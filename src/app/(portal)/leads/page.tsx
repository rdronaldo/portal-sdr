import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const badgeColor: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-700',
  qualificado: 'bg-green-100 text-green-700',
  nao_qualificado: 'bg-red-100 text-red-700',
  transferido: 'bg-purple-100 text-purple-700',
  perdido: 'bg-gray-100 text-gray-600',
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('criado_em', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1628]">Leads</h1>
        <p className="text-[#64748B] mt-1">{leads?.length ?? 0} leads encontrados</p>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="text-left px-4 py-3 font-medium text-[#64748B]">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-[#64748B]">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-[#64748B]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[#64748B]">Score</th>
              <th className="text-left px-4 py-3 font-medium text-[#64748B]">Data</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads && leads.length > 0 ? (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#0A1628]">{lead.nome || '—'}</td>
                  <td className="px-4 py-3 text-[#64748B]">{lead.telefone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColor[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{lead.score_qualificacao ?? '—'}</td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {lead.criado_em ? new Date(lead.criado_em).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-[#028090] hover:underline text-xs font-medium"
                    >
                      Ver detalhes →
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[#64748B]">
                  Nenhum lead encontrado ainda. Os leads chegarão via WhatsApp + n8n.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}