import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: totalLeads }, { count: qualificados }, { count: transferidos }] =
    await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('qualificacoes').select('*', { count: 'exact', head: true }).eq('qualificado', true),
      supabase.from('transferencias').select('*', { count: 'exact', head: true }),
    ])

  const cards = [
    { label: 'Total de Leads', value: totalLeads ?? 0, color: '#028090' },
    { label: 'Qualificados', value: qualificados ?? 0, color: '#10B981' },
    { label: 'Transferidos', value: transferidos ?? 0, color: '#6366F1' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0A1628]">Dashboard</h1>
        <p className="text-[#64748B] mt-1">Visão geral dos leads qualificados por IA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <p className="text-sm text-[#64748B] font-medium">{label}</p>
            <p className="text-4xl font-bold mt-2" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}