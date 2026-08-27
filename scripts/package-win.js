#!/usr/bin/env node
/**
 * Windows packaging entry point (electron-forge) with build-variant support.
 *
 * Usage:
 *   node scripts/package-win.js <peserta|penguji> [--arch=ia32|x64|arm64] [extra forge args]
 *
 * Mirrors scripts/package-mac.js: the variant is exported as APP_VARIANT so the
 * compiled app picks the right portal (see packages/shell/browser/config/variant.js).
 * The arch is exported as APP_TARGET_ARCH as well so forge.config.js can pick the
 * matching native keyhook helper, and it is passed to forge, which overrides
 * packagerConfig.arch. Each arch lands in its own out/ folder
 * ("KKI Browser-win32-ia32" vs "KKI Browser-win32-x64"), so the builds never
 * overwrite each other.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ARCHES = ['ia32', 'x64', 'arm64']
const DEFAULT_ARCH = 'x64'

const argv = process.argv.slice(2)
const archArg = argv.find((arg) => arg.startsWith('--arch='))
const forgeArgs = argv.filter((arg) => arg !== archArg && !arg.startsWith('-'))
const passthroughArgs = argv.filter((arg) => arg !== archArg && arg.startsWith('-'))

const variantArg = forgeArgs[0]
const arch = archArg ? archArg.slice('--arch='.length) : DEFAULT_ARCH

if (!ARCHES.includes(arch)) {
  console.error(`package-win: unknown arch "${arch}". Use one of: ${ARCHES.join(', ')}`)
  process.exit(1)
}

if (variantArg) process.env.APP_VARIANT = variantArg
process.env.APP_TARGET_ARCH = arch

const shellDir = path.join(__dirname, '..', 'packages', 'shell')

const { APP_VARIANT, VARIANT_CONFIG, VARIANTS } = require(
  path.join(shellDir, 'browser', 'config', 'variant')
)

if (variantArg && !Object.prototype.hasOwnProperty.call(VARIANTS, variantArg)) {
  console.error(
    `package-win: unknown variant "${variantArg}". Use one of: ${Object.keys(VARIANTS).join(', ')}`
  )
  process.exit(1)
}

// The keyboard hook helper is a plain win32 exe, not an Electron module, so it
// does not get rebuilt per arch. A 32-bit Windows install cannot run the x64
// copy the repo ships - warn loudly rather than shipping a helper that silently
// fails to spawn. See packages/shell/compile-helper-x86.bat.
if (arch === 'ia32' && !fs.existsSync(path.join(shellDir, 'native', 'ia32', 'keyhook-helper.exe'))) {
  console.warn(
    '\npackage-win: WARNING native/ia32/keyhook-helper.exe is missing, falling back to the\n' +
      'x64 helper. That copy runs on 64-bit Windows but not on a 32-bit install, where the\n' +
      'keyboard blocking will be silently skipped. Run packages/shell/compile-helper-x86.bat\n' +
      'on a machine with the VC++ build tools to produce it.\n'
  )
}

const useShell = process.platform === 'win32'

// spawn with shell:true does not quote for us, so do it here
const quote = (arg) => (useShell && /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg)

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, useShell ? args.map(quote) : args, {
    cwd: shellDir,
    stdio: 'inherit',
    shell: useShell,
    env: { ...process.env, APP_VARIANT, APP_TARGET_ARCH: arch },
  })
  if (result.error) {
    console.error(`package-win: failed to run ${command}:`, result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status === null ? 1 : result.status)
}

console.log(`package-win: building variant "${APP_VARIANT}" (${VARIANT_CONFIG.productName})`)
console.log(`package-win: target win32-${arch}`)
console.log(`package-win: start page ${VARIANT_CONFIG.newtabUrl}`)

run('npx', [
  'electron-forge',
  'package',
  '--platform=win32',
  `--arch=${arch}`,
  ...passthroughArgs,
  ...forgeArgs.slice(1),
])

const outDir = path.join(shellDir, 'out', `${VARIANT_CONFIG.productName}-win32-${arch}`)
console.log(`\npackage-win: done -> ${outDir}`)
