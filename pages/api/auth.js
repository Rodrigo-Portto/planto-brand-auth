export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, password } = req.body;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  try {
    const supabaseRes = await fetch(
      `${SUPABASE_URL}/functions/v1/auth-handler?action=${action}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }
    );
    const data = await supabaseRes.json();
    return res.status(supabaseRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
