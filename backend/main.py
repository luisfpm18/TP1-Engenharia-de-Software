from fastapi import FastAPI
from contextlib import asynccontextmanager # 1. Importe isso
from sqlmodel import SQLModel
from database import engine
import models # Garante que os modelos sejam lidos
from fastapi import HTTPException
from sqlmodel import Session, select # Importe o Session e o select
from database import engine
from models import Paciente

# 2. Criamos uma função "lifespan" (tempo de vida)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tudo antes do 'yield' acontece no STARTUP (ao ligar)
    SQLModel.metadata.create_all(engine)
    yield
    # Tudo depois do 'yield' acontece no SHUTDOWN (ao desligar)

# 3. Passamos o lifespan para o FastAPI
app = FastAPI(lifespan=lifespan)

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