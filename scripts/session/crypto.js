const crypto = require('crypto')

// Derive a 32-byte key from passphrase using scrypt
function kdf(pass, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(pass, salt, 32, { N: 1 << 15, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
}

async function encryptPrivKey(privHex, passphrase) {
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const key = await kdf(passphrase, salt)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(privHex.replace(/^0x/, ''), 'hex')), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    algo: 'aes-256-gcm',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

async function decryptPrivKey(enc, passphrase) {
  const salt = Buffer.from(enc.salt, 'base64')
  const iv = Buffer.from(enc.iv, 'base64')
  const tag = Buffer.from(enc.tag, 'base64')
  const key = await kdf(passphrase, salt)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(Buffer.from(enc.ciphertext, 'base64')), decipher.final()])
  return '0x' + plaintext.toString('hex')
}

module.exports = { encryptPrivKey, decryptPrivKey }
