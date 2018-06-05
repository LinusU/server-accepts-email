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
})
