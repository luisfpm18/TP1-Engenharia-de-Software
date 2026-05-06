from sqlmodel import SQLModel, Field
from typing import Optional
from pydantic import BaseModel

# ==========================================
# 1. MODELO PACIENTE (TABELA NO BANCO)
# ==========================================
# Cadastro Completo de Dados Pessoais — espelha o cabeçalho da ficha em papel
class Paciente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Identificação
    nome: str
    cpf: str = Field(unique=True)
    rg: Optional[str] = None
    data_nascimento: Optional[str] = None
    sexo: Optional[str] = None
    naturalidade: Optional[str] = None
    estado_civil: Optional[str] = None
    profissao: Optional[str] = None

    # Endereço e contato residencial
    telefone: str
    endereco: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None

    # Endereço e contato comercial
    endereco_comercial: Optional[str] = None
    cep_comercial: Optional[str] = None
    cidade_comercial: Optional[str] = None
    telefone_comercial: Optional[str] = None

    # Filiação e indicação
    nome_pai: Optional[str] = None
    profissao_pai: Optional[str] = None
    nome_mae: Optional[str] = None
    profissao_mae: Optional[str] = None
    responsavel: Optional[str] = None
    indicacao: Optional[str] = None

# Pydantic — Criar
class PacienteCreate(BaseModel):
    nome: str
    cpf: str
    rg: Optional[str] = None
    data_nascimento: Optional[str] = None
    sexo: Optional[str] = None
    naturalidade: Optional[str] = None
    estado_civil: Optional[str] = None
    profissao: Optional[str] = None
    telefone: str
    endereco: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    endereco_comercial: Optional[str] = None
    cep_comercial: Optional[str] = None
    cidade_comercial: Optional[str] = None
    telefone_comercial: Optional[str] = None
    nome_pai: Optional[str] = None
    profissao_pai: Optional[str] = None
    nome_mae: Optional[str] = None
    profissao_mae: Optional[str] = None
    responsavel: Optional[str] = None
    indicacao: Optional[str] = None

# Pydantic — Atualizar (todos opcionais)
class PacienteUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    rg: Optional[str] = None
    data_nascimento: Optional[str] = None
    sexo: Optional[str] = None
    naturalidade: Optional[str] = None
    estado_civil: Optional[str] = None
    profissao: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    endereco_comercial: Optional[str] = None
    cep_comercial: Optional[str] = None
    cidade_comercial: Optional[str] = None
    telefone_comercial: Optional[str] = None
    nome_pai: Optional[str] = None
    profissao_pai: Optional[str] = None
    nome_mae: Optional[str] = None
    profissao_mae: Optional[str] = None
    responsavel: Optional[str] = None
    indicacao: Optional[str] = None

# ==========================================
# 2. MODELO FICHA CLÍNICA (TABELA NO BANCO)
# ==========================================
# Ampliado para a Anamnese Clínica Completa
class FichaClinica(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Chave Estrangeira: liga esta ficha ao ID do paciente
    paciente_id: int = Field(foreign_key="paciente.id", unique=True)
    
    queixa_principal: Optional[str] = None
    tratamento_medico: Optional[str] = None 
    
    # Checkboxes Críticos
    diabetico: bool = Field(default=False)
    gravida: bool = Field(default=False)
    
    # Textos Específicos (Trazendo o papel de volta)
    alergias: Optional[str] = None
    medicamentos_em_uso: Optional[str] = None
    
    # Campos Pega-Tudo por Sistemas (Garantia Clínica)
    sistema_cardiovascular: Optional[str] = None
    sistema_respiratorio: Optional[str] = None
    sistema_sanguineo_linfatico: Optional[str] = None
    sistema_gastrointestinal: Optional[str] = None
    sistema_nervoso: Optional[str] = None
    sistema_urinario_endocrino: Optional[str] = None
    historico_familiar_lifestyle: Optional[str] = None

    # Itens específicos da ficha-padrão de ortodontia
    febre_reumatica: bool = Field(default=False)
    operou_amigdalas: bool = Field(default=False)
    traumatismo_facial: bool = Field(default=False)
    tratamento_ortodontico_anterior: bool = Field(default=False)
    tipo_sanguineo: Optional[str] = None
    outras_patologias: Optional[str] = None

    observacoes_adicionais: Optional[str] = None

# ==========================================
# 3. MODELOS DO FINANCEIRO (PAGAMENTOS)
# ==========================================
class Pagamento(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Chave Estrangeira: Liga este pagamento a um paciente. 
    # Diferente da ficha, NÃO tem "unique=True", pois um paciente pode ter VÁRIOS pagamentos.
    paciente_id: int = Field(foreign_key="paciente.id")
    
    valor: float
    data_pagamento: str # Vamos manter como texto (DD/MM/AAAA) para facilitar com o React
    descricao: str
    forma_pagamento: str # Receberá: Pix, Débito, Crédito ou Dinheiro

# Modelo Pydantic para validar os dados chegando do React
class PagamentoCreate(BaseModel):
    valor: float
    data_pagamento: str
    descricao: str
    forma_pagamento: str

# Modelo Pydantic para edição (todos campos opcionais)
class PagamentoUpdate(BaseModel):
    valor: Optional[float] = None
    data_pagamento: Optional[str] = None
    descricao: Optional[str] = None
    forma_pagamento: Optional[str] = None

# ==========================================
# 4. MODELO EVOLUÇÃO (FOLHA DE EVOLUÇÃO + PLANEJAMENTO)
# ==========================================
# Cada registro reúne a história 5 (trabalho realizado) e a história 6 (próxima visita).
# Um paciente pode ter VÁRIOS registros (sem unique=True na FK).
class Evolucao(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="paciente.id")

    data: str  # Data da consulta (DD/MM/AAAA)
    trabalho_realizado: str
    proxima_visita: Optional[str] = None  # Planejamento da próxima consulta

class EvolucaoCreate(BaseModel):
    data: str
    trabalho_realizado: str
    proxima_visita: Optional[str] = None

class EvolucaoUpdate(BaseModel):
    data: Optional[str] = None
    trabalho_realizado: Optional[str] = None
    proxima_visita: Optional[str] = None

# ==========================================
# 5. MODELO EXAME (UPLOAD DE EXAMES — radiografias, PDFs, imagens)
# ==========================================
# Apenas metadados ficam no DB. O binário do arquivo fica em backend/uploads/exames/
class Exame(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="paciente.id")

    descricao: str                  # ex.: "Radiografia panorâmica"
    data_exame: Optional[str] = None
    arquivo_nome: str               # nome original do arquivo
    arquivo_caminho: str            # caminho relativo no disco
    tipo_arquivo: str               # mime type, p.ex. "image/png" ou "application/pdf"
