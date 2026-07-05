// Early-access signup endpoint. Stores each lead as a JSON blob in Vercel Blob
// storage (leads/<timestamp>.json). Requires a Blob store connected to the
// project (Vercel dashboard -> Storage -> Blob), which provides
// BLOB_READ_WRITE_TOKEN automatically. Until then this returns 503 and the
// frontend falls back to mailto, so no lead is ever lost.
import { put } from '@vercel/blob';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'lead store not configured yet' });
  }
  const email = String(req.body?.email ?? '').trim().slice(0, 254);
  const page = String(req.body?.page ?? '').slice(0, 100);
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid email' });
  }
  try {
    await put(
      `leads/${Date.now()}.json`,
      JSON.stringify({ email, page, ts: new Date().toISOString() }),
      { access: 'public', contentType: 'application/json', addRandomSuffix: true }
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('blob put failed:', e?.message);
    return res.status(502).json({ error: 'could not store lead' });
  }
}
