import React, { useEffect, useState } from 'react'
import axios from 'axios'

interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
}

function App() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [erro, setErro] = useState("")

  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [telefone, setTelefone] = useState("")
  
  // NOVO: Um post-it para lembrar qual paciente estamos editando (guarda o ID)
  const [pacienteEditando, setPacienteEditando] = useState<number | null>(null)

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

    // Se tiver um ID no pacienteEditando, significa que é uma ATUALIZAÇÃO (PUT)
    if (pacienteEditando != null) {
      axios.put(`http://localhost:8000/pacientes/${pacienteEditando}`, {
        nome, cpf, telefone
      })
      .then(() => {
        limparFormulario()
        buscarPacientes()
      })
      .catch(error => {
        console.error("Erro ao atualizar:", error)
        alert("Erro ao atualizar os dados do paciente.")
      })
    } 
    // Se for null, significa que é um CADASTRO NOVO (POST)
    else {
      axios.post('http://localhost:8000/pacientes/', {
        nome, cpf, telefone
      })
      .then(() => {
        limparFormulario()
        buscarPacientes()
      })
      .catch(error => {
        console.error("Erro ao cadastrar:", error)
        alert("Erro ao cadastrar paciente.")
      })
    }
  }

  // NOVO: Função para preencher o formulário ao clicar em "Editar"
  const prepararEdicao = (paciente: Paciente) => {
    setNome(paciente.nome)
    setCpf(paciente.cpf)
    setTelefone(paciente.telefone)
    setPacienteEditando(paciente.id)
  }

  // NOVO: Função para limpar os campos e cancelar a edição
  const limparFormulario = () => {
    setNome("")
    setCpf("")
    setTelefone("")
    setPacienteEditando(null)
  }

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este paciente?")) {
      axios.delete(`http://localhost:8000/pacientes/${id}`)
        .then(() => buscarPacientes())
        .catch(error => {
          console.error("Erro ao excluir:", error)
          alert("Erro ao excluir o paciente.")
        })
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Prontuário Odontológico</h1>
      
      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '20px', backgroundColor: pacienteEditando != null ? '#e3f2fd' : 'white' }}>
        {/* Muda o título dependendo do estado */}
        <h2>{pacienteEditando != null ? "Editando Paciente" : "Novo Paciente"}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="text" placeholder="Nome Completo" required
            value={nome} onChange={(e) => setNome(e.target.value)}
            style={{ padding: '8px' }}
          />
          <input 
            type="text" placeholder="CPF (somente números)" required
            value={cpf} onChange={(e) => setCpf(e.target.value)}
            style={{ padding: '8px' }}
          />
          <input 
            type="text" placeholder="Telefone" required
            value={telefone} onChange={(e) => setTelefone(e.target.value)}
            style={{ padding: '8px' }}
          />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: pacienteEditando != null ? '#2196F3' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {pacienteEditando != null ? "Salvar Alterações" : "Salvar Paciente"}
            </button>
            
            {/* Se estiver editando, mostra um botão para cancelar */}
            {pacienteEditando != null && (
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
                <strong>CPF:</strong> {paciente.cpf} <br />
                <strong>Telefone:</strong> {paciente.telefone}
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* NOVO BOTÃO DE EDITAR */}
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