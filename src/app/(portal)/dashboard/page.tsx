import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import DashboardClient, { DashboardData } from './DashboardClient'

async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()

  const [
    { count: transferidos },
    { count: leadsQuentes },
    { count: aguardandoContato },
    { count: convertidos },
    { count: naoConvertidos },
    { count: disparados },
    { count: responderam },
    { data: aguardandoLista },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'transferido'),
    supabase
      .from('qualificacoes')
      .select('*', { count: 'exact', head: true })
      .eq('temperatura', 'quente'),
    supabase
      .from('transferencias')
      .select('*', { count: 'exact', head: true })
      .is('primeiro_contato_em', null),
    supabase
      .from('transferencias')
      .select('*', { count: 'exact', head: true })
      .eq('status_parceiro', 'convertido'),
    supabase
      .from('transferencias')
      .select('*', { count: 'exact', head: true })
      .eq('status_parceiro', 'nao_convertido'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'disparado'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'respondeu'),
    supabase
      .from('transferencias')
      .select('id, lead_id, transferido_em, leads(id, nome, cidade, estado, qualificacoes(temperatura, resumo_ia))')
      .is('primeiro_contato_em', null)
      .order('transferido_em', { ascending: true }),
  ])

  return {
    metrics: {
      transferidos: transferidos ?? 0,
      leadsQuentes: leadsQuentes ?? 0,
      aguardandoContato: aguardandoContato ?? 0,
      convertidos: convertidos ?? 0,
      naoConvertidos: naoConvertidos ?? 0,
    },
    funnel: {
      disparados: disparados ?? 0,
      responderam: responderam ?? 0,
      transferidos: transferidos ?? 0,
      convertidos: convertidos ?? 0,
    },
    aguardandoLista: (aguardandoLista as any) ?? [],
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardClient data={data} />
}
