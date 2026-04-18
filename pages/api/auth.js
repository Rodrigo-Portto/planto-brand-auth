export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, password } = req.body;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Variaveis de ambiente ausentes' });
  }

  const endpoint = action === 'signup'
    ? `${SUPABASE_URL}/auth/v1/signup`
    : `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

  try {
    const supabaseRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await supabaseRes.json();

    // UID: data.user.id (login) or data.id (signup)
    const user_id = data?.user?.id || data?.id || null;

    if (!user_id) {
      return res.status(400).json({
        error: data.error_description || data.msg || data.message || data.error || 'Erro ao autenticar',
      });
    }

    return res.status(200).json({ user_id });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
