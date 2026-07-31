/**
 * Exit Code
 *
 * Fetches the kiosk exit password from the exit code API. Node's http/https is
 * used directly rather than Electron's net module so the request bypasses the
 * session's domain whitelist interceptor.
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')
const { SECURITY_CONFIG } = require('../config/security')

const REQUEST_TIMEOUT_MS = 8000

function requestExitCode() {
  return new Promise((resolve, reject) => {
    const url = new URL(SECURITY_CONFIG.EXIT_CODE_URL)
    const transport = url.protocol === 'http:' ? http : https

    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SECURITY_CONFIG.EXIT_CODE_TOKEN}`,
          Accept: 'application/json',
          'User-Agent': SECURITY_CONFIG.ALLOWED_USER_AGENT,
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}`))
            return
          }

          let payload
          try {
            payload = JSON.parse(body)
          } catch (error) {
            reject(new Error('Response was not valid JSON'))
            return
          }

          // Expected shape: { "code": "GN4ED87E" }
          const code = payload && (payload.code || (payload.data && payload.data.code))
          if (typeof code === 'string' && code.trim()) {
            resolve(code.trim())
          } else {
            reject(new Error('Response contained no exit code'))
          }
        })
      }
    )

    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`))
    })
    req.on('error', reject)
    req.end()
  })
}

/**
 * Resolve the password that unlocks kiosk mode. Falls back to the hardcoded
 * password when the API can't be reached so an outage never traps the proctor.
 *
 * @returns {Promise<string>}
 */
async function getExitPassword() {
  try {
    const code = await requestExitCode()
    console.log('ExitCode: exit password fetched from API')
    return code
  } catch (error) {
    console.warn('ExitCode: failed to fetch exit password, using fallback:', error.message)
    return SECURITY_CONFIG.EXIT_PASSWORD
  }
}

module.exports = { getExitPassword }
