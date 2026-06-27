import { createClient } from '@/lib/supabase/server'
import KanbanBoard from './KanbanBoard'

export default async function KanbanPage() {
  const supabase = await createClient()

  const { data: transferencias } = await supabase
    .from('transferencias')
    .select('*, leads(nome, telefone, criado_em)')
    .order('transferido_em', { ascending: false })

  return <KanbanBoard initialData={transferencias ?? []} />
}