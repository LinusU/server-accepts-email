import dns = require('dns')
import net = require('net')
import os = require('os')
import util = require('util')

import pCatchIf = require('p-catch-if')
import pSleep = require('p-sleep')

import Client from './client'

const debug = require('debug')('server-accepts-email') as (s: string) => void
const resolveMx = util.promisify(dns.resolveMx)

interface TestServerOptions {
  senderDomain: string
  senderAddress: string
  handleGraylisting: boolean
}

async function testServer (server: string, email: string, { senderDomain, senderAddress, handleGraylisting }: TestServerOptions) {
  let client = new Client(senderDomain)

  const result = await client.test(server, email, { senderAddress })

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
