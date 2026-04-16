export default async (req) => {
  if (req.method !== 'POST') {
    return {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { post_id, user_id, content } = req.body;

    if (!post_id || !user_id || !content) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const { data, error } = await db.query(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [post_id, user_id, content]);

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
