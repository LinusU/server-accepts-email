import pTry = require('p-try')

import Client from './client'

export default class Manager {
  private readonly storage: Map<string, { ref: number, client: Client }>

  constructor () {
    this.storage = new Map()
  }

  private aquire (server: string, senderDomain: string) {
    const key = `${server} (from ${senderDomain})`
    const item = this.storage.get(key)

    if (item != null) {
      item.ref += 1
      return item.client
    }

    const client = new Client(server, senderDomain)
    this.storage.set(key, { ref: 1, client })
    return client
  }

  private release (server: string, senderDomain: string) {
    const key = `${server} (from ${senderDomain})`
    const item = this.storage.get(key)

    item.ref -= 1

    if (item.ref === 0) {
      this.storage.delete(key)
    }
  }

  async withClient<T> (server: string, senderDomain: string, fn: (Client) => T | PromiseLike<T>) {
    const client = this.aquire(server, senderDomain)

    return pTry(() => fn(client)).then(
      (val) => { this.release(server, senderDomain); return val },
      (err) => { this.release(server, senderDomain); throw err }
    )
  }
}
