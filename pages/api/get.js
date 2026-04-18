export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id e obrigatorio' });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Variaveis de ambiente ausentes' });
  }

  try {
    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/brand_documents?user_id=eq.${user_id}&order=updated_at.desc`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      let errMsg = 'Erro ao buscar documentos';
      try { errMsg = JSON.parse(errText).message || errMsg; } catch {}
      return res.status(500).json({ error: errMsg });
    }

    const documents = await supabaseRes.json();
    return res.status(200).json({ documents });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
