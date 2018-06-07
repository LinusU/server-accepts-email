/* eslint-env mocha */

const assert = require('assert')
const isTravis = require('is-travis')
const serverAcceptsEmail = require('./')

describe('server-accepts-email', function () {
  this.timeout('30s')

  const senderDomain = process.env['TEST_SENDER_DOMAIN']
  const skipOnTravis = (isTravis ? it.skip : it)

  it('gmail.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@gmail.com', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@gmail.com', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@gmail.com', { senderDomain }), false)
  })

  it('protonmail.ch', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@protonmail.ch', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@protonmail.ch', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@protonmail.ch', { senderDomain }), false)
  })

  skipOnTravis('icloud.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@icloud.com', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@icloud.com', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@icloud.com', { senderDomain }), false)
  })

  skipOnTravis('mail.ru', async () => {
    assert.strictEqual(await serverAcceptsEmail('support@mail.ru', { senderDomain }), true)
  })

  it('yandex.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@yandex.com', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@yandex.com', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@yandex.com', { senderDomain }), false)
  })

  it('rediffmail.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@rediffmail.com', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@rediffmail.com', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@rediffmail.com', { senderDomain }), false)
  })

  it('runbox.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@runbox.com', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@runbox.com', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@runbox.com', { senderDomain }), false)
  })

  it('zoho.eu', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@zoho.eu', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@zoho.eu', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@zoho.eu', { senderDomain }), false)
  })

  skipOnTravis('oknotify2.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@oknotify2.com', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@oknotify2.com', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@oknotify2.com', { senderDomain }), false)
  })

  skipOnTravis('tacobell.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@tacobell.com', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@tacobell.com', { senderDomain }), false)
  })

  it('myspace.com', async function () {
    this.timeout('90s')

    assert.strictEqual(await serverAcceptsEmail('postmaster@myspace.com', { senderDomain }), true)
  })

  it('gp5uzpn2q7.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('linus@gp5uzpn2q7.com', { senderDomain }), false)
  })

  it('pools connections', async () => {
    const net = require('net')
    const connect = net.connect

    let totalConnections = 0
    net.connect = (a, b, c) => { totalConnections++; return connect(a, b, c) }

    try {
      await Promise.all([
        // Common names
        serverAcceptsEmail('emma.smith@gmail.com').then((result) => assert.strictEqual(result, true)),
        serverAcceptsEmail('liam.smith@gmail.com').then((result) => assert.strictEqual(result, true)),
        serverAcceptsEmail('olivia.johnson@gmail.com').then((result) => assert.strictEqual(result, true)),
        serverAcceptsEmail('noah.smith@gmail.com').then((result) => assert.strictEqual(result, true)),
        serverAcceptsEmail('ava.smith@gmail.com').then((result) => assert.strictEqual(result, true)),
        serverAcceptsEmail('william.johnson@gmail.com').then((result) => assert.strictEqual(result, true)),
        serverAcceptsEmail('isabella.johnson@gmail.com').then((result) => assert.strictEqual(result, true)),
        serverAcceptsEmail('james.johnson@gmail.com').then((result) => assert.strictEqual(result, true)),
        serverAcceptsEmail('sophia.johnson@gmail.com').then((result) => assert.strictEqual(result, true)),
        serverAcceptsEmail('logan.johnson@gmail.com').then((result) => assert.strictEqual(result, true)),

        // Random strings
        serverAcceptsEmail('nv8zoh3b0j@gmail.com').then((result) => assert.strictEqual(result, false)),
        serverAcceptsEmail('y9mrigtum2@gmail.com').then((result) => assert.strictEqual(result, false)),
        serverAcceptsEmail('rrfh9i3zxv@gmail.com').then((result) => assert.strictEqual(result, false)),
        serverAcceptsEmail('l9u7edf7nt@gmail.com').then((result) => assert.strictEqual(result, false)),
        serverAcceptsEmail('dj44oxs356@gmail.com').then((result) => assert.strictEqual(result, false)),
        serverAcceptsEmail('b2ob70bh0v@gmail.com').then((result) => assert.strictEqual(result, false)),
        serverAcceptsEmail('849esut58a@gmail.com').then((result) => assert.strictEqual(result, false)),
        serverAcceptsEmail('0nvae3nrtf@gmail.com').then((result) => assert.strictEqual(result, false)),
        serverAcceptsEmail('0c7i2f4nbf@gmail.com').then((result) => assert.strictEqual(result, false)),
        serverAcceptsEmail('w5p6cvooc3@gmail.com').then((result) => assert.strictEqual(result, false))
      ])
    } finally {
      net.connect = connect
    }

    assert.strictEqual(totalConnections, 5)
  })
})
