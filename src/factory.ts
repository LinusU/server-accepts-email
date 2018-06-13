import createDebug = require('debug')
import ResourcePool = require('ts-resource-pool')
import Semaphore = require('ts-semaphore')

import Socket from './socket'

const globalLimit = new Semaphore(256)

export default class Factory implements ResourcePool.Factory<Socket> {
  private readonly debug: debug.IDebugger
  private readonly server: string
  private readonly senderDomain: string

  constructor (server: string, senderDomain: string) {
    this.debug = createDebug(`server-accepts-email:factory:${server}`)
    this.server = server
    this.senderDomain = senderDomain
  }

  async create () {
    this.debug(`Creating connection`)

    await globalLimit.aquire()

    try {
      const connection = await Socket.connect(this.server)

      try {
        const response = await connection.execute(`HELO ${this.senderDomain}`)
        if (response.code !== 250) throw new Error(`Server did not accept sender domain: ${this.senderDomain}`)

        this.debug(`Connection established`)

        return connection
      } catch (err) {
        connection.end()
        throw err
      }
    } catch (err) {
      globalLimit.release()
      throw err
    }
  }

  async destroy (connection: Socket, error: Error | null) {
    this.debug(`Terminating connection`)

    try {
      const response = await connection.execute('QUIT')

      if (response.code === 421) {
        this.debug('Server sent 421 in response to QUIT, ignoring (probably ProtonMail)')
      } else if (response.code !== 221) {
        this.debug(`Unexpected response: ${response.code} - ${response.comment}`)
        throw new Error(`Unexpected response code to QUIT command: ${response.code}`)
      }
    } finally {
      globalLimit.release()
      connection.end()
    }

    this.debug(`Connection terminated`)
  }

  async recycle (connection: Socket, error: Error | null) {
    if (error) {
      try { await this.destroy(connection, error) } catch {}
      return this.create()
    }

    this.debug(`Preparing connection for reuse`)

    try {
      const response = await connection.execute('RSET')

      if (response.code !== 250) {
        throw new Error(`Server did not accept RSET command`)
      }

      this.debug(`Ready to use connection again`)

      return connection
    } catch (err) {
      globalLimit.release()
      connection.end()
      throw err
    }
  }
}
