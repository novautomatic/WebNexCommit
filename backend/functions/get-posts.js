export default async (req) => {
  // CORS Headers to allow requests from any origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return {
      status: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    const { data, error } = await db.query(`
      SELECT p.*, pr.username as author_name, c.name as category_name
      FROM posts p
      JOIN profiles pr ON p.author_id = pr.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_published = true
      ORDER BY p.published_at DESC
    `);

    if (error) throw error;

    return {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
