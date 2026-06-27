export type Lead = {
  id: string
  nome: string
  telefone: string
  email: string | null
  cidade: string | null
  estado: string | null
  data_nascimento: string | null
  origem: string
  status: 'novo' | 'disparado' | 'respondeu' | 'qualificado' | 'transferido' | 'frio' | 'opt_out'
  criado_em: string
  atualizado_em: string
}

export type Qualificacao = {
  id: string
  lead_id: string
  temperatura: 'quente' | 'morno' | 'frio' | null
  sentimento: 'positivo' | 'neutro' | 'negativo' | null
  resumo_ia: string | null
  objecoes: string[] | null
  sinais_compra: string[] | null
  para_quem: 'individual' | 'familia' | 'empresa' | null
  tem_plano_atual: boolean | null
  esforco_parceiro: 'baixo' | 'medio' | 'alto' | 'altissimo' | null
  qualificado_em: string
}

export type Transferencia = {
  id: string
  lead_id: string
  transferido_em: string
  primeiro_contato_em: string | null
  status_parceiro: 'recebido' | 'trabalhando' | 'convertido' | 'nao_convertido'
  notas_parceiro: string | null
}

export type Conversa = {
  id: string
  lead_id: string
  direcao: 'entrada' | 'saida'
  mensagem: string
  criado_em: string
}

export type LeadCompleto = Lead & {
  qualificacoes: Qualificacao | null
  transferencias: Transferencia | null
}