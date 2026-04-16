export default async (req) => {
  if (req.method !== 'DELETE') {
    return {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const user = req.user;
    if (!user) {
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Authentication required' }),
      };
    }

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

    const { id } = req.body;
    if (!id) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Post ID is required' }),
      };
    }

    const { data, error } = await db.query(`
      DELETE FROM posts WHERE id = $1 RETURNING id
    `, [id]);

    if (error) throw error;

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Post deleted successfully', id: data[0]?.id }),
    };
  } catch (e) {
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
