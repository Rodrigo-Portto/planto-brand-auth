import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const getBrandingModels = async () => {
  const { data, error } = await supabase
    .from('plataforma_marca')
    .select('*')

  if (error) throw new Error(JSON.stringify(error))
  return data
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = await getBrandingModels()
    res.status(200).json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[/api/get] Error:', message)
    res.status(500).json({ error: message })
  }
}
