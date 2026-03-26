import React, { useEffect, useState } from 'react'
import axios from 'axios'

interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
}

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

function App() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [erro, setErro] = useState("")

  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [telefone, setTelefone] = useState("")
  const [pacienteEditando, setPacienteEditando] = useState<number | null>(null)

  // NOVO: Estados para os erros visuais dos campos
  const [erroCpfVisual, setErroCpfVisual] = useState("")
  const [erroTelVisual, setErroTelVisual] = useState("")

  const buscarPacientes = () => {
    axios.get('http://localhost:8000/pacientes/')
      .then(response => setPacientes(response.data))
      .catch(() => setErro("Não foi possível carregar a lista."))
  }

  useEffect(() => {
    buscarPacientes()
  }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // 1. Limpa os avisos anteriores
    setErroCpfVisual("")
    setErroTelVisual("")

    // 2. Extrai apenas os números para fazer a contagem
    const cpfLimpo = cpf.replace(/\D/g, '')
    const telLimpo = telefone.replace(/\D/g, '')

    let temErro = false

    // 3. Validação do Frontend (Bloqueia antes de enviar)
    if (cpfLimpo.length !== 11) {
      setErroCpfVisual("O CPF deve ter exatamente 11 números.")
      temErro = true
    }

    if (telLimpo.length < 8) {
      setErroTelVisual("O telefone deve ter pelo menos 8 dígitos.")
      temErro = true
    }

    // Se houver erro, para a função aqui e nem chama o axios
    if (temErro) return

    // Se passou pela validação, segue o jogo
    if (pacienteEditando !== null) {
      axios.put(`http://localhost:8000/pacientes/${pacienteEditando}`, { nome, cpf, telefone })
      .then(() => {
        limparFormulario()
        buscarPacientes()
      })
      .catch(() => alert("Erro ao atualizar os dados do paciente."))
    } else {
      axios.post('http://localhost:8000/pacientes/', { nome, cpf, telefone })
      .then(() => {
        limparFormulario()
        buscarPacientes()
      })
      .catch(() => alert("Erro ao cadastrar paciente."))
    }
  }

  const prepararEdicao = (paciente: Paciente) => {
    setNome(paciente.nome)
    setCpf(formatarCPF(paciente.cpf))
    setTelefone(formatarTelefone(paciente.telefone))
    setPacienteEditando(paciente.id)
    // Limpa erros ao puxar para edição
    setErroCpfVisual("")
    setErroTelVisual("")
  }

  const limparFormulario = () => {
    setNome("")
    setCpf("")
    setTelefone("")
    setPacienteEditando(null)
    setErroCpfVisual("")
    setErroTelVisual("")
  }

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este paciente?")) {
      axios.delete(`http://localhost:8000/pacientes/${id}`)
        .then(() => buscarPacientes())
        .catch(() => alert("Erro ao excluir o paciente."))
    }
  }

// Interceptador do CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const cursor = input.selectionStart // 1. Salva onde o cursor estava piscando

    const formatado = formatarCPF(input.value)
    setCpf(formatado)
    setErroCpfVisual("")

    // 2. Pede pro navegador: "Assim que você desenhar o CPF novo na tela, bote o cursor de volta onde estava"
    window.requestAnimationFrame(() => {
      if (input && cursor !== null) {
        input.setSelectionRange(cursor, cursor)
      }
    })
  }

  // Interceptador do Telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const cursor = input.selectionStart // 1. Salva onde o cursor estava piscando

    const formatado = formatarTelefone(input.value)
    setTelefone(formatado)
    setErroTelVisual("")

    // 2. Devolve o cursor
    window.requestAnimationFrame(() => {
      if (input && cursor !== null) {
        input.setSelectionRange(cursor, cursor)
      }
    })
  }


  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Prontuário Odontológico</h1>
      
      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '20px', backgroundColor: pacienteEditando !== null ? '#e3f2fd' : 'white' }}>
        <h2>{pacienteEditando !== null ? "Editando Paciente" : "Novo Paciente"}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="text" placeholder="Nome Completo" required
            value={nome} onChange={(e) => setNome(e.target.value)}
            style={{ padding: '8px' }}
          />
          
          {/* Caixa do CPF e sua mensagem de erro */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <input 
              type="text" placeholder="CPF" required
              value={cpf} 
              onChange={handleCpfChange}
              style={{ padding: '8px', border: erroCpfVisual ? '1px solid red' : '1px solid #ccc' }}
            />
            {erroCpfVisual && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{erroCpfVisual}</span>}
          </div>

          {/* Caixa do Telefone e sua mensagem de erro */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <input 
              type="text" placeholder="Telefone" required
              value={telefone} 
              onChange={handleTelefoneChange}
              style={{ padding: '8px', border: erroTelVisual ? '1px solid red' : '1px solid #ccc' }}
            />
            {erroTelVisual && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{erroTelVisual}</span>}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: pacienteEditando !== null ? '#2196F3' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {pacienteEditando !== null ? "Salvar Alterações" : "Salvar Paciente"}
            </button>
            
            {pacienteEditando !== null && (
              <button type="button" onClick={limparFormulario} style={{ padding: '10px', backgroundColor: '#9e9e9e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <h2>Pacientes Cadastrados</h2>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      
      {pacientes.length === 0 && !erro ? (
        <p>Nenhum paciente cadastrado ainda.</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {pacientes.map(paciente => (
            <li key={paciente.id} style={{ border: '1px solid #eee', margin: '10px 0', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Nome:</strong> {paciente.nome} <br />
                <strong>CPF:</strong> {formatarCPF(paciente.cpf)} <br />
                <strong>Telefone:</strong> {formatarTelefone(paciente.telefone)}
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => prepararEdicao(paciente)} 
                  style={{ padding: '8px 12px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(paciente.id)} 
                  style={{ padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App