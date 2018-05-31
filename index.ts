import dns = require('dns')
import net = require('net')
import os = require('os')
import util = require('util')

import asyncLines = require('async-lines')
import pCatchIf = require('p-catch-if')
import pSleep = require('p-sleep')

const debug = require('debug')('server-accepts-email') as (s: string) => void
const resolveMx = util.promisify(dns.resolveMx)

async function readLine (lines: AsyncIterableIterator<string>) {
  const { done, value } = await lines.next()

  if (done) throw new Error('Server closed connection prematurely')

  const code = Number(value.slice(0, 3))
  const hasMore = (value.charAt(3) === '-')
  const comment = value.slice(4)

  return { code, hasMore, comment }
}

async function readResponse (lines: AsyncIterableIterator<string>) {
  let line = await readLine(lines)

  let code = line.code
  let comment = line.comment

  while (line.hasMore) {
    line = await readLine(lines)
    comment += '\n' + line.comment
  }

  return { code, comment }
}

interface TestServerOptions {
  senderDomain: string
  senderAddress: string
  handleGraylisting: boolean
}

type TestServerResult = (
  { kind: 'answer', answer: boolean } |
  { kind: 'greylist', timeout: number } |
  { kind: 'error', error: Error }
)

async function testServer (server: string, email: string, { senderDomain, senderAddress, handleGraylisting }: TestServerOptions) {
  let result: TestServerResult

  debug(`Connecting to "${server}"`)
  const connection = net.connect(25, server)

  try {
    const lines = asyncLines(connection)

    {
      debug(`Waiting for greeting`)
      const response = await readResponse(lines)

      if (response.code !== 220) {
        debug(`Unexpected response: ${response.code} - ${response.comment}`)
        throw new Error(`Unexpected code from server: ${response.code}`)
      }
    }

    {
      debug(`Sending "HELO ${senderDomain}" message`)
      connection.write(`HELO ${senderDomain}\r\n`)

      debug(`Waiting for server response`)
      const response = await readResponse(lines)

      if (response.code !== 250) throw new Error(`Server did not accept sender domain: ${senderDomain}`)
    }

    {
      debug(`Sending "MAIL FROM: <${senderAddress}>" message`)
      connection.write(`MAIL FROM: <${senderAddress}>\r\n`)

      debug(`Waiting for server response`)
      const response = await readResponse(lines)

      if (response.code !== 250) throw new Error(`Server did not accept sender address: ${senderAddress}`)
    }

    {
      debug(`Sending "RCPT TO: <${email}>" message`)
      connection.write(`RCPT TO: <${email}>\r\n`)

      debug(`Waiting for server response`)
      const response = await readResponse(lines)

      if (response.code === 250) {
        debug(`Server accepts email for "${email}"`)
        result = { kind: 'answer', answer: true }
      } else if (response.code === 550) {
        debug('The mailbox is unavailable')
        result = { kind: 'answer', answer: false }
      } else if (response.code === 553) {
        debug('The mailbox name is not allowed')
        result = { kind: 'answer', answer: false }
      } else if (response.code === 554 && response.comment.includes('this address does not exist')) {
        debug('The mailbox is unavailable (probably ProtonMail)')
        result = { kind: 'answer', answer: false }
      } else if (response.code === 501 && response.comment.includes('Bad recipient address syntax')) {
        debug('The mailbox name is not allowed (probably ProtonMail or ESMTP Postfix)')
        result = { kind: 'answer', answer: false }
      } else if (response.code === 504 && response.comment.includes('Recipient address rejected')) {
        debug('The mailbox name is not allowed (probably Yandex)')
        result = { kind: 'answer', answer: false }
      } else if (response.code === 501 && response.comment.includes(`<${email}>: `)) {
        debug('The mailbox name is not allowed (probably Runbox)')
        result = { kind: 'answer', answer: false }
      } else if (response.code === 450 && response.comment.includes('unknown user')) {
        debug('The mailbox is unavailable (probably ESMTP Postfix)')
        result = { kind: 'answer', answer: false }
      } else if (response.code === 554 && response.comment.includes('Invalid-Recipient')) {
        debug('The mailbox is unavailable (probably ESMTP Postfix)')
        result = { kind: 'answer', answer: false }
      } else if (response.code === 451 && response.comment.includes('https://community.mimecast.com/docs/DOC-1369#451')) {
        debug('Server is applying greylisting, estimated wait time: 60s')
        result = { kind: 'greylist', timeout: 60 }
      } else if (response.code === 450 && response.comment.includes('Greylisted, see http://postgrey.schweikert.ch/help/')) {
        debug('Server is applying greylisting, estimated wait time: 5m')
        result = { kind: 'greylist', timeout: 300 }
      } else if (response.code === 451 && response.comment.includes('is not yet authorized to deliver mail from')) {
        debug('Server is applying greylisting, estimated wait time: 10m')
        result = { kind: 'greylist', timeout: 600 }
      } else {
        debug(`Unexpected response: ${response.code} - ${response.comment}`)
        result = { kind: 'error', error: Error(`Unexpected code from server: ${response.code}`) }
      }
    }

    {
      debug(`Sending "QUIT" message`)
      connection.write('QUIT\r\n')

      debug(`Waiting for server response`)
      const response = await readResponse(lines)

      if (response.code !== 221) throw new Error('Server did not respond to "QUIT" command')
    }

    {
      debug('Waiting for connection to close')
      const response = await lines.next()

      if (!response.done) throw new Error('Server did not close connection')
    }
  } finally {
    debug('Closing connection')
    connection.end()
  }

  if (result.kind === 'error') {
    throw result.error
  }

  if (result.kind === 'greylist') {
    if (!handleGraylisting) {
      throw new Error('Server applied greylisting')
    }

    debug(`Waiting ${result.timeout} seconds for greylisting to pass`)
    return pSleep(result.timeout * 1000).then(() => {
      return testServer(server, email, { senderDomain, senderAddress, handleGraylisting: false })
    })
  }

  return result.answer
}

export = async function serverAcceptsEmail (email: string, options: { senderDomain?: string, senderAddress?: string } = {}) {
  const server = email.split('@')[1]

  debug(`Resolving MX records for "${server}"`)
  const mxRecords = await resolveMx(server).catch(pCatchIf(err => (err.code === 'ENOTFOUND' || err.code === 'ENODATA'), () => []))
  debug(`Got ${mxRecords.length} record${mxRecords.length === 1 ? '' : 's'} for "${server}"`)

  if (mxRecords.length === 0) {
    return false
  }

  const senderDomain = (options.senderDomain || os.hostname())
  const senderAddress = (options.senderAddress || `test@${senderDomain}`)

  /* https://en.wikipedia.org/wiki/MX_record#Priority
   * The MX priority determines the order in which the servers
   * are supposed to be contacted: The servers with the highest
   * priority (and the lowest preference number) shall be tried
   * first. Node, however, erroneously labels the preference number
   * "priority". Therefore, sort the addresses by priority in
   * ascending order, and then contact the first exchange. */
  const sortedAddresses = mxRecords.sort((lhs, rhs) => lhs.priority - rhs.priority).map(a => a.exchange)

  let lastError: Error | null = null
  for (const address of sortedAddresses) {
    try {
      return await testServer(address, email, { senderDomain, senderAddress, handleGraylisting: true })
    } catch (err) {
      debug(`Error "${err}", trying next server`)
      lastError = err
    }
  }

  throw lastError
}
