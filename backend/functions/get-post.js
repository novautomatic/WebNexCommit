export default async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return {
      status: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    const slug = req.query.slug;
    if (!slug) {
      return {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Slug is required' }),
      };
    }

    const { data, error } = await db.query(`
      SELECT p.*, pr.username as author_name, c.name as category_name
      FROM posts p
      JOIN profiles pr ON p.author_id = pr.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1 AND p.is_published = true
      LIMIT 1
    `, [slug]);

    if (error) throw error;
    if (!data || data.length === 0) {
      return {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    return {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data[0]),
    };
  } catch (e) {
    return {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
