// Kill everything the exam does not need - remote-control software, browsers,
// PDF readers, text editors, office suites, chat and conferencing clients - by
// who signed it, not only by what it is called.
//
// Matching on the process name alone (taskkill /IM TeamViewer.exe) is one rename
// away from useless: a student who copies TeamViewer.exe to notepad.exe keeps a
// working remote session, and the same trick reopens Chrome. What they cannot
// change without invalidating it is the Authenticode signature, so the real
// check is on the signing certificate of the executable behind each running PID.
//
// Three tiers run together and any one of them is enough to kill:
//
//   1. Name       - BLOCKED_PROCESSES, the original taskkill /IM sweep. Free, and
//                   it is the only tier that reaches processes whose image path we
//                   cannot read (services running as SYSTEM without elevation).
//   2. Metadata   - CompanyName / ProductName / OriginalFilename from the PE version
//                   resource. Not cryptographic, but it survives a rename and it is
//                   cheap enough to run over every process on every sweep.
//   3. Signature  - the subject of the Authenticode signing certificate on Windows,
//                   the codesign authority and bundle identifier on macOS. This is
//                   the tier that actually holds up against a determined student.
//
// The two file tiers are deliberately not run in one pass. Measured on the target
// hardware, reading the version resource costs ~5ms per image while verifying the
// Authenticode signature costs ~460ms - two orders of magnitude apart, because the
// signature check can go out to the network for a revocation list. Together they
// left a fresh machine well over a minute into its ~150 running images before any
// of them had been classified, which is a long time to leave a remote session up.
//
// So tier 2 runs over every unclassified image on every sweep and lands within a
// second, and tier 3 drains a bounded batch per sweep behind it. Newly appeared
// processes go to the front of that queue: an application launched during the exam
// is signature-checked on the next sweep no matter how long the startup backlog
// still is. Verdicts are cached per image path and only re-derived when the file's
// size or mtime changes.
//
// Stripping the signature to get past tier 3 leaves an unsigned binary, which is
// what evasion actually looks like in practice - that is reported separately, and
// only logged unless KILL_UNSIGNED_SUSPICIOUS is turned on.

const { execFile } = require('child_process')
const path = require('path')

const diag = require('./diag-log')
const log = (message, data) => diag.write('ProcessBlocker', message, data)
const warn = (message, data) => diag.write('ProcessBlocker', `WARN ${message}`, data)

const SYSTEM_ROOT = process.env.SystemRoot || 'C:\\Windows'
const SYSTEM32 = path.join(SYSTEM_ROOT, 'System32')
const POWERSHELL_EXE = path.join(SYSTEM32, 'WindowsPowerShell', 'v1.0', 'powershell.exe')
const TASKKILL_EXE = path.join(SYSTEM32, 'taskkill.exe')

// A hung revocation lookup must not stall a sweep indefinitely.
const ENUMERATE_TIMEOUT_MS = 15000
const METADATA_TIMEOUT_MS = 20000
const SIGNATURE_TIMEOUT_MS = 30000

// ~460ms per image on Windows, so 30 keeps a sweep's signature pass inside the
// timeout above. codesign is far cheaper, so macOS drains its queue faster.
const MAX_SIGNATURE_PER_SWEEP = process.platform === 'darwin' ? 60 : 30
// Only a bound against a fork bomb - the metadata pass is cheap enough to run over
// every image that is actually new.
const MAX_METADATA_PER_SWEEP = 250
const MAX_KILL_HISTORY = 200

// Suspicious-location test for the unsigned tier: a real remote-control install
// lives in Program Files, a smuggled portable build does not.
const PORTABLE_DIR_PATTERNS = [
  /\\appdata\\local\\temp\\/i,
  /\\downloads\\/i,
  /\\desktop\\/i,
  /\\users\\public\\/i,
  /^\/(private\/)?(var|tmp)\//i,
  /\/downloads\//i,
  /\/desktop\//i,
]

// path -> { key, blocked, reason, detail } from the version resource
const metadataCache = new Map()
// path -> { key, blocked, reason, detail, unsigned } from the signing certificate
const signatureCache = new Map()
// image paths still waiting for tier 3, newest arrivals at the front
const signatureQueue = []
const killHistory = []

let sweepInterval = null
let revalidateInterval = null
let sweeping = false
let startupSweepDone = false
let config = null
let onDetection = null

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

function matchesAny(value, patterns) {
  if (!value) return null
  const haystack = String(value).toLowerCase()
  for (const pattern of patterns) {
    const needle = String(pattern).toLowerCase().trim()
    if (needle && haystack.includes(needle)) return pattern
  }
  return null
}

function isUnderSystemRoot(imagePath) {
  if (process.platform !== 'win32') return false
  return imagePath.toLowerCase().startsWith(SYSTEM_ROOT.toLowerCase() + path.sep)
}

/**
 * Named exceptions to the %SystemRoot% guard below, from
 * KILLABLE_SYSTEM_PROCESSES. Only the name tier consults this: a Windows
 * accessory is killed because someone named it on purpose, never because a
 * hand-edited publisher substring happened to match its certificate.
 */
function isSystemKillable(proc) {
  if (!config || !proc.name) return false

  const names = config.KILLABLE_SYSTEM_PROCESSES || []
  return names.some((name) => String(name).toLowerCase() === proc.name.toLowerCase())
}

/**
 * Anything the OS needs to keep running, plus our own executable.
 *
 * The publisher lists are edited by hand, and a careless entry like 'Microsoft'
 * would otherwise take the machine down mid-exam. Nothing shipped with Windows is
 * ever a kill candidate - a remote-control tool does not live in System32.
 *
 * `allowSystem` lets the name tier past that last rule for the accessories in
 * KILLABLE_SYSTEM_PROCESSES - Notepad ships in System32 and is still a place to
 * keep notes. The checks above it, the idle pids and our own image, hold either
 * way.
 */
function isProtected(proc, { allowSystem = false } = {}) {
  if (!proc.pid || proc.pid <= 4) return true
  if (proc.pid === process.pid) return true
  if (!proc.path) return false
  if (proc.path === process.execPath) return true
  if (allowSystem && isSystemKillable(proc)) return false
  return isUnderSystemRoot(proc.path)
}

function looksPortable(imagePath) {
  return PORTABLE_DIR_PATTERNS.some((pattern) => pattern.test(imagePath))
}

function fileKey(meta) {
  return `${meta.size || 0}:${meta.mtime || 0}`
}

function recordKill(entry) {
  killHistory.push({ ...entry, timestamp: new Date().toISOString() })
  if (killHistory.length > MAX_KILL_HISTORY) killHistory.shift()

  if (onDetection) {
    try {
      onDetection(entry)
    } catch (error) {
      warn('onDetection handler failed:', error.message)
    }
  }
}

function run(file, args, options = {}) {
  return new Promise((resolve) => {
    const child = execFile(
      file,
      args,
      { windowsHide: true, maxBuffer: 8 * 1024 * 1024, ...options },
      (error, stdout, stderr) => resolve({ error, stdout: stdout || '', stderr: stderr || '' }),
    )

    if (options.input !== undefined && child.stdin) {
      child.stdin.on('error', () => {})
      child.stdin.end(options.input)
    }
  })
}

/**
 * Quoting a PowerShell script through a command line is a losing game, so scripts
 * go across as base64 UTF-16LE and the paths they operate on arrive on stdin.
 */
function runPowerShell(script, input, timeout) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  return run(
    POWERSHELL_EXE,
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
    { timeout, input },
  )
}

function parseJsonList(stdout) {
  const text = (stdout || '').trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch (error) {
    warn('Could not parse output as JSON:', error.message)
    return []
  }
}

/* -------------------------------------------------------------------------- */
/* process enumeration                                                         */
/* -------------------------------------------------------------------------- */

// Win32_Process rather than Get-Process: ExecutablePath is populated for processes
// owned by other users, where Get-Process leaves Path null.
const ENUMERATE_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
Get-CimInstance Win32_Process |
  Select-Object @{n='pid';e={$_.ProcessId}}, @{n='name';e={$_.Name}}, @{n='path';e={$_.ExecutablePath}} |
  ConvertTo-Json -Compress -Depth 2
`

async function enumerateWindows() {
  const { error, stdout } = await runPowerShell(ENUMERATE_SCRIPT, undefined, ENUMERATE_TIMEOUT_MS)
  if (error) {
    warn('Process enumeration failed:', error.message)
    return []
  }
  return parseJsonList(stdout)
    .filter((proc) => proc && proc.pid)
    .map((proc) => ({ pid: Number(proc.pid), name: proc.name || '', path: proc.path || '' }))
}

async function enumerateDarwin() {
  // comm= prints the full executable path on macOS, which is what codesign needs.
  const { error, stdout } = await run('/bin/ps', ['-axo', 'pid=,comm='], {
    timeout: ENUMERATE_TIMEOUT_MS,
  })
  if (error) {
    warn('Process enumeration failed:', error.message)
    return []
  }

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.*)$/)
      if (!match) return null
      const imagePath = match[2].trim()
      return { pid: Number(match[1]), name: path.basename(imagePath), path: imagePath }
    })
    .filter(Boolean)
}

function enumerate() {
  if (process.platform === 'win32') return enumerateWindows()
  if (process.platform === 'darwin') return enumerateDarwin()
  return Promise.resolve([])
}

/* -------------------------------------------------------------------------- */
/* tier 2 - version resource                                                   */
/* -------------------------------------------------------------------------- */

// Every field is read defensively: an unreadable image must still come back as a
// row, otherwise the path stays uncached and is re-read on every sweep.
const METADATA_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$paths = [Console]::In.ReadToEnd() | ConvertFrom-Json
$results = @()

foreach ($p in $paths) {
  $size = 0
  $mtime = 0
  $company = ''
  $product = ''
  $description = ''
  $originalName = ''

  $item = Get-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
  if ($item) {
    $size = $item.Length
    $mtime = $item.LastWriteTimeUtc.Ticks
  }

  try {
    $info = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($p)
    if ($info) {
      $company = $info.CompanyName
      $product = $info.ProductName
      $description = $info.FileDescription
      $originalName = $info.OriginalFilename
    }
  } catch {}

  $results += [PSCustomObject]@{
    path = $p
    size = $size
    mtime = [string]$mtime
    company = $company
    product = $product
    description = $description
    originalName = $originalName
  }
}

$results | ConvertTo-Json -Compress -Depth 3
`

async function readMetadataWindows(paths) {
  const { error, stdout } = await runPowerShell(
    METADATA_SCRIPT,
    JSON.stringify(paths),
    METADATA_TIMEOUT_MS,
  )
  if (error) {
    warn('Version resource read failed:', error.message)
    return []
  }
  return parseJsonList(stdout).filter((meta) => meta && meta.path)
}

async function readMetadataDarwin(paths) {
  // Mach-O binaries carry no equivalent of the PE version resource, so the only
  // identity available up front is the file name. Everything else waits for
  // codesign, which on macOS is cheap enough not to need a fast tier.
  const results = []

  for (const imagePath of paths) {
    const { error, stdout } = await run('/usr/bin/stat', ['-f', '%z %m', imagePath], {
      timeout: 5000,
    })
    const [size, mtime] = error ? [0, 0] : stdout.trim().split(/\s+/).map(Number)

    results.push({
      path: imagePath,
      size: size || 0,
      mtime: mtime || 0,
      company: '',
      product: '',
      description: '',
      originalName: path.basename(imagePath),
    })
  }

  return results
}

function readMetadata(paths) {
  if (process.platform === 'win32') return readMetadataWindows(paths)
  if (process.platform === 'darwin') return readMetadataDarwin(paths)
  return Promise.resolve([])
}

/**
 * The version resource is attacker-writable with a resource editor, so a hit here
 * is worth acting on but a miss is never why a binary is spared - that is what the
 * signature tier is for.
 */
function evaluateMetadata(meta) {
  const publishers = config.BLOCKED_PUBLISHERS || []
  const products = config.BLOCKED_PRODUCTS || []

  const hit =
    matchesAny(meta.company, publishers) ||
    matchesAny(meta.company, products) ||
    matchesAny(meta.product, products) ||
    matchesAny(meta.originalName, products) ||
    matchesAny(meta.description, products)

  if (!hit) return { key: fileKey(meta), blocked: false }

  return {
    key: fileKey(meta),
    blocked: true,
    reason: 'metadata',
    detail: `version resource matches "${hit}" (company="${meta.company}" product="${meta.product}" original="${meta.originalName}")`,
  }
}

/* -------------------------------------------------------------------------- */
/* tier 3 - signing certificate                                                */
/* -------------------------------------------------------------------------- */

const SIGNATURE_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$paths = [Console]::In.ReadToEnd() | ConvertFrom-Json
$results = @()

foreach ($p in $paths) {
  $size = 0
  $mtime = 0
  $sigStatus = 'Unknown'
  $subject = ''

  $item = Get-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
  if ($item) {
    $size = $item.Length
    $mtime = $item.LastWriteTimeUtc.Ticks
  }

  try {
    $sig = Get-AuthenticodeSignature -LiteralPath $p -ErrorAction SilentlyContinue
    if ($sig) {
      $sigStatus = [string]$sig.Status
      if ($sig.SignerCertificate) { $subject = $sig.SignerCertificate.Subject }
    }
  } catch {}

  $results += [PSCustomObject]@{
    path = $p
    size = $size
    mtime = [string]$mtime
    sigStatus = $sigStatus
    subject = $subject
  }
}

$results | ConvertTo-Json -Compress -Depth 3
`

async function readSignaturesWindows(paths) {
  const { error, stdout } = await runPowerShell(
    SIGNATURE_SCRIPT,
    JSON.stringify(paths),
    SIGNATURE_TIMEOUT_MS,
  )
  if (error) {
    warn('Signature verification failed:', error.message)
    return []
  }
  return parseJsonList(stdout).filter((entry) => entry && entry.path)
}

async function readSignaturesDarwin(paths) {
  const results = []

  for (const imagePath of paths) {
    // codesign writes its detail block to stderr, including on success.
    const { stderr, stdout } = await run('/usr/bin/codesign', ['-dv', '--verbose=4', imagePath], {
      timeout: 5000,
    })
    const output = `${stderr}\n${stdout}`

    const authorities = [...output.matchAll(/^Authority=(.*)$/gm)].map((m) => m[1].trim())
    const identifier = (output.match(/^Identifier=(.*)$/m) || [])[1] || ''
    const signed = authorities.length > 0 && !/code object is not signed/i.test(output)

    const { error: statError, stdout: statOut } = await run(
      '/usr/bin/stat',
      ['-f', '%z %m', imagePath],
      { timeout: 5000 },
    )
    const [size, mtime] = statError ? [0, 0] : statOut.trim().split(/\s+/).map(Number)

    results.push({
      path: imagePath,
      size: size || 0,
      mtime: mtime || 0,
      sigStatus: signed ? 'Valid' : 'NotSigned',
      // The bundle identifier is as much a part of the signed identity as the
      // authority chain, so both are matched against.
      subject: [authorities.join(' | '), identifier].filter(Boolean).join(' | '),
    })
  }

  return results
}

function readSignatures(paths) {
  if (process.platform === 'win32') return readSignaturesWindows(paths)
  if (process.platform === 'darwin') return readSignaturesDarwin(paths)
  return Promise.resolve([])
}

function evaluateSignature(entry) {
  const publishers = config.BLOCKED_PUBLISHERS || []
  const products = config.BLOCKED_PRODUCTS || []
  const isSigned = entry.sigStatus === 'Valid'

  if (isSigned) {
    const hit = matchesAny(entry.subject, publishers) || matchesAny(entry.subject, products)
    if (hit) {
      return {
        key: fileKey(entry),
        blocked: true,
        reason: 'publisher',
        detail: `signed by "${hit}" (${(entry.subject || '').slice(0, 160)})`,
      }
    }
  }

  // Not a match, but worth surfacing: an unsigned executable running out of a
  // download or temp directory is what a signature-stripped build looks like.
  return {
    key: fileKey(entry),
    blocked: false,
    unsigned: !isSigned && looksPortable(entry.path),
  }
}

/* -------------------------------------------------------------------------- */
/* killing                                                                     */
/* -------------------------------------------------------------------------- */

async function killByPid(targets) {
  if (!targets.length) return

  const pids = targets.map((target) => target.pid)

  if (process.platform === 'win32') {
    const args = ['/F', '/T']
    pids.forEach((pid) => args.push('/PID', String(pid)))
    const { error, stderr } = await run(TASKKILL_EXE, args, { timeout: 10000 })
    if (error) {
      // taskkill exits non-zero when a PID has already gone away on its own.
      warn('taskkill reported a failure', { pids, stderr: (stderr || error.message).trim() })
    }
  } else {
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch (error) {
        warn(`Failed to kill pid ${pid}:`, error.message)
      }
    }
  }

  targets.forEach((target) => {
    log(`Killed ${target.name} (pid ${target.pid}) - ${target.reason}: ${target.detail}`)
    recordKill(target)
  })
}

/**
 * Tier 1. Left in place because it is the only tier that reaches a process whose
 * image path we cannot read - TeamViewer_Service.exe runs as SYSTEM, and without
 * elevation its ExecutablePath comes back empty.
 */
async function killByName(processes) {
  const names = config.BLOCKED_PROCESSES || []
  if (!names.length) return

  const targets = []

  for (const proc of processes) {
    if (isProtected(proc, { allowSystem: true })) continue

    const candidate = process.platform === 'darwin' ? proc.name.replace(/\.exe$/i, '') : proc.name

    const hit = names.some((name) => {
      const wanted = process.platform === 'darwin' ? name.replace(/\.exe$/i, '') : name
      return candidate.toLowerCase() === wanted.toLowerCase()
    })

    if (hit) {
      targets.push({
        pid: proc.pid,
        name: proc.name,
        path: proc.path,
        reason: 'name',
        detail: 'process name is on BLOCKED_PROCESSES',
      })
    }
  }

  await killByPid(targets)
}

/* -------------------------------------------------------------------------- */
/* sweep                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Put an image in line for signature verification. Anything that appeared after
 * the startup sweep goes to the front: the backlog of software that was already
 * running when the kiosk launched must never delay checking something the student
 * started during the exam.
 */
function queueForSignature(imagePath) {
  if (signatureCache.has(imagePath) || signatureQueue.includes(imagePath)) return
  if (startupSweepDone) signatureQueue.unshift(imagePath)
  else signatureQueue.push(imagePath)
}

async function classify(candidates) {
  const seen = new Set()
  const fresh = []

  for (const proc of candidates) {
    if (seen.has(proc.path)) continue
    seen.add(proc.path)
    if (!metadataCache.has(proc.path)) fresh.push(proc.path)
    queueForSignature(proc.path)
  }

  if (fresh.length) {
    const batch = fresh.slice(0, MAX_METADATA_PER_SWEEP)
    if (fresh.length > batch.length) {
      warn(`Unusual number of new images (${fresh.length}), reading ${batch.length} this sweep`)
    }

    for (const meta of await readMetadata(batch)) {
      const verdict = evaluateMetadata(meta)
      metadataCache.set(meta.path, verdict)
      if (verdict.blocked) log(`Blocked on metadata: ${meta.path} - ${verdict.detail}`)
    }
  }

  if (signatureQueue.length) {
    const batch = signatureQueue.splice(0, MAX_SIGNATURE_PER_SWEEP)

    for (const entry of await readSignatures(batch)) {
      const verdict = evaluateSignature(entry)
      signatureCache.set(entry.path, verdict)
      if (verdict.blocked) log(`Blocked on signature: ${entry.path} - ${verdict.detail}`)
      else if (verdict.unsigned) {
        warn(`Unsigned executable running from a portable location: ${entry.path}`)
      }
    }

    if (signatureQueue.length) {
      log(`${signatureQueue.length} images still waiting for signature verification`)
    }
  }
}

async function scanOnce() {
  if (sweeping) return
  sweeping = true

  try {
    const processes = await enumerate()
    if (!processes.length) return

    await killByName(processes)

    // Only images we could actually be asked to kill are worth reading. Skipping
    // everything under %SystemRoot% removes most of the startup backlog.
    const candidates = processes.filter((proc) => proc.path && !isProtected(proc))

    await classify(candidates)

    const targets = []
    const seenPids = new Set()

    for (const proc of candidates) {
      if (seenPids.has(proc.pid)) continue

      const metadata = metadataCache.get(proc.path)
      const signature = signatureCache.get(proc.path)

      let verdict = null
      if (metadata && metadata.blocked) verdict = metadata
      else if (signature && signature.blocked) verdict = signature
      else if (signature && signature.unsigned && config.KILL_UNSIGNED_SUSPICIOUS === true) {
        verdict = { reason: 'unsigned', detail: 'unsigned executable in a portable location' }
      }

      if (verdict) {
        seenPids.add(proc.pid)
        targets.push({
          pid: proc.pid,
          name: proc.name,
          path: proc.path,
          reason: verdict.reason,
          detail: verdict.detail,
        })
      }
    }

    await killByPid(targets)
    startupSweepDone = true
  } catch (error) {
    warn('Sweep failed:', error.message)
  } finally {
    sweeping = false
  }
}

/**
 * Drop cached verdicts whose file changed on disk. A binary swapped in at a path
 * already seen would otherwise keep its old verdict for the life of the session.
 * Only the cheap tier runs here - a changed file goes back in the signature queue.
 */
async function revalidate() {
  const paths = [...metadataCache.keys()]
  if (!paths.length) return

  try {
    for (const meta of await readMetadata(paths.slice(0, MAX_METADATA_PER_SWEEP))) {
      const cached = metadataCache.get(meta.path)
      if (!cached || cached.key === fileKey(meta)) continue

      log(`Image changed on disk, re-evaluating: ${meta.path}`)
      metadataCache.set(meta.path, evaluateMetadata(meta))
      signatureCache.delete(meta.path)
      signatureQueue.unshift(meta.path)
    }
  } catch (error) {
    warn('Revalidation failed:', error.message)
  }
}

/* -------------------------------------------------------------------------- */
/* lifecycle                                                                   */
/* -------------------------------------------------------------------------- */

function start(securityConfig, options = {}) {
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    log(`Not supported on ${process.platform}, skipping`)
    return false
  }

  if (sweepInterval) {
    log('Already running')
    return true
  }

  config = securityConfig || {}
  onDetection = options.onDetection || null

  const intervalMs = options.intervalMs || 5000

  log('Starting process blocker', {
    names: (config.BLOCKED_PROCESSES || []).length,
    publishers: (config.BLOCKED_PUBLISHERS || []).length,
    products: (config.BLOCKED_PRODUCTS || []).length,
    killableSystem: (config.KILLABLE_SYSTEM_PROCESSES || []).length,
    killUnsigned: config.KILL_UNSIGNED_SUSPICIOUS === true,
    intervalMs,
  })

  scanOnce()
  sweepInterval = setInterval(scanOnce, intervalMs)

  // Cheap enough at this cadence, and it closes the swap-the-binary hole.
  revalidateInterval = setInterval(revalidate, intervalMs * 12)

  return true
}

function stop() {
  if (sweepInterval) {
    clearInterval(sweepInterval)
    sweepInterval = null
  }
  if (revalidateInterval) {
    clearInterval(revalidateInterval)
    revalidateInterval = null
  }
  log('Process blocker stopped')
}

function getKillHistory() {
  return [...killHistory]
}

module.exports = { start, stop, scanOnce, getKillHistory }
