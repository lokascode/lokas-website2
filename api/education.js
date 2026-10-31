const { getPool } = require('./_db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = getPool();

  try {
    const [services, stats, scholarships, universities, training, events] = await Promise.all([
      db.query(
        `SELECT slug, position, icon, title_en, title_ar, description_en, description_ar
           FROM edu_services WHERE is_active ORDER BY position`
      ),
      db.query(
        `SELECT stat_key, label_en, label_ar, value, is_placeholder
           FROM edu_stats ORDER BY position`
      ),
      db.query(
        `SELECT slug, title_en, title_ar, provider, country, study_level, field_of_study,
                funding_type, amount_text, description_en, description_ar, application_url,
                image_url,
                deadline, status, is_featured
           FROM edu_scholarships
          WHERE status IN ('open', 'upcoming')
          ORDER BY is_featured DESC, deadline NULLS LAST`
      ),
      db.query(
        `SELECT slug, name_en, name_ar, country, city, website_url, logo_url,
                description_en, description_ar, is_partner
           FROM edu_universities WHERE status = 'published' ORDER BY name_en`
      ),
      db.query(
        `SELECT slug, position, title_en, title_ar, description_en, description_ar,
                delivery_mode, duration_hours
           FROM edu_training_programs WHERE status = 'published' ORDER BY position`
      ),
      db.query(
        `SELECT slug, title_en, title_ar, description_en, description_ar, event_type,
                starts_at, ends_at, location, is_online, registration_url
           FROM edu_events
          WHERE status = 'published' AND (starts_at IS NULL OR starts_at >= now())
          ORDER BY starts_at NULLS LAST`
      ),
    ]);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      services: services.rows,
      stats: stats.rows,
      scholarships: scholarships.rows,
      universities: universities.rows,
      training: training.rows,
      events: events.rows,
    });
  } catch (error) {
    console.error('Failed to load education data', error.message);
    return res.status(500).json({ error: 'Could not load education data' });
  }
};
