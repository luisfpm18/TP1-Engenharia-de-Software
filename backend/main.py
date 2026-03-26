from pydantic import BaseModel #Usado para avisar o formato dos dados que vão chegar para a edição dos pacientes 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware #Importa o CORS para conectar o react com o banco de dados  
from contextlib import asynccontextmanager #Importa o asynccontextmanager para criar a função de lifespan
from sqlmodel import SQLModel
from database import engine
import models # Garante que os modelos sejam lidos
from fastapi import HTTPException
from sqlmodel import Session, select # Importe o Session e o select
from database import engine
from models import Paciente
from fastapi.middleware.cors import CORSMiddleware #Importa o CORS para conectar o react com o banco de dados  
from typing import List

# Criamos uma função "lifespan" (tempo de vida)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tudo antes do 'yield' acontece no STARTUP (ao ligar)
    SQLModel.metadata.create_all(engine)
    yield
    # Tudo depois do 'yield' acontece no SHUTDOWN (ao desligar)

# Passamos o lifespan para o FastAPI
app = FastAPI(lifespan=lifespan)

#Foi só teste para ver se funcionava a conexão, pode ser apagado depois
@app.get("/")
def root():
    return {"message": "Sistema Odontológico Online"}

@app.post("/pacientes/", response_model=Paciente)
def cadastrar_paciente(paciente: Paciente):
    with Session(engine) as session:
        # 1. Preparar: Coloca o objeto na "mesa de trabalho"
        session.add(paciente) 
        
        # 2. Persistir: Salva definitivamente no PostgreSQL
        try:
            session.commit()
        except Exception as e:
            # Se der erro (ex: CPF duplicado), desfaz a bagunça
            session.rollback()
            raise HTTPException(status_code=400, detail="Erro ao salvar: CPF já existe ou dados inválidos.")
            
        # 3. Atualizar: Pega o ID que o banco gerou e coloca de volta no objeto
        session.refresh(paciente)
       
        return paciente

# Rota GET para listar todos os pacientes
@app.get("/pacientes/", response_model=List[Paciente])
def listar_pacientes():
    with Session(engine) as session:
        # Pede ao banco de dados todos os registros da tabela Paciente
        pacientes = session.exec(select(Paciente).order_by(Paciente.id)).all() #adiciono a ordenação por ID (aparece do mais antigo para o mais novo)
        return pacientes

# Rota DELETE para excluir um paciente pelo ID
@app.delete("/pacientes/{paciente_id}")
def excluir_paciente(paciente_id: int):
    with Session(engine) as session:
        # Busca o paciente no banco pelo ID
        paciente = session.get(Paciente, paciente_id)
        
        # Se o paciente não existir, avisa que deu erro 404
        if not paciente:
            raise HTTPException(status_code=404, detail="Paciente não encontrado")
        
        # Se existir, deleta e salva a alteração no banco
        session.delete(paciente)
        session.commit()
        return {"message": "Paciente excluído com sucesso"}


# Configuração do CORS para permitir conexões do frontend
# 1. Lista de quem pode "falar" com o seu backend (seu frontend React)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 2. Adiciona a permissão oficial
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Permite todos os verbos (GET, POST, etc)
    allow_headers=["*"], # Permite todos os cabeçalhos
)

# Definimos o que o backend espera receber quando for atualizar
class PacienteUpdate(BaseModel):
    nome: str
    cpf: str
    telefone: str
    
# Rota PUT para atualizar o paciente
@app.put("/pacientes/{paciente_id}")
def atualizar_paciente(paciente_id: int, paciente_atualizado: PacienteUpdate):
    with Session(engine) as session:
        # 1. Procura o paciente antigo
        paciente_db = session.get(Paciente, paciente_id)
        
        if not paciente_db:
            raise HTTPException(status_code=404, detail="Paciente não encontrado")
        
        # 2. Substitui os dados velhos pelos novos
        paciente_db.nome = paciente_atualizado.nome
        paciente_db.cpf = paciente_atualizado.cpf
        paciente_db.telefone = paciente_atualizado.telefone
        
        # 3. Salva no banco
        session.add(paciente_db)
        session.commit()
        session.refresh(paciente_db)
        return paciente_db