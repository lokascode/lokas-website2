const crypto = require('crypto');
const { getPool } = require('./_db');

const STUDY_LEVELS = ['any', 'diploma', 'bachelor', 'master', 'phd', 'postdoc'];
const PROGRAM_LEVELS = ['diploma', 'bachelor', 'master', 'phd', 'certificate'];
const PUBLISH_STATES = ['draft', 'published', 'archived'];

const text = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra });
const area = (name, label, extra = {}) => ({ name, label, type: 'textarea', ...extra });
const select = (name, label, options, extra = {}) => ({ name, label, type: 'select', options, ...extra });
const number = (name, label, extra = {}) => ({ name, label, type: 'number', ...extra });
const bool = (name, label) => ({ name, label, type: 'bool' });

const RESOURCES = {
  applications: {
    table: 'edu_applications',
    idType: 'uuid',
    label: 'Applications',
    canCreate: false,
    order: 'created_at DESC',
    listColumns: ['full_name', 'email', 'interest_type', 'status', 'created_at'],
    fields: [
      text('full_name', 'Full name', { readOnly: true }),
      text('email', 'Email', { readOnly: true }),
      text('phone', 'Phone', { readOnly: true }),
      text('nationality', 'Nationality', { readOnly: true }),
      text('country_of_residence', 'Country of residence', { readOnly: true }),
      select(
        'interest_type',
        'Interest',
        ['scholarship', 'university', 'study_abroad', 'training', 'consulting', 'event', 'other'],
        { readOnly: true }
      ),
      area('message', 'Message', { readOnly: true }),
      text('preferred_language', 'Language', { readOnly: true }),
      text('source', 'Source', { readOnly: true }),
      select('status', 'Status', ['new', 'contacted', 'in_review', 'submitted', 'accepted', 'rejected', 'withdrawn'], {
        required: true,
      }),
      text('assigned_to', 'Assigned to'),
      area('internal_notes', 'Internal notes'),
    ],
  },
  scholarships: {
    table: 'edu_scholarships',
    idType: 'int',
    label: 'Scholarships',
    canCreate: true,
    order: 'created_at DESC',
    listColumns: ['title_en', 'country', 'study_level', 'deadline', 'status'],
    fields: [
      text('slug', 'Slug', { required: true }),
      text('title_en', 'Title (EN)', { required: true }),
      text('title_ar', 'Title (AR)', { rtl: true }),
      text('provider', 'Provider'),
      text('country', 'Country'),
      select('study_level', 'Study level', STUDY_LEVELS, { required: true, default: 'any' }),
      text('field_of_study', 'Field of study'),
      select('funding_type', 'Funding', ['full', 'partial', 'tuition_only', 'stipend', 'travel_grant'], {
        required: true,
        default: 'partial',
      }),
      text('amount_text', 'Amount'),
      area('description_en', 'Description (EN)'),
      area('description_ar', 'Description (AR)', { rtl: true }),
      area('eligibility_en', 'Eligibility (EN)'),
      area('eligibility_ar', 'Eligibility (AR)', { rtl: true }),
      text('application_url', 'Application URL'),
      { name: 'deadline', label: 'Deadline', type: 'date' },
      select('status', 'Status', ['draft', 'upcoming', 'open', 'closed', 'archived'], {
        required: true,
        default: 'draft',
      }),
      bool('is_featured', 'Featured'),
    ],
  },
  universities: {
    table: 'edu_universities',
    idType: 'int',
    label: 'Universities',
    canCreate: true,
    order: 'name_en',
    listColumns: ['name_en', 'country', 'city', 'is_partner', 'status'],
    fields: [
      text('slug', 'Slug', { required: true }),
      text('name_en', 'Name (EN)', { required: true }),
      text('name_ar', 'Name (AR)', { rtl: true }),
      text('country', 'Country', { required: true }),
      text('city', 'City'),
      text('website_url', 'Website'),
      text('logo_url', 'Logo URL'),
      area('description_en', 'Description (EN)'),
      area('description_ar', 'Description (AR)', { rtl: true }),
      text('ranking_note', 'Ranking note'),
      bool('is_partner', 'Partner'),
      select('status', 'Status', PUBLISH_STATES, { required: true, default: 'draft' }),
    ],
  },
  programs: {
    table: 'edu_programs',
    idType: 'int',
    label: 'Degree programs',
    canCreate: true,
    order: 'name_en',
    listColumns: ['name_en', 'university_id', 'study_level', 'field_of_study', 'status'],
    fields: [
      number('university_id', 'University ID', { required: true }),
      text('slug', 'Slug', { required: true }),
      text('name_en', 'Name (EN)', { required: true }),
      text('name_ar', 'Name (AR)', { rtl: true }),
      select('study_level', 'Level', PROGRAM_LEVELS, { required: true, default: 'bachelor' }),
      text('field_of_study', 'Field of study'),
      text('language_of_instruction', 'Language of instruction'),
      number('duration_months', 'Duration (months)', { min: 1 }),
      text('tuition_text', 'Tuition'),
      { name: 'intake_months', label: 'Intake months (comma separated)', type: 'array' },
      { name: 'application_deadline', label: 'Application deadline', type: 'date' },
      area('description_en', 'Description (EN)'),
      area('description_ar', 'Description (AR)', { rtl: true }),
      select('status', 'Status', PUBLISH_STATES, { required: true, default: 'draft' }),
    ],
  },
  training: {
    table: 'edu_training_programs',
    idType: 'int',
    label: 'Training programs',
    canCreate: true,
    order: 'position',
    listColumns: ['title_en', 'delivery_mode', 'duration_hours', 'position', 'status'],
    fields: [
      text('slug', 'Slug', { required: true }),
      number('position', 'Position', { required: true, default: 0 }),
      text('title_en', 'Title (EN)', { required: true }),
      text('title_ar', 'Title (AR)', { required: true, rtl: true }),
      area('description_en', 'Description (EN)'),
      area('description_ar', 'Description (AR)', { rtl: true }),
      select('delivery_mode', 'Delivery', ['in_person', 'online', 'hybrid'], { required: true, default: 'hybrid' }),
      number('duration_hours', 'Duration (hours)', { min: 1 }),
      select('status', 'Status', PUBLISH_STATES, { required: true, default: 'published' }),
    ],
  },
  events: {
    table: 'edu_events',
    idType: 'int',
    label: 'Events',
    canCreate: true,
    order: 'starts_at DESC NULLS LAST',
    listColumns: ['title_en', 'event_type', 'starts_at', 'location', 'status'],
    fields: [
      text('slug', 'Slug', { required: true }),
      text('title_en', 'Title (EN)', { required: true }),
      text('title_ar', 'Title (AR)', { rtl: true }),
      area('description_en', 'Description (EN)'),
      area('description_ar', 'Description (AR)', { rtl: true }),
      select('event_type', 'Type', ['workshop', 'seminar', 'webinar', 'fair', 'info_session', 'other'], {
        required: true,
        default: 'workshop',
      }),
      { name: 'starts_at', label: 'Starts', type: 'datetime' },
      { name: 'ends_at', label: 'Ends', type: 'datetime' },
      text('location', 'Location'),
      bool('is_online', 'Online'),
      text('registration_url', 'Registration URL'),
      number('capacity', 'Capacity', { min: 1 }),
      select('status', 'Status', ['draft', 'published', 'cancelled', 'completed'], {
        required: true,
        default: 'draft',
      }),
    ],
  },
  services: {
    table: 'edu_services',
    idType: 'int',
    label: 'Services',
    canCreate: true,
    order: 'position',
    listColumns: ['title_en', 'slug', 'position', 'is_active'],
    fields: [
      text('slug', 'Slug', { required: true }),
      number('position', 'Position', { required: true, default: 0 }),
      text('icon', 'Icon'),
      text('title_en', 'Title (EN)', { required: true }),
      text('title_ar', 'Title (AR)', { required: true, rtl: true }),
      area('description_en', 'Description (EN)'),
      area('description_ar', 'Description (AR)', { rtl: true }),
      bool('is_active', 'Active'),
    ],
  },
  stats: {
    table: 'edu_stats',
    idType: 'int',
    label: 'Stats',
    canCreate: true,
    order: 'position',
    listColumns: ['stat_key', 'label_en', 'value', 'is_placeholder'],
    fields: [
      text('stat_key', 'Key', { required: true }),
      number('position', 'Position', { required: true, default: 0 }),
      text('label_en', 'Label (EN)', { required: true }),
      text('label_ar', 'Label (AR)', { required: true, rtl: true }),
      number('value', 'Value', { required: true, default: 0, min: 0 }),
      bool('is_placeholder', 'Placeholder value'),
    ],
  },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ValidationError extends Error {}

function isAuthorized(req) {
  const expected = String(process.env.ADMIN_PASSWORD || '').trim();
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!expected || !provided) return false;
  const a = crypto.createHash('sha256').update(provided, 'utf8').digest();
  const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

function coerce(field, raw) {
  const empty = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');

  if (field.type === 'bool') return raw === true || raw === 'true';

  if (empty) {
    if (field.required) throw new ValidationError(`${field.label} is required`);
    return null;
  }

  switch (field.type) {
    case 'number': {
      const value = Number(raw);
      if (!Number.isInteger(value)) throw new ValidationError(`${field.label} must be a whole number`);
      if (field.min !== undefined && value < field.min) {
        throw new ValidationError(`${field.label} must be at least ${field.min}`);
      }
      return value;
    }
    case 'select': {
      if (!field.options.includes(raw)) throw new ValidationError(`${field.label} has an invalid value`);
      return raw;
    }
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw))) throw new ValidationError(`${field.label} must be a date`);
      return String(raw);
    }
    case 'datetime': {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) throw new ValidationError(`${field.label} must be a date and time`);
      return date.toISOString();
    }
    case 'array': {
      const items = (Array.isArray(raw) ? raw : String(raw).split(','))
        .map((item) => String(item).trim())
        .filter(Boolean);
      return items.length ? items : null;
    }
    default:
      return String(raw).trim().slice(0, 8000);
  }
}

function buildValues(resource, body, { partial }) {
  const values = {};
  for (const field of resource.fields) {
    if (field.readOnly) continue;
    if (partial && !(field.name in body)) continue;
    const source = !partial && !(field.name in body) && field.default !== undefined ? field.default : body[field.name];
    values[field.name] = coerce(field, source);
  }
  return values;
}

function describeDbError(error) {
  if (error.code === '23505') return 'That slug or key is already in use';
  if (error.code === '23514') return 'One of the values is not allowed (check dates and numbers)';
  if (error.code === '22P02') return 'One of the values has the wrong format';
  return null;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body);
  return {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin access is not configured (ADMIN_PASSWORD is missing)' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const url = new URL(req.url, 'http://localhost');
  const name = url.searchParams.get('resource');
  const id = url.searchParams.get('id');
  const db = getPool();

  try {
    if (req.method === 'GET' && !name) {
      const entries = await Promise.all(
        Object.entries(RESOURCES).map(async ([key, resource]) => {
          const { rows } = await db.query(`SELECT count(*)::int AS total FROM ${resource.table}`);
          return { key, label: resource.label, total: rows[0].total };
        })
      );
      const { rows: pending } = await db.query(`SELECT count(*)::int AS total FROM edu_applications WHERE status = 'new'`);
      return res.status(200).json({ resources: entries, newApplications: pending[0].total });
    }

    const resource = RESOURCES[name];
    if (!resource) return res.status(404).json({ error: 'Unknown resource' });

    if (req.method === 'GET') {
      const { rows } = await db.query(`SELECT * FROM ${resource.table} ORDER BY ${resource.order} LIMIT 500`);
      return res.status(200).json({
        label: resource.label,
        canCreate: resource.canCreate,
        listColumns: resource.listColumns,
        fields: resource.fields,
        rows,
      });
    }

    const body = ['POST', 'PATCH'].includes(req.method) ? await readBody(req) : {};

    if (req.method === 'POST') {
      if (!resource.canCreate) return res.status(405).json({ error: 'Creating is not allowed here' });
      const values = buildValues(resource, body, { partial: false });
      const columns = Object.keys(values);
      const placeholders = columns.map((_, index) => `$${index + 1}`);
      const { rows } = await db.query(
        `INSERT INTO ${resource.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        columns.map((column) => values[column])
      );
      return res.status(201).json({ row: rows[0] });
    }

    const validId = resource.idType === 'uuid' ? UUID_PATTERN.test(id || '') : /^\d+$/.test(id || '');
    if (!validId) return res.status(400).json({ error: 'Invalid id' });

    if (req.method === 'PATCH') {
      const values = buildValues(resource, body, { partial: true });
      const columns = Object.keys(values);
      if (!columns.length) return res.status(400).json({ error: 'Nothing to update' });
      const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
      const { rows } = await db.query(
        `UPDATE ${resource.table} SET ${assignments.join(', ')} WHERE id = $${columns.length + 1} RETURNING *`,
        [...columns.map((column) => values[column]), id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ row: rows[0] });
    }

    if (req.method === 'DELETE') {
      const { rowCount } = await db.query(`DELETE FROM ${resource.table} WHERE id = $1`, [id]);
      if (!rowCount) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof SyntaxError) {
      return res.status(400).json({ error: error.message });
    }
    const friendly = describeDbError(error);
    if (friendly) return res.status(400).json({ error: friendly });
    console.error('Admin request failed', error.message);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};
