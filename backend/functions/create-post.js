export default async (req) => {
  if (req.method !== 'POST') {
    return {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // 1. Verify Authentication
    const user = req.user;
    if (!user) {
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Authentication required' }),
      };
    }

    // 2. Verify Admin Status
    const { data: adminData, error: adminError } = await db.query(
      'SELECT is_admin FROM profiles WHERE id = $1',
      [user.id]
    );

    if (adminError || !adminData || !adminData[0]?.is_admin) {
      return {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Forbidden: Admin access required' }),
      };
    }

    const { category_id, title, slug, content, excerpt, featured_image } = req.body;

    if (!title || !slug || !content) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const { data, error } = await db.query(`
      INSERT INTO posts (author_id, category_id, title, slug, content, excerpt, featured_image, is_published)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [user.id, category_id, title, slug, content, excerpt, featured_image]);

    if (error) throw error;

    return {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data[0]),
    };
  } catch (e) {
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
