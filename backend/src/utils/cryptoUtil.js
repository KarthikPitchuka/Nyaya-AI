import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey() {
  const k = process.env.TOTP_ENC_KEY || process.env.ENCRYPTION_KEY;
  if (!k) {
    throw new Error('TOTP_ENC_KEY must be configured to protect authenticator secrets.');
  }
  // Expect base64 or hex; normalize to Buffer of length 32
  let buf = null;
  try { buf = Buffer.from(k, 'base64'); if (buf.length === 32) return buf; } catch (e) {}
  try { buf = Buffer.from(k, 'hex'); if (buf.length === 32) return buf; } catch (e) {}
  // If raw length 32
  buf = Buffer.from(k);
  if (buf.length === 32) return buf;
  throw new Error('TOTP_ENC_KEY must decode to exactly 32 bytes.');
}

export function encryptText(plain) {
  const key = getKey();

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: 16 });
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptText(payload) {
  const key = getKey();

  try {
    const data = Buffer.from(payload, 'base64');
    const iv = data.slice(0, IV_LENGTH);
    const tag = data.slice(IV_LENGTH, IV_LENGTH + 16);
    const enc = data.slice(IV_LENGTH + 16);
    const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: 16 });
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  } catch (e) {
    return null;
  }
}
