def criar_paciente(client, cpf="22233344455"):
    """Função auxiliar para criar um paciente e retornar seu ID."""
    r = client.post("/pacientes/", json={
        "nome": "Paciente Pagamento",
        "cpf": cpf,
        "telefone": "31999998888",
        "endereco": "Rua A, 10",
    })
    assert r.status_code == 200
    return r.json()["id"]


def pagamento_base():
    return {
        "valor": 100.0,
        "data_pagamento": "10/06/2026",
        "descricao": "Limpeza",
        "forma_pagamento": "PIX",
    }


def test_registrar_pagamento_sucesso(client):
    pid = criar_paciente(client)
    # 5. Registrar pagamento -> 200; campos batem
    r = client.post(f"/pacientes/{pid}/pagamentos", json=pagamento_base())
    assert r.status_code == 200
    pag = r.json()
    assert "id" in pag
    assert pag["valor"] == 100.0
    assert pag["descricao"] == "Limpeza"
    assert pag["forma_pagamento"] == "PIX"
    assert pag["paciente_id"] == pid


def test_registrar_pagamento_paciente_inexistente(client):
    # 6. Registrar para paciente inexistente -> 404
    r = client.post("/pacientes/99999/pagamentos", json=pagamento_base())
    assert r.status_code == 404
    assert r.json()["detail"] == "Paciente não encontrado."


def test_listar_pagamentos(client):
    pid = criar_paciente(client)
    p1 = pagamento_base()
    p2 = {**pagamento_base(), "valor": 250.0, "descricao": "Manutenção"}
    client.post(f"/pacientes/{pid}/pagamentos", json=p1)
    client.post(f"/pacientes/{pid}/pagamentos", json=p2)

    # 7. Listar histórico -> 200; reflete os registrados (ordem de inserção)
    r = client.get(f"/pacientes/{pid}/pagamentos")
    assert r.status_code == 200
    lista = r.json()
    assert len(lista) == 2
    assert lista[0]["descricao"] == "Limpeza"
    assert lista[1]["descricao"] == "Manutenção"


def test_editar_pagamento(client):
    pid = criar_paciente(client)
    r_criacao = client.post(f"/pacientes/{pid}/pagamentos", json=pagamento_base())
    pag_id = r_criacao.json()["id"]

    # 8. Editar (PUT parcial, só valor) -> 200; valor muda, demais preservados
    r_put = client.put(f"/pacientes/{pid}/pagamentos/{pag_id}", json={"valor": 150.0})
    assert r_put.status_code == 200
    pag = r_put.json()
    assert pag["valor"] == 150.0
    assert pag["descricao"] == "Limpeza"  # preservado
    assert pag["forma_pagamento"] == "PIX"  # preservado


def test_editar_pagamento_inexistente(client):
    pid = criar_paciente(client)
    # 9. Editar pagamento inexistente -> 404
    r = client.put(f"/pacientes/{pid}/pagamentos/9999", json={"valor": 99.0})
    assert r.status_code == 404
    assert r.json()["detail"] == "Pagamento não encontrado."


def test_excluir_pagamento(client):
    pid = criar_paciente(client)
    r_criacao = client.post(f"/pacientes/{pid}/pagamentos", json=pagamento_base())
    pag_id = r_criacao.json()["id"]

    # 10. Excluir -> 200; lista encolhe
    r_del = client.delete(f"/pacientes/{pid}/pagamentos/{pag_id}")
    assert r_del.status_code == 200
    assert r_del.json()["message"] == "Pagamento excluído com sucesso"

    r_lista = client.get(f"/pacientes/{pid}/pagamentos")
    assert len(r_lista.json()) == 0


def test_excluir_pagamento_inexistente(client):
    pid = criar_paciente(client)
    r = client.delete(f"/pacientes/{pid}/pagamentos/9999")
    assert r.status_code == 404
