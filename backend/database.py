import os
from dotenv import load_dotenv
from sqlmodel import create_engine, Session

# Carrega o arquivo .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# O engine é o "motor" que gerencia as conexões com o Postgres
engine = create_engine(DATABASE_URL, echo=True) # echo=True mostra o SQL no terminal (ótimo para aprender)

def get_session():
    with Session(engine) as session:
        yield session