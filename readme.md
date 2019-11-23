# Server Accepts Email

Check if an SMTP server accepts emails to a given address.

## Installation

```sh
npm install --save server-accepts-email
```

## Usage

```js
const serverAcceptsEmail = require('server-accepts-email')

console.log(await serverAcceptsEmail('linus@folkdatorn.se'))
//=> true

console.log(await serverAcceptsEmail('6bJ4zsZHOE@folkdatorn.se'))
//=> false

console.log(await serverAcceptsEmail('linus@gp5uzpn2q7.se'))
//=> false
```

## API

### `serverAcceptsEmail(email[, options])`

- `email` (`string`, required) - Email address to test
- `options` (`object`, optional)
  - `senderDomain` (`string`, optional) - Domain to identify as (in `HELO` smtp command)
  - `senderAddress` (`string`, optional) - Email address to identify as (in `MAIL FROM` command)
- returns `Promise<boolean>` - Wether or not email is accepted for the given address

## Other libraries

There are some other libraries that do the same thing, but I found them to have some flaws which made me write this one.

&nbsp; | Promise API | Follows [RFC5321](https://tools.ietf.org/html/rfc5321) <sup>1</sup> | Proper Errors <sup>2</sup> | Handles Greylisting <sup>3</sup> | Connection Pooling <sup>4</sup>
----- | :---: | :---: | :---: | :---: | :---:
**`server-accepts-email`** | ✅ | ✅ | ✅ | ✅ | ✅
[`email-exists`](https://github.com/MarkTiedemann/email-exists) | ✅ | ❌ | ❌ | ❌ | ❌
[`email-existence`](https://github.com/scippio/email-existence) | ❌ | ❌ | ❌ | ❌ | ❌
[`email-verify`](https://github.com/bighappyworld/email-verify) | ❌ | ❌ | ✅ | ❌ | ❌

<sup>1</sup> None of the other libraries parsed the replies to support multiline replies but instead relied on every reply coming in a chunk, accepting all data and searching for substrings, or something similar.

<sup>2</sup> Some of the other libraries rejects, or calls the callback, with something other than an `Error` instance.

<sup>3</sup> This library detects [Greylisting](https://en.wikipedia.org/wiki/Greylisting) and sends another request after the timeout has passed.

<sup>4</sup> This library reuses connections, and limits the number of simultaneous connections to any given host. This is more effecient, and the behaviour more closely matches that of proper SMTP clients, decreasing the chance of being blacklisted.
