const crypto = require('crypto');
const { put } = require('@vercel/blob');

function isAuthorized(req) {
  const expected = String(process.env.ADMIN_PASSWORD || '').trim();
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!expected || !provided) return false;
  const a = crypto.createHash('sha256').update(provided, 'utf8').digest();
  const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, contentType, data } = req.body || {};
  if (!filename || !data) return res.status(400).json({ error: 'A file is required' });

  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
  const buffer = Buffer.from(String(data), 'base64');
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'Files must be between 1 byte and 10 MB' });
  }

  try {
    const blob = await put(`site-media/${Date.now()}-${safeName}`, buffer, {
      access: 'public',
      contentType: contentType || 'application/octet-stream',
      addRandomSuffix: false,
    });
    return res.status(200).json({ url: blob.url, pathname: blob.pathname, filename: safeName });
  } catch (error) {
    console.error('[v0] Media upload failed:', error.message);
    return res.status(500).json({ error: 'Upload failed. Check Blob integration configuration.' });
  }
};
