#!/usr/bin/env node
/**
 * Mac packaging entry point (electron-builder) with build-variant support.
 *
 * Usage:
 *   node scripts/package-mac.js <peserta|penguji> [extra electron-builder args]
 *
 * The variant is exported as APP_VARIANT so the compiled app picks the right
 * portal (see packages/shell/browser/config/variant.js), and the same variant
 * drives the electron-builder product/artifact names so the two builds never
 * overwrite each other in release/.
 */
const path = require('path')
const { spawnSync } = require('child_process')

const [variantArg, ...builderArgs] = process.argv.slice(2)

if (variantArg) process.env.APP_VARIANT = variantArg

const { APP_VARIANT, VARIANT_CONFIG, VARIANTS } = require(
  path.join(__dirname, '..', 'packages', 'shell', 'browser', 'config', 'variant')
)

if (variantArg && !Object.prototype.hasOwnProperty.call(VARIANTS, variantArg)) {
  console.error(
    `package-mac: unknown variant "${variantArg}". Use one of: ${Object.keys(VARIANTS).join(', ')}`
  )
  process.exit(1)
}

const useShell = process.platform === 'win32'

// spawn with shell:true does not quote for us, so do it here
const quote = (arg) => (useShell && /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg)

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, useShell ? args.map(quote) : args, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: useShell,
    env: { ...process.env, APP_VARIANT },
  })
  if (result.error) {
    console.error(`package-mac: failed to run ${command}:`, result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status === null ? 1 : result.status)
}

console.log(`package-mac: building variant "${APP_VARIANT}" (${VARIANT_CONFIG.productName})`)
console.log(`package-mac: start page ${VARIANT_CONFIG.newtabUrl}`)

run('npm', ['run', 'build'])

run('npx', [
  'electron-builder',
  '--mac',
  ...builderArgs,
  `-c.productName=${VARIANT_CONFIG.productName}`,
  '-c.mac.artifactName=' + VARIANT_CONFIG.artifactBaseName + '-${version}-mac-${arch}.${ext}',
  '-c.dmg.title=' + VARIANT_CONFIG.productName + ' ${version}',
  `-c.directories.output=release/${APP_VARIANT}`,
])
