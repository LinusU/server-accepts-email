import dns = require('dns')
import net = require('net')
import os = require('os')
import util = require('util')

import pCatchIf = require('p-catch-if')
import pSleep = require('p-sleep')

import Client from './client'
import Manager from './manager'

const debug = require('debug')('server-accepts-email') as (s: string) => void
const resolveMx = util.promisify(dns.resolveMx)

const globalManager = new Manager()

interface TestServerOptions {
  senderAddress: string
  handleGraylisting: boolean
}

async function testServer (client: Client, email: string, { senderAddress, handleGraylisting }: TestServerOptions) {
  const result = await client.test(email, { senderAddress })

  if (result.kind === 'greylist') {
    if (!handleGraylisting) {
      throw new Error('Server applied greylisting')
    }

    debug(`Waiting ${result.timeout} seconds for greylisting to pass`)
    return pSleep(result.timeout * 1000).then(() => {
      return testServer(client, email, { senderAddress, handleGraylisting: false })
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
  const sortedServers = mxRecords.sort((lhs, rhs) => lhs.priority - rhs.priority).map(a => a.exchange)

  let lastError: Error | null = null
  for (const server of sortedServers) {
    try {
      return await globalManager.withClient(server, senderDomain, (client) => {
        return testServer(client, email, { senderAddress, handleGraylisting: true })
      })
    } catch (err) {
      debug(`Error "${err}", trying next server`)
      lastError = err
    }
  }

  throw lastError
}
