import { useEffect, useState, FormEvent } from 'react'
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

  // 1. Estados para o formulário (o que a dentista digita)
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [telefone, setTelefone] = useState("")

  // Função para buscar a lista atualizada
  const buscarPacientes = () => {
    axios.get('http://localhost:8000/pacientes/')
      .then(response => setPacientes(response.data))
      .catch(error => setErro("Não foi possível carregar a lista."))
  }

  // Busca os pacientes assim que a tela abre
  useEffect(() => {
    buscarPacientes()
  }, [])

  // 2. Função que roda quando a dentista clica em "Salvar"
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault() // Impede a página de piscar/recarregar

    // Dispara o POST para o servidor Python
    axios.post('http://localhost:8000/pacientes/', {
      nome: nome,
      cpf: cpf,
      telefone: telefone
    })
    .then(() => {
      // Se deu certo: limpa os campos e busca a lista atualizada
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

  // 3. O visual (Formulário no topo, lista embaixo)
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Prontuário Odontológico</h1>
      
      {/* SEÇÃO DO FORMULÁRIO */}
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

      {/* SEÇÃO DA LISTA (Que já tínhamos feito) */}
      <h2>Pacientes Cadastrados</h2>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      
      {pacientes.length === 0 && !erro ? (
        <p>Nenhum paciente cadastrado ainda.</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {pacientes.map(paciente => (
            <li key={paciente.id} style={{ border: '1px solid #eee', margin: '10px 0', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
              <strong>Nome:</strong> {paciente.nome} <br />
              <strong>CPF:</strong> {paciente.cpf} <br />
              <strong>Telefone:</strong> {paciente.telefone}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App