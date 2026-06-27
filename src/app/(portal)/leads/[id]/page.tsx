import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LeadDetailClient from './LeadDetailClient'

export async function generateMetadata(props: any) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: lead } = await supabase
    .from('leads')
    .select('nome')
    .eq('id', id)
    .single()
  return {
    title: lead?.nome ? `${lead.nome} — Portal SDR` : 'Lead — Portal SDR',
  }
}

export default async function LeadDetailPage(props: any) {
  const { id } = await props.params
  const supabase = await createClient()

  const [
    { data: lead },
    { data: qualificacao },
    { data: transferencia },
    { data: conversas },
  ] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('qualificacoes').select('*').eq('lead_id', id).maybeSingle(),
    supabase.from('transferencias').select('*').eq('lead_id', id).maybeSingle(),
    supabase
      .from('conversas')
      .select('id, direcao, mensagem, criado_em')
      .eq('lead_id', id)
      .order('criado_em', { ascending: true }),
  ])

  if (!lead) notFound()

  return (
    <LeadDetailClient
      lead={lead as any}
      qualificacao={qualificacao as any}
      transferencia={transferencia as any}
      conversas={(conversas as any) ?? []}
    />
  )
}
