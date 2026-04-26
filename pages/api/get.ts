import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const getBrandingModels = async () => {
  const { data, error } = await supabase
    .from('plataforma_marca')
    .select('*')
  if (error) throw error
  return data
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = await getBrandingModels()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados' })
  }
}
