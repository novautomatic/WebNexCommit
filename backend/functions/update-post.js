export default async (req) => {
  if (req.method !== 'PUT') {
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

    const { id, title, slug, content, excerpt, featured_image, is_published } = req.body;

    if (!id) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Post ID is required' }),
      };
    }

    const { data, error } = await db.query(`
      UPDATE posts
      SET title = COALESCE($1, title),
          slug = COALESCE($2, slug),
          content = COALESCE($3, content),
          excerpt = COALESCE($4, excerpt),
          featured_image = COALESCE($5, featured_image),
          is_published = COALESCE($6, is_published),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [title, slug, content, excerpt, featured_image, is_published, id]);

    if (error) throw error;
    if (!data || data.length === 0) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    return {
      status: 200,
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
