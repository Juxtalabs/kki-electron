/**
 * Exit Code
 *
 * Fetches the kiosk exit password from the exit code API.
 *
 * Chromium's stack (Electron's net module) is tried first because it validates
 * against the Windows certificate store and honours the system proxy. Plain Node
 * https does neither: the packaged build fails here with
 * SELF_SIGNED_CERT_IN_CHAIN, because a TLS-inspecting security product presents
 * its own root that Windows trusts and Node's bundled CA list does not. Node https
 * stays as a fallback for the case where Chromium networking is unavailable.
 *
 * The request runs on its own session partition, so the kiosk's domain whitelist
 * interceptor on the default session never sees it.
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')
const { SECURITY_CONFIG } = require('../config/security')
const diag = require('../utils/diag-log')

const log = (message, data) => diag.write('ExitCode', message, data)

const REQUEST_TIMEOUT_MS = 8000
const EXIT_CODE_PARTITION = 'exit-code'

function buildHeaders() {
  return {
    Authorization: `Bearer ${SECURITY_CONFIG.EXIT_CODE_TOKEN}`,
    Accept: 'application/json',
    'User-Agent': SECURITY_CONFIG.ALLOWED_USER_AGENT,
  }
}

/**
 * Expected shape: { "code": "GN4ED87E" }
 */
function parseExitCode(body) {
  let payload
  try {
    payload = JSON.parse(body)
  } catch (error) {
    throw new Error('Response was not valid JSON')
  }

  const code = payload && (payload.code || (payload.data && payload.data.code))
  if (typeof code !== 'string' || !code.trim()) {
    throw new Error('Response contained no exit code')
  }

  return code.trim()
}

function requestViaChromium() {
  // Required lazily so this module still loads outside an Electron process
  const { net, session } = require('electron')

  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url: SECURITY_CONFIG.EXIT_CODE_URL,
      session: session.fromPartition(EXIT_CODE_PARTITION),
      useSessionCookies: false,
    })

    Object.entries(buildHeaders()).forEach(([name, value]) => request.setHeader(name, value))

    const timer = setTimeout(() => {
      request.abort()
      reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`))
    }, REQUEST_TIMEOUT_MS)

    request.on('response', (response) => {
      let body = ''
      response.on('data', (chunk) => {
        body += chunk.toString()
      })
      response.on('end', () => {
        clearTimeout(timer)

        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode} - ${body.slice(0, 200)}`))
          return
        }

        try {
          resolve(parseExitCode(body))
        } catch (error) {
          reject(error)
        }
      })
    })

    request.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })

    request.end()
  })
}

function requestViaNode() {
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
        headers: buildHeaders(),
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
            reject(new Error(`HTTP ${res.statusCode} - ${body.slice(0, 200)}`))
            return
          }

          try {
            resolve(parseExitCode(body))
          } catch (error) {
            reject(error)
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
  const startedAt = Date.now()
  log('Fetching exit password', SECURITY_CONFIG.EXIT_CODE_URL)

  try {
    const code = await requestViaChromium()
    log(`Exit password fetched from API in ${Date.now() - startedAt}ms (chromium)`)
    return code
  } catch (error) {
    log('Chromium request failed, retrying over node https', {
      error: error.message,
      code: error.code,
    })
  }

  try {
    const code = await requestViaNode()
    log(`Exit password fetched from API in ${Date.now() - startedAt}ms (node https)`)
    return code
  } catch (error) {
    // The proctor must never be trapped, so a failure still yields a usable
    // password - but it has to be obvious in the log which one is in play.
    log(`WARN API fetch failed after ${Date.now() - startedAt}ms, USING FALLBACK PASSWORD`, {
      url: SECURITY_CONFIG.EXIT_CODE_URL,
      error: error.message,
      code: error.code,
    })
    return SECURITY_CONFIG.EXIT_PASSWORD
  }
}

module.exports = { getExitPassword }
