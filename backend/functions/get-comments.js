export default async (req) => {
  try {
    const { data, error } = await db.query(`
      SELECT c.*, p.title as post_title
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      ORDER BY c.created_at DESC
    `);
    if (error) throw error;
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
