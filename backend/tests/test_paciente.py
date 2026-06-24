"""
Testes de integração do recurso Paciente (Etapa A).

Usam a fixture `client` definida em conftest.py: um TestClient da FastAPI já apontado
para um banco SQLite isolado por teste e um diretório de uploads temporário.
"""


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def criar_paciente(client, cpf="123.456.789-01", telefone="(31) 99999-8888", nome="Maria Silva"):
    """Cria um paciente e devolve o JSON da resposta (já com id)."""
    resp = client.post("/pacientes/", json={
        "nome": nome,
        "cpf": cpf,
        "telefone": telefone,
        "endereco": "Rua A, 10",
        "data_nascimento": "01/01/1990",
    })
    assert resp.status_code == 200, resp.text
    return resp.json()


# ------------------------------------------------------------------
# Criação
# ------------------------------------------------------------------
def test_criar_paciente_cpf_normalizado(client):
    """CPF e telefone enviados com máscara são salvos só com dígitos."""
    paciente = criar_paciente(client, cpf="123.456.789-01", telefone="(31) 99999-8888")
    assert paciente["id"] is not None
    assert paciente["cpf"] == "12345678901"
    assert paciente["telefone"] == "31999998888"
    assert paciente["nome"] == "Maria Silva"


def test_criar_paciente_telefone_comercial_normalizado(client):
    """telefone_comercial também é normalizado quando enviado."""
    resp = client.post("/pacientes/", json={
        "nome": "Joao",
        "cpf": "11122233344",
        "telefone": "31999990000",
        "telefone_comercial": "(31) 3232-3232",
    })
    assert resp.status_code == 200, resp.text
    assert resp.json()["telefone_comercial"] == "3132323232"


def test_criar_paciente_cpf_invalido(client):
    """CPF com menos de 11 dígitos é rejeitado com 400."""
    resp = client.post("/pacientes/", json={
        "nome": "Fulano",
        "cpf": "1234567890",   # 10 dígitos
        "telefone": "31999998888",
    })
    assert resp.status_code == 400
    assert resp.json()["detail"] == "O CPF deve conter exatamente 11 números."


def test_criar_paciente_cpf_duplicado(client):
    """Dois pacientes com o mesmo CPF: o segundo retorna 400 (UNIQUE)."""
    criar_paciente(client, cpf="12345678901")
    resp = client.post("/pacientes/", json={
        "nome": "Outro",
        "cpf": "123.456.789-01",  # mesmo CPF após normalização
        "telefone": "31900000000",
    })
    assert resp.status_code == 400
    assert resp.json()["detail"] == "CPF já cadastrado."


# ------------------------------------------------------------------
# Listagem
# ------------------------------------------------------------------
def test_listar_pacientes_vazio(client):
    resp = client.get("/pacientes/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_listar_pacientes_ordenado_por_id(client):
    p1 = criar_paciente(client, cpf="11111111111", nome="Ana")
    p2 = criar_paciente(client, cpf="22222222222", nome="Bruno")
    resp = client.get("/pacientes/")
    assert resp.status_code == 200
    dados = resp.json()
    assert len(dados) == 2
    assert [p["id"] for p in dados] == [p1["id"], p2["id"]]


# ------------------------------------------------------------------
# Edição (PUT parcial)
# ------------------------------------------------------------------
def test_editar_paciente_parcial_preserva_demais_campos(client):
    paciente = criar_paciente(client, cpf="12345678901", nome="Nome Antigo")
    resp = client.put(f"/pacientes/{paciente['id']}", json={"nome": "Nome Novo"})
    assert resp.status_code == 200, resp.text
    atualizado = resp.json()
    assert atualizado["nome"] == "Nome Novo"
    assert atualizado["cpf"] == "12345678901"        # não enviado => preservado
    assert atualizado["telefone"] == "31999998888"   # não enviado => preservado


def test_editar_paciente_cpf_invalido(client):
    paciente = criar_paciente(client)
    resp = client.put(f"/pacientes/{paciente['id']}", json={"cpf": "123"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "CPF inválido."


def test_editar_paciente_inexistente(client):
    resp = client.put("/pacientes/99999", json={"nome": "Nao existe"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Paciente não encontrado"


# ------------------------------------------------------------------
# Exclusão com cascata manual
# ------------------------------------------------------------------
def test_excluir_paciente_com_cascata(client):
    """Excluir paciente apaga ficha, pagamento, evolução, exame (DB) e o arquivo no disco."""
    import os

    paciente = criar_paciente(client, cpf="12345678901")
    pid = paciente["id"]

    # Filhos: ficha, pagamento, evolução e exame
    client.post(f"/pacientes/{pid}/ficha", json={"paciente_id": pid, "diabetico": True})
    client.post(f"/pacientes/{pid}/pagamentos", json={
        "valor": 100.0, "data_pagamento": "01/01/2024", "descricao": "Limpeza", "forma_pagamento": "PIX",
    })
    client.post(f"/pacientes/{pid}/evolucao", json={
        "data": "01/01/2024", "trabalho_realizado": "Profilaxia",
    })
    up = client.post(
        f"/pacientes/{pid}/exames",
        data={"descricao": "Raio-X"},
        files={"arquivo": ("exame.pdf", b"%PDF-1.4 conteudo", "application/pdf")},
    )
    assert up.status_code == 200, up.text
    caminho_arquivo = up.json()["arquivo_caminho"]
    assert os.path.exists(caminho_arquivo)

    # Confirma que os filhos existem antes de excluir
    assert client.get(f"/pacientes/{pid}/ficha").status_code == 200
    assert len(client.get(f"/pacientes/{pid}/pagamentos").json()) == 1
    assert len(client.get(f"/pacientes/{pid}/evolucao").json()) == 1
    assert len(client.get(f"/pacientes/{pid}/exames").json()) == 1

    # Exclui o paciente
    resp = client.delete(f"/pacientes/{pid}")
    assert resp.status_code == 200
    assert "excluídos com sucesso" in resp.json()["message"]

    # Filhos sumiram do banco
    assert client.get(f"/pacientes/{pid}/ficha").status_code == 404
    assert client.get(f"/pacientes/{pid}/pagamentos").json() == []
    assert client.get(f"/pacientes/{pid}/evolucao").json() == []
    assert client.get(f"/pacientes/{pid}/exames").json() == []
    # Paciente sumiu da lista
    assert client.get("/pacientes/").json() == []
    # Arquivo do exame foi removido do disco
    assert not os.path.exists(caminho_arquivo)


def test_excluir_paciente_inexistente(client):
    resp = client.delete("/pacientes/99999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Paciente não encontrado"
