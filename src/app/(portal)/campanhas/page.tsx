import { createClient } from '@/lib/supabase/server'
import CampanhasClient from './CampanhasClient'

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

export default async function CampanhasPage() {
  const supabase = await createClient()

  const { data: campanhas } = await supabase
    .from('campanhas')
    .select(`
      id, codigo, nome_descritivo, status, is_champion, versao,
      total_leads, percentual_conversao, valor_total_potencial,
      comissao_entrada_potencial, comissao_recorrente_potencial,
      canal, formatos, horario_tipo, criado_em
    `)
    .order('criado_em', { ascending: false })

  const ids = (campanhas ?? []).map((c: any) => c.id)

  // Buscar apenas os campos necessários para estatísticas
  const { data: leadsRaw } = ids.length > 0
    ? await supabase
        .from('leads')
        .select('campanha_id, sexo, data_nascimento')
        .in('campanha_id', ids)
    : { data: [] }

  // Computar estatísticas por campanha
  const statsMap: Record<string, {
    pct_masc: number | null
    pct_fem: number | null
    faixa_dominante: string | null
    dist_etaria: Record<string, number>
  }> = {}

  for (const id of ids) {
    const cl = (leadsRaw ?? []).filter((l: any) => l.campanha_id === id)
    const total = cl.length

    if (total === 0) {
      statsMap[id] = { pct_masc: null, pct_fem: null, faixa_dominante: null, dist_etaria: {} }
      continue
    }

    const masc = cl.filter((l: any) => l.sexo === 'M' || l.sexo === 'masculino').length
    const fem  = cl.filter((l: any) => l.sexo === 'F' || l.sexo === 'feminino').length

    const buckets: Record<string, number> = { '18–30': 0, '31–45': 0, '46–60': 0, '61+': 0 }
    for (const l of cl) {
      const age = calcAge(l.data_nascimento)
      if (age === null) continue
      if (age <= 30)      buckets['18–30']++
      else if (age <= 45) buckets['31–45']++
      else if (age <= 60) buckets['46–60']++
      else                buckets['61+']++
    }

    // Faixa dominante
    const topFaixa = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]
    const dist_etaria: Record<string, number> = {}
    for (const [k, v] of Object.entries(buckets)) {
      dist_etaria[k] = Math.round(v / total * 100)
    }

    statsMap[id] = {
      pct_masc: Math.round(masc / total * 100),
      pct_fem:  Math.round(fem  / total * 100),
      faixa_dominante: topFaixa ? `${topFaixa[0]}: ${Math.round(topFaixa[1] / total * 100)}%` : null,
      dist_etaria,
    }
  }

  // Mesclar estatísticas nas campanhas
  const enriched = (campanhas ?? []).map((c: any) => ({
    ...c,
    ...(statsMap[c.id] ?? { pct_masc: null, pct_fem: null, faixa_dominante: null, dist_etaria: {} }),
  }))

  return <CampanhasClient campanhas={enriched as any} />
}
