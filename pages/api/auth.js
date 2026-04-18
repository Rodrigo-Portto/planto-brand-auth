export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Variaveis de ambiente ausentes' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  try {
    // Tenta login primeiro
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginRes.json();
    const loginUserId = loginData?.user?.id || null;

    if (loginUserId) {
      return res.status(200).json({ user_id: loginUserId });
    }

    // Login falhou - tenta signup
    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
    const signupData = await signupRes.json();
    const signupUserId = signupData?.id || signupData?.user?.id || null;

    if (signupUserId) {
      return res.status(200).json({ user_id: signupUserId });
    }

    // Ambos falharam
    const errorMsg =
      signupData?.error_description ||
      signupData?.msg ||
      signupData?.message ||
      signupData?.error ||
      loginData?.error_description ||
      loginData?.msg ||
      loginData?.error ||
      'Erro ao autenticar';

    return res.status(400).json({ error: errorMsg });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
