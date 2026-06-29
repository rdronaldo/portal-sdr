import { createClient } from '@/lib/supabase/server'
import LeadsClient from './LeadsClient'

const PAGE_SIZE = 20

export default async function LeadsPage(props: any) {
  const searchParams = await props.searchParams
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10))
  const temperatura = searchParams?.temperatura || ''
  const status = searchParams?.status || ''
  const busca = searchParams?.busca || ''

  const supabase = await createClient()

  // Step 1: If temperatura filter → get matching lead IDs from qualificacoes
  let tempLeadIds: string[] | null = null
  if (temperatura) {
    const { data } = await supabase
      .from('qualificacoes')
      .select('lead_id')
      .eq('temperatura', temperatura)
    tempLeadIds = data?.map((q: any) => q.lead_id) ?? []
    if (tempLeadIds.length === 0) {
      return (
        <LeadsClient
          leads={[]}
          total={0}
          page={page}
          pageSize={PAGE_SIZE}
          filters={{ temperatura, status, busca }}
        />
      )
    }
  }

  // Step 2: If status filter → get matching lead IDs from transferencias
  let statusLeadIds: string[] | null = null
  if (status) {
    const { data } = await supabase
      .from('transferencias')
      .select('lead_id')
      .eq('status_parceiro', status)
    statusLeadIds = data?.map((t: any) => t.lead_id) ?? []
    if (statusLeadIds.length === 0) {
      return (
        <LeadsClient
          leads={[]}
          total={0}
          page={page}
          pageSize={PAGE_SIZE}
          filters={{ temperatura, status, busca }}
        />
      )
    }
  }

  // Step 3: Intersect the two ID sets
  let filteredIds: string[] | null = null
  if (tempLeadIds !== null && statusLeadIds !== null) {
    const tempSet = new Set(tempLeadIds)
    filteredIds = statusLeadIds.filter((id) => tempSet.has(id))
    if (filteredIds.length === 0) {
      return (
        <LeadsClient
          leads={[]}
          total={0}
          page={page}
          pageSize={PAGE_SIZE}
          filters={{ temperatura, status, busca }}
        />
      )
    }
  } else if (tempLeadIds !== null) {
    filteredIds = tempLeadIds
  } else if (statusLeadIds !== null) {
    filteredIds = statusLeadIds
  }

  // Step 4: Build main query with pagination
  let query: any = supabase
    .from('leads')
    .select(
      `id, nome, telefone, cidade, estado, status, criado_em, percentual_renda, renda_estimada, valor_plano_total,
       transferencias(id, transferido_em, primeiro_contato_em, status_parceiro),
       qualificacoes(temperatura, resumo_ia)`,
      { count: 'exact' }
    )

  if (filteredIds !== null) {
    query = query.in('id', filteredIds)
  }

  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%`)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: leads, count } = await query
    .range(from, to)
    .order('criado_em', { ascending: false })

  return (
    <LeadsClient
      leads={(leads as any) ?? []}
      total={count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      filters={{ temperatura, status, busca }}
    />
  )
}
