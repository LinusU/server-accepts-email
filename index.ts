import dns = require('dns')
import net = require('net')
import os = require('os')
import util = require('util')

import asyncLines = require('async-lines')
import pCatchIf = require('p-catch-if')

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
    debug(`Connecting to "${address}"`)
    const connection = net.connect(25, address)

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

        if (response.code === 550) {
          debug('The mailbox is unavailable')
          return false
        }

        if (response.code === 553) {
          debug('The mailbox name is not allowed')
          return false
        }

        if (response.code === 554 && response.comment.includes('this address does not exist')) {
          debug('The mailbox is unavailable (probably ProtonMail)')
          return false
        }

        if (response.code === 501 && response.comment.includes('Bad recipient address syntax')) {
          debug('The mailbox name is not allowed (probably ProtonMail or ESMTP Postfix)')
          return false
        }

        if (response.code === 504 && response.comment.includes('Recipient address rejected')) {
          debug('The mailbox name is not allowed (probably Yandex)')
          return false
        }

        if (response.code === 501 && response.comment.includes(`<${email}>: `)) {
          debug('The mailbox name is not allowed (probably Runbox)')
          return false
        }

        if (response.code === 450 && response.comment.includes('unknown user')) {
          debug('The mailbox is unavailable (probably ESMTP Postfix)')
          return false
        }

        if (response.code !== 250) {
          debug(`Unexpected response: ${response.code} - ${response.comment}`)
          throw new Error(`Unexpected code from server: ${response.code}`)
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

      debug(`Server accepts email for "${email}"`)

      return true
    } catch (err) {
      debug(`Error "${err}", trying next server`)
      lastError = err
    } finally {
      debug('Closing connection')
      connection.end()
    }
  }

  throw lastError
}
