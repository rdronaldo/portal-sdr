import { createClient } from '@/lib/supabase/server'
import CampanhasClient from './CampanhasClient'

export default async function CampanhasPage() {
  const supabase = await createClient()
  const { data: campanhas } = await supabase
    .from('campanhas')
    .select('id, codigo, nome_descritivo, status, is_champion, total_leads, percentual_conversao, valor_total_potencial, canal, criado_em')
    .order('criado_em', { ascending: false })

  return <CampanhasClient campanhas={(campanhas as any) ?? []} />
}
