from sqlmodel import SQLModel, Field
from typing import Optional

class Paciente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    cpf: str = Field(unique=True, index=True)
    telefone: str
    anamnese: Optional[str] = None # Texto livre para a anamnese inicial