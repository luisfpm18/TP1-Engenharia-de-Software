import { useEffect, useState } from 'react'
import axios from 'axios'

// 1. Ensinamos ao TypeScript o que é um "Paciente"
interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
}

function App() {
  // 2. O post-it agora guarda uma LISTA de pacientes (começa vazia: [])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [erro, setErro] = useState("")

  // 3. O carteiro (Axios) busca os dados quando a tela carrega
  useEffect(() => {
    axios.get('http://localhost:8000/pacientes/')
      .then(response => {
        setPacientes(response.data) // Guarda a lista que veio do Python
      })
      .catch(error => {
        console.error("Erro ao buscar pacientes:", error)
        setErro("Não foi possível carregar a lista de pacientes.")
      })
  }, [])

  // 4. O visual (HTML) da tela
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Prontuário Odontológico</h1>
      <h2>Lista de Pacientes Cadastrados</h2>

      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      {pacientes.length === 0 && !erro ? (
        <p>Nenhum paciente cadastrado ainda.</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {/* O map percorre a lista e desenha um "card" para cada paciente */}
          {pacientes.map(paciente => (
            <li key={paciente.id} style={{ 
              border: '1px solid #ccc', 
              margin: '10px 0', 
              padding: '15px', 
              borderRadius: '8px',
              backgroundColor: '#f9f9f9'
            }}>
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