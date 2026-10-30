// GURU POS licensing — verification only.
// Keys are digital signatures made with a PRIVATE key that never leaves the owner's device
// (see owner-tools/keygen.html). This file holds only the PUBLIC key, so it cannot be used to make keys.
const GURU_PUBLIC_KEY = {"kty":"EC","crv":"P-256","x":"bed3URyZWDGUwyUxH2LexhRNacItyLGVZMPFazvRwOg","y":"aNNNPJq2YwuUU-AnymgQ-8HcNy4MTlAnWBZUJY19Qzs"};
const GURU_PLAN = 'STANDARD';

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function licenseMessage(deviceId, plan) {
  return `GURU|${String(plan).trim().toUpperCase()}|${String(deviceId).trim().toUpperCase()}`;
}

async function isValidKey(deviceId, plan, enteredKey) {
  try {
    if (!(window.crypto && crypto.subtle)) return false;
    const key = String(enteredKey || '').replace(/\s+/g, '');
    if (!key.startsWith('GURU1-')) return false;
    const sig = b64urlToBytes(key.slice(6));
    if (sig.length !== 64) return false;
    const pub = await crypto.subtle.importKey('jwk', GURU_PUBLIC_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, sig, new TextEncoder().encode(licenseMessage(deviceId, plan)));
  } catch (e) { return false; }
}

// Re-checked on every app start, so setting a flag in the browser console is not enough.
async function verifyStoredLicense() {
  const k = localStorage.getItem('GURU_LICENSE_KEY');
  return k ? isValidKey(getDeviceId(), GURU_PLAN, k) : false;
}

function getDeviceId() {
  let id = localStorage.getItem('GURU_DEVICE_ID');
  if (!id) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const r = new Uint8Array(8);
    crypto.getRandomValues(r);
    const c = Array.from(r, v => chars[v % chars.length]).join('');
    id = `${c.slice(0, 4)}-${c.slice(4)}`;
    localStorage.setItem('GURU_DEVICE_ID', id);
  }
  return id;
}
