import React, { useEffect, useState } from 'react'
import axios from 'axios'

// ==========================================
// 1. ESTILOS PADRONIZADOS (PROPORCIONALIDADE)
// ==========================================
const ESTILO_GERAL = {
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  backgroundColor: '#f0f2f5',
  padding: '30px',
  color: '#333',
  minHeight: '100vh',
};

const ESTILO_CONTAINER = {
  maxWidth: '1000px',
  margin: '0 auto',
};

const ESTILO_CARD = {
  backgroundColor: 'white',
  padding: '25px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  marginBottom: '20px',
};

const ESTILO_INPUT_BASE = {
  padding: '12px',
  fontSize: '16px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  color: '#333',
  marginTop: '5px',
  // Sem isto, padding+border são somados a 100% e o input transborda à direita,
  // escondendo a borda direita dentro do gap entre colunas.
  boxSizing: 'border-box' as const,
};

const ESTILO_LABEL = {
  fontWeight: 'bold',
  fontSize: '14px',
  textTransform: 'sentencecase',
};

const ESTILO_BOTAO_BASE = {
  padding: '12px 20px',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '15px',
};

// ==========================================
// 2. FUNÇÕES DE FORMATAÇÃO (MÁSCARAS)
// ==========================================
const formatarCPF = (valor: string) => {
  const v = valor.replace(/\D/g, '').slice(0, 11)
  if (v.length <= 3) return v
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`
}

const formatarTelefone = (valor: string) => {
  const v = valor.replace(/\D/g, '').slice(0, 11)
  if (v.length === 0) return ''
  if (v.length <= 4) return v
  if (v.length <= 8) return `${v.slice(0, 4)}-${v.slice(4)}`
  if (v.length === 9) return `${v.slice(0, 5)}-${v.slice(5)}`
  if (v.length === 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

const formatarData = (valor: string) => {
  const v = valor.replace(/\D/g, '').slice(0, 8)
  if (v.length <= 2) return v
  if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`
  return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`
}

const formatarCEP = (valor: string) => {
  const v = valor.replace(/\D/g, '').slice(0, 8)
  if (v.length <= 5) return v
  return `${v.slice(0, 5)}-${v.slice(5)}`
}

// ==========================================
// 3. INTERFACES (TIPAGEM)
// ==========================================
interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
  endereco: string;
  rg?: string;  // mantido opcional só para retrocompatibilidade com pacientes antigos
  // Campos novos (todos opcionais para retrocompatibilidade)
  sexo?: string;
  naturalidade?: string;
  estado_civil?: string;
  profissao?: string;
  cep?: string;
  cidade?: string;
  endereco_comercial?: string;
  cep_comercial?: string;
  cidade_comercial?: string;
  telefone_comercial?: string;
  nome_pai?: string;
  profissao_pai?: string;
  nome_mae?: string;
  profissao_mae?: string;
  responsavel?: string;
  indicacao?: string;
}

interface FichaClinica {
  queixa_principal: string;
  tratamento_medico: string;
  diabetico: boolean;
  gravida: boolean;
  medicamentos_em_uso: string;
  alergias: string;
  sistema_cardiovascular: string;
  sistema_respiratorio: string;
  sistema_sanguineo_linfatico: string;
  sistema_gastrointestinal: string;
  sistema_nervoso: string;
  sistema_urinario_endocrino: string;
  // Campos novos da ficha de ortodontia
  febre_reumatica: boolean;
  operou_amigdalas: boolean;
  traumatismo_facial: boolean;
  tratamento_ortodontico_anterior: boolean;
  tipo_sanguineo: string;
  outras_patologias: string;
  observacoes_adicionais: string;
}

interface Pagamento {
  id?: number;
  valor: number;
  data_pagamento: string;
  descricao: string;
  forma_pagamento: string;
}

interface Evolucao {
  id?: number;
  data: string;
  trabalho_realizado: string;
  proxima_visita: string;
}

interface Exame {
  id?: number;
  descricao: string;
  data_exame: string;
  arquivo_nome: string;
  tipo_arquivo: string;
}

// Estrutura dos campos pessoais "extras" do paciente (além dos básicos)
const DADOS_EXTRAS_INICIAL = {
  sexo: "", naturalidade: "", estado_civil: "", profissao: "",
  cep: "", cidade: "",
  endereco_comercial: "", cep_comercial: "", cidade_comercial: "", telefone_comercial: "",
  nome_pai: "", profissao_pai: "", nome_mae: "", profissao_mae: "",
  responsavel: "", indicacao: "",
}
type DadosExtras = typeof DADOS_EXTRAS_INICIAL

const FICHA_INICIAL: FichaClinica = {
  queixa_principal: "", tratamento_medico: "",
  diabetico: false, gravida: false, medicamentos_em_uso: "", alergias: "",
  sistema_cardiovascular: "", sistema_respiratorio: "", sistema_sanguineo_linfatico: "",
  sistema_gastrointestinal: "", sistema_nervoso: "", sistema_urinario_endocrino: "",
  febre_reumatica: false, operou_amigdalas: false,
  traumatismo_facial: false, tratamento_ortodontico_anterior: false,
  tipo_sanguineo: "", outras_patologias: "",
  observacoes_adicionais: "",
}

// ==========================================
// 4. COMPONENTE PRINCIPAL
// ==========================================
function App() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [erro, setErro] = useState("")
  const [pacienteExpandidoId, setPacienteExpandidoId] = useState<number | null>(null)

  // Estados do Formulário Cadastro Paciente — campos básicos
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [telefone, setTelefone] = useState("")
  const [endereco, setEndereco] = useState("")
  // Campos pessoais extras (agrupados num objeto único pra reduzir verbosidade)
  const [dadosExtras, setDadosExtras] = useState<DadosExtras>(DADOS_EXTRAS_INICIAL)
  const setExtra = (campo: keyof DadosExtras, valor: string) =>
    setDadosExtras(prev => ({ ...prev, [campo]: valor }))

  const [pacienteEditando, setPacienteEditando] = useState<number | null>(null)
  const [erroCpfVisual, setErroCpfVisual] = useState("")

  // Estados Ficha Clínica
  const [pacienteFichaAberta, setPacienteFichaAberta] = useState<Paciente | null>(null)
  const [ficha, setFicha] = useState<FichaClinica>(FICHA_INICIAL)

  // Estados Financeiro
  const [pacienteFinanceiroAberto, setPacienteFinanceiroAberto] = useState<Paciente | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [valorPagamento, setValorPagamento] = useState("")
  const [dataPagamento, setDataPagamento] = useState("")
  const [descricaoPagamento, setDescricaoPagamento] = useState("")
  const [formaPagamento, setFormaPagamento] = useState("")
  const [pagamentoEditandoId, setPagamentoEditandoId] = useState<number | null>(null)

  // Estados Folha de Evolução (Histórias 5 e 6)
  const [pacienteEvolucaoAberto, setPacienteEvolucaoAberto] = useState<Paciente | null>(null)
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])
  const [dataEvolucao, setDataEvolucao] = useState("")
  const [trabalhoRealizado, setTrabalhoRealizado] = useState("")
  const [proximaVisita, setProximaVisita] = useState("")
  const [evolucaoEditandoId, setEvolucaoEditandoId] = useState<number | null>(null)

  // Estados Exames
  const [pacienteExamesAberto, setPacienteExamesAberto] = useState<Paciente | null>(null)
  const [exames, setExames] = useState<Exame[]>([])
  const [exameDescricao, setExameDescricao] = useState("")
  const [exameData, setExameData] = useState("")
  const [exameArquivo, setExameArquivo] = useState<File | null>(null)
  const [exameUploading, setExameUploading] = useState(false)

  const buscarPacientes = () => {
    axios.get('http://localhost:8000/pacientes/')
      .then(response => { setPacientes(response.data); setErro("") })
      .catch(() => setErro("Não foi possível carregar a lista. Verifique se o backend está rodando."))
  }

  useEffect(() => {
    buscarPacientes()
  }, [])

  // ==========================================
  // Interceptador de Mudança (uma funcao para cada campo para cuidar da formatação e do cursor)
  // ==========================================
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target; let cursor = input.selectionStart;
    const formatado = formatarCPF(input.value);
    setCpf(formatado); setErroCpfVisual("");
    window.requestAnimationFrame(() => {
      if (input && cursor !== null) {
        if (formatado[cursor - 1] === '.' || formatado[cursor - 1] === '-') cursor++;
        input.setSelectionRange(cursor, cursor);
      }
    })
  }

const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target; let cursor = input.selectionStart;
    const formatado = formatarData(input.value); setDataNascimento(formatado);
    window.requestAnimationFrame(() => {
      if (input && cursor !== null) {
        if (formatado[cursor - 1] === '/') cursor++;
        input.setSelectionRange(cursor, cursor);
      }
    })
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursorPos = input.selectionStart ?? rawValue.length;
    const digitsBeforeCursor = rawValue.slice(0, cursorPos).replace(/\D/g, '').length;
    const formatado = formatarTelefone(rawValue);
    setTelefone(formatado);
    window.requestAnimationFrame(() => {
      if (!input) return;
      let digitCount = 0;
      let newCursor = formatado.length;
      if (digitsBeforeCursor === 0) {
        newCursor = 0;
      } else {
        for (let i = 0; i < formatado.length; i++) {
          if (/\d/.test(formatado[i])) digitCount++;
          if (digitCount === digitsBeforeCursor) { newCursor = i + 1; break; }
        }
      }
      input.setSelectionRange(newCursor, newCursor);
    });
  }

  const handleTelefoneComercialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursorPos = input.selectionStart ?? rawValue.length;
    const digitsBeforeCursor = rawValue.slice(0, cursorPos).replace(/\D/g, '').length;
    const formatado = formatarTelefone(rawValue);
    setExtra('telefone_comercial', formatado);
    window.requestAnimationFrame(() => {
      if (!input) return;
      let digitCount = 0;
      let newCursor = formatado.length;
      if (digitsBeforeCursor === 0) {
        newCursor = 0;
      } else {
        for (let i = 0; i < formatado.length; i++) {
          if (/\d/.test(formatado[i])) digitCount++;
          if (digitCount === digitsBeforeCursor) { newCursor = i + 1; break; }
        }
      }
      input.setSelectionRange(newCursor, newCursor);
    });
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErroCpfVisual("")
    const cpfLimpo = cpf.replace(/\D/g, '')

    if (cpfLimpo.length !== 11) {
      setErroCpfVisual("O CPF deve ter exatamente 11 números.")
      return
    }

    const dadosPacientePayload = {
      nome,
      cpf,
      data_nascimento: dataNascimento,
      telefone,
      endereco,
      ...dadosExtras,
    }

    // Constrói mensagem informativa: prioriza o detail do backend, senão usa err.message (rede/CORS)
    const mensagemErro = (err: any, fallback: string) =>
      err.response?.data?.detail
        ?? (err.message ? `${fallback} (${err.message})` : fallback)

    if (pacienteEditando !== null) {
      axios.put(`http://localhost:8000/pacientes/${pacienteEditando}`, dadosPacientePayload)
      .then(() => { limparFormulario(); buscarPacientes() })
      .catch((err) => alert(mensagemErro(err, "Erro ao atualizar os dados do paciente.")))
    } else {
      axios.post('http://localhost:8000/pacientes/', dadosPacientePayload)
      .then(() => { limparFormulario(); buscarPacientes() })
      .catch((err) => alert(mensagemErro(err, "Erro ao cadastrar paciente.")))
    }
  }

  const prepararEdicao = (paciente: Paciente) => {
    setNome(paciente.nome)
    setCpf(formatarCPF(paciente.cpf))
    setDataNascimento(formatarData(paciente.data_nascimento || ""))
    setTelefone(formatarTelefone(paciente.telefone))
    setEndereco(paciente.endereco || "")
    // Preenche os campos extras a partir do que veio do banco
    setDadosExtras({
      sexo: paciente.sexo || "",
      naturalidade: paciente.naturalidade || "",
      estado_civil: paciente.estado_civil || "",
      profissao: paciente.profissao || "",
      cep: paciente.cep ? formatarCEP(paciente.cep) : "",
      cidade: paciente.cidade || "",
      endereco_comercial: paciente.endereco_comercial || "",
      cep_comercial: paciente.cep_comercial ? formatarCEP(paciente.cep_comercial) : "",
      cidade_comercial: paciente.cidade_comercial || "",
      telefone_comercial: paciente.telefone_comercial ? formatarTelefone(paciente.telefone_comercial) : "",
      nome_pai: paciente.nome_pai || "",
      profissao_pai: paciente.profissao_pai || "",
      nome_mae: paciente.nome_mae || "",
      profissao_mae: paciente.profissao_mae || "",
      responsavel: paciente.responsavel || "",
      indicacao: paciente.indicacao || "",
    })
    setPacienteEditando(paciente.id)
    setErroCpfVisual("")
  }

  const limparFormulario = () => {
    setNome(""); setCpf(""); setDataNascimento(""); setTelefone(""); setEndereco("");
    setDadosExtras(DADOS_EXTRAS_INICIAL)
    setPacienteEditando(null)
    setErroCpfVisual("")
  }

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este paciente?")) {
      axios.delete(`http://localhost:8000/pacientes/${id}`)
        .then(() => buscarPacientes())
        .catch(() => alert("Erro ao excluir o paciente."))
    }
  }

  // Funções Ficha Clínica
  const abrirFicha = (paciente: Paciente) => {
    setPacienteFichaAberta(paciente)
    axios.get(`http://localhost:8000/pacientes/${paciente.id}/ficha`)
      .then(response => {
        const dados = response.data
        setFicha({
          queixa_principal: dados.queixa_principal || "",
          tratamento_medico: dados.tratamento_medico || "",
          diabetico: dados.diabetico || false,
          gravida: dados.gravida || false,
          medicamentos_em_uso: dados.medicamentos_em_uso || "",
          alergias: dados.alergias || "",
          sistema_cardiovascular: dados.sistema_cardiovascular || "",
          sistema_respiratorio: dados.sistema_respiratorio || "",
          sistema_sanguineo_linfatico: dados.sistema_sanguineo_linfatico || "",
          sistema_gastrointestinal: dados.sistema_gastrointestinal || "",
          sistema_nervoso: dados.sistema_nervoso || "",
          sistema_urinario_endocrino: dados.sistema_urinario_endocrino || "",
          febre_reumatica: dados.febre_reumatica || false,
          operou_amigdalas: dados.operou_amigdalas || false,
          traumatismo_facial: dados.traumatismo_facial || false,
          tratamento_ortodontico_anterior: dados.tratamento_ortodontico_anterior || false,
          tipo_sanguineo: dados.tipo_sanguineo || "",
          outras_patologias: dados.outras_patologias || "",
          observacoes_adicionais: dados.observacoes_adicionais || "",
        })
      })
      .catch(() => { setFicha(FICHA_INICIAL) })
  }

  const fecharFicha = () => { setPacienteFichaAberta(null) }

  const salvarFicha = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pacienteFichaAberta) return
    axios.post(`http://localhost:8000/pacientes/${pacienteFichaAberta.id}/ficha`, ficha)
      .then(() => { alert("Ficha Clínica salva com sucesso!"); fecharFicha(); })
      .catch(() => alert("Erro ao salvar a ficha clínica."))
  }

  const atualizarCampoFicha = (campo: keyof FichaClinica, valor: any) => {
    setFicha(prev => ({ ...prev, [campo]: valor }))
  }

  // ==========================================
  // Funções do Financeiro
  // ==========================================
  const abrirFinanceiro = (paciente: Paciente) => {
    setPacienteFinanceiroAberto(paciente)
    axios.get(`http://localhost:8000/pacientes/${paciente.id}/pagamentos`)
      .then(response => setPagamentos(response.data))
      .catch(() => alert("Erro ao carregar histórico financeiro."))
  }

  const limparFormularioPagamento = () => {
    setValorPagamento(""); setDataPagamento(""); setDescricaoPagamento(""); setFormaPagamento("");
    setPagamentoEditandoId(null)
  }

  const fecharFinanceiro = () => {
    setPacienteFinanceiroAberto(null)
    limparFormularioPagamento()
  }

  const recarregarPagamentos = (pacienteId: number) => {
    axios.get(`http://localhost:8000/pacientes/${pacienteId}/pagamentos`)
      .then(response => setPagamentos(response.data))
      .catch(() => alert("Erro ao recarregar histórico financeiro."))
  }

  const salvarPagamento = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pacienteFinanceiroAberto) return

    const payload = {
      valor: parseFloat(valorPagamento.replace(',', '.')),
      data_pagamento: dataPagamento,
      descricao: descricaoPagamento,
      forma_pagamento: formaPagamento,
    }

    const pacienteId = pacienteFinanceiroAberto.id
    if (pagamentoEditandoId !== null) {
      axios.put(`http://localhost:8000/pacientes/${pacienteId}/pagamentos/${pagamentoEditandoId}`, payload)
        .then(() => {
          limparFormularioPagamento()
          recarregarPagamentos(pacienteId)
        })
        .catch(() => alert("Erro ao atualizar pagamento."))
    } else {
      axios.post(`http://localhost:8000/pacientes/${pacienteId}/pagamentos`, payload)
        .then(() => {
          limparFormularioPagamento()
          recarregarPagamentos(pacienteId)
        })
        .catch(() => alert("Erro ao registrar pagamento."))
    }
  }

  const prepararEdicaoPagamento = (pag: Pagamento) => {
    // valor vem como número do backend; mostra com vírgula como separador decimal pra combinar com o input
    setValorPagamento(pag.valor.toString().replace('.', ','))
    setDataPagamento(pag.data_pagamento)
    setDescricaoPagamento(pag.descricao)
    setFormaPagamento(pag.forma_pagamento)
    setPagamentoEditandoId(pag.id ?? null)
  }

  const excluirPagamento = (pagamentoId: number) => {
    if (!pacienteFinanceiroAberto) return
    if (!window.confirm("Tem certeza que deseja excluir este pagamento?")) return
    axios.delete(`http://localhost:8000/pacientes/${pacienteFinanceiroAberto.id}/pagamentos/${pagamentoId}`)
      .then(() => {
        setPagamentos(prev => prev.filter(p => p.id !== pagamentoId))
        if (pagamentoEditandoId === pagamentoId) limparFormularioPagamento()
      })
      .catch(() => alert("Erro ao excluir pagamento."))
  }

  // ==========================================
  // Funções da Folha de Evolução (Histórias 5 e 6)
  // ==========================================
  const limparFormularioEvolucao = () => {
    setDataEvolucao(""); setTrabalhoRealizado(""); setProximaVisita("");
    setEvolucaoEditandoId(null);
  }

  const abrirEvolucao = (paciente: Paciente) => {
    setPacienteEvolucaoAberto(paciente)
    limparFormularioEvolucao()
    axios.get(`http://localhost:8000/pacientes/${paciente.id}/evolucao`)
      .then(response => setEvolucoes(response.data))
      .catch(() => alert("Erro ao carregar a folha de evolução."))
  }

  const fecharEvolucao = () => {
    setPacienteEvolucaoAberto(null)
    limparFormularioEvolucao()
  }

  const recarregarEvolucoes = (pacienteId: number) => {
    axios.get(`http://localhost:8000/pacientes/${pacienteId}/evolucao`)
      .then(response => setEvolucoes(response.data))
      .catch(() => alert("Erro ao recarregar a folha de evolução."))
  }

  const salvarEvolucao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pacienteEvolucaoAberto) return

    const payload = {
      data: dataEvolucao,
      trabalho_realizado: trabalhoRealizado,
      proxima_visita: proximaVisita
    }

    if (evolucaoEditandoId !== null) {
      axios.put(`http://localhost:8000/pacientes/${pacienteEvolucaoAberto.id}/evolucao/${evolucaoEditandoId}`, payload)
        .then(() => {
          alert("Registro atualizado com sucesso!")
          limparFormularioEvolucao()
          recarregarEvolucoes(pacienteEvolucaoAberto.id)
        })
        .catch(() => alert("Erro ao atualizar o registro."))
    } else {
      axios.post(`http://localhost:8000/pacientes/${pacienteEvolucaoAberto.id}/evolucao`, payload)
        .then(() => {
          alert("Registro adicionado à folha de evolução!")
          limparFormularioEvolucao()
          recarregarEvolucoes(pacienteEvolucaoAberto.id)
        })
        .catch(() => alert("Erro ao registrar o trabalho realizado."))
    }
  }

  const prepararEdicaoEvolucao = (evo: Evolucao) => {
    setDataEvolucao(evo.data || "")
    setTrabalhoRealizado(evo.trabalho_realizado || "")
    setProximaVisita(evo.proxima_visita || "")
    setEvolucaoEditandoId(evo.id ?? null)
  }

  const excluirEvolucao = (evolucaoId: number) => {
    if (!pacienteEvolucaoAberto) return
    if (!window.confirm("Tem certeza que deseja excluir este registro da folha de evolução?")) return

    axios.delete(`http://localhost:8000/pacientes/${pacienteEvolucaoAberto.id}/evolucao/${evolucaoId}`)
      .then(() => {
        recarregarEvolucoes(pacienteEvolucaoAberto.id)
        if (evolucaoEditandoId === evolucaoId) limparFormularioEvolucao()
      })
      .catch(() => alert("Erro ao excluir o registro."))
  }

  // ==========================================
  // Funções de Exames (upload e listagem de radiografias / PDFs)
  // ==========================================
  const limparFormularioExame = () => {
    setExameDescricao(""); setExameData(""); setExameArquivo(null);
  }

  const recarregarExames = (pacienteId: number) => {
    axios.get(`http://localhost:8000/pacientes/${pacienteId}/exames`)
      .then(response => setExames(response.data))
      .catch(() => alert("Erro ao recarregar a lista de exames."))
  }

  const abrirExames = (paciente: Paciente) => {
    setPacienteExamesAberto(paciente)
    limparFormularioExame()
    recarregarExames(paciente.id)
  }

  const fecharExames = () => {
    setPacienteExamesAberto(null)
    setExames([])
    limparFormularioExame()
  }

  const enviarExame = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pacienteExamesAberto || !exameArquivo) return
    const formData = new FormData()
    formData.append("descricao", exameDescricao)
    if (exameData) formData.append("data_exame", exameData)
    formData.append("arquivo", exameArquivo)

    setExameUploading(true)
    axios.post(`http://localhost:8000/pacientes/${pacienteExamesAberto.id}/exames`, formData)
      .then(() => {
        limparFormularioExame()
        recarregarExames(pacienteExamesAberto.id)
      })
      .catch((err) => alert(err.response?.data?.detail || "Erro ao enviar exame."))
      .finally(() => setExameUploading(false))
  }

  const excluirExame = (exameId: number) => {
    if (!pacienteExamesAberto) return
    if (!window.confirm("Tem certeza que deseja excluir este exame?")) return
    axios.delete(`http://localhost:8000/pacientes/${pacienteExamesAberto.id}/exames/${exameId}`)
      .then(() => setExames(prev => prev.filter(ex => ex.id !== exameId)))
      .catch(() => alert("Erro ao excluir o exame."))
  }

  const urlExame = (paciente: Paciente, exameId: number) =>
    `http://localhost:8000/pacientes/${paciente.id}/exames/${exameId}/arquivo`

  // ==========================================
  // RENDERIZAÇÃO: TELA DE EXAMES (UPLOAD + LISTA)
  // ==========================================
  if (pacienteExamesAberto) {
    return (
      <div style={ESTILO_GERAL}>
        <div style={ESTILO_CONTAINER}>
          <div style={{ ...ESTILO_CARD, borderTop: '5px solid #00838f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', gap: '15px' }}>
              <h1 style={{ margin: 0, lineHeight: '1.3' }}>Exames: <br/><span style={{ color: '#00838f' }}>{pacienteExamesAberto.nome}</span></h1>
              <button onClick={fecharExames} style={{ ...ESTILO_BOTAO_BASE, backgroundColor: '#9e9e9e', color: 'white', whiteSpace: 'nowrap' }}>← Voltar</button>
            </div>

            {/* FORMULÁRIO DE UPLOAD */}
            <div style={{ backgroundColor: '#e0f7fa', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
              <h3 style={{ marginTop: 0, color: '#006064' }}>Carregar novo exame</h3>
              <form onSubmit={enviarExame} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Descrição do exame</label>
                    <input type="text" required placeholder="Ex.: Radiografia panorâmica" value={exameDescricao} onChange={(e) => setExameDescricao(e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Data do exame (opcional)</label>
                    <input type="text" placeholder="DD/MM/AAAA" value={exameData} onChange={(e) => setExameData(formatarData(e.target.value))} style={ESTILO_INPUT_BASE} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Arquivo (PDF, PNG, JPG, JPEG, GIF, WEBP, BMP, TIFF)</label>
                  <input type="file" required accept=".pdf,image/*"
                    onChange={(e) => setExameArquivo(e.target.files?.[0] || null)}
                    style={{ ...ESTILO_INPUT_BASE, padding: '8px' }} />
                  {exameArquivo && <small style={{ marginTop: '4px', color: '#555' }}>Selecionado: {exameArquivo.name}</small>}
                </div>
                <button type="submit" disabled={exameUploading || !exameArquivo} style={{ ...ESTILO_BOTAO_BASE, backgroundColor: exameUploading ? '#9e9e9e' : '#00838f', color: 'white' }}>
                  {exameUploading ? "Enviando..." : "📤 Enviar exame"}
                </button>
              </form>
            </div>

            {/* LISTA DE EXAMES */}
            <h3 style={{ marginTop: 0 }}>Exames carregados</h3>
            {exames.length === 0 ? (
              <p>Nenhum exame carregado para este paciente ainda.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'black' }}>
                <thead>
                  <tr style={{ backgroundColor: '#eeeeee', borderBottom: '2px solid #ccc' }}>
                    <th style={{ padding: '10px', width: '15%' }}>Data</th>
                    <th style={{ padding: '10px', width: '40%' }}>Descrição</th>
                    <th style={{ padding: '10px', width: '25%' }}>Arquivo</th>
                    <th style={{ padding: '10px', width: '20%' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {exames.map(ex => (
                    <tr key={ex.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{ex.data_exame || '—'}</td>
                      <td style={{ padding: '10px' }}>{ex.descricao}</td>
                      <td style={{ padding: '10px', fontSize: '13px', wordBreak: 'break-all' }}>{ex.arquivo_nome}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                          <a href={urlExame(pacienteExamesAberto, ex.id!)} target="_blank" rel="noreferrer" style={{ textAlign: 'center', textDecoration: 'none', ...ESTILO_BOTAO_BASE, padding: '6px 10px', fontSize: '12px', backgroundColor: '#00838f', color: 'white' }}>👁 Ver</a>
                          <button onClick={() => ex.id && excluirExame(ex.id)} style={{ ...ESTILO_BOTAO_BASE, padding: '6px 10px', fontSize: '12px', backgroundColor: '#f44336', color: 'white' }}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDERIZAÇÃO: TELA FOLHA DE EVOLUÇÃO
  // ==========================================
  if (pacienteEvolucaoAberto) {
    return (
      <div style={ESTILO_GERAL}>
        <div style={ESTILO_CONTAINER}>
          <div style={{ ...ESTILO_CARD, borderTop: '5px solid #ff9800' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', gap: '15px' }}>
              <h1 style={{ margin: 0, lineHeight: '1.3' }}>Folha de Evolução: <br/><span style={{ color: '#ff9800' }}>{pacienteEvolucaoAberto.nome}</span></h1>
              <button onClick={fecharEvolucao} style={{ ...ESTILO_BOTAO_BASE, backgroundColor: '#9e9e9e', color: 'white', whiteSpace: 'nowrap' }}>
                ← Voltar
              </button>
            </div>

            {/* FORMULÁRIO DE NOVO REGISTRO (ou edição) */}
            <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
              <h3 style={{ marginTop: 0, color: '#e65100' }}>
                {evolucaoEditandoId !== null ? "Editar Registro" : "Registrar Trabalho Realizado e Planejamento"}
              </h3>
              <form onSubmit={salvarEvolucao} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '250px' }}>
                  <label style={ESTILO_LABEL}>Data da Consulta</label>
                  <input type="text" placeholder="DD/MM/AAAA" required value={dataEvolucao} onChange={(e) => setDataEvolucao(formatarData(e.target.value))} style={ESTILO_INPUT_BASE} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Trabalho Realizado</label>
                  <textarea rows={3} required placeholder="O que foi feito nesta consulta..." value={trabalhoRealizado} onChange={(e) => setTrabalhoRealizado(e.target.value)} style={{ ...ESTILO_INPUT_BASE, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Próxima Visita / Planejamento</label>
                  <textarea rows={3} placeholder="Trabalhos a serem feitos na próxima consulta..." value={proximaVisita} onChange={(e) => setProximaVisita(e.target.value)} style={{ ...ESTILO_INPUT_BASE, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ ...ESTILO_BOTAO_BASE, flex: 1, backgroundColor: evolucaoEditandoId !== null ? '#2196F3' : '#ff9800', color: 'white' }}>
                    {evolucaoEditandoId !== null ? "💾 Salvar Alterações" : "➕ Adicionar Registro"}
                  </button>
                  {evolucaoEditandoId !== null && (
                    <button type="button" onClick={limparFormularioEvolucao} style={{ ...ESTILO_BOTAO_BASE, backgroundColor: '#9e9e9e', color: 'white' }}>Cancelar</button>
                  )}
                </div>
              </form>
            </div>

            {/* TABELA DE HISTÓRICO DE EVOLUÇÃO */}
            <h3 style={{ marginTop: 0 }}>Histórico de Evolução</h3>
            {evolucoes.length === 0 ? (
              <p>Nenhum registro de evolução para este paciente ainda.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'black' }}>
                <thead>
                  <tr style={{ backgroundColor: '#eeeeee', borderBottom: '2px solid #ccc' }}>
                    <th style={{ padding: '10px', width: '13%' }}>Data</th>
                    <th style={{ padding: '10px', width: '37%' }}>Trabalho Realizado</th>
                    <th style={{ padding: '10px', width: '37%' }}>Próxima Visita</th>
                    <th style={{ padding: '10px', width: '13%' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {evolucoes.map(ev => (
                    <tr key={ev.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', verticalAlign: 'top' }}>{ev.data}</td>
                      <td style={{ padding: '10px', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>{ev.trabalho_realizado}</td>
                      <td style={{ padding: '10px', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>{ev.proxima_visita || "-"}</td>
                      <td style={{ padding: '10px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                          <button onClick={() => prepararEdicaoEvolucao(ev)} style={{ ...ESTILO_BOTAO_BASE, padding: '6px 10px', fontSize: '12px', backgroundColor: '#2196F3', color: 'white' }}>Editar</button>
                          <button onClick={() => ev.id && excluirEvolucao(ev.id)} style={{ ...ESTILO_BOTAO_BASE, padding: '6px 10px', fontSize: '12px', backgroundColor: '#f44336', color: 'white' }}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDERIZAÇÃO: TELA FINANCEIRO
  // ==========================================
  if (pacienteFinanceiroAberto) {
    return (
      <div style={ESTILO_GERAL}>
        <div style={ESTILO_CONTAINER}>
          <div style={{ ...ESTILO_CARD, borderTop: '5px solid #4CAF50' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
              <h1 style={{ margin: 0, lineHeight: '1.3' }}>Financeiro: <br/><span style={{ color: '#4CAF50' }}>{pacienteFinanceiroAberto.nome}</span></h1>
              <button onClick={fecharFinanceiro} style={{ ...ESTILO_BOTAO_BASE, backgroundColor: '#9e9e9e', color: 'white' }}>
                ← Voltar
              </button>
            </div>

            {/* FORMULÁRIO DE NOVO PAGAMENTO (ou edição) */}
            <div style={{ backgroundColor: '#f9fbe7', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
              <h3 style={{ marginTop: 0, color: '#33691e' }}>
                {pagamentoEditandoId !== null ? "Editar Pagamento" : "Registrar Novo Pagamento"}
              </h3>
              <form onSubmit={salvarPagamento} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Valor</label>
                  <input type="number" step="0.01" placeholder="00,00" required value={valorPagamento} onChange={(e) => setValorPagamento(e.target.value)} style={ESTILO_INPUT_BASE} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Data do Pagamento</label>
                  <input type="text" placeholder="DD/MM/AAAA" required value={dataPagamento} onChange={(e) => setDataPagamento(formatarData(e.target.value))} style={ESTILO_INPUT_BASE} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Descrição</label>
                  <input type="text" placeholder="Limpeza, Manutenção, Tratamento..." required value={descricaoPagamento} onChange={(e) => setDescricaoPagamento(e.target.value)} style={ESTILO_INPUT_BASE} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Forma de Pagamento</label>
                  <select required value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} style={ESTILO_INPUT_BASE}>
                    <option value="" disabled>Selecione uma opção...</option>
                    <option value="PIX">PIX</option>
                    <option value="Débito">Débito</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', gridColumn: 'span 2' }}>
                  <button type="submit" style={{ ...ESTILO_BOTAO_BASE, flex: 1, backgroundColor: pagamentoEditandoId !== null ? '#2196F3' : '#4CAF50', color: 'white' }}>
                    {pagamentoEditandoId !== null ? "💾 Salvar Alterações" : "💰 Registrar Pagamento"}
                  </button>
                  {pagamentoEditandoId !== null && (
                    <button type="button" onClick={limparFormularioPagamento} style={{ ...ESTILO_BOTAO_BASE, backgroundColor: '#9e9e9e', color: 'white' }}>Cancelar</button>
                  )}
                </div>
              </form>
            </div>

            {/* HISTÓRICO DE PAGAMENTOS */}
            <h3 style={{ marginTop: 0 }}>Histórico de Pagamentos</h3>
            {pagamentos.length === 0 ? (
              <p>Nenhum pagamento registrado para este paciente.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'black' }}>
                <thead>
                  <tr style={{ backgroundColor: '#eeeeee', borderBottom: '2px solid #ccc' }}>
                    <th style={{ padding: '10px' }}>Data</th>
                    <th style={{ padding: '10px' }}>Descrição</th>
                    <th style={{ padding: '10px' }}>Forma</th>
                    <th style={{ padding: '10px' }}>Valor</th>
                    <th style={{ padding: '10px', width: '15%' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map(pag => (
                    <tr key={pag.id} style={{ borderBottom: '1px solid #eee', backgroundColor: pagamentoEditandoId === pag.id ? '#e3f2fd' : 'transparent' }}>
                      <td style={{ padding: '10px' }}>{pag.data_pagamento}</td>
                      <td style={{ padding: '10px' }}>{pag.descricao}</td>
                      <td style={{ padding: '10px' }}>{pag.forma_pagamento}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#2e7d32' }}>R$ {pag.valor.toFixed(2).replace('.', ',')}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                          <button onClick={() => prepararEdicaoPagamento(pag)} style={{ ...ESTILO_BOTAO_BASE, padding: '6px 10px', fontSize: '12px', backgroundColor: '#2196F3', color: 'white' }}>Editar</button>
                          <button onClick={() => pag.id && excluirPagamento(pag.id)} style={{ ...ESTILO_BOTAO_BASE, padding: '6px 10px', fontSize: '12px', backgroundColor: '#f44336', color: 'white' }}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDERIZAÇÃO: TELA FICHA CLÍNICA
  // ==========================================
  if (pacienteFichaAberta) {
    return (
      <div style={ESTILO_GERAL}>
        <div style={ESTILO_CONTAINER}>
          <div style={{ ...ESTILO_CARD, borderTop: '5px solid #673ab7' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', gap: '15px' }}>
              <h1 style={{ margin: 0, lineHeight: '1.3' }}>Anamnese Clínica: <br/><span style={{ color: '#673ab7' }}>{pacienteFichaAberta.nome}</span></h1>
              <button onClick={fecharFicha} style={{ ...ESTILO_BOTAO_BASE, backgroundColor: '#9e9e9e', color: 'white', whiteSpace: 'nowrap' }}>
                ← Voltar
              </button>
            </div>

            <form onSubmit={salvarFicha} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>1. Queixa Principal</label>
                  <textarea rows={2} value={ficha.queixa_principal} onChange={(e) => atualizarCampoFicha('queixa_principal', e.target.value)} style={{ ...ESTILO_INPUT_BASE, width: '100%', resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>2. Tratamento médico ou cirúrgico atual? (Qual motivo?)</label>
                  <textarea rows={2} value={ficha.tratamento_medico} onChange={(e) => atualizarCampoFicha('tratamento_medico', e.target.value)} style={{ ...ESTILO_INPUT_BASE, width: '100%', resize: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', ...ESTILO_LABEL, color: '#1565c0', fontSize: '15px' }}>
                  <input type="checkbox" checked={ficha.diabetico} onChange={(e) => atualizarCampoFicha('diabetico', e.target.checked)} style={{ transform: 'scale(1.4)' }} />
                  Diabético(a)?
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', ...ESTILO_LABEL, color: '#1565c0', fontSize: '15px' }}>
                  <input type="checkbox" checked={ficha.gravida} onChange={(e) => atualizarCampoFicha('gravida', e.target.checked)} style={{ transform: 'scale(1.4)' }} />
                  Está Grávida?
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', ...ESTILO_LABEL, color: '#1565c0', fontSize: '15px' }}>
                  <input type="checkbox" checked={ficha.febre_reumatica} onChange={(e) => atualizarCampoFicha('febre_reumatica', e.target.checked)} style={{ transform: 'scale(1.4)' }} />
                  Febre reumática?
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', ...ESTILO_LABEL, color: '#1565c0', fontSize: '15px' }}>
                  <input type="checkbox" checked={ficha.operou_amigdalas} onChange={(e) => atualizarCampoFicha('operou_amigdalas', e.target.checked)} style={{ transform: 'scale(1.4)' }} />
                  Operou amígdalas/adenóides?
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', ...ESTILO_LABEL, color: '#1565c0', fontSize: '15px' }}>
                  <input type="checkbox" checked={ficha.traumatismo_facial} onChange={(e) => atualizarCampoFicha('traumatismo_facial', e.target.checked)} style={{ transform: 'scale(1.4)' }} />
                  Traumatismo facial?
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', ...ESTILO_LABEL, color: '#1565c0', fontSize: '15px' }}>
                  <input type="checkbox" checked={ficha.tratamento_ortodontico_anterior} onChange={(e) => atualizarCampoFicha('tratamento_ortodontico_anterior', e.target.checked)} style={{ transform: 'scale(1.4)' }} />
                  Tratamento ortodôntico anterior?
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Tipo sanguíneo</label>
                  <input type="text" placeholder="Ex.: O+, A-, AB+" value={ficha.tipo_sanguineo} onChange={(e) => atualizarCampoFicha('tipo_sanguineo', e.target.value)} style={{ ...ESTILO_INPUT_BASE, width: '100%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Outras patologias não citadas acima</label>
                  <input type="text" value={ficha.outras_patologias} onChange={(e) => atualizarCampoFicha('outras_patologias', e.target.value)} style={{ ...ESTILO_INPUT_BASE, width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>3. Possui Alergias ou Distúrbios Sanguíneos?</label>
                  <input type="text" value={ficha.alergias} onChange={(e) => atualizarCampoFicha('alergias', e.target.value)} style={{ ...ESTILO_INPUT_BASE, width: '100%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>4. Faz uso de algum medicamento? Quais?</label>
                  <input type="text" value={ficha.medicamentos_em_uso} onChange={(e) => atualizarCampoFicha('medicamentos_em_uso', e.target.value)} style={{ ...ESTILO_INPUT_BASE, width: '100%' }} />
                </div>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '10px 0' }} />
              <h3 style={{ margin: '0 0 10px 0', textTransform: 'sentencecase' }}>Histórico detalhado por sistemas (Garantia Clínica)</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                  { label: "5. Sistema Cardiovascular (Pressão, próteses)", campo: "sistema_cardiovascular" },
                  { label: "6. Sistema Respiratório (Asma, sinusite)", campo: "sistema_respiratorio" },
                  { label: "7. Sanguíneo/Linfático (Hemofilia, anemia)", campo: "sistema_sanguineo_linfatico" },
                  { label: "8. Gastrointestinal (Úlcera, hepatite)", campo: "sistema_gastrointestinal" },
                  { label: "9. Sistema Nervoso (Epilepsia, paralisia)", campo: "sistema_nervoso" },
                  { label: "10. Urinário/Endócrino (Renal, tireoide)", campo: "sistema_urinario_endocrino" }
                ].map((item) => (
                  <div key={item.campo} style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>{item.label}</label>
                    <input 
                      type="text" 
                      /* O SEGREDO ESTÁ AQUI: adicionamos o "as string" */
                      value={ficha[item.campo as keyof FichaClinica] as string} 
                      onChange={(e) => atualizarCampoFicha(item.campo as keyof FichaClinica, e.target.value)} 
                      style={{ ...ESTILO_INPUT_BASE, width: '100%' }} 
                      placeholder="Descreva se houver..." 
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
                <label style={ESTILO_LABEL}>11. Observações Adicionais</label>
                <textarea rows={3} value={ficha.observacoes_adicionais} onChange={(e) => atualizarCampoFicha('observacoes_adicionais', e.target.value)} style={{ ...ESTILO_INPUT_BASE, width: '100%', resize: 'none' }} />
              </div>

              <button type="submit" style={{ ...ESTILO_BOTAO_BASE, backgroundColor: '#4CAF50', color: 'white', fontSize: '18px', marginTop: '20px' }}>
                💾 Salvar Ficha Clínica Completa
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDERIZAÇÃO: TELA CADASTRO PACIENTE
  // ==========================================
  return (
    <div style={ESTILO_GERAL}>
      <div style={ESTILO_CONTAINER}>
        <h1>Prontuário Odontológico</h1>
        
        <div style={{ ...ESTILO_CARD, backgroundColor: pacienteEditando !== null ? '#e3f2fd' : 'white' }}>
          <h2 style={{ textTransform: 'sentencecase' }}>{pacienteEditando !== null ? "Editando dados do paciente" : "Novo cadastro de paciente"}</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* SEÇÃO: IDENTIFICAÇÃO */}
            <div>
              <h3 style={{ margin: '0 0 10px 0', color: '#673ab7' }}>Identificação</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Nome Completo</label>
                  <input type="text" placeholder="Nome Completo" required value={nome} onChange={(e) => setNome(e.target.value)} style={ESTILO_INPUT_BASE} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>CPF</label>
                    <input type="text" placeholder="000.000.000-00" required value={cpf} onChange={handleCpfChange} style={{ ...ESTILO_INPUT_BASE, border: erroCpfVisual ? '2px solid red' : '1px solid #ddd' }} />
                    {erroCpfVisual && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{erroCpfVisual}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Data de Nascimento</label>
                    <input type="text" placeholder="DD/MM/AAAA" required value={dataNascimento} onChange={handleDataChange} style={ESTILO_INPUT_BASE} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Sexo</label>
                    <select value={dadosExtras.sexo} onChange={(e) => setExtra('sexo', e.target.value)} style={ESTILO_INPUT_BASE}>
                      <option value="">—</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Estado Civil</label>
                    <input type="text" placeholder="Solteiro, Casado..." value={dadosExtras.estado_civil} onChange={(e) => setExtra('estado_civil', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Naturalidade</label>
                    <input type="text" placeholder="Cidade/UF" value={dadosExtras.naturalidade} onChange={(e) => setExtra('naturalidade', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Profissão</label>
                    <input type="text" value={dadosExtras.profissao} onChange={(e) => setExtra('profissao', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO: CONTATO E ENDEREÇO RESIDENCIAL */}
            <div>
              <h3 style={{ margin: '0 0 10px 0', color: '#673ab7' }}>Endereço residencial</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Telefone</label>
                    <input type="text" placeholder="(DD) 00000-0000" required value={telefone} onChange={handleTelefoneChange} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Endereço</label>
                    <input type="text" placeholder="Rua, Número, Bairro" required value={endereco} onChange={(e) => setEndereco(e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>CEP</label>
                    <input type="text" placeholder="00000-000" value={dadosExtras.cep}
                      onChange={(e) => setExtra('cep', formatarCEP(e.target.value))} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Cidade</label>
                    <input type="text" value={dadosExtras.cidade} onChange={(e) => setExtra('cidade', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO: ENDEREÇO COMERCIAL */}
            <div>
              <h3 style={{ margin: '0 0 10px 0', color: '#673ab7' }}>Endereço comercial</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={ESTILO_LABEL}>Endereço</label>
                  <input type="text" placeholder="Rua, Número, Bairro" value={dadosExtras.endereco_comercial} onChange={(e) => setExtra('endereco_comercial', e.target.value)} style={ESTILO_INPUT_BASE} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>CEP</label>
                    <input type="text" placeholder="00000-000" value={dadosExtras.cep_comercial}
                      onChange={(e) => setExtra('cep_comercial', formatarCEP(e.target.value))} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Cidade</label>
                    <input type="text" value={dadosExtras.cidade_comercial} onChange={(e) => setExtra('cidade_comercial', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Telefone</label>
                    <input type="text" placeholder="(DD) 0000-0000" value={dadosExtras.telefone_comercial}
                      onChange={handleTelefoneComercialChange} style={ESTILO_INPUT_BASE} />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO: FILIAÇÃO E INDICAÇÃO */}
            <div>
              <h3 style={{ margin: '0 0 10px 0', color: '#673ab7' }}>Filiação e indicação</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Nome do Pai</label>
                    <input type="text" value={dadosExtras.nome_pai} onChange={(e) => setExtra('nome_pai', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Profissão do Pai</label>
                    <input type="text" value={dadosExtras.profissao_pai} onChange={(e) => setExtra('profissao_pai', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Nome da Mãe</label>
                    <input type="text" value={dadosExtras.nome_mae} onChange={(e) => setExtra('nome_mae', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Profissão da Mãe</label>
                    <input type="text" value={dadosExtras.profissao_mae} onChange={(e) => setExtra('profissao_mae', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Responsável</label>
                    <input type="text" placeholder="(se menor de idade)" value={dadosExtras.responsavel} onChange={(e) => setExtra('responsavel', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={ESTILO_LABEL}>Indicação</label>
                    <input type="text" placeholder="Quem indicou o consultório?" value={dadosExtras.indicacao} onChange={(e) => setExtra('indicacao', e.target.value)} style={ESTILO_INPUT_BASE} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" style={{ ...ESTILO_BOTAO_BASE, flex: 1, backgroundColor: pacienteEditando !== null ? '#2196F3' : '#4CAF50', color: 'white' }}>
                {pacienteEditando !== null ? "💾 Salvar Alterações" : "👤 Cadastrar Paciente"}
              </button>
              {pacienteEditando !== null && (
                <button type="button" onClick={limparFormulario} style={{ ...ESTILO_BOTAO_BASE, backgroundColor: '#9e9e9e', color: 'white' }}>Cancelar</button>
              )}
            </div>
          </form>
        </div>

        <h2 style={{ textTransform: 'sentencecase' }}>Pacientes cadastrados</h2>
        {erro && <p style={{ color: 'red', fontWeight: 'bold' }}>{erro}</p>}
        
        {pacientes.length === 0 && !erro ? (
          <p>Nenhum paciente cadastrado ainda.</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {pacientes.map(paciente => {
              const expandido = pacienteExpandidoId === paciente.id
              return (
              <li key={paciente.id} style={{ ...ESTILO_CARD, marginBottom: '10px', padding: '15px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '15px' }}>
                    <strong style={{ fontSize: '18px', color: '#673ab7' }}>{paciente.nome}</strong> <br />
                    <strong>CPF:</strong> {formatarCPF(paciente.cpf)} |
                    <strong> DN:</strong> {formatarData(paciente.data_nascimento || "")} |
                    <strong> Tel:</strong> {formatarTelefone(paciente.telefone)}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => setPacienteExpandidoId(expandido ? null : paciente.id)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#607d8b', color: 'white' }}>
                      {expandido ? "🔼 Ver menos" : "🔽 Ver mais"}
                    </button>
                    <button onClick={() => abrirFicha(paciente)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#673ab7', color: 'white' }}>
                      📝 Ficha Clínica
                    </button>
                    <button onClick={() => abrirEvolucao(paciente)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#ff9800', color: 'white' }}>
                      📋 Evolução
                    </button>
                    <button onClick={() => abrirExames(paciente)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#00838f', color: 'white' }}>
                      🩻 Exames
                    </button>
                    <button onClick={() => abrirFinanceiro(paciente)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#4CAF50', color: 'white' }}>
                      💰 Financeiro
                    </button>
                    <button onClick={() => prepararEdicao(paciente)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#2196F3', color: 'white' }}>Editar</button>
                    <button onClick={() => handleDelete(paciente.id)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#f44336', color: 'white' }}>Excluir</button>
                  </div>
                </div>

                {expandido && (
                  <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fafafa', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '14px', lineHeight: '1.7' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '8px', color: '#673ab7' }}>Identificação</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                      <div><strong>Data de Nascimento:</strong> {paciente.data_nascimento ? formatarData(paciente.data_nascimento) : '—'}</div>
                      <div><strong>Sexo:</strong> {paciente.sexo || '—'}</div>
                      <div><strong>Estado Civil:</strong> {paciente.estado_civil || '—'}</div>
                      <div><strong>Naturalidade:</strong> {paciente.naturalidade || '—'}</div>
                      <div><strong>Profissão:</strong> {paciente.profissao || '—'}</div>
                    </div>

                    <h4 style={{ marginTop: '12px', marginBottom: '8px', color: '#673ab7' }}>Endereço residencial</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                      <div><strong>Telefone:</strong> {formatarTelefone(paciente.telefone)}</div>
                      <div><strong>Endereço:</strong> {paciente.endereco || '—'}</div>
                      <div><strong>CEP:</strong> {paciente.cep ? formatarCEP(paciente.cep) : '—'}</div>
                      <div><strong>Cidade:</strong> {paciente.cidade || '—'}</div>
                    </div>

                    {(paciente.endereco_comercial || paciente.cep_comercial || paciente.cidade_comercial || paciente.telefone_comercial) && (
                      <>
                        <h4 style={{ marginTop: '12px', marginBottom: '8px', color: '#673ab7' }}>Endereço comercial</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                          <div><strong>Endereço:</strong> {paciente.endereco_comercial || '—'}</div>
                          <div><strong>Telefone:</strong> {paciente.telefone_comercial ? formatarTelefone(paciente.telefone_comercial) : '—'}</div>
                          <div><strong>CEP:</strong> {paciente.cep_comercial ? formatarCEP(paciente.cep_comercial) : '—'}</div>
                          <div><strong>Cidade:</strong> {paciente.cidade_comercial || '—'}</div>
                        </div>
                      </>
                    )}

                    {(paciente.nome_pai || paciente.nome_mae || paciente.responsavel || paciente.indicacao) && (
                      <>
                        <h4 style={{ marginTop: '12px', marginBottom: '8px', color: '#673ab7' }}>Filiação e indicação</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                          <div><strong>Nome do Pai:</strong> {paciente.nome_pai || '—'}</div>
                          <div><strong>Profissão do Pai:</strong> {paciente.profissao_pai || '—'}</div>
                          <div><strong>Nome da Mãe:</strong> {paciente.nome_mae || '—'}</div>
                          <div><strong>Profissão da Mãe:</strong> {paciente.profissao_mae || '—'}</div>
                          <div><strong>Responsável:</strong> {paciente.responsavel || '—'}</div>
                          <div><strong>Indicação:</strong> {paciente.indicacao || '—'}</div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App
