'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  MessageSquare,
  Thermometer,
  AlertCircle,
  TrendingUp,
  ExternalLink,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Lead = {
  id: string
  nome: string | null
  telefone: string
  email: string | null
  cidade: string | null
  estado: string | null
  status: string
  criado_em: string
  data_nascimento?: string | null
}

type Qualificacao = {
  id: string
  lead_id: string
  temperatura: string | null
  resumo_ia: string | null
  para_quem?: string | null
  tem_plano_atual?: boolean | null
  esforco_esperado?: string | null
  objecoes?: string[] | null
  sinais_compra?: string[] | null
} | null

type Transferencia = {
  id: string
  lead_id: string
  transferido_em: string
  primeiro_contato_em: string | null
  status_parceiro: string | null
  notas_parceiro: string | null
} | null

type Conversa = {
  id: string
  direcao: string
  mensagem: string
  criado_em: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

type BadgeStyle = { bg: string; text: string; border: string }

const ALL_STATUS_CONFIG: Record<string, BadgeStyle & { label: string }> = {
  recebido:       { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', label: 'Recebido' },
  trabalhando:    { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', label: 'Em andamento' },
  convertido:     { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', label: 'Convertido' },
  nao_convertido: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'Não convertido' },
  novo:           { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', label: 'Novo' },
  disparado:      { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE', label: 'Disparado' },
  respondeu:      { bg: '#ECFEFF', text: '#155E75', border: '#A5F3FC', label: 'Respondeu' },
  qualificado:    { bg: '#FAF5FF', text: '#6B21A8', border: '#E9D5FF', label: 'Qualificado' },
  transferido:    { bg: '#F0FDFA', text: '#065F46', border: '#99F6E4', label: 'Transferido' },
  frio:           { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', label: 'Frio' },
  opt_out:        { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'Opt-out' },
}

const TEMP_CONFIG: Record<string, BadgeStyle & { label: string; emoji: string; cardBg: string }> = {
  quente: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', label: 'Quente', emoji: '🔥', cardBg: '#F0FDF4' },
  morno:  { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', label: 'Morno',  emoji: '🌡️', cardBg: '#FFFDF0' },
  frio:   { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', label: 'Frio',   emoji: '❄️', cardBg: '#F8FAFC' },
}

const ESFORCO_CONFIG: Record<string, { label: string; color: string }> = {
  baixo: { label: 'Baixo', color: 'text-green-600' },
  medio: { label: 'Médio', color: 'text-amber-600' },
  alto: { label: 'Alto', color: 'text-orange-600' },
  altissimo: { label: 'Altíssimo', color: 'text-red-600' },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E2E8F0] rounded ${className}`} />
}

// ─── Contact Modal ─────────────────────────────────────────────────────────────

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
        <h3 className="text-base font-bold text-[#0A1628] text-center mb-2">Registrar contato</h3>
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

// ─── Left Column — Lead Info ───────────────────────────────────────────────────

function LeadInfo({
  lead,
  transferencia,
  statusKey,
  now,
  onContact,
}: {
  lead: Lead
  transferencia: Transferencia
  statusKey: string
  now: number
  onContact: () => void
}) {
  const trans = transferencia
  const showTimer = trans && !trans.primeiro_contato_em
  const elapsed = showTimer ? now - new Date(trans.transferido_em).getTime() : 0
  const timerStyle = showTimer ? getTimerStyle(elapsed) : null

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
      {/* Nome */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A1628]">{lead.nome || 'Lead sem nome'}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {(() => {
            const cfg = ALL_STATUS_CONFIG[statusKey]
            return cfg ? (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
              >
                {cfg.label}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                {statusKey}
              </span>
            )
          })()}
          {showTimer && timerStyle && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${timerStyle.pulse ? 'animate-pulse' : ''}`}
              style={{ color: timerStyle.color, backgroundColor: `${timerStyle.color}18` }}
            >
              <Clock size={11} />
              Aguardando há {formatElapsed(elapsed)}
            </span>
          )}
        </div>
      </div>

      <hr className="border-[#F1F5F9]" />

      {/* Info rows */}
      <div className="space-y-3">
        {/* Telefone */}
        <div className="flex items-start gap-3">
          <Phone size={15} className="text-[#028090] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#94A3B8] mb-0.5">Telefone</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[#0A1628]">{lead.telefone || '—'}</span>
              {lead.telefone && (
                <a
                  href={`https://wa.me/55${cleanPhone(lead.telefone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-white bg-[#25D366] hover:bg-[#1ebe5d] px-2.5 py-1 rounded-lg font-medium transition-colors"
                >
                  <ExternalLink size={10} />
                  Abrir WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start gap-3">
          <Mail size={15} className="text-[#028090] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-[#94A3B8] mb-0.5">E-mail</p>
            <p className="text-sm text-[#0A1628]">{lead.email || '—'}</p>
          </div>
        </div>

        {/* Cidade/Estado */}
        <div className="flex items-start gap-3">
          <MapPin size={15} className="text-[#028090] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-[#94A3B8] mb-0.5">Localização</p>
            <p className="text-sm text-[#0A1628]">
              {[lead.cidade, lead.estado].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
        </div>

        {/* Data de nascimento */}
        {lead.data_nascimento && (
          <div className="flex items-start gap-3">
            <Calendar size={15} className="text-[#028090] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-[#94A3B8] mb-0.5">Data de nascimento</p>
              <p className="text-sm text-[#0A1628]">{formatDate(lead.data_nascimento)}</p>
            </div>
          </div>
        )}

        {/* Lead desde */}
        <div className="flex items-start gap-3">
          <Calendar size={15} className="text-[#64748B] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-[#94A3B8] mb-0.5">Lead desde</p>
            <p className="text-sm text-[#0A1628]">{formatDate(lead.criado_em)}</p>
          </div>
        </div>
      </div>

      {/* Botão registrar contato */}
      {showTimer && (
        <button
          onClick={onContact}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors"
        >
          <CheckCircle2 size={15} />
          Registrar contato
        </button>
      )}

      {trans?.primeiro_contato_em && (
        <div className="flex items-center gap-2 text-xs text-[#10B981]">
          <CheckCircle2 size={14} />
          Contatado em {formatDate(trans.primeiro_contato_em)} às {formatTime(trans.primeiro_contato_em)}
        </div>
      )}
    </div>
  )
}

// ─── Right Column — Qualificação ───────────────────────────────────────────────

function QualCard({ qualificacao }: { qualificacao: Qualificacao }) {
  if (!qualificacao) {
    return (
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
        <p className="text-sm text-[#94A3B8] text-center py-8">Nenhuma qualificação da IA registrada.</p>
      </div>
    )
  }

  const temp = qualificacao.temperatura
  const tempConfig = temp ? TEMP_CONFIG[temp] : null
  const esforco = qualificacao.esforco_esperado
  const esforcoConfig = esforco ? ESFORCO_CONFIG[esforco.toLowerCase()] : null
  const objecoes = qualificacao.objecoes ?? []
  const sinais = qualificacao.sinais_compra ?? []

  const paraQuemLabel: Record<string, string> = {
    individual: 'Individual',
    familia: 'Família',
    empresa: 'Empresa',
  }

  const temPlanoLabel =
    qualificacao.tem_plano_atual === true
      ? 'Sim'
      : qualificacao.tem_plano_atual === false
      ? 'Não'
      : 'Não informado'

  return (
    <div
      className="rounded-xl border-l-4 shadow-sm p-6 space-y-5"
      style={{
        backgroundColor: tempConfig?.cardBg ?? '#F4F8FB',
        borderLeftColor: '#028090',
        borderTopColor: '#E2E8F0',
        borderRightColor: '#E2E8F0',
        borderBottomColor: '#E2E8F0',
        border: '1px solid #E2E8F0',
        borderLeft: '4px solid #028090',
      }}
    >
      {/* Temperatura badge */}
      {tempConfig && (
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-2 text-sm font-bold px-4 py-1.5 rounded-full border"
            style={{ backgroundColor: tempConfig.bg, color: tempConfig.text, borderColor: tempConfig.border }}
          >
            <span className="text-base">{tempConfig.emoji}</span>
            {tempConfig.label}
          </span>
        </div>
      )}

      {/* Resumo da IA */}
      {qualificacao.resumo_ia && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-[#028090] mb-1">Resumo da IA</p>
          <p className="text-sm text-[#0A1628] leading-relaxed italic">{qualificacao.resumo_ia}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Para quem é o plano */}
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-[#94A3B8] mb-1">Para quem é o plano</p>
          <p className="text-sm font-medium text-[#0A1628]">
            {qualificacao.para_quem
              ? paraQuemLabel[qualificacao.para_quem] ?? qualificacao.para_quem
              : 'Não informado'}
          </p>
        </div>

        {/* Tem plano atual */}
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-[#94A3B8] mb-1">Tem plano atual</p>
          <p className="text-sm font-medium text-[#0A1628]">{temPlanoLabel}</p>
        </div>
      </div>

      {/* Esforço esperado */}
      {esforco && (
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-[#94A3B8] mb-1">Esforço esperado</p>
          <div className="flex items-center gap-1.5">
            <Thermometer size={14} className={esforcoConfig?.color ?? 'text-[#64748B]'} />
            <p className={`text-sm font-medium ${esforcoConfig?.color ?? 'text-[#0A1628]'}`}>
              {esforcoConfig?.label ?? esforco}
            </p>
          </div>
        </div>
      )}

      {/* Objeções */}
      <div>
        <p className="text-xs font-semibold text-[#64748B] mb-2 flex items-center gap-1">
          <AlertCircle size={12} />
          Objeções identificadas
        </p>
        {objecoes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {objecoes.map((obj, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium border" style={{ backgroundColor: '#FEF2F2', color: '#991B1B', borderColor: '#FECACA' }}>
                {obj}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#94A3B8]">Nenhuma objeção identificada</p>
        )}
      </div>

      {/* Sinais de compra */}
      <div>
        <p className="text-xs font-semibold text-[#64748B] mb-2 flex items-center gap-1">
          <TrendingUp size={12} />
          Sinais de compra
        </p>
        {sinais.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {sinais.map((sinal, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium border" style={{ backgroundColor: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0' }}>
                {sinal}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#94A3B8]">Nenhum sinal identificado</p>
        )}
      </div>
    </div>
  )
}

// ─── Conversation Timeline ─────────────────────────────────────────────────────

function ConversationTimeline({ conversas }: { conversas: Conversa[] }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
      <h2 className="text-sm font-semibold text-[#0A1628] mb-5 flex items-center gap-2">
        <MessageSquare size={15} className="text-[#028090]" />
        Conversa com a IA
      </h2>

      {conversas.length === 0 ? (
        <p className="text-sm text-[#94A3B8] text-center py-8">Nenhuma mensagem registrada ainda.</p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {conversas.map((msg) => {
            const isIA = msg.direcao === 'saida'
            return (
              <div key={msg.id} className={`flex flex-col ${isIA ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-[#94A3B8] mb-1 px-1">{isIA ? 'IA' : 'Lead'}</span>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isIA
                      ? 'bg-[#028090] text-white rounded-tr-sm'
                      : 'bg-[#F1F5F9] text-[#0A1628] rounded-tl-sm'
                  }`}
                >
                  {msg.mensagem}
                </div>
                <span className="text-xs text-[#94A3B8] mt-1 px-1">{formatTime(msg.criado_em)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Notes Section ─────────────────────────────────────────────────────────────

function NotesSection({
  transferenciaId,
  initialNotes,
}: {
  transferenciaId: string | null
  initialNotes: string | null
}) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!transferenciaId) {
      toast.error('Nenhuma transferência associada a este lead.')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transferencias')
      .update({ notas_parceiro: notes })
      .eq('id', transferenciaId)
    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar nota.')
      return
    }
    toast.success('Nota salva com sucesso.')
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
      <h2 className="text-sm font-semibold text-[#0A1628] mb-4">Notas do vendedor</h2>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Adicione suas anotações sobre este lead..."
        rows={4}
        className="w-full text-sm border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-[#0A1628] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090] resize-none"
      />
      <div className="mt-3 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !transferenciaId}
          className="px-4 py-2 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar nota'}
        </button>
      </div>
    </div>
  )
}

// ─── Status Update Section ─────────────────────────────────────────────────────

function StatusSection({
  transferenciaId,
  currentStatus,
  onStatusChange,
}: {
  transferenciaId: string | null
  currentStatus: string
  onStatusChange: (s: string) => void
}) {
  const [selected, setSelected] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!transferenciaId) {
      toast.error('Nenhuma transferência associada a este lead.')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transferencias')
      .update({ status_parceiro: selected })
      .eq('id', transferenciaId)
    setSaving(false)
    if (error) {
      toast.error('Erro ao atualizar status.')
      return
    }
    onStatusChange(selected)
    toast.success('Status atualizado com sucesso.')
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
      <h2 className="text-sm font-semibold text-[#0A1628] mb-4">Atualizar status</h2>
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={!transferenciaId}
          className="flex-1 min-w-[180px] py-2 px-3 text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#0A1628] focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090] disabled:opacity-50"
        >
          <option value="recebido">Recebido</option>
          <option value="trabalhando">Em andamento</option>
          <option value="convertido">Convertido</option>
          <option value="nao_convertido">Não convertido</option>
        </select>
        <button
          onClick={handleConfirm}
          disabled={saving || !transferenciaId || selected === currentStatus}
          className="px-4 py-2 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Confirmar'}
        </button>
      </div>
      {!transferenciaId && (
        <p className="text-xs text-[#94A3B8] mt-2">
          Este lead ainda não foi transferido — nenhum status de parceiro disponível.
        </p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadDetailClient({
  lead,
  qualificacao,
  transferencia,
  conversas,
}: {
  lead: Lead
  qualificacao: Qualificacao
  transferencia: Transferencia
  conversas: Conversa[]
}) {
  const router = useRouter()
  const [now, setNow] = useState(Date.now())
  const [trans, setTrans] = useState(transferencia)
  const [statusKey, setStatusKey] = useState(
    transferencia?.status_parceiro || lead.status || 'novo'
  )
  const [modal, setModal] = useState(false)
  const [savingModal, setSavingModal] = useState(false)

  // Timer tick every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  const handleConfirmContact = useCallback(async () => {
    if (!trans) return
    setSavingModal(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('transferencias')
      .update({ primeiro_contato_em: new Date().toISOString() })
      .eq('id', trans.id)
    setSavingModal(false)
    if (error) {
      toast.error('Erro ao registrar contato.')
      return
    }
    setTrans((prev) => prev ? { ...prev, primeiro_contato_em: new Date().toISOString() } : prev)
    setModal(false)
    toast.success(`Contato registrado para ${lead.nome ?? 'Lead'}`)
  }, [trans, lead.nome])

  const handleStatusChange = useCallback((newStatus: string) => {
    setStatusKey(newStatus)
    if (trans) setTrans((prev) => prev ? { ...prev, status_parceiro: newStatus } : prev)
  }, [trans])

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0A1628] mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Voltar para Leads
      </button>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Left 40% */}
        <div className="lg:w-[40%]">
          <LeadInfo
            lead={lead}
            transferencia={trans}
            statusKey={statusKey}
            now={now}
            onContact={() => setModal(true)}
          />
        </div>

        {/* Right 60% */}
        <div className="lg:w-[60%]">
          <QualCard qualificacao={qualificacao} />
        </div>
      </div>

      {/* Conversation */}
      <div className="mb-6">
        <ConversationTimeline conversas={conversas} />
      </div>

      {/* Notes + Status — side by side on desktop */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <NotesSection
            transferenciaId={trans?.id ?? null}
            initialNotes={trans?.notas_parceiro ?? null}
          />
        </div>
        <div className="lg:w-80">
          <StatusSection
            transferenciaId={trans?.id ?? null}
            currentStatus={trans?.status_parceiro ?? 'recebido'}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ConfirmModal
          name={lead.nome ?? 'Lead'}
          onConfirm={handleConfirmContact}
          onCancel={() => setModal(false)}
          saving={savingModal}
        />
      )}
    </div>
  )
}
