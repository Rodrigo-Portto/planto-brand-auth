export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, document_type, content } = req.body;

  if (!user_id || !document_type || !content) {
    return res.status(400).json({ error: 'Campos obrigatorios: user_id, document_type, content' });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Variaveis de ambiente ausentes' });
  }

  try {
    // Upsert: insere ou atualiza baseado no UNIQUE (user_id, type)
    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/brand_documents?on_conflict=user_id,type`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          user_id,
          type: document_type,
          content,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      let errMsg = 'Erro ao salvar';
      try { errMsg = JSON.parse(errText).message || errMsg; } catch {}
      return res.status(500).json({ error: errMsg });
    }

    return res.status(200).json({
      success: true,
      message: `Documento '${document_type}' salvo com sucesso para o usuario ${user_id}.`,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
