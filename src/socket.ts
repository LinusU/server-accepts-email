import net = require('net')
import asyncLines = require('async-lines')

const debug = require('debug')('server-accepts-email') as (s: string) => void

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

export default class Socket {
  private socket: net.Socket
  private lines: AsyncIterableIterator<string>

  static async connect (server: string) {
    const self = new Socket(server)

    try {
      debug(`Waiting for greeting`)
      const response = await readResponse(self.lines)

      if (response.code !== 220) {
        debug(`Unexpected response: ${response.code} - ${response.comment}`)
        throw new Error(`Unexpected code from server: ${response.code}`)
      }
    } catch (err) {
      self.end()
      throw err
    }

    return self
  }

  private constructor (server: string) {
    debug(`Connecting to "${server}"`)
    this.socket = net.connect(25, server)
    this.lines = asyncLines(this.socket)
  }

  async execute (message: string) {
    debug(`Sending "${message}" message`)
    this.socket.write(`${message}\r\n`)

    debug(`Waiting for server response`)
    return readResponse(this.lines)
  }

  end () {
    debug('Closing connection')
    this.socket.end()
  }
}
