'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Star, Pause, Play, XCircle, Users, TrendingUp,
  DollarSign, Repeat, ChevronLeft, ChevronRight,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Campanha = {
  id: string
  codigo: string
  nome_descritivo: string | null
  nome_plano: string | null
  operadora: string | null
  acomodacao: string | null
  coparticipacao: string | null
  abrangencia: string | null
  municipio: string | null
  rede_referenciada: string | null
  canal: string[] | null
  formatos: string[] | null
  horario_tipo: string | null
  percentual_conversao: number | null
  status: string
  is_champion: boolean
  total_leads: number
  valor_total_potencial: number
  comissao_entrada_potencial: number
  comissao_recorrente_potencial: number
  percentual_conversao_real: number | null
  preco_0_18: number; preco_19_23: number; preco_24_28: number
  preco_29_33: number; preco_34_38: number; preco_39_43: number
  preco_44_48: number; preco_49_53: number; preco_54_58: number
  preco_59_mais: number
  criado_em: string
}

type Lead = {
  id: string
  nome: string
  sexo: string | null
  data_nascimento: string | null
  valor_plano_total: number
  comissao_entrada: number
  comissao_recorrente: number
  status: string
  criado_em: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  rascunho:  { label: 'Rascunho',  bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
  ativa:     { label: 'Ativa',     bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  pausada:   { label: 'Pausada',   bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  encerrada: { label: 'Encerrada', bg: '#F1F5F9', text: '#374151', border: '#9CA3AF' },
  champion:  { label: '⭐ Champion',bg: '#FEF9C3', text: '#92400E', border: '#FDE68A' },
}

const LEAD_STATUS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  novo:           { label: 'Novo',           bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  disparado:      { label: 'Disparado',      bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  respondeu:      { label: 'Respondeu',      bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  qualificado:    { label: 'Qualificado',    bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  transferido:    { label: 'Transferido',    bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
  convertido:     { label: 'Convertido',     bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  nao_convertido: { label: 'Não convertido', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  frio:           { label: 'Frio',           bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  opt_out:        { label: 'Opt-out',        bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
}

const CANAL_LABEL: Record<string, string> = {
  whatsapp: '📱 WhatsApp', whatsapp_meta: '💼 WA Meta',
  sms: '💬 SMS', telefone: '📞 Telefone',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function calcIdade(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  const hoje = new Date()
  let idade = hoje.getFullYear() - d.getFullYear()
  const m = hoje.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--
  return idade
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isChampion }: { status: string; isChampion: boolean }) {
  const key = isChampion ? 'champion' : (status in STATUS_CFG ? status : 'rascunho')
  const cfg = STATUS_CFG[key]
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border" style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: any
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">{label}</p>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '1A' }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: '#0A1628' }}>{value}</p>
      {sub && <p className="text-xs text-[#94A3B8]">{sub}</p>}
    </div>
  )
}

// ─── Distribution Bar ─────────────────────────────────────────────────────────

function DistBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#64748B]">{label}</span>
        <span className="font-semibold text-[#0A1628]">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ─── Lead Status Distribution ─────────────────────────────────────────────────

function LeadsDist({ leads }: { leads: Lead[] }) {
  const total = leads.length
  if (total === 0) return null
  const counts: Record<string, number> = {}
  leads.forEach(l => { counts[l.status] = (counts[l.status] ?? 0) + 1 })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-2">
      {sorted.map(([status, count]) => {
        const cfg = LEAD_STATUS[status] ?? { label: status, text: '#64748B' }
        return (
          <DistBar key={status} label={cfg.label} pct={(count / total) * 100} color={cfg.text} />
        )
      })}
    </div>
  )
}

// ─── Age Distribution ─────────────────────────────────────────────────────────

function AgesDist({ leads }: { leads: Lead[] }) {
  const total = leads.length
  if (total === 0) return null
  const faixas = [
    { label: '0-18',  min: 0,  max: 18 },
    { label: '19-28', min: 19, max: 28 },
    { label: '29-38', min: 29, max: 38 },
    { label: '39-48', min: 39, max: 48 },
    { label: '49-58', min: 49, max: 58 },
    { label: '59+',   min: 59, max: 999 },
  ]
  return (
    <div className="space-y-2">
      {faixas.map(f => {
        const count = leads.filter(l => {
          const age = calcIdade(l.data_nascimento)
          return age !== null && age >= f.min && age <= f.max
        }).length
        return <DistBar key={f.label} label={f.label} pct={total > 0 ? (count / total) * 100 : 0} color="#028090" />
      })}
    </div>
  )
}

// ─── Leads Table ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

function LeadsTable({ leads }: { leads: Lead[] }) {
  const [page, setPage] = useState(1)
  const total = leads.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const slice = leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (total === 0) {
    return <p className="text-sm text-[#94A3B8] text-center py-8">Nenhum lead nesta campanha ainda.</p>
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F4F8FB] border-b border-[#E2E8F0]">
              {['Nome', 'Sexo', 'Idade', 'Valor plano', 'Com. entrada', 'Rec./mês', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map(l => {
              const cfg = LEAD_STATUS[l.status] ?? { label: l.status, bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' }
              const age = calcIdade(l.data_nascimento)
              return (
                <tr key={l.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/leads/${l.id}`} className="font-medium text-[#028090] hover:underline">
                      {l.nome || '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-[#64748B]">{l.sexo || '—'}</td>
                  <td className="px-4 py-2.5 text-[#0A1628]">{age !== null ? `${age}a` : '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-[#0A1628]">{fmt(l.valor_plano_total)}</td>
                  <td className="px-4 py-2.5 text-[#028090]">{fmt(l.comissao_entrada)}</td>
                  <td className="px-4 py-2.5 text-[#02C39A]">{fmt(l.comissao_recorrente)}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium border" style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
          <span className="text-xs text-[#64748B]">
            {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} leads
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F4F8FB] transition-colors disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F4F8FB] transition-colors disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CampanhaDetailClient({ campanha: initial, leads }: {
  campanha: Campanha
  leads: Lead[]
}) {
  const router = useRouter()
  const [campanha, setCampanha] = useState(initial)
  const [actioning, setActioning] = useState(false)

  const pct = campanha.percentual_conversao ?? 0
  const leadsConv = Math.round(campanha.total_leads * (pct / 100))
  const valorConv = campanha.valor_total_potencial * (pct / 100)
  const comEntradaConv = campanha.comissao_entrada_potencial * (pct / 100)
  const comRecConv = campanha.comissao_recorrente_potencial * (pct / 100)

  const feminino = leads.filter(l => ['F', 'Feminino', 'FEMININO'].includes(l.sexo ?? '')).length
  const masculino = leads.length - feminino
  const pctFem = leads.length > 0 ? (feminino / leads.length) * 100 : 0
  const pctMas = leads.length > 0 ? (masculino / leads.length) * 100 : 0

  const planInfos = [
    { label: 'Operadora',        value: campanha.operadora },
    { label: 'Acomodação',       value: campanha.acomodacao },
    { label: 'Coparticipação',   value: campanha.coparticipacao },
    { label: 'Abrangência',      value: campanha.abrangencia },
    { label: 'Município',        value: campanha.municipio },
    { label: 'Rede referenciada',value: campanha.rede_referenciada },
    { label: 'Canais',           value: (campanha.canal ?? []).map(c => CANAL_LABEL[c] ?? c).join(', ') },
    { label: 'Horário',          value: campanha.horario_tipo ? campanha.horario_tipo.replace('_', ' ') : null },
  ]

  const executeStatusAction = async (action: 'pausar' | 'ativar' | 'encerrar' | 'champion') => {
    setActioning(true)
    const supabase = createClient()
    try {
      const updates: Record<string, any> = {
        pausar:   { status: 'pausada' },
        ativar:   { status: 'ativa' },
        encerrar: { status: 'encerrada' },
        champion: { status: 'champion', is_champion: true },
      }
      const { error } = await supabase.from('campanhas').update(updates[action]).eq('id', campanha.id)
      if (error) throw error
      setCampanha(prev => ({ ...prev, ...updates[action] }))
      toast.success('Status atualizado!')
    } catch {
      toast.error('Erro ao atualizar status.')
    } finally {
      setActioning(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/campanhas" className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0A1628] mb-4 transition-colors">
          <ArrowLeft size={14} /> Campanhas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[#0A1628]">
                {campanha.nome_descritivo || campanha.codigo}
              </h1>
              <StatusBadge status={campanha.status} isChampion={campanha.is_champion} />
            </div>
            <p className="text-sm text-[#64748B] font-mono">{campanha.codigo}</p>
            {campanha.nome_plano && (
              <p className="text-sm text-[#028090] mt-0.5">{campanha.nome_plano}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {campanha.status !== 'champion' && !campanha.is_champion && (
              <button
                onClick={() => executeStatusAction('champion')}
                disabled={actioning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#FDE68A] bg-[#FEF9C3] text-[#92400E] text-xs font-medium hover:bg-[#FEF3C7] transition-colors disabled:opacity-50"
              >
                <Star size={13} /> Champion
              </button>
            )}
            {campanha.status === 'ativa' && (
              <button
                onClick={() => executeStatusAction('pausar')}
                disabled={actioning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
              >
                <Pause size={13} /> Pausar
              </button>
            )}
            {(campanha.status === 'pausada' || campanha.status === 'rascunho') && (
              <button
                onClick={() => executeStatusAction('ativar')}
                disabled={actioning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#028090] text-white text-xs font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-50"
              >
                <Play size={13} /> Ativar
              </button>
            )}
            {campanha.status !== 'encerrada' && (
              <button
                onClick={() => executeStatusAction('encerrar')}
                disabled={actioning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] text-xs font-medium hover:bg-[#FEE2E2] transition-colors disabled:opacity-50"
              >
                <XCircle size={13} /> Encerrar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total de leads" value={campanha.total_leads.toLocaleString('pt-BR')}
          sub={`${pct}% conversão estimada`}
          color="#028090" icon={Users}
        />
        <MetricCard
          label="Potencial (mensalidades)" value={fmt(campanha.valor_total_potencial)}
          sub={`≈ ${fmt(valorConv)} com ${pct}% conv.`}
          color="#028090" icon={DollarSign}
        />
        <MetricCard
          label="Com. entrada (1,5x)" value={fmt(campanha.comissao_entrada_potencial)}
          sub={`≈ ${fmt(comEntradaConv)} esperado`}
          color="#02C39A" icon={TrendingUp}
        />
        <MetricCard
          label="Recorrente / mês (2%)" value={fmt(campanha.comissao_recorrente_potencial)}
          sub={`≈ ${fmt(comRecConv)} esperado`}
          color="#02C39A" icon={Repeat}
        />
      </div>

      {/* Two-column: Plan Info + Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Info */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
          <p className="text-xs font-semibold text-[#028090] uppercase tracking-wide">Informações do plano</p>
          {planInfos.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-[#94A3B8] mb-0.5">{label}</p>
              <p className="text-sm text-[#0A1628] font-medium">{value || '—'}</p>
            </div>
          ))}
          <div>
            <p className="text-xs text-[#94A3B8] mb-0.5">Criado em</p>
            <p className="text-sm text-[#0A1628]">{new Date(campanha.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Distributions */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Gênero */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <p className="text-xs font-semibold text-[#028090] uppercase tracking-wide mb-4">Distribuição por gênero</p>
            {leads.length > 0 ? (
              <div className="space-y-3">
                <DistBar label={`Feminino (${feminino})`} pct={pctFem} color="#028090" />
                <DistBar label={`Masculino (${masculino})`} pct={pctMas} color="#0A1628" />
              </div>
            ) : <p className="text-xs text-[#94A3B8]">Sem dados de gênero.</p>}
          </div>

          {/* Idade */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <p className="text-xs font-semibold text-[#028090] uppercase tracking-wide mb-4">Distribuição por faixa etária</p>
            <AgesDist leads={leads} />
          </div>

          {/* Status dos leads */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:col-span-2">
            <p className="text-xs font-semibold text-[#028090] uppercase tracking-wide mb-4">Status dos leads</p>
            <LeadsDist leads={leads} />
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0A1628]">Leads desta campanha</p>
          <span className="text-xs text-[#94A3B8]">{leads.length} total</span>
        </div>
        <LeadsTable leads={leads} />
      </div>
    </div>
  )
}
