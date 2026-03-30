from sqlmodel import SQLModel, Field
from typing import Optional

#Clase base para o paciente
class Paciente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    cpf: str = Field(unique=True, index=True)
    telefone: str
    anamnese: Optional[str] = None # Texto livre para a anamnese inicial
    
#Classe para a ficha clínica, que tem chave estrangeira para o paciente
class FichaClinica(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    
    # A Chave Estrangeira: liga esta ficha ao ID do paciente
    paciente_id: int = Field(foreign_key="paciente.id", unique=True)
    
    queixa_principal: str | None = None
    tratamento_medico: str | None = None 
    disturbios_cardiovasculares: str | None = None
    diabetico: bool = Field(default=False)
    gravida: bool = Field(default=False)
    medicamentos: str | None = None
    alergias: str | None = None
    observacoes: str | None = None
    
