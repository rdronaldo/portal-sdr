import { createClient } from '@/lib/supabase/server'
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
    { data: campanhasData },
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
    supabase
      .from('campanhas')
      .select('id, nome_descritivo, codigo, status, is_champion, total_leads, valor_total_potencial, comissao_entrada_potencial, comissao_recorrente_potencial, percentual_conversao, criado_em')
      .neq('status', 'encerrada')
      .order('total_leads', { ascending: false })
      .limit(20),
  ])

  // Campanhas metrics
  const campanhas = (campanhasData as any[]) ?? []
  const campanhasAtivas = campanhas.filter((c: any) => c.status === 'ativa').length
  const campanhasChampion = campanhas.filter((c: any) => c.is_champion).length
  const totalLeadsBase = campanhas.reduce((s: number, c: any) => s + (c.total_leads ?? 0), 0)
  const potencialTotal = campanhas.reduce((s: number, c: any) => s + (c.valor_total_potencial ?? 0), 0)
  const recorrenteTotal = campanhas.reduce((s: number, c: any) => s + (c.comissao_recorrente_potencial ?? 0), 0)
  const topCampanhas = campanhas.slice(0, 6)

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
    campanhas: {
      ativas: campanhasAtivas,
      champion: campanhasChampion,
      totalLeads: totalLeadsBase,
      potencialTotal,
      recorrenteTotal,
      top: topCampanhas,
    },
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardClient data={data} />
}
