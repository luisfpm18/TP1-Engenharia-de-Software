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

const formatarRG = (valor: string) => {
  const v = valor.replace(/\D/g, '').slice(0, 9)
  if (v.length <= 2) return v
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}-${v.slice(8)}`
}

// ==========================================
// 3. INTERFACES (TIPAGEM)
// ==========================================
interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  rg: string;
  data_nascimento: string;
  endereco: string;
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
  observacoes_adicionais: string;
}

// ==========================================
// 4. COMPONENTE PRINCIPAL
// ==========================================
function App() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [erro, setErro] = useState("")

  // Estados do Formulário Cadastro Paciente
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [rg, setRg] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [telefone, setTelefone] = useState("")
  const [endereco, setEndereco] = useState("")
  
  const [pacienteEditando, setPacienteEditando] = useState<number | null>(null)
  const [erroCpfVisual, setErroCpfVisual] = useState("")

  // Estados Ficha Clínica
  const [pacienteFichaAberta, setPacienteFichaAberta] = useState<Paciente | null>(null)
  const [ficha, setFicha] = useState<FichaClinica>({
    queixa_principal: "", tratamento_medico: "",
    diabetico: false, gravida: false, medicamentos_em_uso: "", alergias: "",
    sistema_cardiovascular: "", sistema_respiratorio: "", sistema_sanguineo_linfatico: "",
    sistema_gastrointestinal: "", sistema_nervoso: "", sistema_urinario_endocrino: "",
    observacoes_adicionais: ""
  })

  const buscarPacientes = () => {
    axios.get('http://localhost:8000/pacientes/')
      .then(response => setPacientes(response.data))
      .catch(() => setErro("Não foi possível carregar a lista."))
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

  const handleRgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target; let cursor = input.selectionStart;
    const formatado = formatarRG(input.value); setRg(formatado);
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
    const input = e.target; let cursor = input.selectionStart;
    const formatado = formatarTelefone(input.value); setTelefone(formatado);
    window.requestAnimationFrame(() => {
      if (input && cursor !== null) {
        if (formatado[cursor - 1] === '-' || formatado[cursor - 1] === ' ') cursor++;
        input.setSelectionRange(cursor, cursor);
      }
    })
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
      rg,
      data_nascimento: dataNascimento,
      telefone,
      endereco
    }

    if (pacienteEditando !== null) {
      axios.put(`http://localhost:8000/pacientes/${pacienteEditando}`, dadosPacientePayload)
      .then(() => { limparFormulario(); buscarPacientes() })
      .catch(() => alert("Erro ao atualizar os dados do paciente."))
    } else {
      axios.post('http://localhost:8000/pacientes/', dadosPacientePayload)
      .then(() => { limparFormulario(); buscarPacientes() })
      .catch((err) => {
        if(err.response?.status === 400){
          alert("Erro: CPF já cadastrado.")
        } else {
          alert("Erro ao cadastrar paciente.")
        }
      })
    }
  }

  const prepararEdicao = (paciente: Paciente) => {
    setNome(paciente.nome)
    setCpf(formatarCPF(paciente.cpf))
    setRg(formatarRG(paciente.rg || ""))
    setDataNascimento(formatarData(paciente.data_nascimento || ""))
    setTelefone(formatarTelefone(paciente.telefone))
    setEndereco(paciente.endereco || "")
    
    setPacienteEditando(paciente.id)
    setErroCpfVisual("")
  }

  const limparFormulario = () => {
    setNome(""); setCpf(""); setRg(""); setDataNascimento(""); setTelefone(""); setEndereco("");
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
          observacoes_adicionais: dados.observacoes_adicionais || ""
        })
      })
      .catch(() => {
        setFicha({ queixa_principal: "", tratamento_medico: "", diabetico: false, gravida: false, medicamentos_em_uso: "", alergias: "", sistema_cardiovascular: "", sistema_respiratorio: "", sistema_sanguineo_linfatico: "", sistema_gastrointestinal: "", sistema_nervoso: "", sistema_urinario_endocrino: "", observacoes_adicionais: "" })
      })
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

              <div style={{ display: 'flex', gap: '30px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', ...ESTILO_LABEL, color: '#1565c0', fontSize: '16px' }}>
                  <input type="checkbox" checked={ficha.diabetico} onChange={(e) => atualizarCampoFicha('diabetico', e.target.checked)} style={{ transform: 'scale(1.4)' }} />
                  Paciente é Diabético(a)?
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', ...ESTILO_LABEL, color: '#1565c0', fontSize: '16px' }}>
                  <input type="checkbox" checked={ficha.gravida} onChange={(e) => atualizarCampoFicha('gravida', e.target.checked)} style={{ transform: 'scale(1.4)' }} />
                  Está Grávida?
                </label>
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
                <label style={ESTILO_LABEL}>11. Observações Adicionais (Febre reumática, traumatismo de face)</label>
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
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={ESTILO_LABEL}>Nome Completo</label>
              <input type="text" placeholder="Nome Completo" required value={nome} onChange={(e) => setNome(e.target.value)} style={ESTILO_INPUT_BASE} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={ESTILO_LABEL}>CPF</label>
                <input type="text" placeholder="000.000.000-00" required value={cpf} onChange={handleCpfChange} style={{ ...ESTILO_INPUT_BASE, border: erroCpfVisual ? '2px solid red' : '1px solid #ddd' }} />
              {erroCpfVisual && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{erroCpfVisual}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={ESTILO_LABEL}>RG (Opcional)</label>
              <input type="text" placeholder="00.000.000-0" value={rg} onChange={handleRgChange} style={ESTILO_INPUT_BASE} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={ESTILO_LABEL}>Data de Nascimento (Opcional)</label>
              <input type="text" placeholder="DD/MM/AAAA" value={dataNascimento} onChange={handleDataChange} style={ESTILO_INPUT_BASE} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={ESTILO_LABEL}>Telefone</label>
              <input type="text" placeholder="(DD) 00000-0000" required value={telefone} onChange={handleTelefoneChange} style={ESTILO_INPUT_BASE} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={ESTILO_LABEL}>Endereço Completo (Opcional)</label>
                <input type="text" placeholder="Rua, Número, Bairro, Cidade..." value={endereco} onChange={(e) => setEndereco(e.target.value)} style={ESTILO_INPUT_BASE} />
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
            {pacientes.map(paciente => (
              <li key={paciente.id} style={{ ...ESTILO_CARD, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '15px 20px' }}>
                <div style={{ fontSize: '15px' }}>
                  <strong style={{ fontSize: '18px', color: '#673ab7' }}>{paciente.nome}</strong> <br />
                  <strong>CPF:</strong> {formatarCPF(paciente.cpf)} | 
                  <strong> DN:</strong> {formatarData(paciente.data_nascimento || "")} | 
                  <strong> Tel:</strong> {formatarTelefone(paciente.telefone)}
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => abrirFicha(paciente)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#673ab7', color: 'white' }}>
                    📝 Ficha Clínica
                  </button>
                  <button onClick={() => prepararEdicao(paciente)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#2196F3', color: 'white' }}>Editar</button>
                  <button onClick={() => handleDelete(paciente.id)} style={{ ...ESTILO_BOTAO_BASE, padding: '10px 15px', backgroundColor: '#f44336', color: 'white' }}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App