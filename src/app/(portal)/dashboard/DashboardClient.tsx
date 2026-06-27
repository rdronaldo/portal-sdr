'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRightLeft,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  CheckCheck,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Metrics = {
  transferidos: number
  leadsQuentes: number
  aguardandoContato: number
  convertidos: number
  naoConvertidos: number
}

type Funnel = {
  disparados: number
  responderam: number
  transferidos: number
  convertidos: number
}

type AguardandoItem = {
  id: string
  lead_id: string
  transferido_em: string
  leads: {
    id: string
    nome: string | null
    cidade: string | null
    estado: string | null
    qualificacoes: Array<{
      temperatura: string | null
      resumo_ia: string | null
    }> | null
  } | null
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[#E2E8F0] rounded ${className}`} />
  )
}

// ─── Timer ───────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}

function getTimerStyle(ms: number): { color: string; pulse: boolean } {
  const minutes = ms / 60000
  if (minutes < 30) return { color: '#02C39A', pulse: false }
  if (minutes < 120) return { color: '#F59E0B', pulse: false }
  return { color: '#EF4444', pulse: true }
}

function ContactTimer({ transferidoEm, now }: { transferidoEm: string; now: number }) {
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

// ─── Metric Cards ─────────────────────────────────────────────────────────────

const METRIC_CONFIG = [
  {
    key: 'transferidos' as keyof Metrics,
    label: 'Transferidos',
    icon: ArrowRightLeft,
    iconColor: '#028090',
    iconBg: '#E0F7FA',
    numberColor: '#028090',
  },
  {
    key: 'leadsQuentes' as keyof Metrics,
    label: 'Leads Quentes',
    icon: Flame,
    iconColor: '#02C39A',
    iconBg: '#ECFDF5',
    numberColor: '#02C39A',
  },
  {
    key: 'aguardandoContato' as keyof Metrics,
    label: 'Aguardando Contato',
    icon: Clock,
    iconColor: '#F59E0B',
    iconBg: '#FFFBEB',
    numberColor: '#F59E0B',
  },
  {
    key: 'convertidos' as keyof Metrics,
    label: 'Convertidos',
    icon: CheckCircle2,
    iconColor: '#02C39A',
    iconBg: '#ECFDF5',
    numberColor: '#02C39A',
  },
  {
    key: 'naoConvertidos' as keyof Metrics,
    label: 'Não Convertidos',
    icon: XCircle,
    iconColor: '#EF4444',
    iconBg: '#FEE2E2',
    numberColor: '#EF4444',
  },
]

function MetricCards({ metrics, loading }: { metrics: Metrics; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {METRIC_CONFIG.map(({ key, label, icon: Icon, iconColor, iconBg, numberColor }) => (
        <div
          key={key}
          className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#64748B] leading-tight">{label}</p>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={16} style={{ color: iconColor }} />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold" style={{ color: numberColor }}>{metrics[key]}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Funnel ──────────────────────────────────────────────────────────────────

const FUNNEL_STEPS = [
  { key: 'disparados' as keyof Funnel, label: 'Disparados' },
  { key: 'responderam' as keyof Funnel, label: 'Responderam' },
  { key: 'transferidos' as keyof Funnel, label: 'Transferidos' },
  { key: 'convertidos' as keyof Funnel, label: 'Convertidos' },
]

function FunnelChart({ funnel, loading }: { funnel: Funnel; loading: boolean }) {
  const max = Math.max(...Object.values(funnel), 1)

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm mb-8">
      <h2 className="text-base font-semibold text-[#0A1628] mb-5">Funil de Conversão</h2>

      <div className="space-y-3">
        {FUNNEL_STEPS.map(({ key, label }, i) => {
          const value = funnel[key]
          const prev = i > 0 ? funnel[FUNNEL_STEPS[i - 1].key] : null
          const pct = prev && prev > 0 ? Math.round((value / prev) * 100) : null
          const barWidth = max > 0 ? (value / max) * 100 : 0

          return (
            <div key={key} className="flex items-center gap-4">
              <div className="w-28 text-right text-xs font-semibold text-[#0A1628] shrink-0">{label}</div>
              <div className="flex-1 flex items-center gap-3">
                {loading ? (
                  <Skeleton className="h-7 flex-1" />
                ) : (
                  <>
                    <div className="flex-1 bg-[#E2E8F0] rounded-full h-7 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center pl-3 transition-all duration-700"
                        style={{
                          width: `${Math.max(barWidth, 4)}%`,
                          background: 'linear-gradient(to right, #028090, #02C39A)',
                        }}
                      >
                        <span className="text-white text-xs font-bold whitespace-nowrap">
                          {value}
                        </span>
                      </div>
                    </div>
                    {pct !== null && (
                      <span className="text-xs text-[#64748B] w-16 shrink-0">
                        {pct}% anterior
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

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

// ─── Waiting Table ────────────────────────────────────────────────────────────

function WaitingTable({
  initialItems,
  loading,
}: {
  initialItems: AguardandoItem[]
  loading: boolean
}) {
  const [items, setItems] = useState(initialItems)
  const [now, setNow] = useState(Date.now())
  const [modalItem, setModalItem] = useState<AguardandoItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Update "now" every 30 seconds for the timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  // Sync with server data when it arrives
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const handleConfirm = useCallback(async () => {
    if (!modalItem) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('transferencias')
      .update({ primeiro_contato_em: new Date().toISOString() })
      .eq('id', modalItem.id)

    setSaving(false)

    if (error) {
      toast.error('Erro ao registrar contato. Tente novamente.')
      return
    }

    const name = modalItem.leads?.nome || 'Lead'
    setItems((prev) => prev.filter((i) => i.id !== modalItem.id))
    setModalItem(null)
    toast.success(`Contato registrado para ${name}`)
  }, [modalItem])

  const temperaturaBadge = (temp: string | null | undefined) => {
    if (temp === 'quente') return 'bg-red-100 text-red-700'
    if (temp === 'morno') return 'bg-amber-100 text-amber-700'
    if (temp === 'frio') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0A1628]">Aguardando seu contato</h2>
        {!loading && (
          <span className="text-xs bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full">
            {items.length} leads
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCheck size={24} className="text-[#10B981]" />
          </div>
          <p className="text-sm font-medium text-[#0A1628]">Você está em dia!</p>
          <p className="text-xs text-[#64748B] mt-1">
            Nenhum lead aguardando contato. ✓
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B]">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B]">Cidade/Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B]">Temperatura</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B]">Resumo da IA</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B]">Aguardando há</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const lead = item.leads
                const qual = lead?.qualificacoes?.[0]
                const localidade = [lead?.cidade, lead?.estado].filter(Boolean).join(' / ') || '—'

                return (
                  <tr
                    key={item.id}
                    className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#0A1628]">
                      {lead?.nome || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{localidade}</td>
                    <td className="px-4 py-3">
                      {qual?.temperatura ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${temperaturaBadge(qual.temperatura)}`}
                        >
                          {qual.temperatura}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#64748B] max-w-xs">
                      <p className="truncate text-xs">
                        {qual?.resumo_ia || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <ContactTimer transferidoEm={item.transferido_em} now={now} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModalItem(item)}
                        className="text-xs font-medium text-white bg-[#028090] hover:bg-[#026d7a] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Registrar contato
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalItem && (
        <ConfirmModal
          name={modalItem.leads?.nome || 'Lead'}
          onConfirm={handleConfirm}
          onCancel={() => setModalItem(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export type DashboardData = {
  metrics: Metrics
  funnel: Funnel
  aguardandoLista: AguardandoItem[]
}

export default function DashboardClient({
  data,
}: {
  data: DashboardData
}) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0A1628]" style={{ fontFamily: 'Inter, sans-serif' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>Visão geral dos leads qualificados por IA</p>
      </div>

      <MetricCards metrics={data.metrics} loading={false} />
      <FunnelChart funnel={data.funnel} loading={false} />
      <WaitingTable initialItems={data.aguardandoLista} loading={false} />
    </div>
  )
}
