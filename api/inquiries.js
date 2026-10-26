const { getPool } = require('./_db');

const INTEREST_TYPES = new Set([
  'scholarship',
  'university',
  'study_abroad',
  'training',
  'consulting',
  'event',
  'other',
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const fullName = clean(body.name, 120);
  const email = clean(body.email, 254);
  if (!fullName || !email || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Name and a valid email are required' });
  }

  const interestType = INTEREST_TYPES.has(body.interestType) ? body.interestType : 'other';
  const language = body.language === 'ar' ? 'ar' : 'en';
  const organization = clean(body.organization, 160);
  const service = clean(body.service, 80);
  const message = clean(body.message, 4000);

  const details = [
    service && `Service: ${service}`,
    organization && `Organization: ${organization}`,
    message,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { rows } = await getPool().query(
      `INSERT INTO edu_applications
         (full_name, email, phone, interest_type, message, preferred_language, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [fullName, email, clean(body.phone, 40), interestType, details || null, language, 'website-contact-form']
    );
    return res.status(201).json({ ok: true, id: rows[0].id });
  } catch (error) {
    console.error('Failed to save inquiry', error.message);
    return res.status(500).json({ error: 'Could not save your inquiry' });
  }
};
