export function excelSerialToDate(serial: number): Date {
  const base = new Date(1900, 0, 1)
  base.setDate(base.getDate() + serial - 2)
  return base
}

export function calcularIdade(dataNascimento: Date): number {
  const hoje = new Date()
  let idade = hoje.getFullYear() - dataNascimento.getFullYear()
  const m = hoje.getMonth() - dataNascimento.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) idade--
  return idade
}

export function getPrecoPorIdade(idade: number, campanha: any): number {
  if (idade <= 18) return campanha.preco_0_18 ?? 0
  if (idade <= 23) return campanha.preco_19_23 ?? 0
  if (idade <= 28) return campanha.preco_24_28 ?? 0
  if (idade <= 33) return campanha.preco_29_33 ?? 0
  if (idade <= 38) return campanha.preco_34_38 ?? 0
  if (idade <= 43) return campanha.preco_39_43 ?? 0
  if (idade <= 48) return campanha.preco_44_48 ?? 0
  if (idade <= 53) return campanha.preco_49_53 ?? 0
  if (idade <= 58) return campanha.preco_54_58 ?? 0
  return campanha.preco_59_mais ?? 0
}

export function getSigno(dia: number, mes: number): string {
  const signos = [
    { signo: 'CAP', ini: [1,1],   fim: [1,19]  },
    { signo: 'AQU', ini: [1,20],  fim: [2,18]  },
    { signo: 'PIS', ini: [2,19],  fim: [3,20]  },
    { signo: 'ARI', ini: [3,21],  fim: [4,19]  },
    { signo: 'TAU', ini: [4,20],  fim: [5,20]  },
    { signo: 'GEM', ini: [5,21],  fim: [6,20]  },
    { signo: 'CAN', ini: [6,21],  fim: [7,22]  },
    { signo: 'LEO', ini: [7,23],  fim: [8,22]  },
    { signo: 'VIR', ini: [8,23],  fim: [9,22]  },
    { signo: 'LIB', ini: [9,23],  fim: [10,22] },
    { signo: 'ESC', ini: [10,23], fim: [11,21] },
    { signo: 'SAG', ini: [11,22], fim: [12,21] },
    { signo: 'CAP', ini: [12,22], fim: [12,31] },
  ]
  const found = signos.find(s =>
    (mes > s.ini[0] || (mes === s.ini[0] && dia >= s.ini[1])) &&
    (mes < s.fim[0] || (mes === s.fim[0] && dia <= s.fim[1]))
  )
  return found?.signo ?? 'CAP'
}

export async function gerarCodigoCampanha(
  supabase: any,
  versao: string = 'A'
): Promise<string> {
  const hoje = new Date()
  const dd   = String(hoje.getDate()).padStart(2, '0')
  const mm   = String(hoje.getMonth() + 1).padStart(2, '0')
  const yyyy = hoje.getFullYear()
  const dataStr = `${dd}${mm}${yyyy}`
  const signo   = getSigno(hoje.getDate(), hoje.getMonth() + 1)

  // Busca todos os códigos do dia para encontrar o próximo sequencial disponível
  const { data: existing } = await supabase
    .from('campanhas')
    .select('codigo')
    .like('codigo', `${dataStr}_%`)

  const usedSeqs = new Set(
    (existing ?? []).map((r: any) => parseInt(r.codigo.split('_')[2] ?? '0', 10))
  )

  let seq = 1
  while (usedSeqs.has(seq)) seq++

  return `${dataStr}_${signo}_${String(seq).padStart(4, '0')}_${versao}`
}

export function processarLinhaCampanha(row: any, campanha: any) {
  const dataNasc1 = excelSerialToDate(Number(row['Data Nascimento Responsável MEI']))
  const dataNasc2 = excelSerialToDate(Number(row['Data Nascimento Esposo (a)']))
  const dataNasc3 = excelSerialToDate(Number(row['Data Nascimento Filho (a)']))
  const idade1 = calcularIdade(dataNasc1)
  const idade2 = calcularIdade(dataNasc2)
  const idade3 = calcularIdade(dataNasc3)
  const v1 = getPrecoPorIdade(idade1, campanha)
  const v2 = getPrecoPorIdade(idade2, campanha)
  const v3 = getPrecoPorIdade(idade3, campanha)
  const total = v1 + v2 + v3
  const renda = Number(row['Renda Estimada']) || 0
  return {
    nome:                    String(row['Responsável Empresa'] ?? '').trim(),
    telefone:                String(row['Telefone1'] ?? '').replace(/\D/g, ''),
    cnpj:                    String(row['CNPJ Formatado'] ?? '').trim(),
    nome_empresa:            String(row['Nome Empresa'] ?? '').trim(),
    cnae:                    String(row['CNAE Principal'] ?? '').trim(),
    sexo:                    String(row['Sexo'] ?? '').trim(),
    data_nascimento:         dataNasc1.toISOString().split('T')[0],
    vida2_data_nascimento:   dataNasc2.toISOString().split('T')[0],
    vida3_data_nascimento:   dataNasc3.toISOString().split('T')[0],
    renda_estimada:          renda,
    valor_plano_vida1:       v1,
    valor_plano_vida2:       v2,
    valor_plano_vida3:       v3,
    valor_plano_total:       total,
    percentual_renda:        renda > 0 ? (total / renda) * 100 : null,
    comissao_entrada:        total * 1.5,
    comissao_recorrente:     total * 0.02,
    status:                  'novo',
    origem:                  'campanha',
  }
}
