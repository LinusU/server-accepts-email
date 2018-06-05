import ResourcePool = require('ts-resource-pool')

import Factory from './factory'
import Socket from './socket'

const debug = require('debug')('server-accepts-email') as (s: string) => void

export interface TestOptions {
  senderAddress: string
}

export type TestResult = (
  { kind: 'answer', answer: boolean } |
  { kind: 'greylist', timeout: number } |
  { kind: 'error', error: Error }
)

export default class Client {
  readonly serverPools: Map<string, ResourcePool<Socket>>
  readonly senderDomain: string

  constructor (senderDomain) {
    this.serverPools = new Map()
    this.senderDomain = senderDomain
  }

  test (server: string, email: string, { senderAddress }: TestOptions): Promise<TestResult> {
    if (!this.serverPools.has(server)) {
      this.serverPools.set(server, new ResourcePool(new Factory(server, this.senderDomain)))
    }

    const pool = this.serverPools.get(server)

    return pool.use(async (connection) => {
      let result: TestResult

      await connection.execute(`MAIL FROM: <${senderAddress}>`).then((response) => {
        if (response.code !== 250) throw new Error(`Server did not accept sender address: ${senderAddress}`)
      })

      const response = await connection.execute(`RCPT TO: <${email}>`)

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

      return result
    })
  }
}
