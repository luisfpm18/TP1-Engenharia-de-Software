import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {
  const [mensagem, setMensagem] = useState("Carregando...")

  useEffect(() => {
    // A mágica acontece aqui:
    axios.get('http://localhost:8000/')
      .then(response => {
        setMensagem(response.data.message)
      })
      .catch(error => {
        console.error("Erro ao falar com o backend:", error)
        setMensagem("Erro de conexão!")
      })
  }, [])

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Prontuário Odontológico</h1>
      <p>Status do Backend: <strong>{mensagem}</strong></p>
    </div>
  )
}

export default App