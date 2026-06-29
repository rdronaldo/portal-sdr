'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Clock,
  CheckCircle2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  PhoneCall,
  RefreshCw,
  Users,
  FilterX,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type TransferenciaData = {
  id: string
  transferido_em: string
  primeiro_contato_em: string | null
  status_parceiro: string | null
}

type QualificacaoData = {
  temperatura: string | null
  resumo_ia: string | null
}

type LeadRow = {
  id: string
  nome: string | null
  telefone: string
  cidade: string | null
  estado: string | null
  status: string
  criado_em: string
  percentual_renda: number | null
  renda_estimada: number | null
  valor_plano_total: number | null
  transferencias: TransferenciaData[] | null
  qualificacoes: QualificacaoData[] | null
}

type Filters = {
  temperatura: string
  status: string
  busca: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}

function formatTimeTaken(from: string, to: string): string {
  const ms = new Date(to).getTime() - new Date(from).getTime()
  return formatElapsed(ms)
}

function getTimerStyle(ms: number): { color: string; pulse: boolean } {
  const minutes = ms / 60000
  if (minutes < 30) return { color: '#02C39A', pulse: false }
  if (minutes < 120) return { color: '#F59E0B', pulse: false }
  return { color: '#EF4444', pulse: true }
}

// Spec-exact badge configs using style attributes for precise control
type BadgeStyle = { bg: string; text: string; border: string }

const TEMP_CONFIG: Record<string, BadgeStyle & { emoji: string; label: string }> = {
  quente: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', emoji: '🔥', label: 'Quente' },
  morno:  { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', emoji: '🌡️', label: 'Morno' },
  frio:   { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', emoji: '❄️', label: 'Frio' },
}

const STATUS_PARTNER_CONFIG: Record<string, BadgeStyle & { label: string }> = {
  recebido:       { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', label: 'Recebido' },
  trabalhando:    { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', label: 'Em andamento' },
  convertido:     { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', label: 'Convertido' },
  nao_convertido: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'Não convertido' },
}

// Lead own status (no transferencia)
const LEAD_STATUS_CONFIG: Record<string, BadgeStyle & { label: string }> = {
  novo:       { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', label: 'Novo' },
  disparado:  { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE', label: 'Disparado' },
  respondeu:  { bg: '#ECFEFF', text: '#155E75', border: '#A5F3FC', label: 'Respondeu' },
  qualificado:{ bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF', label: 'Qualificado' },
  transferido:{ bg: '#F0FDFA', text: '#065F46', border: '#99F6E4', label: 'Transferido' },
  frio:       { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', label: 'Frio' },
  opt_out:    { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'Opt-out' },
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters }: { filters: Filters }) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(filters.busca)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildUrl = useCallback(
    (overrides: Partial<Filters & { page: string }>) => {
      const merged = { ...filters, page: '1', ...overrides }
      const params = new URLSearchParams()
      if (merged.temperatura) params.set('temperatura', merged.temperatura)
      if (merged.status) params.set('status', merged.status)
      if (merged.busca) params.set('busca', merged.busca)
      if (merged.page && merged.page !== '1') params.set('page', merged.page)
      const qs = params.toString()
      return `/leads${qs ? `?${qs}` : ''}`
    },
    [filters]
  )

  // Debounced search push
  useEffect(() => {
    if (searchValue === filters.busca) return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      router.push(buildUrl({ busca: searchValue, page: '1' }))
    }, 400)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchValue, filters.busca, buildUrl, router])

  const hasFilters = filters.temperatura || filters.status || filters.busca

  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#0A1628] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090]"
        />
        {searchValue && (
          <button
            onClick={() => {
              setSearchValue('')
              router.push(buildUrl({ busca: '', page: '1' }))
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Temperatura */}
      <select
        value={filters.temperatura}
        onChange={(e) => router.push(buildUrl({ temperatura: e.target.value, page: '1' }))}
        className="py-2 px-3 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#0A1628] focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090] cursor-pointer"
      >
        <option value="">Todas as temperaturas</option>
        <option value="quente">🔥 Quente</option>
        <option value="morno">🌡️ Morno</option>
        <option value="frio">❄️ Frio</option>
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => router.push(buildUrl({ status: e.target.value, page: '1' }))}
        className="py-2 px-3 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#0A1628] focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090] cursor-pointer"
      >
        <option value="">Todos os status</option>
        <option value="recebido">Recebido</option>
        <option value="trabalhando">Em andamento</option>
        <option value="convertido">Convertido</option>
        <option value="nao_convertido">Não convertido</option>
      </select>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={() => {
            setSearchValue('')
            router.push('/leads')
          }}
          className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0A1628] transition-colors"
        >
          <FilterX size={14} />
          Limpar filtros
        </button>
      )}
    </div>
  )
}

// ─── Timer Cell ───────────────────────────────────────────────────────────────

function TimerCell({
  transferidoEm,
  primeiroContatoEm,
  now,
}: {
  transferidoEm: string
  primeiroContatoEm: string | null
  now: number
}) {
  if (primeiroContatoEm) {
    const taken = formatTimeTaken(transferidoEm, primeiroContatoEm)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#10B981] font-medium">
        <CheckCircle2 size={12} />
        Contatado em {taken}
      </span>
    )
  }

  const elapsed = now - new Date(transferidoEm).getTime()
  const { color, pulse } = getTimerStyle(elapsed)

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
        pulse ? 'animate-pulse' : ''
      }`}
      style={{ color, backgroundColor: `${color}18` }}
    >
      <Clock size={11} />
      {formatElapsed(elapsed)}
    </span>
  )
}

// ─── Contact Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  name,
  onConfirm,
  onCancel,
  saving,
}: {
  name: string
  onConfirm: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="w-12 h-12 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={24} className="text-[#10B981]" />
        </div>
        <h3 className="text-base font-bold text-[#0A1628] text-center mb-2">
          Registrar contato
        </h3>
        <p className="text-sm text-[#64748B] text-center mb-6">
          Confirmar que você já entrou em contato com{' '}
          <strong className="text-[#0A1628]">{name}</strong>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status Dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({
  transferenciaId,
  currentStatus,
  onUpdate,
}: {
  transferenciaId: string
  currentStatus: string
  onUpdate: (newStatus: string) => void
}) {
  const [saving, setSaving] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transferencias')
      .update({ status_parceiro: newStatus })
      .eq('id', transferenciaId)
    setSaving(false)
    if (error) {
      toast.error('Erro ao atualizar status.')
      return
    }
    onUpdate(newStatus)
    toast.success('Status atualizado com sucesso.')
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={saving}
      className="text-xs border border-[#E2E8F0] rounded-md px-2 py-1 bg-white text-[#0A1628] focus:outline-none focus:ring-2 focus:ring-[#028090]/30 disabled:opacity-50 cursor-pointer"
    >
      <option value="recebido">Recebido</option>
      <option value="trabalhando">Em andamento</option>
      <option value="convertido">Convertido</option>
      <option value="nao_convertido">Não convertido</option>
    </select>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  pageSize,
  filters,
}: {
  page: number
  total: number
  pageSize: number
  filters: Filters
}) {
  const router = useRouter()
  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const buildUrl = (p: number) => {
    const params = new URLSearchParams()
    if (filters.temperatura) params.set('temperatura', filters.temperatura)
    if (filters.status) params.set('status', filters.status)
    if (filters.busca) params.set('busca', filters.busca)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/leads${qs ? `?${qs}` : ''}`
  }

  if (total === 0) return null

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-[#64748B]">
        Mostrando {from} a {to} de {total} leads
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(buildUrl(page - 1))}
          disabled={page <= 1}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={13} />
          Anterior
        </button>
        <span className="text-xs text-[#64748B] px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => router.push(buildUrl(page + 1))}
          disabled={page >= totalPages}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Próxima
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadsClient({
  leads: initialLeads,
  total,
  page,
  pageSize,
  filters,
}: {
  leads: LeadRow[]
  total: number
  page: number
  pageSize: number
  filters: Filters
}) {
  const [leads, setLeads] = useState(initialLeads)
  const [now, setNow] = useState(Date.now())
  const [modal, setModal] = useState<{ transferenciaId: string; nome: string } | null>(null)
  const [savingModal, setSavingModal] = useState(false)

  // Sync when server re-renders with new data
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  // Timer tick every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  const handleConfirmContact = useCallback(async () => {
    if (!modal) return
    setSavingModal(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transferencias')
      .update({ primeiro_contato_em: new Date().toISOString() })
      .eq('id', modal.transferenciaId)
    setSavingModal(false)
    if (error) {
      toast.error('Erro ao registrar contato.')
      return
    }
    // Optimistic: mark as contacted in state
    setLeads((prev) =>
      prev.map((lead) => {
        if (!lead.transferencias) return lead
        return {
          ...lead,
          transferencias: lead.transferencias.map((t) =>
            t.id === modal.transferenciaId
              ? { ...t, primeiro_contato_em: new Date().toISOString() }
              : t
          ),
        }
      })
    )
    toast.success(`Contato registrado para ${modal.nome}`)
    setModal(null)
  }, [modal])

  const handleStatusUpdate = useCallback((leadId: string, transId: string, newStatus: string) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId || !lead.transferencias) return lead
        return {
          ...lead,
          transferencias: lead.transferencias.map((t) =>
            t.id === transId ? { ...t, status_parceiro: newStatus } : t
          ),
        }
      })
    )
  }, [])

  const hasFilters = filters.temperatura || filters.status || filters.busca

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1628]">Leads</h1>
        <p className="text-[#64748B] mt-1">
          {total} {total === 1 ? 'lead encontrado' : 'leads encontrados'}
        </p>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} />

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {leads.length === 0 ? (
          /* Empty state */
          <div className="py-20 text-center">
            {hasFilters ? (
              <>
                <div className="w-12 h-12 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <FilterX size={22} className="text-[#94A3B8]" />
                </div>
                <p className="text-sm font-medium text-[#0A1628]">Nenhum resultado para esses filtros</p>
                <p className="text-xs text-[#64748B] mt-1">Tente ajustar os filtros ou limpe-os para ver todos os leads.</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={22} className="text-[#94A3B8]" />
                </div>
                <p className="text-sm font-medium text-[#0A1628]">Nenhum lead ainda</p>
                <p className="text-xs text-[#64748B] mt-1">Os leads aparecerão aqui após chegarem via WhatsApp + n8n.</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F8FB] border-b border-[#E2E8F0]">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap">Telefone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap">Cidade/Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap">Temperatura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] max-w-[200px]">Resumo da IA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap">Renda vs Plano</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap">Aguardando/Contatado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const trans = lead.transferencias?.[0] ?? null
                  const qual = lead.qualificacoes?.[0] ?? null
                  const localidade = [lead.cidade, lead.estado].filter(Boolean).join(' / ') || '—'
                  const statusKey = trans?.status_parceiro || lead.status || ''

                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors"
                    >
                      {/* Nome */}
                      <td className="px-4 py-3 font-medium text-[#0A1628] whitespace-nowrap">
                        {lead.nome || '—'}
                      </td>

                      {/* Telefone */}
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                        {lead.telefone || '—'}
                      </td>

                      {/* Cidade/Estado */}
                      <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                        {localidade}
                      </td>

                      {/* Temperatura */}
                      <td className="px-4 py-3">
                        {qual?.temperatura && TEMP_CONFIG[qual.temperatura] ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                            style={{
                              backgroundColor: TEMP_CONFIG[qual.temperatura].bg,
                              color: TEMP_CONFIG[qual.temperatura].text,
                              borderColor: TEMP_CONFIG[qual.temperatura].border,
                            }}
                          >
                            {TEMP_CONFIG[qual.temperatura].emoji} {TEMP_CONFIG[qual.temperatura].label}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8] text-xs">—</span>
                        )}
                      </td>

                      {/* Resumo da IA */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs text-[#64748B] truncate" title={qual?.resumo_ia ?? ''}>
                          {qual?.resumo_ia || '—'}
                        </p>
                      </td>

                      {/* Renda vs Plano */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lead.percentual_renda != null && lead.renda_estimada ? (() => {
                          const p = lead.percentual_renda!
                          const { bg, text } = p <= 10
                            ? { bg: '#ECFDF5', text: '#065F46' }
                            : p <= 20
                            ? { bg: '#FFFBEB', text: '#92400E' }
                            : { bg: '#FEF2F2', text: '#991B1B' }
                          const pStr = p.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                          return (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ backgroundColor: bg, color: text }}>
                              {pStr}%
                            </span>
                          )
                        })() : <span className="text-[#94A3B8] text-xs">—</span>}
                      </td>

                      {/* Aguardando/Contatado */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {trans ? (
                          <TimerCell
                            transferidoEm={trans.transferido_em}
                            primeiroContatoEm={trans.primeiro_contato_em}
                            now={now}
                          />
                        ) : (
                          <span className="text-[#94A3B8] text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {trans ? (
                          <StatusDropdown
                            transferenciaId={trans.id}
                            currentStatus={trans.status_parceiro || 'recebido'}
                            onUpdate={(newStatus) => handleStatusUpdate(lead.id, trans.id, newStatus)}
                          />
                        ) : (
                          (() => {
                            const cfg = LEAD_STATUS_CONFIG[statusKey]
                            return cfg ? (
                              <span
                                className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                                style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                              >
                                {cfg.label}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                {statusKey}
                              </span>
                            )
                          })()
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Ver detalhes */}
                          <Link
                            href={`/leads/${lead.id}`}
                            className="flex items-center gap-1 text-xs font-medium text-[#028090] hover:text-[#026d7a] transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={13} />
                            Detalhes
                          </Link>

                          {/* Registrar contato (only if transferred and not yet contacted) */}
                          {trans && !trans.primeiro_contato_em && (
                            <button
                              onClick={() =>
                                setModal({
                                  transferenciaId: trans.id,
                                  nome: lead.nome || 'Lead',
                                })
                              }
                              className="flex items-center gap-1 text-xs font-medium text-white bg-[#028090] hover:bg-[#026d7a] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                              title="Registrar contato"
                            >
                              <PhoneCall size={11} />
                              Contato
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination page={page} total={total} pageSize={pageSize} filters={filters} />

      {/* Modal */}
      {modal && (
        <ConfirmModal
          name={modal.nome}
          onConfirm={handleConfirmContact}
          onCancel={() => setModal(null)}
          saving={savingModal}
        />
      )}
    </div>
  )
}
