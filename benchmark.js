const dns = require('dns')
const net = require('net')
const assert = require('assert')

const asyncLines = require('async-lines')
const memwatch = require('node-memwatch')

/* All MX records resolve to themselves */
dns.resolveMx = (hostname, cb) => cb(null, [{ exchange: hostname, priority: 10 }])

async function connectionHandler (connection) {
  const lines = asyncLines(connection)

  connection.write('220 Test\r\n')

  for (let it = await lines.next(); it.done === false; it = await lines.next()) {
    const line = it.value

    if (line.startsWith('HELO')) connection.write('250 Hello\r\n')
    if (line.startsWith('QUIT')) connection.end('221 Bye\r\n')
    if (line.startsWith('RSET')) connection.write('250 Done\r\n')
    if (line.startsWith('MAIL FROM')) connection.write('250 Okay\r\n')
    if (line.startsWith('RCPT TO')) connection.write('250 Sure\r\n')
  }
}

function createServer () {
  return new Promise((resolve) => {
    const server = net.createServer(connectionHandler)

    server.listen(0, 'localhost', () => resolve({
      close () { return server.close() },
      get port () { return server.address().port }
    }))
  })
}

async function main () {
  if (!process.argv[2] || !process.argv[3]) {
    process.exitCode = 1
    console.log('Usage: benchmark.js <server-count> <iterations>')
    return
  }

  const serverCount = Number(process.argv[2])
  const iterations = Number(process.argv[3])

  let globalErrorCount = 0
  let globalDoneCount = 0

  let maxMemory = 0
  memwatch.on('stats', (stats) => {
    maxMemory = Math.max(maxMemory, stats.current_base)
  })

  console.time('main()')
  console.log(`Running benchmark with ${serverCount} servers and ${iterations} iterations`)

  console.log(`Starting ${serverCount} servers`)
  const servers = await Promise.all(Array.from({ length: serverCount }, () => createServer()))
  console.log(`${serverCount} servers started`)

  if (global.gc) global.gc()
  console.log(`${(process.memoryUsage().heapUsed / 1024 / 1024) | 0} MB memory used`)

  const connect = net.connect
  net.connect = (_, hostname) => {
    const index = Number(hostname.replace('server-', ''))
    return connect(servers[index].port, 'localhost')
  }

  const serverAcceptsEmail = require('./')

  let wait = []

  console.log(`Enqueueing ${iterations} tasks`)

  for (let i = 0; i < iterations; i++) {
    const index = (Math.random() * serverCount) | 0
    const server = `server-${index}`

    wait.push(serverAcceptsEmail(`hello@${server}`).then((result) => { assert.strictEqual(result, true); globalDoneCount++ }).catch(() => globalErrorCount++))
  }

  console.log(`${iterations} tasks enqueued`)

  if (global.gc) global.gc()
  console.log(`${(process.memoryUsage().heapUsed / 1024 / 1024) | 0} MB memory used`)

  process.stdout.write('\n')
  const printStatus = setInterval(() => {
    process.stdout.write(`\rMax Memory: ${(maxMemory / 1024 / 1024) | 0} MB    Error count: ${globalErrorCount}    Done: ${(globalDoneCount / iterations * 100) | 0} %`)
  }, 30)

  try {
    await Promise.all(wait)
  } finally {
    clearInterval(printStatus)
    process.stdout.write('\n\n')

    servers.map((server) => server.close())
    console.timeEnd('main()')
  }
}

main().catch((err) => {
  process.exitCode = 1
  console.log(err.stack)
})
