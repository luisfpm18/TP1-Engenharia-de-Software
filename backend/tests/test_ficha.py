def criar_paciente(client, cpf="11122233344"):
    """Função auxiliar para criar um paciente e retornar seu ID."""
    r = client.post("/pacientes/", json={
        "nome": "Paciente Ficha",
        "cpf": cpf,
        "telefone": "31999998888",
        "endereco": "Rua A, 10",
    })
    assert r.status_code == 200
    return r.json()["id"]


def test_ler_ficha_inexistente(client):
    pid = criar_paciente(client)
    # 1. GET ficha de paciente sem ficha -> 404
    r = client.get(f"/pacientes/{pid}/ficha")
    assert r.status_code == 404
    assert r.json()["detail"] == "Ficha clínica não encontrada para este paciente."


def test_criar_ficha_e_ler(client):
    pid = criar_paciente(client)
    # 2. POST cria a ficha (1ª vez) -> 200 message
    r_post = client.post(f"/pacientes/{pid}/ficha", json={
        "paciente_id": pid,
        "diabetico": True,
        "gravida": True,
        "queixa_principal": "Dor",
    })
    assert r_post.status_code == 200
    assert r_post.json()["message"] == "Ficha clínica salva com sucesso"

    # GET depois retorna os campos enviados
    r_get = client.get(f"/pacientes/{pid}/ficha")
    assert r_get.status_code == 200
    ficha = r_get.json()
    assert ficha["diabetico"] is True
    assert ficha["gravida"] is True
    assert ficha["queixa_principal"] == "Dor"


def test_upsert_ficha(client):
    pid = criar_paciente(client)
    # 1º POST cria
    client.post(f"/pacientes/{pid}/ficha", json={
        "paciente_id": pid, "diabetico": True, "queixa_principal": "Dor"
    })

    # 3. 2º POST no mesmo paciente cai no branch de update (upsert)
    r = client.post(f"/pacientes/{pid}/ficha", json={
        "paciente_id": pid, "diabetico": False, "queixa_principal": "Revisão"
    })
    assert r.status_code == 200

    # GET reflete os novos valores
    ficha = client.get(f"/pacientes/{pid}/ficha").json()
    assert ficha["diabetico"] is False
    assert ficha["queixa_principal"] == "Revisão"

    # Continua existindo apenas UMA ficha por paciente (relação 1:1)
    # Um 2º paciente tem sua própria ficha, independente
    pid2 = criar_paciente(client, cpf="55566677788")
    client.post(f"/pacientes/{pid2}/ficha", json={
        "paciente_id": pid2, "gravida": True
    })
    ficha2 = client.get(f"/pacientes/{pid2}/ficha").json()
    assert ficha2["gravida"] is True
    # A ficha do 1º paciente segue intacta
    assert client.get(f"/pacientes/{pid}/ficha").json()["queixa_principal"] == "Revisão"


def test_salvar_ficha_paciente_inexistente(client):
    # 4. POST ficha para paciente inexistente -> 404
    r = client.post("/pacientes/99999/ficha", json={"diabetico": True})
    assert r.status_code == 404
    assert r.json()["detail"] == "Paciente não encontrado."
