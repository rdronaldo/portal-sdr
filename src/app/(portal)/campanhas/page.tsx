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

  const { data: leadsRaw } = ids.length > 0
    ? await supabase
        .from('leads')
        .select('campanha_id, sexo, data_nascimento')
        .in('campanha_id', ids)
    : { data: [] }

  const statsMap: Record<string, {
    pct_masc: number | null
    pct_fem: number | null
    faixas_top3: string | null
  }> = {}

  const BUCKETS = ['0–18', '19–28', '29–38', '39–48', '49–58', '59+']

  for (const id of ids) {
    const cl = (leadsRaw ?? []).filter((l: any) => l.campanha_id === id)
    const total = cl.length

    if (total === 0) {
      statsMap[id] = { pct_masc: null, pct_fem: null, faixas_top3: null }
      continue
    }

    // Gênero — comparação case-insensitive
    let masc = 0, fem = 0
    for (const l of cl) {
      const s = (l.sexo ?? '').toString().toLowerCase().trim()
      if (s === 'm' || s === 'masculino' || s === 'male') masc++
      else if (s === 'f' || s === 'feminino' || s === 'female') fem++
    }

    // Faixas etárias — alinhadas com a página de detalhe
    const counts: Record<string, number> = {}
    for (const b of BUCKETS) counts[b] = 0

    for (const l of cl) {
      const age = calcAge(l.data_nascimento)
      if (age === null) continue
      if      (age <= 18) counts['0–18']++
      else if (age <= 28) counts['19–28']++
      else if (age <= 38) counts['29–38']++
      else if (age <= 48) counts['39–48']++
      else if (age <= 58) counts['49–58']++
      else                counts['59+']++
    }

    // Top 3 faixas com dados
    const top3 = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${Math.round(v / total * 100)}%`)

    statsMap[id] = {
      pct_masc: Math.round(masc / total * 100),
      pct_fem:  Math.round(fem  / total * 100),
      faixas_top3: top3.length > 0 ? top3.join(' · ') : null,
    }
  }

  const enriched = (campanhas ?? []).map((c: any) => ({
    ...c,
    ...(statsMap[c.id] ?? { pct_masc: null, pct_fem: null, faixas_top3: null }),
  }))

  return <CampanhasClient campanhas={enriched as any} />
}
