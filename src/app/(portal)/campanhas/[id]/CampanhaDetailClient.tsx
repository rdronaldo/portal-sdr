'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Star, Pause, Play, XCircle, Users, TrendingUp,
  DollarSign, Repeat, ChevronLeft, ChevronRight, Target, Download,
  Plus, Trash2, FileText, Music, Video, Image, ExternalLink,
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
  percentual_renda: number | null
  renda_estimada: number | null
  status: string
  criado_em: string
}

type Material = {
  id: string
  campanha_id: string
  tipo: 'texto' | 'audio' | 'video' | 'imagem'
  nome_arquivo: string
  storage_path: string
  tamanho_bytes: number
  mime_type: string
  conteudo_texto: string
  percentual_uso: number
  ativo: boolean
  criado_em: string
}

type SelecaoFiltros = {
  maxPctRenda: number
  faixasEtarias: string[]
  rendaMinima: number
  quantidade: number
  ordenarPor: 'menor_pct' | 'maior_renda' | 'faixa_intermediaria'
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

const FAIXAS_ETARIAS = [
  { key: '19-28', label: '19–28 anos', default: true },
  { key: '29-38', label: '29–38 anos', default: true },
  { key: '39-48', label: '39–48 anos', default: true },
  { key: '0-18',  label: '0–18 anos',  default: false },
  { key: '49-58', label: '49–58 anos', default: false },
  { key: '59+',   label: '59+ anos',   default: false },
]

const DEFAULT_FILTROS: SelecaoFiltros = {
  maxPctRenda: 10,
  faixasEtarias: ['19-28', '29-38', '39-48'],
  rendaMinima: 3000,
  quantidade: 50,
  ordenarPor: 'menor_pct',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

function calcIdade(dob: string | null): number | null {
  if (!dob) return null
  const parts = dob.split('-')
  if (parts.length < 3) return null
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  const hoje = new Date()
  let idade = hoje.getFullYear() - d.getFullYear()
  const m = hoje.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--
  return idade
}

function getFaixaKey(age: number | null): string | null {
  if (age === null) return null
  if (age <= 18) return '0-18'
  if (age <= 28) return '19-28'
  if (age <= 38) return '29-38'
  if (age <= 48) return '39-48'
  if (age <= 58) return '49-58'
  return '59+'
}

function rendaColor(pct: number | null): { bg: string; text: string } {
  if (pct === null) return { bg: 'transparent', text: '#94A3B8' }
  if (pct <= 10) return { bg: '#ECFDF5', text: '#065F46' }
  if (pct <= 20) return { bg: '#FFFBEB', text: '#92400E' }
  return { bg: '#FEF2F2', text: '#991B1B' }
}

// ─── Filter logic ─────────────────────────────────────────────────────────────

function filtrarLeads(leads: Lead[], filtros: SelecaoFiltros): Lead[] {
  let result = leads.filter(l => {
    // Excluir já transferidos
    if (l.status === 'transferido') return false
    // Filtro de renda mínima
    if ((l.renda_estimada ?? 0) < filtros.rendaMinima) return false
    // Filtro de % da renda (só aplica se tiver percentual_renda)
    if (l.percentual_renda != null && l.percentual_renda > filtros.maxPctRenda) return false
    // Filtro de faixa etária
    if (filtros.faixasEtarias.length > 0) {
      const age = calcIdade(l.data_nascimento)
      const faixa = getFaixaKey(age)
      if (!faixa || !filtros.faixasEtarias.includes(faixa)) return false
    }
    return true
  })

  // Ordenação
  if (filtros.ordenarPor === 'menor_pct') {
    result = result.sort((a, b) => (a.percentual_renda ?? 999) - (b.percentual_renda ?? 999))
  } else if (filtros.ordenarPor === 'maior_renda') {
    result = result.sort((a, b) => (b.renda_estimada ?? 0) - (a.renda_estimada ?? 0))
  } else if (filtros.ordenarPor === 'faixa_intermediaria') {
    // Prioriza 29–43 (dentro de 29-48)
    const prioMap: Record<string, number> = { '29-38': 0, '39-48': 1, '19-28': 2, '49-58': 3, '0-18': 4, '59+': 5 }
    result = result.sort((a, b) => {
      const fa = getFaixaKey(calcIdade(a.data_nascimento)) ?? '59+'
      const fb = getFaixaKey(calcIdade(b.data_nascimento)) ?? '59+'
      return (prioMap[fa] ?? 9) - (prioMap[fb] ?? 9)
    })
  }

  return result.slice(0, filtros.quantidade)
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isChampion }: { status: string; isChampion: boolean }) {
  const key = isChampion ? 'champion' : (status in STATUS_CFG ? status : 'rascunho')
  const cfg = STATUS_CFG[key]
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
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

// ─── Section Block ────────────────────────────────────────────────────────────

function SectionBlock({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-bold text-[#0A1628]">{title}</h2>
        <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>
      </div>
      {children}
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
        return <DistBar key={status} label={cfg.label} pct={(count / total) * 100} color={cfg.text} />
      })}
    </div>
  )
}

function AgesDist({ leads }: { leads: Lead[] }) {
  const total = leads.length
  if (total === 0) return null
  const faixas = [
    { label: '0–18',  test: (a: number) => a <= 18 },
    { label: '19–28', test: (a: number) => a >= 19 && a <= 28 },
    { label: '29–38', test: (a: number) => a >= 29 && a <= 38 },
    { label: '39–48', test: (a: number) => a >= 39 && a <= 48 },
    { label: '49–58', test: (a: number) => a >= 49 && a <= 58 },
    { label: '59+',   test: (a: number) => a >= 59 },
  ]
  return (
    <div className="space-y-2">
      {faixas.map(f => {
        const count = leads.filter(l => {
          const age = calcIdade(l.data_nascimento)
          return age !== null && f.test(age)
        }).length
        return (
          <DistBar key={f.label} label={`${f.label} (${count})`}
            pct={total > 0 ? (count / total) * 100 : 0} color="#028090" />
        )
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

  if (total === 0)
    return <p className="text-sm text-[#94A3B8] text-center py-8">Nenhum lead nesta campanha ainda.</p>

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F4F8FB] border-b border-[#E2E8F0]">
              {['Nome', 'Sexo', 'Idade', 'Valor plano', '% da Renda', 'Com. entrada', 'Rec./mês', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map(l => {
              const cfg = LEAD_STATUS[l.status] ?? { label: l.status, bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' }
              const age = calcIdade(l.data_nascimento)
              const pct = l.percentual_renda
              const rColor = rendaColor(pct)
              const hasRenda = l.renda_estimada != null && l.renda_estimada > 0
              const tooltip = hasRenda && pct != null
                ? `Renda estimada: ${fmt(l.renda_estimada!)} | Plano: ${fmt(l.valor_plano_total)} | ${fmtPct(pct)} comprometido`
                : undefined
              return (
                <tr key={l.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/leads/${l.id}`} className="font-medium text-[#028090] hover:underline">{l.nome || '—'}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-[#64748B]">{l.sexo || '—'}</td>
                  <td className="px-4 py-2.5 text-[#0A1628]">{age !== null ? `${age}a` : '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-[#0A1628]">{fmt(l.valor_plano_total)}</td>
                  <td className="px-4 py-2.5" title={tooltip}>
                    {hasRenda && pct != null ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold cursor-help"
                        style={{ backgroundColor: rColor.bg, color: rColor.text }}>
                        {fmtPct(pct)}
                      </span>
                    ) : <span className="text-[#94A3B8] text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-[#028090]">{fmt(l.comissao_entrada)}</td>
                  <td className="px-4 py-2.5 text-[#02C39A]">{fmt(l.comissao_recorrente)}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium border"
                      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
          <span className="text-xs text-[#64748B]">
            {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, total)} de {total} leads
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F4F8FB] disabled:opacity-40"><ChevronLeft size={14} /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F4F8FB] disabled:opacity-40"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Materials Block ──────────────────────────────────────────────────────────

function fmtBytesDetail(b: number): string {
  if (!b) return ''
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

const TIPO_ICON: Record<string, any> = {
  texto: FileText, audio: Music, video: Video, imagem: Image,
}
const TIPO_EMOJI: Record<string, string> = {
  texto: '📝', audio: '🎵', video: '🎬', imagem: '🖼️',
}

function MaterialCard({ mat, onRemove, campanhaId }: { mat: Material; onRemove: (id: string) => void; campanhaId: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const getSignedUrl = async () => {
    if (!mat.storage_path) return null
    setLoadingUrl(true)
    const supabase = createClient()
    const { data } = await supabase.storage.from('campanha-materiais').createSignedUrl(mat.storage_path, 60)
    setLoadingUrl(false)
    return data?.signedUrl ?? null
  }

  const handleView = async () => {
    if (mat.tipo === 'texto') { setExpanded(e => !e); return }
    const url = await getSignedUrl()
    if (url) { setSignedUrl(url); window.open(url, '_blank') }
  }

  const handleDownload = async () => {
    const url = await getSignedUrl()
    if (!url) return
    const a = document.createElement('a')
    a.href = url; a.download = mat.nome_arquivo; a.click()
  }

  const handleRemoveConfirmed = async () => {
    setRemoving(true)
    const supabase = createClient()
    try {
      if (mat.storage_path) {
        await supabase.storage.from('campanha-materiais').remove([mat.storage_path])
      }
      const { error } = await supabase.from('materiais_campanha').delete().eq('id', mat.id)
      if (error) throw error
      onRemove(mat.id)
      toast.success('Material removido.')
    } catch {
      toast.error('Erro ao remover material.')
    } finally {
      setRemoving(false)
      setConfirmRemove(false)
    }
  }

  const Icon = TIPO_ICON[mat.tipo] ?? FileText
  const emoji = TIPO_EMOJI[mat.tipo] ?? '📄'

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center shrink-0">
            <Icon size={16} style={{ color: '#028090' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0A1628] truncate">{emoji} {mat.nome_arquivo}</p>
            <p className="text-xs text-[#94A3B8]">
              {fmtBytesDetail(mat.tamanho_bytes)}{mat.tamanho_bytes ? ' · ' : ''}
              {mat.percentual_uso}% uso · {new Date(mat.criado_em).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <button onClick={() => setConfirmRemove(true)} className="shrink-0 text-[#94A3B8] hover:text-[#EF4444] transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Preview for text */}
      {mat.tipo === 'texto' && mat.conteudo_texto && (
        <div className="bg-[#F8FAFC] rounded-lg p-3 text-xs text-[#64748B] leading-relaxed">
          {expanded ? mat.conteudo_texto : mat.conteudo_texto.slice(0, 120) + (mat.conteudo_texto.length > 120 ? '...' : '')}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleView}
          disabled={loadingUrl}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#028090] text-white text-xs font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-50"
        >
          <ExternalLink size={12} />
          {mat.tipo === 'texto' ? (expanded ? 'Recolher' : 'Ver completo') : (loadingUrl ? 'Abrindo...' : 'Abrir')}
        </button>
        {mat.tipo !== 'texto' && (
          <button
            onClick={handleDownload}
            disabled={loadingUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            <Download size={12} /> Baixar
          </button>
        )}
      </div>

      {confirmRemove && (
        <div className="border-t border-[#FEE2E2] pt-3 bg-[#FEF2F2] rounded-b-xl -mx-4 -mb-4 px-4 pb-4">
          <p className="text-xs font-semibold text-[#991B1B] mb-2">Remover este material permanentemente?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmRemove(false)} className="flex-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-[#64748B]">Cancelar</button>
            <button onClick={handleRemoveConfirmed} disabled={removing} className="flex-1 px-3 py-1.5 rounded-lg bg-[#EF4444] text-white text-xs font-medium disabled:opacity-50">
              {removing ? 'Removendo...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddMaterialModal({ campanhaId, onClose, onAdded }: { campanhaId: string; onClose: () => void; onAdded: (m: Material) => void }) {
  const [tipo, setTipo] = useState<'texto' | 'audio' | 'video' | 'imagem'>('texto')
  const [conteudoTexto, setConteudoTexto] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const TIPO_OPTS = [
    { value: 'texto', label: '📝 Texto' },
    { value: 'audio', label: '🎵 Áudio' },
    { value: 'video', label: '🎬 Vídeo' },
    { value: 'imagem', label: '🖼️ Imagem' },
  ]

  const ACCEPT: Record<string, string> = {
    audio: '.mp3,.ogg,.wav', video: '.mp4,.mov', imagem: '.jpg,.jpeg,.png,.webp',
  }

  const handleSave = async () => {
    setUploading(true)
    const supabase = createClient()
    try {
      let storagePath = ''
      let tamanho = 0
      let mimeType = ''

      if (tipo !== 'texto' && file) {
        const path = `${campanhaId}/${Date.now()}_${file.name}`
        const { error } = await supabase.storage.from('campanha-materiais').upload(path, file, { upsert: true })
        if (error) throw error
        storagePath = path
        tamanho = file.size
        mimeType = file.type
      }

      const { data: mat, error: dbErr } = await supabase.from('materiais_campanha').insert({
        campanha_id: campanhaId,
        tipo,
        nome_arquivo: tipo === 'texto' ? 'Texto principal' : (file?.name ?? ''),
        storage_path: storagePath,
        tamanho_bytes: tamanho,
        mime_type: mimeType,
        conteudo_texto: tipo === 'texto' ? conteudoTexto : '',
        percentual_uso: 100,
      }).select().single()

      if (dbErr) throw dbErr
      onAdded(mat as Material)
      toast.success('Material adicionado!')
      onClose()
    } catch (err: any) {
      toast.error(`Erro: ${err?.message ?? 'tente novamente'}`)
    } finally {
      setUploading(false)
    }
  }

  const canSave = tipo === 'texto' ? conteudoTexto.trim().length > 0 : file !== null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#0A1628]">+ Adicionar Material</h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-2">Tipo</label>
            <div className="grid grid-cols-4 gap-2">
              {TIPO_OPTS.map(opt => (
                <button key={opt.value} onClick={() => { setTipo(opt.value as any); setFile(null) }}
                  className="py-2 px-1 rounded-lg text-xs font-medium border transition-colors text-center"
                  style={tipo === opt.value
                    ? { borderColor: '#028090', backgroundColor: '#F0FDFA', color: '#028090' }
                    : { borderColor: '#E2E8F0', color: '#64748B' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {tipo === 'texto' ? (
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-2">Conteúdo</label>
              <textarea value={conteudoTexto} onChange={e => setConteudoTexto(e.target.value)} rows={5}
                placeholder="Digite a mensagem... use {{nome}} para personalizar."
                className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#028090]/30 resize-none" />
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-2">Arquivo</label>
              <input type="file" accept={ACCEPT[tipo] ?? ''} onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm file:mr-3 file:text-xs file:font-medium file:bg-[#028090] file:text-white file:border-0 file:rounded file:px-3 file:py-1" />
              {file && <p className="text-xs text-[#64748B] mt-1">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-between gap-3">
          <button onClick={onClose} disabled={uploading} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50">Cancelar</button>
          <button onClick={handleSave} disabled={!canSave || uploading}
            className="px-5 py-2 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] disabled:opacity-40">
            {uploading ? 'Enviando...' : 'Salvar material'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MaterialsBlock({ campanhaId, initialMateriais }: { campanhaId: string; initialMateriais: Material[] }) {
  const [materiais, setMateriais] = useState(initialMateriais)
  const [showAdd, setShowAdd] = useState(false)

  const handleRemove = (id: string) => setMateriais(prev => prev.filter(m => m.id !== id))
  const handleAdded = (m: Material) => setMateriais(prev => [...prev, m])

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <p className="text-sm font-semibold text-[#0A1628]">Materiais da Campanha</p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#028090] text-white text-xs font-medium hover:bg-[#026d7a] transition-colors">
          <Plus size={13} /> Adicionar Material
        </button>
      </div>
      <div className="p-6">
        {materiais.length === 0 ? (
          <p className="text-sm text-[#94A3B8] text-center py-4">Nenhum material de conteúdo cadastrado para esta campanha.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materiais.map(m => (
              <MaterialCard key={m.id} mat={m} onRemove={handleRemove} campanhaId={campanhaId} />
            ))}
          </div>
        )}
      </div>
      {showAdd && <AddMaterialModal campanhaId={campanhaId} onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
    </div>
  )
}

// ─── Seleção Inteligente Modal ────────────────────────────────────────────────

function SelecaoModal({
  leads,
  onClose,
  onConfirm,
}: {
  leads: Lead[]
  onClose: () => void
  onConfirm: (selected: Lead[]) => void
}) {
  const [filtros, setFiltros] = useState<SelecaoFiltros>(DEFAULT_FILTROS)
  const [saving, setSaving] = useState(false)
  const [confirmarMenos, setConfirmarMenos] = useState(false)

  const candidatos = useMemo(() => {
    // Sem limite para o preview
    const semLimite = { ...filtros, quantidade: 99999 }
    return filtrarLeads(leads, semLimite)
  }, [leads, filtros])

  const selecionados = useMemo(() => {
    return filtrarLeads(leads, filtros)
  }, [leads, filtros])

  const toggleFaixa = (key: string) => {
    setFiltros(prev => ({
      ...prev,
      faixasEtarias: prev.faixasEtarias.includes(key)
        ? prev.faixasEtarias.filter(f => f !== key)
        : [...prev.faixasEtarias, key],
    }))
  }

  const temMenosQueDesejado = candidatos.length < filtros.quantidade

  const handleConfirm = () => {
    if (temMenosQueDesejado && !confirmarMenos) {
      setConfirmarMenos(true)
      return
    }
    onConfirm(selecionados)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#0A1628] flex items-center gap-2">
            🎯 Selecionar Leads Propensos à Compra
          </h2>
          <p className="text-xs text-[#64748B] mt-1">Configure os critérios de seleção abaixo</p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* % máximo da renda */}
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-2">
              % máximo da renda comprometida
            </label>
            <div className="flex items-center gap-4">
              <input type="range" min={0} max={30} step={1}
                value={filtros.maxPctRenda}
                onChange={e => setFiltros(prev => ({ ...prev, maxPctRenda: parseInt(e.target.value) }))}
                className="flex-1 accent-[#028090]"
              />
              <span className="text-sm font-bold text-[#028090] w-14 text-right">
                até {filtros.maxPctRenda}%
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Plano acessível: custo ≤ {filtros.maxPctRenda}% do faturamento mensal
            </p>
          </div>

          {/* Faixa etária */}
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-2">
              Faixa etária do responsável
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FAIXAS_ETARIAS.map(f => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm text-[#0A1628]">
                  <input
                    type="checkbox"
                    checked={filtros.faixasEtarias.includes(f.key)}
                    onChange={() => toggleFaixa(f.key)}
                    className="accent-[#028090] w-4 h-4"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          {/* Renda mínima */}
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-2">
              Renda mínima estimada
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#64748B]">R$</span>
              <input
                type="number" min={0} step={500}
                value={filtros.rendaMinima}
                onChange={e => setFiltros(prev => ({ ...prev, rendaMinima: parseInt(e.target.value) || 0 }))}
                className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090]"
              />
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-2">
              Quantidade máxima a selecionar
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={1000}
                value={filtros.quantidade}
                onChange={e => setFiltros(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                className="w-28 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090]"
              />
              <span className="text-sm text-[#64748B]">leads</span>
            </div>
          </div>

          {/* Ordenação */}
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-2">
              Ordenar por
            </label>
            <div className="space-y-2">
              {[
                { value: 'menor_pct',          label: 'Menor % da renda (mais acessível primeiro)' },
                { value: 'maior_renda',         label: 'Maior renda estimada' },
                { value: 'faixa_intermediaria', label: 'Faixa etária intermediária (29–43 primeiro)' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-[#0A1628]">
                  <input
                    type="radio"
                    name="ordenar"
                    value={opt.value}
                    checked={filtros.ordenarPor === opt.value}
                    onChange={() => setFiltros(prev => ({ ...prev, ordenarPor: opt.value as any }))}
                    className="accent-[#028090]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className={`rounded-xl p-4 border ${
            candidatos.length === 0
              ? 'bg-[#FEF2F2] border-[#FECACA]'
              : 'bg-[#F0FDFA] border-[#A7F3D0]'
          }`}>
            <p className="text-sm font-semibold" style={{ color: candidatos.length === 0 ? '#991B1B' : '#065F46' }}>
              {candidatos.length === 0
                ? '⚠ Nenhum lead encontrado com estes critérios'
                : `✓ ${candidatos.length} leads encontrados com estes critérios`}
            </p>
            {candidatos.length > 0 && (
              <p className="text-xs mt-1" style={{ color: '#065F46' }}>
                {temMenosQueDesejado
                  ? `Menos que o solicitado — serão selecionados ${candidatos.length} leads`
                  : `Serão selecionados os ${filtros.quantidade} primeiros`}
              </p>
            )}
          </div>

          {/* Aviso de poucos leads */}
          {temMenosQueDesejado && candidatos.length > 0 && confirmarMenos && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4">
              <p className="text-sm font-semibold text-[#92400E] mb-1">⚠ Menos leads que o solicitado</p>
              <p className="text-xs text-[#92400E]">
                Encontramos apenas {candidatos.length} leads com estes critérios.
                Você pode afrouxar os filtros ou confirmar com {candidatos.length} leads.
              </p>
              <button
                onClick={() => setConfirmarMenos(false)}
                className="mt-2 text-xs text-[#92400E] underline hover:no-underline"
              >
                Ajustar filtros
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-between gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || candidatos.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Target size={14} />
            {saving
              ? 'Movendo...'
              : temMenosQueDesejado && confirmarMenos
              ? `✓ Confirmar com ${candidatos.length} leads`
              : `✓ Mover para Kanban — ${Math.min(filtros.quantidade, candidatos.length)} leads`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CampanhaDetailClient({ campanha: initial, leads: initialLeads, materiais: initialMateriais }: {
  campanha: Campanha
  leads: Lead[]
  materiais: Material[]
}) {
  const router = useRouter()
  const [campanha, setCampanha] = useState(initial)
  const [leads, setLeads] = useState(initialLeads)
  const [actioning, setActioning] = useState(false)
  const [showSelecao, setShowSelecao] = useState(false)
  const [transferindo, setTransferindo] = useState(false)
  const [exportando, setExportando] = useState(false)

  const exportarExcel = async () => {
    setExportando(true)
    try {
      const XLSX = await import('xlsx')
      const rows = leads.map(l => {
        const age = calcIdade(l.data_nascimento)
        return {
          'Nome': l.nome || '',
          'Sexo': l.sexo || '',
          'Idade': age !== null ? age : '',
          'Data Nasc.': l.data_nascimento || '',
          'Renda Estimada (R$)': l.renda_estimada ?? '',
          'Valor Plano (R$)': l.valor_plano_total,
          '% da Renda': l.percentual_renda ?? '',
          'Com. Entrada (R$)': l.comissao_entrada,
          'Recorrente/mês (R$)': l.comissao_recorrente,
          'Status': l.status,
          'Criado em': new Date(l.criado_em).toLocaleDateString('pt-BR'),
        }
      })
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Leads')
      const filename = `${campanha.codigo}_leads.xlsx`
      XLSX.writeFile(wb, filename)
      toast.success(`Exportado: ${filename}`)
    } catch (err) {
      toast.error('Erro ao exportar Excel')
    } finally {
      setExportando(false)
    }
  }

  const pct = campanha.percentual_conversao ?? 0
  const leadsConv = Math.round(campanha.total_leads * (pct / 100))
  const mensalidadesEsperadas = campanha.valor_total_potencial * (pct / 100)
  const comEntradaEsperada = mensalidadesEsperadas * 1.5
  const recorrenteEsperada = mensalidadesEsperadas * 0.02

  const feminino = leads.filter(l => ['F', 'Feminino', 'FEMININO', 'feminino'].includes(l.sexo ?? '')).length
  const masculino = leads.length - feminino
  const pctFem = leads.length > 0 ? (feminino / leads.length) * 100 : 0
  const pctMas = leads.length > 0 ? (masculino / leads.length) * 100 : 0

  const planInfos = [
    { label: 'Operadora',         value: campanha.operadora },
    { label: 'Acomodação',        value: campanha.acomodacao },
    { label: 'Coparticipação',    value: campanha.coparticipacao },
    { label: 'Abrangência',       value: campanha.abrangencia },
    { label: 'Município',         value: campanha.municipio },
    { label: 'Rede referenciada', value: campanha.rede_referenciada },
    { label: 'Canais',            value: (campanha.canal ?? []).map(c => CANAL_LABEL[c] ?? c).join(', ') },
    { label: 'Horário',           value: campanha.horario_tipo ? campanha.horario_tipo.replace(/_/g, ' ') : null },
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

  const handleSelecaoConfirm = async (selected: Lead[]) => {
    if (selected.length === 0) return
    setTransferindo(true)
    setShowSelecao(false)
    const supabase = createClient()
    try {
      const ids = selected.map(l => l.id)
      const now = new Date().toISOString()

      // 1. UPDATE leads para 'transferido'
      const { error: upErr } = await supabase
        .from('leads')
        .update({ status: 'transferido' })
        .in('id', ids)
      if (upErr) throw upErr

      // 2. INSERT transferencias em batches de 100
      const BATCH = 100
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH).map(lead_id => ({
          lead_id,
          transferido_em: now,
          status_parceiro: 'recebido',
          notas_parceiro: 'selecao_inteligente',
        }))
        const { error: tErr } = await supabase.from('transferencias').insert(batch)
        if (tErr) throw tErr
      }

      // 3. Atualiza estado local (marca como transferido)
      setLeads(prev => prev.map(l =>
        ids.includes(l.id) ? { ...l, status: 'transferido' } : l
      ))

      toast.success(`${selected.length} leads movidos para o Kanban com sucesso!`)
      router.push('/kanban')
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao transferir leads: ${err?.message ?? 'tente novamente'}`)
    } finally {
      setTransferindo(false)
    }
  }

  return (
    <div className="p-8 w-full space-y-8">
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
            {/* Exportar Excel */}
            <button
              onClick={exportarExcel}
              disabled={exportando || leads.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
            >
              <Download size={13} />
              {exportando ? 'Exportando...' : 'Excel'}
            </button>

            {/* Seleção Inteligente */}
            <button
              onClick={() => setShowSelecao(true)}
              disabled={actioning || transferindo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-medium hover:bg-[#1a2d4a] transition-colors disabled:opacity-50"
            >
              🎯 Selecionar Propensos
            </button>

            {campanha.status !== 'champion' && !campanha.is_champion && (
              <button onClick={() => executeStatusAction('champion')} disabled={actioning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#FDE68A] bg-[#FEF9C3] text-[#92400E] text-xs font-medium hover:bg-[#FEF3C7] transition-colors disabled:opacity-50">
                <Star size={13} /> Champion
              </button>
            )}
            {campanha.status === 'ativa' && (
              <button onClick={() => executeStatusAction('pausar')} disabled={actioning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50">
                <Pause size={13} /> Pausar
              </button>
            )}
            {(campanha.status === 'pausada' || campanha.status === 'rascunho') && (
              <button onClick={() => executeStatusAction('ativar')} disabled={actioning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#028090] text-white text-xs font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-50">
                <Play size={13} /> Ativar
              </button>
            )}
            {campanha.status !== 'encerrada' && (
              <button onClick={() => executeStatusAction('encerrar')} disabled={actioning}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] text-xs font-medium hover:bg-[#FEE2E2] transition-colors disabled:opacity-50">
                <XCircle size={13} /> Encerrar
              </button>
            )}
          </div>
        </div>
        {transferindo && (
          <div className="mt-3 flex items-center gap-2 text-sm text-[#028090]">
            <div className="w-4 h-4 border-2 border-[#028090] border-t-transparent rounded-full animate-spin" />
            Transferindo leads para o Kanban...
          </div>
        )}
      </div>

      {/* BLOCO A — Potencial Total */}
      <SectionBlock
        title="Potencial Total (100% da base)"
        subtitle="Se 100% dos leads converterem"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total de leads" value={campanha.total_leads.toLocaleString('pt-BR')}
            color="#028090" icon={Users} />
          <MetricCard label="Mensalidades totais" value={fmt(campanha.valor_total_potencial)}
            color="#028090" icon={DollarSign} />
          <MetricCard label="Comissão de entrada (1,5x)" value={fmt(campanha.comissao_entrada_potencial)}
            color="#02C39A" icon={TrendingUp} />
          <MetricCard label="Recorrente mensal (2%)" value={fmt(campanha.comissao_recorrente_potencial)}
            color="#02C39A" icon={Repeat} />
        </div>
      </SectionBlock>

      <hr className="border-[#E2E8F0]" />

      {/* BLOCO B — Visão Comercial */}
      <SectionBlock
        title="Visão Comercial (conversão estimada)"
        subtitle={`Baseado em ${pct}% de conversão estimada`}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Leads estimados" value={leadsConv.toLocaleString('pt-BR')}
            sub={`${pct}% de ${campanha.total_leads.toLocaleString('pt-BR')} leads`}
            color="#F59E0B" icon={Users} />
          <MetricCard label="Mensalidades esperadas" value={fmt(mensalidadesEsperadas)}
            color="#F59E0B" icon={DollarSign} />
          <MetricCard label="Comissão entrada esperada" value={fmt(comEntradaEsperada)}
            color="#028090" icon={TrendingUp} />
          <MetricCard label="Recorrente esperada/mês" value={fmt(recorrenteEsperada)}
            color="#028090" icon={Repeat} />
        </div>
      </SectionBlock>

      <hr className="border-[#E2E8F0]" />

      {/* Plan Info + Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <p className="text-xs font-semibold text-[#028090] uppercase tracking-wide mb-4">Distribuição por gênero</p>
            {leads.length > 0 ? (
              <div className="space-y-3">
                <DistBar label={`Feminino (${feminino})`} pct={pctFem} color="#028090" />
                <DistBar label={`Masculino (${masculino})`} pct={pctMas} color="#0A1628" />
              </div>
            ) : <p className="text-xs text-[#94A3B8]">Sem dados de gênero.</p>}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <p className="text-xs font-semibold text-[#028090] uppercase tracking-wide mb-4">Distribuição por faixa etária</p>
            <AgesDist leads={leads} />
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:col-span-2">
            <p className="text-xs font-semibold text-[#028090] uppercase tracking-wide mb-4">Status dos leads</p>
            <LeadsDist leads={leads} />
          </div>
        </div>
      </div>

      {/* Materiais */}
      <MaterialsBlock campanhaId={campanha.id} initialMateriais={initialMateriais} />

      {/* Leads Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0A1628]">Leads desta campanha</p>
          <span className="text-xs text-[#94A3B8]">{leads.length} total</span>
        </div>
        <LeadsTable leads={leads} />
      </div>

      {/* Modal Seleção Inteligente */}
      {showSelecao && (
        <SelecaoModal
          leads={leads}
          onClose={() => setShowSelecao(false)}
          onConfirm={handleSelecaoConfirm}
        />
      )}
    </div>
  )
}
