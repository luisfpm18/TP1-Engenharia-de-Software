"""
Infraestrutura compartilhada da suíte de testes (TP2).

Pontos centrais:
- As rotas em main.py fazem `with Session(engine)` usando o `engine` de MÓDULO
  (`from database import engine`). Elas NÃO usam Depends(get_session), então
  `app.dependency_overrides` não tem efeito. Para apontar o banco de teste é preciso
  substituir `main.engine` (monkeypatch no atributo do módulo main).
- O `lifespan` de main.py roda `aplicar_migracoes()` com `ALTER TABLE ... ADD COLUMN
  IF NOT EXISTS` (sintaxe só do Postgres, que quebra no SQLite). Por isso o TestClient
  é instanciado SEM o `with` — assim o lifespan NÃO roda. O schema é criado aqui via
  `SQLModel.metadata.create_all`, que já monta todas as colunas a partir dos modelos
  (as migrações ALTER TABLE ficam redundantes num banco novo).
- SQLite em memória precisa de StaticPool + check_same_thread=False para a mesma
  conexão (e os dados) sobreviverem aos vários Session(engine) que cada rota abre.
"""

import os

# database.py lê DATABASE_URL no import; garante um valor válido ANTES de importar main
# (assim ninguém precisa de Postgres nem de .env para rodar os testes de integração).
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine
from sqlalchemy.pool import StaticPool

import main  # importa o app FastAPI e, por tabela, registra os modelos em SQLModel.metadata


@pytest.fixture(name="client")
def client_fixture(tmp_path, monkeypatch):
    """TestClient apontado para um banco SQLite isolado e um UPLOAD_DIR temporário.

    Cada teste recebe um banco limpo (escopo de função). Uso: `def test_x(client): ...`.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    # Redireciona o engine usado por TODAS as rotas para o banco de teste.
    monkeypatch.setattr(main, "engine", engine)

    # Redireciona o diretório de uploads para uma pasta temporária (não suja o disco real).
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(main, "UPLOAD_DIR", upload_dir)

    # Sem `with` => lifespan (migrações específicas de Postgres) NÃO é executado.
    client = TestClient(main.app)
    yield client

    SQLModel.metadata.drop_all(engine)
    engine.dispose()  # fecha conexões SQLite; silencia ResourceWarning do GC
