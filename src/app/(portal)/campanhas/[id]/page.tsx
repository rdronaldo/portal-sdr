import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CampanhaDetailClient from './CampanhaDetailClient'

export async function generateMetadata(props: any) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data } = await supabase
    .from('campanhas')
    .select('codigo, nome_descritivo')
    .eq('id', id)
    .single()
  const title = data?.nome_descritivo || data?.codigo || 'Campanha'
  return { title: `${title} — Portal SDR` }
}

export default async function CampanhaDetailPage(props: any) {
  const { id } = await props.params
  const supabase = await createClient()

  const [{ data: campanha }, { data: leads }] = await Promise.all([
    supabase
      .from('campanhas')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('leads')
      .select('id, nome, sexo, data_nascimento, valor_plano_total, comissao_entrada, comissao_recorrente, percentual_renda, renda_estimada, status, criado_em')
      .eq('campanha_id', id)
      .order('valor_plano_total', { ascending: false }),
  ])

  if (!campanha) notFound()

  return <CampanhaDetailClient campanha={campanha as any} leads={(leads as any) ?? []} />
}
