import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const badgeColor: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-700',
  qualificado: 'bg-green-100 text-green-700',
  nao_qualificado: 'bg-red-100 text-red-700',
  transferido: 'bg-purple-100 text-purple-700',
  perdido: 'bg-gray-100 text-gray-600',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const { data: qualificacao } = await supabase
    .from('qualificacoes')
    .select('*')
    .eq('lead_id', lead.id)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: conversas } = await supabase
    .from('conversas')
    .select('*')
    .eq('lead_id', lead.id)
    .order('enviado_em', { ascending: true })

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/leads" className="text-sm text-[#028090] hover:underline mb-6 inline-block">
        ← Voltar para Leads
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628]">{lead.nome || 'Lead sem nome'}</h1>
          <p className="text-[#64748B] mt-1">{lead.telefone}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColor[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {lead.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0A1628] mb-4">Informações</h2>
          <dl className="space-y-3 text-sm">
            {[
              ['Telefone', lead.telefone],
              ['Score', lead.score_qualificacao ?? '—'],
              ['Produto de interesse', lead.produto_interesse ?? '—'],
              ['Criado em', lead.criado_em ? new Date(lead.criado_em).toLocaleString('pt-BR') : '—'],
              ['Atualizado em', lead.atualizado_em ? new Date(lead.atualizado_em).toLocaleString('pt-BR') : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-[#64748B]">{label}</dt>
                <dd className="font-medium text-[#0A1628]">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {qualificacao && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#0A1628] mb-4">Qualificação por IA</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#64748B]">Qualificado</dt>
                <dd className={`font-medium ${qualificacao.qualificado ? 'text-green-600' : 'text-red-500'}`}>
                  {qualificacao.qualificado ? 'Sim' : 'Não'}
                </dd>
              </div>
              {qualificacao.score && (
                <div className="flex justify-between">
                  <dt className="text-[#64748B]">Score</dt>
                  <dd className="font-medium text-[#0A1628]">{qualificacao.score}</dd>
                </div>
              )}
            </dl>
            {qualificacao.motivo && (
              <div className="mt-4 p-3 bg-[#F8FAFC] rounded-lg text-xs text-[#64748B]">
                <strong className="block mb-1 text-[#0A1628]">Motivo:</strong>
                {qualificacao.motivo}
              </div>
            )}
          </div>
        )}
      </div>

      {conversas && conversas.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0A1628] mb-4">
            Histórico de conversa ({conversas.length} mensagens)
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {conversas.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direcao === 'saida' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                    msg.direcao === 'saida'
                      ? 'bg-[#028090] text-white'
                      : 'bg-[#F1F5F9] text-[#0A1628]'
                  }`}
                >
                  <p>{msg.mensagem}</p>
                  {msg.enviado_em && (
                    <p className={`text-xs mt-1 ${msg.direcao === 'saida' ? 'text-teal-200' : 'text-[#94A3B8]'}`}>
                      {new Date(msg.enviado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}