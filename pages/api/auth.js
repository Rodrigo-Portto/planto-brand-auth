export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, password } = req.body;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const endpoint = action === 'signup'
    ? `${SUPABASE_URL}/auth/v1/signup`
    : `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

  try {
    const supabaseRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await supabaseRes.json();

    // Supabase retorna access_token em data.access_token
    const token = data.access_token || null;

    if (!supabaseRes.ok || !token) {
      const msg = data.error_description || data.msg || data.message || 'Erro ao autenticar';
      return res.status(400).json({ error: msg });
    }

    return res.status(200).json({ access_token: token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
