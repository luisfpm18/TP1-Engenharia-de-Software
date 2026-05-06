import re
import uuid
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlmodel import SQLModel, Session, select
from sqlalchemy.exc import IntegrityError

from database import engine
from models import (
    Paciente, PacienteCreate, PacienteUpdate,
    FichaClinica,
    Pagamento, PagamentoCreate, PagamentoUpdate,
    Evolucao, EvolucaoCreate, EvolucaoUpdate,
    Exame,
)

# ==========================================
# DIRETÓRIO DE UPLOADS
# ==========================================
UPLOAD_DIR = Path("uploads/exames")

# ==========================================
# MIGRAÇÃO IDEMPOTENTE
# create_all() não adiciona colunas em tabelas que já existem.
# Aqui aplicamos ALTER TABLE IF NOT EXISTS para os campos novos.
# ==========================================
def aplicar_migracoes(engine):
    statements = [
        # Paciente — campos novos da ficha em papel
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS sexo VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS naturalidade VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS estado_civil VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS profissao VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS cep VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS cidade VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS endereco_comercial VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS cep_comercial VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS cidade_comercial VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS telefone_comercial VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS nome_pai VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS profissao_pai VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS nome_mae VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS profissao_mae VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS responsavel VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS indicacao VARCHAR",
        # FichaClinica — campos novos da ficha de ortodontia
        "ALTER TABLE fichaclinica ADD COLUMN IF NOT EXISTS febre_reumatica BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE fichaclinica ADD COLUMN IF NOT EXISTS operou_amigdalas BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE fichaclinica ADD COLUMN IF NOT EXISTS traumatismo_facial BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE fichaclinica ADD COLUMN IF NOT EXISTS tratamento_ortodontico_anterior BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE fichaclinica ADD COLUMN IF NOT EXISTS tipo_sanguineo VARCHAR",
        "ALTER TABLE fichaclinica ADD COLUMN IF NOT EXISTS outras_patologias VARCHAR",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.exec_driver_sql(stmt)

# ==========================================
# LIFESPAN
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    aplicar_migracoes(engine)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield

app = FastAPI(lifespan=lifespan)

# CORS — permite qualquer origem localhost (qualquer porta), tanto localhost quanto 127.0.0.1.
# allow_origin_regex aceita preflight de qualquer origem que case com o padrão, evitando
# erros sutis quando o frontend roda em portas alternativas durante desenvolvimento.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

@app.get("/")
def root():
    return {"message": "Sistema Odontológico Online"}

#===================================================
# ROTAS DE PACIENTE
#===================================================

@app.post("/pacientes/", response_model=Paciente)
def criar_paciente(paciente: PacienteCreate):
    cpf_limpo = re.sub(r'[^0-9]', '', paciente.cpf)
    telefone_limpo = re.sub(r'[^0-9]', '', paciente.telefone)
    if len(cpf_limpo) != 11:
        raise HTTPException(status_code=400, detail="O CPF deve conter exatamente 11 números.")

    # Monta dict com TODOS os campos enviados; sobrescreve cpf/telefone com versão limpa
    dados = paciente.model_dump()
    dados["cpf"] = cpf_limpo
    dados["telefone"] = telefone_limpo
    if dados.get("telefone_comercial"):
        dados["telefone_comercial"] = re.sub(r'[^0-9]', '', dados["telefone_comercial"])

    paciente_db = Paciente(**dados)
    with Session(engine) as session:
        session.add(paciente_db)
        try:
            session.commit()
            session.refresh(paciente_db)
            return paciente_db
        except IntegrityError as e:
            session.rollback()
            # Distingue CPF duplicado (UNIQUE violation) de outros erros de schema/dados
            msg = str(getattr(e, "orig", e)).lower()
            if "unique" in msg or "duplicate" in msg or "paciente_cpf" in msg:
                raise HTTPException(status_code=400, detail="CPF já cadastrado.")
            raise HTTPException(status_code=400, detail=f"Erro ao salvar paciente: {e.orig}")
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Erro inesperado ao salvar paciente: {e}")

@app.get("/pacientes/", response_model=List[Paciente])
def listar_pacientes():
    with Session(engine) as session:
        return session.exec(select(Paciente).order_by(Paciente.id)).all()

@app.put("/pacientes/{paciente_id}", response_model=Paciente)
def atualizar_paciente(paciente_id: int, paciente_update: PacienteUpdate):
    with Session(engine) as session:
        paciente_db = session.get(Paciente, paciente_id)
        if not paciente_db:
            raise HTTPException(status_code=404, detail="Paciente não encontrado")

        # exclude_unset=True só pega os campos que o cliente realmente mandou
        update_data = paciente_update.model_dump(exclude_unset=True)

        if "cpf" in update_data and update_data["cpf"]:
            cpf_limpo = re.sub(r'[^0-9]', '', update_data["cpf"])
            if len(cpf_limpo) != 11:
                raise HTTPException(status_code=400, detail="CPF inválido.")
            update_data["cpf"] = cpf_limpo
        if "telefone" in update_data and update_data["telefone"]:
            update_data["telefone"] = re.sub(r'[^0-9]', '', update_data["telefone"])
        if "telefone_comercial" in update_data and update_data["telefone_comercial"]:
            update_data["telefone_comercial"] = re.sub(r'[^0-9]', '', update_data["telefone_comercial"])

        for campo, valor in update_data.items():
            setattr(paciente_db, campo, valor)

        session.add(paciente_db)
        try:
            session.commit()
            session.refresh(paciente_db)
            return paciente_db
        except IntegrityError as e:
            session.rollback()
            msg = str(getattr(e, "orig", e)).lower()
            if "unique" in msg or "duplicate" in msg or "paciente_cpf" in msg:
                raise HTTPException(status_code=400, detail="CPF já cadastrado em outro paciente.")
            raise HTTPException(status_code=400, detail=f"Erro ao atualizar paciente: {e.orig}")

@app.delete("/pacientes/{paciente_id}")
def excluir_paciente(paciente_id: int):
    with Session(engine) as session:
        paciente = session.get(Paciente, paciente_id)
        if not paciente:
            raise HTTPException(status_code=404, detail="Paciente não encontrado")

        # Apaga TODOS os registros filhos em cascata (FKs sem ON DELETE CASCADE no schema)
        for evolucao in session.exec(select(Evolucao).where(Evolucao.paciente_id == paciente_id)).all():
            session.delete(evolucao)
        for pagamento in session.exec(select(Pagamento).where(Pagamento.paciente_id == paciente_id)).all():
            session.delete(pagamento)
        # Exames: apaga o registro no DB E o arquivo físico do disco
        for exame in session.exec(select(Exame).where(Exame.paciente_id == paciente_id)).all():
            try:
                Path(exame.arquivo_caminho).unlink(missing_ok=True)
            except Exception:
                pass  # se o arquivo já foi removido manualmente, ignora
            session.delete(exame)
        ficha = session.exec(select(FichaClinica).where(FichaClinica.paciente_id == paciente_id)).first()
        if ficha:
            session.delete(ficha)

        session.delete(paciente)
        session.commit()
        return {"message": "Paciente e todos os seus dados foram excluídos com sucesso"}

#===================================================
# ROTAS DA FICHA CLÍNICA (ANAMNESE)
#===================================================

@app.get("/pacientes/{paciente_id}/ficha", response_model=FichaClinica)
def ler_ficha(paciente_id: int):
    with Session(engine) as session:
        ficha = session.exec(select(FichaClinica).where(FichaClinica.paciente_id == paciente_id)).first()
        if not ficha:
            raise HTTPException(status_code=404, detail="Ficha clínica não encontrada para este paciente.")
        return ficha

@app.post("/pacientes/{paciente_id}/ficha")
def salvar_ficha(paciente_id: int, dados_ficha: FichaClinica):
    with Session(engine) as session:
        paciente = session.get(Paciente, paciente_id)
        if not paciente:
            raise HTTPException(status_code=404, detail="Paciente não encontrado.")

        ficha_existente = session.exec(select(FichaClinica).where(FichaClinica.paciente_id == paciente_id)).first()

        # Lista dos campos a copiar (todos os campos da ficha, exceto id e paciente_id)
        campos = [
            "queixa_principal", "tratamento_medico",
            "diabetico", "gravida",
            "alergias", "medicamentos_em_uso",
            "sistema_cardiovascular", "sistema_respiratorio",
            "sistema_sanguineo_linfatico", "sistema_gastrointestinal",
            "sistema_nervoso", "sistema_urinario_endocrino",
            "historico_familiar_lifestyle",
            "febre_reumatica", "operou_amigdalas",
            "traumatismo_facial", "tratamento_ortodontico_anterior",
            "tipo_sanguineo", "outras_patologias",
            "observacoes_adicionais",
        ]

        if ficha_existente:
            for campo in campos:
                setattr(ficha_existente, campo, getattr(dados_ficha, campo))
            session.add(ficha_existente)
        else:
            dados_ficha.paciente_id = paciente_id
            session.add(dados_ficha)

        session.commit()
        return {"message": "Ficha clínica salva com sucesso"}

#===================================================
# ROTAS DOS PAGAMENTOS
#===================================================

@app.post("/pacientes/{paciente_id}/pagamentos", response_model=Pagamento)
def registrar_pagamento(paciente_id: int, pagamento_in: PagamentoCreate):
    with Session(engine) as session:
        paciente = session.get(Paciente, paciente_id)
        if not paciente:
            raise HTTPException(status_code=404, detail="Paciente não encontrado.")
        novo = Pagamento(
            paciente_id=paciente_id,
            valor=pagamento_in.valor,
            data_pagamento=pagamento_in.data_pagamento,
            descricao=pagamento_in.descricao,
            forma_pagamento=pagamento_in.forma_pagamento,
        )
        session.add(novo)
        session.commit()
        session.refresh(novo)
        return novo

@app.get("/pacientes/{paciente_id}/pagamentos", response_model=List[Pagamento])
def listar_pagamentos(paciente_id: int):
    with Session(engine) as session:
        return session.exec(select(Pagamento).where(Pagamento.paciente_id == paciente_id)).all()

@app.put("/pacientes/{paciente_id}/pagamentos/{pagamento_id}", response_model=Pagamento)
def atualizar_pagamento(paciente_id: int, pagamento_id: int, pagamento_update: PagamentoUpdate):
    with Session(engine) as session:
        pagamento = session.get(Pagamento, pagamento_id)
        if not pagamento or pagamento.paciente_id != paciente_id:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado.")
        update_data = pagamento_update.model_dump(exclude_unset=True)
        for campo, valor in update_data.items():
            setattr(pagamento, campo, valor)
        session.add(pagamento)
        session.commit()
        session.refresh(pagamento)
        return pagamento

@app.delete("/pacientes/{paciente_id}/pagamentos/{pagamento_id}")
def excluir_pagamento(paciente_id: int, pagamento_id: int):
    with Session(engine) as session:
        pagamento = session.get(Pagamento, pagamento_id)
        if not pagamento or pagamento.paciente_id != paciente_id:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado.")
        session.delete(pagamento)
        session.commit()
        return {"message": "Pagamento excluído com sucesso"}

#===================================================
# ROTAS DA FOLHA DE EVOLUÇÃO
#===================================================

@app.post("/pacientes/{paciente_id}/evolucao", response_model=Evolucao)
def registrar_evolucao(paciente_id: int, evolucao_in: EvolucaoCreate):
    with Session(engine) as session:
        paciente = session.get(Paciente, paciente_id)
        if not paciente:
            raise HTTPException(status_code=404, detail="Paciente não encontrado.")
        nova = Evolucao(
            paciente_id=paciente_id,
            data=evolucao_in.data,
            trabalho_realizado=evolucao_in.trabalho_realizado,
            proxima_visita=evolucao_in.proxima_visita,
        )
        session.add(nova)
        session.commit()
        session.refresh(nova)
        return nova

@app.get("/pacientes/{paciente_id}/evolucao", response_model=List[Evolucao])
def listar_evolucoes(paciente_id: int):
    with Session(engine) as session:
        return session.exec(
            select(Evolucao).where(Evolucao.paciente_id == paciente_id).order_by(Evolucao.id)
        ).all()

@app.put("/pacientes/{paciente_id}/evolucao/{evolucao_id}", response_model=Evolucao)
def atualizar_evolucao(paciente_id: int, evolucao_id: int, evolucao_update: EvolucaoUpdate):
    with Session(engine) as session:
        evolucao = session.get(Evolucao, evolucao_id)
        if not evolucao or evolucao.paciente_id != paciente_id:
            raise HTTPException(status_code=404, detail="Registro de evolução não encontrado.")
        if evolucao_update.data is not None:
            evolucao.data = evolucao_update.data
        if evolucao_update.trabalho_realizado is not None:
            evolucao.trabalho_realizado = evolucao_update.trabalho_realizado
        if evolucao_update.proxima_visita is not None:
            evolucao.proxima_visita = evolucao_update.proxima_visita
        session.add(evolucao)
        session.commit()
        session.refresh(evolucao)
        return evolucao

@app.delete("/pacientes/{paciente_id}/evolucao/{evolucao_id}")
def excluir_evolucao(paciente_id: int, evolucao_id: int):
    with Session(engine) as session:
        evolucao = session.get(Evolucao, evolucao_id)
        if not evolucao or evolucao.paciente_id != paciente_id:
            raise HTTPException(status_code=404, detail="Registro de evolução não encontrado.")
        session.delete(evolucao)
        session.commit()
        return {"message": "Registro de evolução excluído com sucesso"}

#===================================================
# ROTAS DE EXAMES (UPLOAD/LISTAR/BAIXAR/EXCLUIR)
# Aceita imagens e PDFs.
#===================================================

EXTENSOES_PERMITIDAS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".tif"}

@app.post("/pacientes/{paciente_id}/exames", response_model=Exame)
async def upload_exame(
    paciente_id: int,
    descricao: str = Form(...),
    data_exame: Optional[str] = Form(None),
    arquivo: UploadFile = File(...),
):
    with Session(engine) as session:
        paciente = session.get(Paciente, paciente_id)
        if not paciente:
            raise HTTPException(status_code=404, detail="Paciente não encontrado.")

        nome_original = arquivo.filename or "arquivo"
        extensao = Path(nome_original).suffix.lower()
        if extensao not in EXTENSOES_PERMITIDAS:
            raise HTTPException(
                status_code=400,
                detail=f"Formato não suportado. Aceitos: {', '.join(sorted(EXTENSOES_PERMITIDAS))}",
            )

        # Nome único no disco para evitar colisão entre arquivos com o mesmo nome
        nome_unico = f"{uuid.uuid4().hex}{extensao}"
        caminho_disco = UPLOAD_DIR / nome_unico
        conteudo = await arquivo.read()
        caminho_disco.write_bytes(conteudo)

        novo_exame = Exame(
            paciente_id=paciente_id,
            descricao=descricao,
            data_exame=data_exame,
            arquivo_nome=nome_original,
            arquivo_caminho=str(caminho_disco),
            tipo_arquivo=arquivo.content_type or "application/octet-stream",
        )
        session.add(novo_exame)
        session.commit()
        session.refresh(novo_exame)
        return novo_exame

@app.get("/pacientes/{paciente_id}/exames", response_model=List[Exame])
def listar_exames(paciente_id: int):
    with Session(engine) as session:
        return session.exec(
            select(Exame).where(Exame.paciente_id == paciente_id).order_by(Exame.id)
        ).all()

@app.get("/pacientes/{paciente_id}/exames/{exame_id}/arquivo")
def baixar_arquivo_exame(paciente_id: int, exame_id: int):
    with Session(engine) as session:
        exame = session.get(Exame, exame_id)
        if not exame or exame.paciente_id != paciente_id:
            raise HTTPException(status_code=404, detail="Exame não encontrado.")
        caminho = Path(exame.arquivo_caminho)
        if not caminho.exists():
            raise HTTPException(status_code=404, detail="Arquivo do exame não encontrado em disco.")
        # Inline para o browser exibir PDF/imagem direto na aba
        return FileResponse(
            path=str(caminho),
            media_type=exame.tipo_arquivo,
            filename=exame.arquivo_nome,
            headers={"Content-Disposition": f'inline; filename="{exame.arquivo_nome}"'},
        )

@app.delete("/pacientes/{paciente_id}/exames/{exame_id}")
def excluir_exame(paciente_id: int, exame_id: int):
    with Session(engine) as session:
        exame = session.get(Exame, exame_id)
        if not exame or exame.paciente_id != paciente_id:
            raise HTTPException(status_code=404, detail="Exame não encontrado.")
        try:
            Path(exame.arquivo_caminho).unlink(missing_ok=True)
        except Exception:
            pass
        session.delete(exame)
        session.commit()
        return {"message": "Exame excluído com sucesso"}
