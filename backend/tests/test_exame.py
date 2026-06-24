import os

def criar_paciente(client):
    """Função auxiliar para criar um paciente e retornar seu ID."""
    r = client.post("/pacientes/", json={
        "nome": "Paciente Exame", 
        "cpf": "12345678901",
        "telefone": "31999998888", 
        "endereco": "Rua A, 10",
    })
    assert r.status_code == 200
    return r.json()["id"]

def test_upload_exame_sucesso(client):
    pid = criar_paciente(client)
    
    # 1. Upload OK (.pdf)
    r = client.post(
        f"/pacientes/{pid}/exames",
        data={"descricao": "Radiografia", "data_exame": "01/01/2024"},
        files={"arquivo": ("exame.pdf", b"%PDF-1.4 conteudo ficticio", "application/pdf")},
    )
    
    assert r.status_code == 200
    dados = r.json()
    assert dados["arquivo_nome"] == "exame.pdf"
    assert dados["tipo_arquivo"] == "application/pdf"
    assert "id" in dados

def test_upload_exame_extensao_invalida(client):
    pid = criar_paciente(client)
    
    # 2. Upload com extensão fora da whitelist (.exe)
    r = client.post(
        f"/pacientes/{pid}/exames",
        data={"descricao": "Virus"},
        files={"arquivo": ("virus.exe", b"conteudo", "application/octet-stream")},
    )
    assert r.status_code == 400
    assert r.json()["detail"].startswith("Formato não suportado")

def test_upload_exame_paciente_inexistente(client):
    # 3. Upload para paciente inexistente
    r = client.post(
        "/pacientes/99999/exames",
        data={"descricao": "Radiografia"},
        files={"arquivo": ("exame.pdf", b"x", "application/pdf")},
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "Paciente não encontrado."

def test_listar_exames(client):
    pid = criar_paciente(client)
    client.post(
        f"/pacientes/{pid}/exames",
        data={"descricao": "Raio X 1"},
        files={"arquivo": ("ex1.pdf", b"x", "application/pdf")},
    )
    client.post(
        f"/pacientes/{pid}/exames",
        data={"descricao": "Raio X 2"},
        files={"arquivo": ("ex2.pdf", b"x", "application/pdf")},
    )
    
    # 4. Listar exames (ordenado por id)
    r = client.get(f"/pacientes/{pid}/exames")
    assert r.status_code == 200
    lista = r.json()
    assert len(lista) == 2
    assert lista[0]["descricao"] == "Raio X 1"

def test_download_exame_inline(client):
    pid = criar_paciente(client)
    r_upload = client.post(
        f"/pacientes/{pid}/exames",
        data={"descricao": "Radiografia"},
        files={"arquivo": ("meu_exame.pdf", b"conteudo", "application/pdf")},
    )
    exame_id = r_upload.json()["id"]
    
    # 5. Download inline
    r_download = client.get(f"/pacientes/{pid}/exames/{exame_id}/arquivo")
    assert r_download.status_code == 200
    assert "inline" in r_download.headers["content-disposition"]
    assert "meu_exame.pdf" in r_download.headers["content-disposition"]

def test_download_exame_inexistente(client):
    pid = criar_paciente(client)
    # 6. Download de exame inexistente
    r = client.get(f"/pacientes/{pid}/exames/9999/arquivo")
    assert r.status_code == 404

def test_excluir_exame_com_remocao_de_arquivo(client):
    pid = criar_paciente(client)
    r_upload = client.post(
        f"/pacientes/{pid}/exames",
        data={"descricao": "Para Excluir"},
        files={"arquivo": ("lixo.png", b"img", "image/png")},
    )
    exame = r_upload.json()
    exame_id = exame["id"]
    caminho_arquivo = exame["arquivo_caminho"]
    
    assert os.path.exists(caminho_arquivo) is True
    
    # 7. Excluir exame
    r_del = client.delete(f"/pacientes/{pid}/exames/{exame_id}")
    assert r_del.status_code == 200
    
    # Arquivo deve ter sumido do disco
    assert os.path.exists(caminho_arquivo) is False
    
    # Não deve mais aparecer na lista
    r_lista = client.get(f"/pacientes/{pid}/exames")
    assert len(r_lista.json()) == 0

def test_excluir_exame_inexistente(client):
    pid = criar_paciente(client)
    # 8. Excluir exame inexistente
    r = client.delete(f"/pacientes/{pid}/exames/9999")
    assert r.status_code == 404
