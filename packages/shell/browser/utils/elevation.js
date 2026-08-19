// Run the kiosk with administrator rights.
//
// Most of what the lockdown layer does reaches outside our own process, and each
// of those things stops at the integrity boundary when we run as a normal user:
//
//   - taskkill on TeamViewer_Service.exe, which runs as SYSTEM. Without
//     elevation the kill is denied and the service respawns the session process
//     we just killed.
//   - reading the image path of another user's process, which is what tiers 2
//     and 3 of process-blocker.js match on. Unelevated it comes back empty, and
//     a renamed AnyDesk.exe is then only visible to the name tier it defeats.
//   - the low-level keyboard hook. UIPI does not deliver input aimed at a
//     high-integrity window to a medium-integrity hook, so Alt+Tab out of the
//     exam into an elevated application is not blocked unless we are elevated
//     as well.
//
// Two mechanisms get us there and both are wanted:
//
//   1. The packaged exe carries requestedExecutionLevel=requireAdministrator in
//      its manifest (see win32metadata in forge.config.js), so Windows shows the
//      UAC prompt before a line of our code runs. This is the normal path.
//   2. This module, as the fallback for every case where that manifest is not in
//      play: a development run under electron-forge, an exe whose resources have
//      been rewritten, or a copy started some other way. A process cannot raise
//      its own integrity level once it is running, so the only option left is to
//      start a second copy through ShellExecute's "runas" verb and exit.
//
// macOS is deliberately left alone: the mac protections do not need root, and a
// GUI application asking to run as root there is a bigger risk than the one it
// would solve.

const { execFileSync, spawnSync } = require('child_process')
const path = require('path')

const diag = require('./diag-log')
const log = (message, data) => diag.write('Elevation', message, data)
const warn = (message, data) => diag.write('Elevation', `WARN ${message}`, data)

// Marker on the relaunched copy's command line. Without it a machine where the
// elevation probe itself is unreliable would relaunch forever.
const ELEVATED_ARG = '--kki-elevated'

// What to do when the proctor dismisses the UAC prompt. Left off because a kiosk
// that refuses to start is worse than one running with the name-based tier only,
// and the refusal is written to the diag log either way. Flip it to true to make
// administrator rights mandatory instead.
const REQUIRE_ELEVATION = false

const SYSTEM_ROOT = process.env.SystemRoot || 'C:\\Windows'
const POWERSHELL_EXE = path.join(
  SYSTEM_ROOT,
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe'
)

// fltmc.exe is the cheapest reliable elevation probe on Windows: it ships with
// every supported version and refuses to enumerate filter drivers below high
// integrity. Sysnative comes first because a 32-bit build on 64-bit Windows has
// its System32 redirected to SysWOW64, which has no fltmc.exe; Sysnative is the
// alias that escapes that redirection, and it does not exist for a 64-bit
// process, which is why both are tried.
const FLTMC_CANDIDATES = [
  path.join(SYSTEM_ROOT, 'Sysnative', 'fltmc.exe'),
  path.join(SYSTEM_ROOT, 'System32', 'fltmc.exe'),
]

const PROBE_TIMEOUT_MS = 5000

/**
 * true / false when the probe could run, null when none of them could. The
 * caller treats null as "assume not elevated and try once", which the marker
 * above makes safe.
 */
function isElevated() {
  if (process.platform !== 'win32') {
    return typeof process.getuid === 'function' ? process.getuid() === 0 : null
  }

  for (const exe of FLTMC_CANDIDATES) {
    try {
      execFileSync(exe, ['filters'], {
        stdio: 'ignore',
        windowsHide: true,
        timeout: PROBE_TIMEOUT_MS,
      })
      return true
    } catch (error) {
      // A missing binary means the wrong System32 view, not a failed check, so
      // move on to the next candidate. Anything else is fltmc reporting that it
      // was denied, which is the answer we came for.
      if (error && error.code === 'ENOENT') continue
      return false
    }
  }

  warn('fltmc.exe not found in either System32 view, elevation state unknown')
  return null
}

/** Escape a value for a PowerShell single-quoted string. */
function quoteForPowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * Start a second copy of ourselves through the "runas" verb and report whether
 * Windows accepted it. Synchronous on purpose: the answer decides whether this
 * process exits or carries on, and no window exists yet to block.
 */
function relaunchElevated() {
  // argv[0] is our own exe, which Start-Process takes separately. The rest is
  // whatever we were launched with - in development that includes the app path,
  // so it has to be passed through or the copy starts as a different app.
  const args = process.argv.slice(1).filter((arg) => arg !== ELEVATED_ARG)
  args.push(ELEVATED_ARG)

  const command = [
    "$ErrorActionPreference = 'Stop';",
    `Start-Process -FilePath ${quoteForPowerShell(process.execPath)}`,
    `-ArgumentList ${args.map(quoteForPowerShell).join(',')}`,
    `-WorkingDirectory ${quoteForPowerShell(process.cwd())}`,
    '-Verb RunAs',
  ].join(' ')

  const result = spawnSync(
    POWERSHELL_EXE,
    ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', command],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }
  )

  if (result.error) {
    warn('Failed to run the elevation helper:', result.error.message)
    return false
  }

  if (result.status !== 0) {
    // The usual reason is the proctor clicking No on the UAC prompt, which
    // surfaces here as a non-zero exit from Start-Process.
    warn('Elevated relaunch was refused:', String(result.stderr || '').trim())
    return false
  }

  return true
}

/**
 * Call this before anything else in the main process. Returns true when the
 * caller should keep going, and does not return at all when an elevated copy has
 * taken over.
 */
function ensureElevated() {
  if (process.platform !== 'win32') return true

  if (process.env.DISABLE_ELEVATION === 'true') {
    log('Skipped, DISABLE_ELEVATION is set')
    return true
  }

  // A development run would detach from electron-forge the moment it relaunched,
  // so outside a packaged build this stays opt-in through FORCE_ELEVATION=true.
  const { app } = require('electron')
  if (!app.isPackaged && process.env.FORCE_ELEVATION !== 'true') {
    log('Skipped, unpackaged run (set FORCE_ELEVATION=true to exercise it)')
    return true
  }

  const elevated = isElevated()

  if (elevated === true) {
    log('Running as administrator')
    return true
  }

  if (process.argv.includes(ELEVATED_ARG)) {
    warn('Still not elevated after a relaunch, continuing with reduced protection')
    return true
  }

  log('Not elevated, relaunching through UAC')

  if (relaunchElevated()) {
    log('Elevated copy started, exiting this one')
    app.exit(0)
    // app.exit does not tear the process down synchronously, and the caller must
    // not go on to open a window in a process that is already on its way out.
    process.exit(0)
  }

  if (REQUIRE_ELEVATION) {
    warn('Administrator rights are required, exiting')
    app.exit(1)
    process.exit(1)
  }

  warn(
    'Continuing without administrator rights - process blocking and the keyboard hook are degraded'
  )
  return false
}

module.exports = { ensureElevated, isElevated, ELEVATED_ARG }
