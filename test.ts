import assert = require('assert')
import serverAcceptsEmail = require('./')

describe('server-accepts-email', function () {
  this.timeout('30s')

  const senderDomain = process.env['TEST_SENDER_DOMAIN']

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

  it('icloud.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@icloud.com', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@icloud.com', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@icloud.com', { senderDomain }), false)
  })

  it('mail.ru', async () => {
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

  it('travisci.net', async () => {
    assert.strictEqual(await serverAcceptsEmail('postmaster@oknotify2.com', { senderDomain }), true)
    assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@oknotify2.com', { senderDomain }), false)
    assert.strictEqual(await serverAcceptsEmail('a        b@oknotify2.com', { senderDomain }), false)
  })

  it('gp5uzpn2q7.com', async () => {
    assert.strictEqual(await serverAcceptsEmail('linus@gp5uzpn2q7.com', { senderDomain }), false)
  })
})
