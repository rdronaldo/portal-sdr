'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  gerarCodigoCampanha,
  calcularIdade,
  excelSerialToDate,
  getPrecoPorIdade,
  getSigno,
} from '@/lib/campanhas'
import { Copy, Check, Upload, ChevronLeft, ChevronRight, Save, Zap } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ProcessedLead = {
  nome: string
  telefone: string
  cnpj: string
  nome_empresa: string
  cnae: string
  sexo: string
  data_nascimento: string
  vida2_data_nascimento: string
  vida3_data_nascimento: string
  renda_estimada: number
  idade1: number
  idade2: number
  idade3: number
  // Calculated in step 4:
  valor_plano_vida1: number
  valor_plano_vida2: number
  valor_plano_vida3: number
  valor_plano_total: number
  percentual_renda: number | null
  comissao_entrada: number
  comissao_recorrente: number
  status: string
  campanha_id?: string
}

type Precos = {
  preco_0_18: number; preco_19_23: number; preco_24_28: number
  preco_29_33: number; preco_34_38: number; preco_39_43: number
  preco_44_48: number; preco_49_53: number; preco_54_58: number
  preco_59_mais: number
}

type WizardData = {
  // Step 1
  codigo: string
  versao: string
  nome_descritivo: string
  // Step 2
  canal: string[]
  formatos: string[]
  horario_tipo: string
  horario_inicio: string
  horario_fim: string
  dias_semana: string[]
  percentual_conversao: number
  // Step 3
  rawRows: any[]
  processedLeads: ProcessedLead[]
  fileName: string
  // Step 4
  nome_plano: string
  operadora: string
  acomodacao: string
  coparticipacao: string
  abrangencia: string
  municipio: string
  rede_referenciada: string
  precos: Precos
}

const PRECO_FAIXAS: { key: keyof Precos; label: string }[] = [
  { key: 'preco_0_18',   label: '0 a 18 anos' },
  { key: 'preco_19_23',  label: '19 a 23 anos' },
  { key: 'preco_24_28',  label: '24 a 28 anos' },
  { key: 'preco_29_33',  label: '29 a 33 anos' },
  { key: 'preco_34_38',  label: '34 a 38 anos' },
  { key: 'preco_39_43',  label: '39 a 43 anos' },
  { key: 'preco_44_48',  label: '44 a 48 anos' },
  { key: 'preco_49_53',  label: '49 a 53 anos' },
  { key: 'preco_54_58',  label: '54 a 58 anos' },
  { key: 'preco_59_mais',label: '59 anos +' },
]

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const emptyPrecos: Precos = {
  preco_0_18: 0, preco_19_23: 0, preco_24_28: 0, preco_29_33: 0,
  preco_34_38: 0, preco_39_43: 0, preco_44_48: 0, preco_49_53: 0,
  preco_54_58: 0, preco_59_mais: 0,
}

const initialData: WizardData = {
  codigo: '', versao: 'A', nome_descritivo: '',
  canal: [], formatos: [], horario_tipo: 'dias_uteis',
  horario_inicio: '08:00', horario_fim: '18:00', dias_semana: [],
  percentual_conversao: 2,
  rawRows: [], processedLeads: [], fileName: '',
  nome_plano: '', operadora: '', acomodacao: '', coparticipacao: '',
  abrangencia: '', municipio: '', rede_referenciada: '',
  precos: { ...emptyPrecos },
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = ['Identificação', 'Abordagem', 'Base de leads', 'Produto e preços']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors"
                style={{
                  backgroundColor: done ? '#02C39A' : active ? '#028090' : '#E2E8F0',
                  borderColor: done ? '#02C39A' : active ? '#028090' : '#CBD5E1',
                  color: done || active ? '#fff' : '#94A3B8',
                }}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span className="text-xs mt-1 whitespace-nowrap" style={{ color: active ? '#028090' : done ? '#02C39A' : '#94A3B8', fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-5"
                style={{ backgroundColor: i < current ? '#02C39A' : '#E2E8F0' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── STEP 1: Identificação ────────────────────────────────────────────────────

function Step1({ data, onChange, onNext, onCancel }: {
  data: WizardData
  onChange: (d: Partial<WizardData>) => void
  onNext: () => void
  onCancel: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(!data.codigo)

  useEffect(() => {
    if (!data.codigo) {
      setLoading(true)
      const supabase = createClient()
      gerarCodigoCampanha(supabase, 'A').then(code => {
        onChange({ codigo: code, versao: 'A' })
        setLoading(false)
      })
    }
  }, [])

  const changeVersao = (v: string) => {
    const parts = data.codigo.split('_')
    if (parts.length >= 4) parts[3] = v
    onChange({ versao: v, codigo: parts.join('_') })
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(data.codigo)
    setCopied(true)
    toast.success('Código copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const versaoOpts = [
    { value: 'A', label: 'A' },
    { value: 'AB', label: 'A+B' },
    { value: 'ABC', label: 'A+B+C' },
  ]

  return (
    <div className="space-y-6">
      {/* Código */}
      <div>
        <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-1.5">
          Código da campanha
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#F4F8FB] border border-[#E2E8F0] rounded-lg px-4 py-2.5">
            {loading ? (
              <span className="text-sm text-[#94A3B8]">Gerando código...</span>
            ) : (
              <span className="font-mono text-sm font-semibold text-[#0A1628] tracking-wider">{data.codigo}</span>
            )}
          </div>
          <button
            onClick={copyCode}
            className="p-2.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F4F8FB] transition-colors"
            title="Copiar código"
          >
            {copied ? <Check size={16} className="text-[#02C39A]" /> : <Copy size={16} className="text-[#64748B]" />}
          </button>
        </div>
        <p className="text-xs text-[#94A3B8] mt-1">Gerado automaticamente. Formato: DDMMYYYY_SIGNO_SEQ_VERSÃO</p>
      </div>

      {/* Nome descritivo */}
      <div>
        <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-1.5">
          Nome descritivo <span className="font-normal normal-case text-[#94A3B8]">(opcional)</span>
        </label>
        <input
          type="text"
          value={data.nome_descritivo}
          onChange={e => onChange({ nome_descritivo: e.target.value })}
          placeholder="Ex: Porto Bairros Junho 2026"
          className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm text-[#0A1628] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090]"
        />
      </div>

      {/* Versão A/B/C */}
      <div>
        <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-1.5">
          Versão
        </label>
        <div className="flex gap-2">
          {versaoOpts.map(opt => (
            <button
              key={opt.value}
              onClick={() => changeVersao(opt.value)}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={
                data.versao === opt.value
                  ? { backgroundColor: '#028090', color: '#fff', borderColor: '#028090' }
                  : { backgroundColor: '#fff', color: '#0A1628', borderColor: '#E2E8F0' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div className="flex justify-between pt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
          Cancelar
        </button>
        <button
          onClick={onNext}
          disabled={!data.codigo}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-50"
        >
          Próximo <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── STEP 2: Abordagem ────────────────────────────────────────────────────────

const CANAIS = [
  { key: 'whatsapp', emoji: '📱', label: 'WhatsApp' },
  { key: 'whatsapp_meta', emoji: '💼', label: 'WhatsApp Meta' },
  { key: 'sms', emoji: '💬', label: 'SMS + Link' },
  { key: 'telefone', emoji: '📞', label: 'Telefone + Link' },
]

const FORMATOS = [
  { key: 'texto', emoji: '📝', label: 'Texto' },
  { key: 'audio', emoji: '🎵', label: 'Áudio' },
  { key: 'video', emoji: '🎬', label: 'Vídeo' },
  { key: 'imagem', emoji: '🖼️', label: 'Imagem' },
]

function CardToggle({ emoji, label, selected, onClick }: {
  emoji: string; label: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center"
      style={
        selected
          ? { borderColor: '#028090', backgroundColor: '#F0FDFA' }
          : { borderColor: '#E2E8F0', backgroundColor: '#fff' }
      }
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-medium" style={{ color: selected ? '#028090' : '#64748B' }}>{label}</span>
    </button>
  )
}

function Step2({ data, onChange, onNext, onBack }: {
  data: WizardData
  onChange: (d: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]

  const nLeads = data.processedLeads.length
  const converted = Math.round(nLeads * (data.percentual_conversao / 100))

  return (
    <div className="space-y-8">
      {/* Canal */}
      <div>
        <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-3">
          Canal de abordagem <span className="normal-case font-normal text-[#94A3B8]">(múltipla escolha)</span>
        </label>
        <div className="grid grid-cols-4 gap-3">
          {CANAIS.map(c => (
            <CardToggle
              key={c.key} emoji={c.emoji} label={c.label}
              selected={data.canal.includes(c.key)}
              onClick={() => onChange({ canal: toggleItem(data.canal, c.key) })}
            />
          ))}
        </div>
      </div>

      {/* Formato */}
      <div>
        <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-3">
          Formato do conteúdo <span className="normal-case font-normal text-[#94A3B8]">(múltipla escolha)</span>
        </label>
        <div className="grid grid-cols-4 gap-3">
          {FORMATOS.map(f => (
            <CardToggle
              key={f.key} emoji={f.emoji} label={f.label}
              selected={data.formatos.includes(f.key)}
              onClick={() => onChange({ formatos: toggleItem(data.formatos, f.key) })}
            />
          ))}
        </div>
      </div>

      {/* Horário */}
      <div>
        <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-3">
          Horário de abordagem
        </label>
        <div className="space-y-2">
          {[
            { value: 'todas_horas', label: '24 horas' },
            { value: 'dias_uteis', label: 'Dias úteis (segunda a sexta)' },
            { value: 'personalizado', label: 'Personalizado' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="horario_tipo"
                value={opt.value}
                checked={data.horario_tipo === opt.value}
                onChange={() => onChange({ horario_tipo: opt.value })}
                className="accent-[#028090]"
              />
              <span className="text-sm text-[#0A1628]">{opt.label}</span>
            </label>
          ))}
        </div>

        {data.horario_tipo === 'personalizado' && (
          <div className="mt-4 space-y-3 p-4 bg-[#F4F8FB] rounded-xl border border-[#E2E8F0]">
            <div className="flex flex-wrap gap-2">
              {DIAS.map(dia => (
                <button
                  key={dia}
                  onClick={() => onChange({ dias_semana: toggleItem(data.dias_semana, dia) })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={
                    data.dias_semana.includes(dia)
                      ? { backgroundColor: '#028090', color: '#fff', borderColor: '#028090' }
                      : { backgroundColor: '#fff', color: '#64748B', borderColor: '#E2E8F0' }
                  }
                >
                  {dia}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#64748B]">Das</label>
                <input
                  type="time"
                  value={data.horario_inicio}
                  onChange={e => onChange({ horario_inicio: e.target.value })}
                  className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#028090]/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#64748B]">até</label>
                <input
                  type="time"
                  value={data.horario_fim}
                  onChange={e => onChange({ horario_fim: e.target.value })}
                  className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#028090]/30"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conversão */}
      <div>
        <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-3">
          % de conversão estimada
        </label>
        <div className="flex items-center gap-4 mb-2">
          <input
            type="range"
            min={0} max={20} step={0.5}
            value={data.percentual_conversao}
            onChange={e => onChange({ percentual_conversao: parseFloat(e.target.value) })}
            className="flex-1 accent-[#028090]"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0} max={20} step={0.5}
              value={data.percentual_conversao}
              onChange={e => onChange({ percentual_conversao: parseFloat(e.target.value) || 0 })}
              className="w-20 border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#028090]/30"
            />
            <span className="text-sm text-[#64748B]">%</span>
          </div>
        </div>
        <div className="bg-[#F4F8FB] border border-[#E2E8F0] rounded-xl p-4 text-sm text-[#64748B]">
          Com <strong className="text-[#028090]">{data.percentual_conversao}%</strong> de conversão estimada
          sobre <strong>{nLeads}</strong> leads, esperamos{' '}
          <strong className="text-[#028090]">{converted}</strong> clientes para atendimento humano.
        </div>
      </div>

      {/* Nav */}
      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
          <ChevronLeft size={15} /> Voltar
        </button>
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors">
          Próximo <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── STEP 3: Base de leads ────────────────────────────────────────────────────

function Step3({ data, onChange, onNext, onBack }: {
  data: WizardData
  onChange: (d: Partial<WizardData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Apenas arquivos .xlsx são aceitos.')
      return
    }
    setProcessing(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)

      const processed: ProcessedLead[] = rows.map(row => {
        const parseDate = (val: any): Date => {
          if (typeof val === 'number') return excelSerialToDate(val)
          if (typeof val === 'string' && val) return new Date(val)
          return new Date(2000, 0, 1)
        }
        const d1 = parseDate(row['Data Nascimento Responsável MEI'])
        const d2 = parseDate(row['Data Nascimento Esposo (a)'])
        const d3 = parseDate(row['Data Nascimento Filho (a)'])
        const renda = Number(row['Renda Estimada']) || 0

        return {
          nome: String(row['Responsável Empresa'] ?? '').trim(),
          telefone: String(row['Telefone1'] ?? '').replace(/\D/g, ''),
          cnpj: String(row['CNPJ Formatado'] ?? '').trim(),
          nome_empresa: String(row['Nome Empresa'] ?? '').trim(),
          cnae: String(row['CNAE Principal'] ?? '').trim(),
          sexo: String(row['Sexo'] ?? '').trim(),
          data_nascimento: d1.toISOString().split('T')[0],
          vida2_data_nascimento: d2.toISOString().split('T')[0],
          vida3_data_nascimento: d3.toISOString().split('T')[0],
          renda_estimada: renda,
          idade1: calcularIdade(d1),
          idade2: calcularIdade(d2),
          idade3: calcularIdade(d3),
          valor_plano_vida1: 0,
          valor_plano_vida2: 0,
          valor_plano_vida3: 0,
          valor_plano_total: 0,
          percentual_renda: null,
          comissao_entrada: 0,
          comissao_recorrente: 0,
          status: 'novo',
        }
      })

      onChange({ rawRows: rows, processedLeads: processed, fileName: file.name })
      toast.success(`${processed.length} leads carregados!`)
    } catch {
      toast.error('Erro ao processar o arquivo. Verifique o formato.')
    } finally {
      setProcessing(false)
    }
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const leads = data.processedLeads
  const avgIdade = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.idade1, 0) / leads.length) : 0
  const feminino = leads.filter(l => ['F', 'FEMININO', 'Feminino'].includes(l.sexo)).length
  const masculino = leads.length - feminino
  const pctFem = leads.length > 0 ? Math.round((feminino / leads.length) * 100) : 0
  const pctMas = 100 - pctFem

  const previewCols = ['Responsável Empresa', 'Telefone1', 'CNPJ Formatado', 'Nome Empresa', 'Sexo']

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragging ? '#028090' : '#CBD5E1',
          backgroundColor: dragging ? '#F0FDFA' : '#F8FAFC',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
        />
        {processing ? (
          <p className="text-sm text-[#028090] animate-pulse">Processando arquivo...</p>
        ) : data.fileName ? (
          <div>
            <p className="text-sm font-semibold text-[#0A1628]">📊 {data.fileName}</p>
            <p className="text-xs text-[#64748B] mt-1">{leads.length} leads carregados</p>
            <button
              onClick={e => { e.stopPropagation(); onChange({ rawRows: [], processedLeads: [], fileName: '' }) }}
              className="mt-2 text-xs text-[#EF4444] hover:underline"
            >
              Trocar arquivo
            </button>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 bg-[#E2E8F0] rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload size={24} className="text-[#94A3B8]" />
            </div>
            <p className="text-sm font-medium text-[#0A1628]">Arraste o arquivo Excel aqui</p>
            <p className="text-xs text-[#64748B] mt-1">ou clique para selecionar — apenas .xlsx</p>
          </>
        )}
      </div>

      {/* Preview & Summary */}
      {leads.length > 0 && (
        <>
          {/* Preview table */}
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
              Preview (5 primeiras linhas)
            </p>
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-[#F4F8FB]">
                  <tr>
                    {previewCols.map(col => (
                      <th key={col} className="px-3 py-2 text-left font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">
                        {col.replace('Responsável Empresa', 'Nome').replace('Telefone1', 'Tel').replace('CNPJ Formatado', 'CNPJ').replace('Nome Empresa', 'Empresa')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rawRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-[#F1F5F9]">
                      {previewCols.map(col => (
                        <td key={col} className="px-3 py-2 text-[#0A1628] max-w-[140px] truncate">
                          {String(row[col] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#F4F8FB] border border-[#E2E8F0] rounded-xl p-5 space-y-2">
            <p className="text-xs font-semibold text-[#028090] uppercase tracking-wide mb-3">Resumo da base</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[#64748B]">Total de leads:</span> <strong className="text-[#0A1628]">{leads.length.toLocaleString('pt-BR')}</strong></div>
              <div><span className="text-[#64748B]">Média de idade:</span> <strong className="text-[#0A1628]">{avgIdade} anos</strong></div>
              <div><span className="text-[#64748B]">Feminino:</span> <strong className="text-[#028090]">{pctFem}%</strong> ({feminino})</div>
              <div><span className="text-[#64748B]">Masculino:</span> <strong className="text-[#0A1628]">{pctMas}%</strong> ({masculino})</div>
            </div>
          </div>

          <p className="text-xs text-[#94A3B8]">
            💡 Os valores financeiros serão calculados após você preencher a tabela de preços na próxima etapa.
          </p>
        </>
      )}

      {/* Nav */}
      <div className="flex justify-between pt-4">
        <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
          <ChevronLeft size={15} /> Voltar
        </button>
        <button
          onClick={onNext}
          disabled={leads.length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Próximo <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── STEP 4: Produto e preços ─────────────────────────────────────────────────

function recalcLeads(leads: ProcessedLead[], precos: Precos): ProcessedLead[] {
  const camp = { ...precos }
  return leads.map(l => {
    const v1 = getPrecoPorIdade(l.idade1, camp)
    const v2 = l.idade2 > 0 ? getPrecoPorIdade(l.idade2, camp) : 0
    const v3 = l.idade3 > 0 ? getPrecoPorIdade(l.idade3, camp) : 0
    const total = v1 + v2 + v3
    const renda = l.renda_estimada
    return {
      ...l,
      valor_plano_vida1: v1,
      valor_plano_vida2: v2,
      valor_plano_vida3: v3,
      valor_plano_total: total,
      percentual_renda: renda > 0 ? (total / renda) * 100 : null,
      comissao_entrada: total * 1.5,
      comissao_recorrente: total * 0.02,
    }
  })
}

function Step4({ data, onChange, onBack, onSave, saving }: {
  data: WizardData
  onChange: (d: Partial<WizardData>) => void
  onBack: () => void
  onSave: (status: 'rascunho' | 'ativa') => void
  saving: boolean
}) {
  const leads = recalcLeads(data.processedLeads, data.precos)
  const totalLeads = leads.length
  const valorTotal = leads.reduce((s, l) => s + l.valor_plano_total, 0)
  const comEntrada = leads.reduce((s, l) => s + l.comissao_entrada, 0)
  const comRec = leads.reduce((s, l) => s + l.comissao_recorrente, 0)
  const pct = data.percentual_conversao / 100
  const leadsConv = Math.round(totalLeads * pct)
  const valorConv = valorTotal * pct
  const comEntradaConv = comEntrada * pct
  const comRecConv = comRec * pct

  const planFields = [
    { key: 'nome_plano', label: 'Nome do plano', required: true },
    { key: 'operadora', label: 'Operadora', required: true },
    { key: 'acomodacao', label: 'Acomodação', required: false },
    { key: 'coparticipacao', label: 'Coparticipação', required: false },
    { key: 'abrangencia', label: 'Abrangência', required: false },
    { key: 'municipio', label: 'Município', required: false },
    { key: 'rede_referenciada', label: 'Rede referenciada', required: false },
  ]

  return (
    <div className="space-y-8">
      {/* Plan info */}
      <div>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">Informações do plano</p>
        <div className="grid grid-cols-2 gap-4">
          {planFields.map(f => (
            <div key={f.key}>
              <label className="text-xs text-[#64748B] block mb-1">
                {f.label} {f.required && <span className="text-[#EF4444]">*</span>}
              </label>
              <input
                type="text"
                value={(data as any)[f.key]}
                onChange={e => onChange({ [f.key]: e.target.value })}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0A1628] focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Price table */}
      <div>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">Tabela de preços</p>
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F8FB]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Faixa etária</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {PRECO_FAIXAS.map(f => (
                <tr key={f.key} className="border-t border-[#F1F5F9]">
                  <td className="px-4 py-2.5 text-[#0A1628]">{f.label}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={data.precos[f.key] || ''}
                      placeholder="0,00"
                      onChange={e => onChange({
                        precos: { ...data.precos, [f.key]: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-36 border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#028090]/30 focus:border-[#028090]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Potencial cards */}
      <div className="space-y-4">
        <div className="bg-[#F4F8FB] border border-[#E2E8F0] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#028090] uppercase tracking-wide mb-4">Potencial total (100% da base)</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Mensalidades</p>
              <p className="text-lg font-bold text-[#0A1628]">{formatCurrency(valorTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Comissão entrada (1,5x)</p>
              <p className="text-lg font-bold text-[#028090]">{formatCurrency(comEntrada)}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Recorrente (2%/mês)</p>
              <p className="text-lg font-bold text-[#02C39A]">{formatCurrency(comRec)}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#065F46] uppercase tracking-wide mb-1">
            Visão comercial (baseado em {data.percentual_conversao}% conversão)
          </p>
          <p className="text-xs text-[#64748B] mb-4">Leads estimados para conversão: <strong>{leadsConv}</strong></p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Mensalidades esperadas</p>
              <p className="text-lg font-bold text-[#065F46]">{formatCurrency(valorConv)}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Comissão entrada esperada</p>
              <p className="text-lg font-bold text-[#065F46]">{formatCurrency(comEntradaConv)}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Recorrente esperada/mês</p>
              <p className="text-lg font-bold text-[#065F46]">{formatCurrency(comRecConv)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TODO: Botão IA — integração OpenAI a ser configurada */}

      {/* Nav */}
      <div className="flex justify-between pt-4">
        <button onClick={onBack} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50">
          <ChevronLeft size={15} /> Voltar
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => onSave('rascunho')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvando...' : 'Salvar como rascunho'}
          </button>
          <button
            onClick={() => onSave('ativa')}
            disabled={saving || !data.nome_plano || !data.operadora}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#028090] text-white text-sm font-medium hover:bg-[#026d7a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap size={14} />
            {saving ? 'Salvando...' : '✓ Ativar campanha'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'wizard_campanha_v1'

export default function NovaCampanhaPage() {
  const router = useRouter()
  const [step, setStep] = useState(() => {
    try { return parseInt(localStorage.getItem(STORAGE_KEY + '_step') || '0', 10) } catch { return 0 }
  })
  const [data, setData] = useState<WizardData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Nunca restaurar o código — sempre gerar um novo para evitar duplicatas
        // Não restaurar leads — muito grande para localStorage
        const { codigo, versao, processedLeads, rawRows, fileName, ...rest } = parsed
        return { ...initialData, ...rest, processedLeads: [], rawRows: [], fileName: '' }
      }
    } catch {}
    return initialData
  })
  const [saving, setSaving] = useState(false)

  const update = useCallback((d: Partial<WizardData>) => {
    setData(prev => {
      const next = { ...prev, ...d }
      // Persiste no localStorage (exceto leads — muito grande)
      try {
        // Nunca salvar codigo/versao — sempre gerado fresh ao abrir o wizard
        const { processedLeads, rawRows, codigo, versao, ...toSave } = next
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
      } catch {}
      return next
    })
  }, [])

  const setStepPersisted = (s: number) => {
    setStep(s)
    try { localStorage.setItem(STORAGE_KEY + '_step', String(s)) } catch {}
  }

  const saveCampanha = async (status: 'rascunho' | 'ativa') => {
    setSaving(true)
    try {
      const supabase = createClient()
      const finalLeads = recalcLeads(data.processedLeads, data.precos)
      const codeParts = data.codigo.split('_')
      const signo = codeParts[1] ?? 'CAP'
      const numSeq = parseInt(codeParts[2] ?? '1')

      const campanhaPayload: any = {
        codigo: data.codigo,
        signo,
        numero_sequencial: numSeq,
        versao: data.versao,
        nome_descritivo: data.nome_descritivo || null,
        nome_plano: data.nome_plano || null,
        operadora: data.operadora || null,
        acomodacao: data.acomodacao || null,
        coparticipacao: data.coparticipacao || null,
        abrangencia: data.abrangencia || null,
        municipio: data.municipio || null,
        rede_referenciada: data.rede_referenciada || null,
        canal: data.canal,
        formatos: data.formatos,
        horario_tipo: data.horario_tipo,
        horario_inicio: data.horario_inicio || null,
        horario_fim: data.horario_fim || null,
        dias_semana: data.dias_semana,
        percentual_conversao: data.percentual_conversao,
        status,
        ...data.precos,
      }

      const { data: camp, error: campErr } = await supabase
        .from('campanhas')
        .insert(campanhaPayload)
        .select('id')
        .single()

      if (campErr) throw campErr

      // Batch insert leads
      const BATCH = 100
      for (let i = 0; i < finalLeads.length; i += BATCH) {
        const batch = finalLeads.slice(i, i + BATCH).map(l => ({
          nome: l.nome,
          telefone: l.telefone,
          cnpj: l.cnpj,
          nome_empresa: l.nome_empresa,
          cnae: l.cnae,
          sexo: l.sexo,
          data_nascimento: l.data_nascimento || null,
          vida2_data_nascimento: l.vida2_data_nascimento || null,
          vida3_data_nascimento: l.vida3_data_nascimento || null,
          renda_estimada: l.renda_estimada,
          valor_plano_vida1: l.valor_plano_vida1,
          valor_plano_vida2: l.valor_plano_vida2,
          valor_plano_vida3: l.valor_plano_vida3,
          valor_plano_total: l.valor_plano_total,
          percentual_renda: l.percentual_renda,
          comissao_entrada: l.comissao_entrada,
          comissao_recorrente: l.comissao_recorrente,
          status: 'novo',
          campanha_id: camp.id,
        }))
        const { error: lErr } = await supabase.from('leads').insert(batch)
        if (lErr) throw lErr
      }

      const valorTotal = finalLeads.reduce((s, l) => s + l.valor_plano_total, 0)
      const comEntrada = finalLeads.reduce((s, l) => s + l.comissao_entrada, 0)
      const comRec = finalLeads.reduce((s, l) => s + l.comissao_recorrente, 0)

      await supabase.from('campanhas').update({
        total_leads: finalLeads.length,
        valor_total_potencial: valorTotal,
        comissao_entrada_potencial: comEntrada,
        comissao_recorrente_potencial: comRec,
      }).eq('id', camp.id)

      toast.success('Campanha salva com sucesso!')
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_KEY + '_step') } catch {}
      router.push(`/campanhas/${camp.id}`)
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao salvar: ${err?.message ?? 'tente novamente'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1628]">Nova Campanha</h1>
        <p className="text-sm text-[#64748B] mt-1">Preencha as informações para criar sua campanha.</p>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-8">
        <StepBar current={step} />

        {step === 0 && <Step1 data={data} onChange={update} onNext={() => setStepPersisted(1)} onCancel={() => router.push('/campanhas')} />}
        {step === 1 && <Step2 data={data} onChange={update} onNext={() => setStepPersisted(2)} onBack={() => setStepPersisted(0)} />}
        {step === 2 && <Step3 data={data} onChange={update} onNext={() => setStepPersisted(3)} onBack={() => setStepPersisted(1)} />}
        {step === 3 && <Step4 data={data} onChange={update} onBack={() => setStepPersisted(2)} onSave={saveCampanha} saving={saving} />}
      </div>
    </div>
  )
}
