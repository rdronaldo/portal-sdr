import { createClient } from '@/lib/supabase/server'

const COLUNAS = [
  { key: 'novo', label: 'Novo', color: '#3B82F6' },
  { key: 'qualificado', label: 'Qualificado', color: '#10B981' },
  { key: 'transferido', label: 'Transferido', color: '#8B5CF6' },
  { key: 'nao_qualificado', label: 'Não Qualificado', color: '#EF4444' },
  { key: 'perdido', label: 'Perdido', color: '#6B7280' },
]

export default async function KanbanPage() {
  const supabase = await createClient()
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('criado_em', { ascending: false })

  const leadsPorStatus = COLUNAS.reduce<Record<string, typeof leads>>((acc, col) => {
    acc[col.key] = leads?.filter((l) => l.status === col.key) ?? []
    return acc
  }, {})

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1628]">Kanban</h1>
        <p className="text-[#64748B] mt-1">Visualização por status dos leads</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUNAS.map(({ key, label, color }) => {
          const items = leadsPorStatus[key] ?? []
          return (
            <div key={key} className="flex-shrink-0 w-64">
              {/* Header da coluna */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold text-[#0A1628]">{label}</span>
                </div>
                <span className="text-xs bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full font-medium">
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[200px]">
                {items.length > 0 ? (
                  items.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white rounded-lg border border-[#E2E8F0] p-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <p className="font-medium text-sm text-[#0A1628] truncate">
                        {lead.nome || 'Sem nome'}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">{lead.telefone}</p>
                      {lead.score_qualificacao != null && (
                        <div className="mt-2 flex items-center gap-1">
                          <div className="h-1.5 flex-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(lead.score_qualificacao, 100)}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                          <span className="text-xs text-[#64748B]">{lead.score_qualificacao}</span>
                        </div>
                      )}
                      {lead.criado_em && (
                        <p className="text-xs text-[#94A3B8] mt-1.5">
                          {new Date(lead.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-4 text-center">
                    <p className="text-xs text-[#94A3B8]">Nenhum lead</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}