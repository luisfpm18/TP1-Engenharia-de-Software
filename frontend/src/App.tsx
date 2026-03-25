import { useEffect, useState } from 'react'
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

  const buscarPacientes = () => {
    axios.get('http://localhost:8000/pacientes/')
      .then(response => setPacientes(response.data))
      .catch(error => setErro("Não foi possível carregar a lista."))
  }

  useEffect(() => {
    buscarPacientes()
  }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    axios.post('http://localhost:8000/pacientes/', {
      nome: nome,
      cpf: cpf,
      telefone: telefone
    })
    .then(() => {
      setNome("")
      setCpf("")
      setTelefone("")
      buscarPacientes()
    })
    .catch(error => {
      console.error("Erro ao cadastrar:", error)
      alert("Erro ao cadastrar paciente. Verifique os dados.")
    })
  }

  // NOVA FUNÇÃO: Acionada quando clica no botão Excluir
  const handleDelete = (id: number) => {
    // Um aviso para a dentista não apagar sem querer
    if (window.confirm("Tem certeza que deseja excluir este paciente?")) {
      axios.delete(`http://localhost:8000/pacientes/${id}`)
        .then(() => {
          // Se o backend apagou com sucesso, busca a lista nova
          buscarPacientes()
        })
        .catch(error => {
          console.error("Erro ao excluir:", error)
          alert("Erro ao excluir o paciente.")
        })
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Prontuário Odontológico</h1>
      
      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Novo Paciente</h2>
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
          <button type="submit" style={{ padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Salvar Paciente
          </button>
        </form>
      </div>

      <h2>Pacientes Cadastrados</h2>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      
      {pacientes.length === 0 && !erro ? (
        <p>Nenhum paciente cadastrado ainda.</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {pacientes.map(paciente => (
            // Flexbox para colocar as infos na esquerda e o botão na direita
            <li key={paciente.id} style={{ border: '1px solid #eee', margin: '10px 0', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Nome:</strong> {paciente.nome} <br />
                <strong>CPF:</strong> {paciente.cpf} <br />
                <strong>Telefone:</strong> {paciente.telefone}
              </div>
              {/* NOVO BOTÃO DE EXCLUIR */}
              <button 
                onClick={() => handleDelete(paciente.id)} 
                style={{ padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App