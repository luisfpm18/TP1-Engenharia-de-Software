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
from models import Paciente, PacienteCreate, PacienteUpdate, FichaClinica, Pagamento, PagamentoCreate # Importe os modelos de dados
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

# --- ROTA POST (CRIAR PACIENTE) --- AMPLIAÇÃO
@app.post("/pacientes/", response_model=Paciente)
def criar_paciente(paciente: PacienteCreate):
    # Faxina dos dados (só números no CPF e Tel)
    cpf_limpo = re.sub(r'[^0-9]', '', paciente.cpf)
    telefone_limpo = re.sub(r'[^0-9]', '', paciente.telefone)
    
    # Validação do CPF
    if len(cpf_limpo) != 11:
        raise HTTPException(status_code=400, detail="O CPF deve conter exatamente 11 números.")
    
    # Criamos o objeto final para o banco com os dados limpos
    paciente_db = Paciente(
        nome=paciente.nome,
        cpf=cpf_limpo,
        rg=paciente.rg,
        data_nascimento=paciente.data_nascimento,
        telefone=telefone_limpo,
        endereco=paciente.endereco,
    )
    
    with Session(engine) as session:
        session.add(paciente_db)
        try:
            session.commit()
            session.refresh(paciente_db)
            return paciente_db
        except Exception:
            raise HTTPException(status_code=400, detail="CPF já cadastrado.")

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
    
# --- ROTA PUT (EDITAR PACIENTE) --- AMPLIAÇÃO
@app.put("/pacientes/{paciente_id}", response_model=Paciente)
def atualizar_paciente(paciente_id: int, paciente_update: PacienteUpdate):
    with Session(engine) as session:
        paciente_db = session.get(Paciente, paciente_id)
        if not paciente_db:
            raise HTTPException(status_code=404, detail="Paciente não encontrado")
        
        # Fazemos a faxina dos dados SE eles foram enviados
        if paciente_update.cpf:
            cpf_limpo = re.sub(r'[^0-9]', '', paciente_update.cpf)
            if len(cpf_limpo) != 11: raise HTTPException(status_code=400, detail="CPF inválido.")
            paciente_db.cpf = cpf_limpo

        if paciente_update.telefone:
            paciente_db.telefone = re.sub(r'[^0-9]', '', paciente_update.telefone)

        # Atualizamos os outros campos normais
        if paciente_update.nome: paciente_db.nome = paciente_update.nome
        if paciente_update.rg: paciente_db.rg = paciente_update.rg
        if paciente_update.data_nascimento: paciente_db.data_nascimento = paciente_update.data_nascimento
        if paciente_update.endereco: paciente_db.endereco = paciente_update.endereco
        
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
            ficha_existente.diabetico = dados_ficha.diabetico
            ficha_existente.gravida = dados_ficha.gravida
            ficha_existente.alergias = dados_ficha.alergias
            ficha_existente.medicamentos_em_uso = dados_ficha.medicamentos_em_uso
            ficha_existente.sistema_cardiovascular = dados_ficha.sistema_cardiovascular
            ficha_existente.sistema_respiratorio = dados_ficha.sistema_respiratorio
            ficha_existente.sistema_sanguineo_linfatico = dados_ficha.sistema_sanguineo_linfatico
            ficha_existente.sistema_gastrointestinal = dados_ficha.sistema_gastrointestinal
            ficha_existente.sistema_nervoso = dados_ficha.sistema_nervoso
            ficha_existente.sistema_urinario_endocrino = dados_ficha.sistema_urinario_endocrino
            ficha_existente.observacoes_adicionais = dados_ficha.observacoes_adicionais
            session.add(ficha_existente)
        else:
            # Se não tem, cria uma nova e força o cordão umbilical a se conectar ao paciente
            dados_ficha.paciente_id = paciente_id
            session.add(dados_ficha)

        session.commit()
        return {"message": "Ficha clínica salva com sucesso"}
    
#===================================================
# ROTAS PARA O HISTÓRICO FINANCEIRO (PAGAMENTOS)
#===================================================

# Rota para CADASTRAR um novo pagamento para o paciente
@app.post("/pacientes/{paciente_id}/pagamentos", response_model=Pagamento)
def registrar_pagamento(paciente_id: int, pagamento_in: PagamentoCreate):
    with Session(engine) as session:
        # Checa se o paciente existe antes de aceitar o pagamento
        paciente = session.get(Paciente, paciente_id)
        if not paciente:
            raise HTTPException(status_code=404, detail="Paciente não encontrado.")

        # Cria o registro do pagamento e liga o "cordão umbilical" ao paciente
        novo_pagamento = Pagamento(
            paciente_id=paciente_id,
            valor=pagamento_in.valor,
            data_pagamento=pagamento_in.data_pagamento,
            descricao=pagamento_in.descricao,
            forma_pagamento=pagamento_in.forma_pagamento
        )
        
        session.add(novo_pagamento)
        session.commit()
        session.refresh(novo_pagamento)
        return novo_pagamento

# Rota para LISTAR todos os pagamentos de um paciente (Histórico)
@app.get("/pacientes/{paciente_id}/pagamentos", response_model=List[Pagamento])
def listar_pagamentos(paciente_id: int):
    with Session(engine) as session:
        # Pega todos os pagamentos cujo paciente_id bata com a URL
        pagamentos = session.exec(select(Pagamento).where(Pagamento.paciente_id == paciente_id)).all()
        return pagamentos
