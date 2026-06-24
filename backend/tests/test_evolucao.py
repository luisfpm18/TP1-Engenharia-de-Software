def criar_paciente(client):
    r = client.post("/pacientes/", json={
        "nome": "Paciente Evolucao", 
        "cpf": "98765432100",
        "telefone": "31999998888"
    })
    assert r.status_code == 200
    return r.json()["id"]

def test_criar_evolucao_sucesso(client):
    pid = criar_paciente(client)
    # 9. Criar evolução
    dados = {
        "data": "10/06/2026",
        "trabalho_realizado": "Acesso endodôntico",
        "proxima_visita": "Finalizar canal"
    }
    r = client.post(f"/pacientes/{pid}/evolucao", json=dados)
    assert r.status_code == 200
    evo = r.json()
    assert "id" in evo
    assert evo["trabalho_realizado"] == "Acesso endodôntico"

def test_criar_evolucao_paciente_inexistente(client):
    # 10. Criar para paciente inexistente
    r = client.post("/pacientes/99999/evolucao", json={
        "data": "10/06/2026", "trabalho_realizado": "Teste"
    })
    assert r.status_code == 404

def test_listar_evolucao_ordenada(client):
    pid = criar_paciente(client)
    client.post(f"/pacientes/{pid}/evolucao", json={"data": "01/01", "trabalho_realizado": "Evo 1"})
    client.post(f"/pacientes/{pid}/evolucao", json={"data": "02/01", "trabalho_realizado": "Evo 2"})
    
    # 11. Listar na ordem de criação (id)
    r = client.get(f"/pacientes/{pid}/evolucao")
    assert r.status_code == 200
    lista = r.json()
    assert len(lista) == 2
    assert lista[0]["trabalho_realizado"] == "Evo 1"
    assert lista[1]["trabalho_realizado"] == "Evo 2"

def test_editar_evolucao(client):
    pid = criar_paciente(client)
    r_criacao = client.post(f"/pacientes/{pid}/evolucao", json={
        "data": "10/06", "trabalho_realizado": "Inicial"
    })
    eid = r_criacao.json()["id"]
    
    # 12. Editar incluindo proxima_visita (mantendo trabalho_realizado intocado)
    r_put = client.put(f"/pacientes/{pid}/evolucao/{eid}", json={"proxima_visita": "Retorno"})
    assert r_put.status_code == 200
    evo_atualizada = r_put.json()
    assert evo_atualizada["proxima_visita"] == "Retorno"
    assert evo_atualizada["trabalho_realizado"] == "Inicial"  # Preservado

def test_editar_evolucao_inexistente(client):
    pid = criar_paciente(client)
    # 13. Editar evolução inexistente
    r = client.put(f"/pacientes/{pid}/evolucao/9999", json={"trabalho_realizado": "X"})
    assert r.status_code == 404

def test_excluir_evolucao(client):
    pid = criar_paciente(client)
    r_criacao = client.post(f"/pacientes/{pid}/evolucao", json={
        "data": "10/06", "trabalho_realizado": "Lixo"
    })
    eid = r_criacao.json()["id"]
    
    # 14. Excluir evolução
    r_del = client.delete(f"/pacientes/{pid}/evolucao/{eid}")
    assert r_del.status_code == 200
    
    r_lista = client.get(f"/pacientes/{pid}/evolucao")
    assert len(r_lista.json()) == 0

def test_excluir_evolucao_inexistente(client):
    pid = criar_paciente(client)
    r = client.delete(f"/pacientes/{pid}/evolucao/9999")
    assert r.status_code == 404
