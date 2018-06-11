import dns = require('dns')
import net = require('net')
import os = require('os')
import util = require('util')

import pCatchIf = require('p-catch-if')
import pLimit = require('p-limit')
import pSleep = require('p-sleep')

import Client from './client'
import Manager from './manager'

const debug = require('debug')('server-accepts-email:index') as (s: string) => void

const globalManager = new Manager()

const resolveMx = util.promisify(dns.resolveMx)
const resolveMxLimit = pLimit(256)

async function getMailServers (hostname: string): Promise<string[]> {
  return resolveMxLimit(async () => {
    debug(`Resolving MX records for "${hostname}"`)
    const mxRecords = await resolveMx(hostname).catch(pCatchIf(err => (err.code === 'ENOTFOUND' || err.code === 'ENODATA'), () => []))
    debug(`Got ${mxRecords.length} record${mxRecords.length === 1 ? '' : 's'} for "${hostname}"`)

    /* https://en.wikipedia.org/wiki/MX_record#Priority
    * The MX priority determines the order in which the servers
    * are supposed to be contacted: The servers with the highest
    * priority (and the lowest preference number) shall be tried
    * first. Node, however, erroneously labels the preference number
    * "priority". Therefore, sort the addresses by priority in
    * ascending order, and then contact the first exchange. */
    return mxRecords.sort((lhs, rhs) => lhs.priority - rhs.priority).map(a => a.exchange)
  })
}

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
  const hostname = email.split('@')[1]
  const servers = await getMailServers(hostname)

  if (servers.length === 0) {
    return false
  }

  const senderDomain = (options.senderDomain || os.hostname())
  const senderAddress = (options.senderAddress || `test@${senderDomain}`)

  let lastError: Error | null = null
  for (const server of servers) {
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
