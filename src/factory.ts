import ResourcePool = require('ts-resource-pool')

import Socket from './socket'

export default class Factory implements ResourcePool.Factory<Socket> {
  readonly server: string
  readonly senderDomain: string

  constructor (server: string, senderDomain: string) {
    this.server = server
    this.senderDomain = senderDomain
  }

  async create () {
    const connection = await Socket.connect(this.server)
    const response = await connection.execute(`HELO ${this.senderDomain}`)

    if (response.code !== 250) {
      throw new Error(`Server did not accept sender domain: ${this.senderDomain}`)
    }

    return connection
  }

  async destroy (connection, error) {
    try {
      const response = await connection.execute('QUIT')

      if (response.code !== 221) {
        throw new Error('Server did not respond to "QUIT" command')
      }
    } finally {
      await connection.end()
    }
  }

  async recycle (connection, error) {
    if (error) {
      try { await this.destroy(connection, error) } catch {}
      return this.create()
    }

    const response = await connection.execute('RSET')

    if (response.code !== 250) {
      throw new Error(`Server did not accept RSET command`)
    }

    return connection
  }
}
