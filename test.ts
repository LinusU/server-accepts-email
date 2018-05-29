const assert = require('assert')
const serverAcceptsEmail = require('./')

async function test () {
  assert.strictEqual(await serverAcceptsEmail('postmaster@gmail.com'), true)
  assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@gmail.com'), false)
  assert.strictEqual(await serverAcceptsEmail('a        b@gmail.com'), false)

  assert.strictEqual(await serverAcceptsEmail('postmaster@protonmail.ch'), true)
  assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@protonmail.ch'), false)
  assert.strictEqual(await serverAcceptsEmail('a        b@protonmail.ch'), false)

  assert.strictEqual(await serverAcceptsEmail('postmaster@icloud.com'), true)
  assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@icloud.com'), false)
  assert.strictEqual(await serverAcceptsEmail('a        b@icloud.com'), false)

  assert.strictEqual(await serverAcceptsEmail('support@mail.ru'), true)
  assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@mail.ru'), false)
  assert.strictEqual(await serverAcceptsEmail('a        b@mail.ru'), false)

  assert.strictEqual(await serverAcceptsEmail('postmaster@yandex.com'), true)
  assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@yandex.com'), false)
  assert.strictEqual(await serverAcceptsEmail('a        b@yandex.com'), false)

  assert.strictEqual(await serverAcceptsEmail('postmaster@rediffmail.com'), true)
  assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@rediffmail.com'), false)
  assert.strictEqual(await serverAcceptsEmail('a        b@rediffmail.com'), false)

  assert.strictEqual(await serverAcceptsEmail('postmaster@runbox.com'), true)
  assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@runbox.com'), false)
  assert.strictEqual(await serverAcceptsEmail('a        b@runbox.com'), false)

  assert.strictEqual(await serverAcceptsEmail('postmaster@zoho.eu'), true)
  assert.strictEqual(await serverAcceptsEmail('6bJ4zsZHOE@zoho.eu'), false)
  assert.strictEqual(await serverAcceptsEmail('a        b@zoho.eu'), false)

  assert.strictEqual(await serverAcceptsEmail('linus@gp5uzpn2q7.com'), false)
}

test().catch((err) => {
  process.exitCode = 1
  console.error(err.stack)
})
