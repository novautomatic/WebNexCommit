export default async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const user = req.user;
    if (!user) {
      return {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Authentication required', authenticated: false }),
      };
    }

    const { data, error } = await db.query(
      'SELECT is_admin FROM profiles WHERE id = $1',
      [user.id]
    );

    if (error) throw error;
    const isAdmin = data && data[0]?.is_admin === true;

    return {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdmin,
        user: {
          id: user.id,
          email: user.email
        }
      }),
    };
  } catch (e) {
    return {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
