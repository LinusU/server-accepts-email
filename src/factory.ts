import ResourcePool = require('ts-resource-pool')

import Socket from './socket'

const debug = require('debug')('server-accepts-email:factory') as (s: string) => void

export default class Factory implements ResourcePool.Factory<Socket> {
  readonly server: string
  readonly senderDomain: string

  constructor (server: string, senderDomain: string) {
    this.server = server
    this.senderDomain = senderDomain
  }

  async create () {
    debug(`Creating connection to "${this.server}"`)

    const connection = await Socket.connect(this.server)
    const response = await connection.execute(`HELO ${this.senderDomain}`)

    if (response.code !== 250) {
      throw new Error(`Server did not accept sender domain: ${this.senderDomain}`)
    }

    debug(`Connection to "${this.server}" established`)

    return connection
  }

  async destroy (connection, error) {
    debug(`Terminating connection to "${this.server}"`)

    try {
      const response = await connection.execute('QUIT')

      if (response.code === 421) {
        debug('Server sent 421 in response to QUIT, ignoring (probably ProtonMail)')
      } else if (response.code !== 221) {
        debug(`Unexpected response: ${response.code} - ${response.comment}`)
        throw new Error(`Unexpected response code to QUIT command: ${response.code}`)
      }
    } finally {
      await connection.end()
    }

    debug(`Connection to "${this.server}" terminated`)
  }

  async recycle (connection, error) {
    if (error) {
      try { await this.destroy(connection, error) } catch {}
      return this.create()
    }

    debug(`Preparing connection to "${this.server}" for reuse`)

    const response = await connection.execute('RSET')

    if (response.code !== 250) {
      throw new Error(`Server did not accept RSET command`)
    }

    debug(`Ready to use connection to "${this.server}" again`)

    return connection
  }
}
