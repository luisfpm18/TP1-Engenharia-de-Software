import re
from pydantic import BaseModel #Usado para avisar o formato dos dados que vão chegar para a edição dos pacientes 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware #Importa o CORS para conectar o react com o banco de dados  
from contextlib import asynccontextmanager #Importa o asynccontextmanager para criar a função de lifespan
from sqlmodel import SQLModel
from database import engine
from fastapi import HTTPException
from sqlmodel import Session, select # Importe o Session e o select
from database import engine
from models import Paciente, FichaClinica # Importe os modelos de dados
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

# --- ROTA POST (CRIAR) ---
@app.post("/pacientes/")
def criar_paciente(paciente: Paciente):
    # 1. Limpa os dados (deixa só números)
    cpf_limpo = re.sub(r'[^0-9]', '', paciente.cpf)
    telefone_limpo = re.sub(r'[^0-9]', '', paciente.telefone)
    
    # 2. Valida o tamanho do CPF
    if len(cpf_limpo) != 11:
        raise HTTPException(status_code=400, detail="O CPF deve conter exatamente 11 números.")
    
    with Session(engine) as session:
        # Substitui os dados pelos limpos antes de salvar
        paciente.cpf = cpf_limpo
        paciente.telefone = telefone_limpo
        
        session.add(paciente)
        session.commit()
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
    
# --- ROTA PUT (EDITAR) ---
@app.put("/pacientes/{paciente_id}")
def atualizar_paciente(paciente_id: int, paciente_atualizado: PacienteUpdate):
    # 1. Limpa os dados (deixa só números)
    cpf_limpo = re.sub(r'[^0-9]', '', paciente_atualizado.cpf)
    telefone_limpo = re.sub(r'[^0-9]', '', paciente_atualizado.telefone)
    
    # 2. Valida o tamanho do CPF
    if len(cpf_limpo) != 11:
        raise HTTPException(status_code=400, detail="O CPF deve conter exatamente 11 números.")

    with Session(engine) as session:
        paciente_db = session.get(Paciente, paciente_id)
        if not paciente_db:
            raise HTTPException(status_code=404, detail="Paciente não encontrado")
        
        # 3. Substitui pelos dados limpos
        paciente_db.nome = paciente_atualizado.nome
        paciente_db.cpf = cpf_limpo
        paciente_db.telefone = telefone_limpo
        
        session.add(paciente_db)
        session.commit()
        session.refresh(paciente_db)
        return paciente_db
    

#===================================================
# ROTAS PARA A FICHA CLÍNICA (NOVO MODELO DE DADOS)
#===================================================

# --- ADICIONE ISTO NO FINAL DO ARQUIVO ---

# Rota para BUSCAR a ficha de um paciente específico
@app.get("/pacientes/{paciente_id}/ficha", response_model=FichaClinica)
def ler_ficha(paciente_id: int):
    with Session(engine) as session:
        # Pede ao banco a ficha cujo cordão umbilical (paciente_id) seja igual ao ID da URL
        ficha = session.exec(select(FichaClinica).where(FichaClinica.paciente_id == paciente_id)).first()
        
        if not ficha:
            raise HTTPException(status_code=404, detail="Ficha clínica não encontrada para este paciente.")
        return ficha

# Rota inteligente para SALVAR ou ATUALIZAR a ficha
@app.post("/pacientes/{paciente_id}/ficha")
def salvar_ficha(paciente_id: int, dados_ficha: FichaClinica):
    with Session(engine) as session:
        # 1. Checa se o paciente existe antes de criar uma ficha pra ele
        paciente = session.get(Paciente, paciente_id)
        if not paciente:
            raise HTTPException(status_code=404, detail="Paciente não encontrado.")

        # 2. Checa se o paciente já tem uma ficha
        ficha_existente = session.exec(select(FichaClinica).where(FichaClinica.paciente_id == paciente_id)).first()

        if ficha_existente:
            # Se já tem ficha, nós apenas atualizamos os dados dela (como um PUT embutido)
            ficha_existente.queixa_principal = dados_ficha.queixa_principal
            ficha_existente.tratamento_medico = dados_ficha.tratamento_medico
            ficha_existente.disturbios_cardiovasculares = dados_ficha.disturbios_cardiovasculares
            ficha_existente.diabetico = dados_ficha.diabetico
            ficha_existente.gravida = dados_ficha.gravida
            ficha_existente.medicamentos = dados_ficha.medicamentos
            ficha_existente.alergias = dados_ficha.alergias
            ficha_existente.observacoes = dados_ficha.observacoes
            session.add(ficha_existente)
        else:
            # Se não tem, cria uma nova e força o cordão umbilical a se conectar ao paciente
            dados_ficha.paciente_id = paciente_id
            session.add(dados_ficha)

        session.commit()
        return {"message": "Ficha clínica salva com sucesso"}