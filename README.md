# TP1-Engenharia-de-Software

## Prontuário odontológico

### Membros do projeto:

- Bernardo Borges Machado - Full Stack
- Leonardo Cesar Cota de Castro - Full Stack
- Luis Felipe Pimenta Marcos - Full Stack


### Objetivo do sistema:
O sistema consiste em um prontuário odontológico digital desenvolvido para otimizar a gestão de consultórios. Ele visa substituir registros físicos por uma plataforma digital que centraliza dados pessoais, anamneses e o histórico clínico dos pacientes. Além disso, o software gerencia o fluxo financeiro de pagamentos e o planejamento de tratamentos, permitindo o registro de procedimentos realizados e a organização das próximas consultas, garantindo maior agilidade e segurança na administração dos atendimentos.


### Tecnologias a serem utilizadas:
Frontend: React + TypeScript + Vite + Axios.

Backend: Python com FastAPI.

Banco de Dados: PostgreSQL.

Agentes de IA: Claude Code/Gemini.


### Histórias de usuário:
1. Cadastro e Anamnese: Como dentista, quero cadastrar os dados pessoais e a anamnese do paciente para manter um histórico clínico detalhado e acessível.

2. Consulta de Ficha: Como dentista, quero visualizar a ficha clínica completa do paciente para revisar alergias e condições de saúde antes de iniciar um procedimento.

3. Registro de Pagamento: Como dentista, quero registrar os valores recebidos de cada paciente para manter o controle financeiro do consultório atualizado.

4. Histórico Financeiro: Como dentista, quero consultar a ficha de pagamentos de um paciente para identificar débitos pendentes ou saldos em aberto.

5. Folha de Evolução: Como dentista, quero registrar o trabalho realizado em cada consulta para documentar a evolução do tratamento clínico.

6. Planejamento de Tratamento: Como dentista, quero listar os trabalhos a serem feitos na próxima consulta para organizar os materiais e o tempo necessário para o atendimento.

7. Registro de Exames: Como dentista, quero carregar e armazenar exames feitos pelo paciente para centralizar o registro das suas informações clínicas.


---

## Documentação UML

### Diagrama 1 — Casos de Uso

Representa o escopo funcional do sistema do ponto de vista do dentista (único ator). Cada caso de uso corresponde a uma história de usuário implementada.

```mermaid
flowchart LR
    Dentista(["👨‍⚕️\nDentista"])

    subgraph Sistema["Sistema — Prontuário Odontológico"]
        direction TB
        H1["Cadastrar paciente\ne anamnese\n(H1)"]
        H2["Consultar ficha\nclínica\n(H2)"]
        H3["Registrar\npagamento\n(H3)"]
        H4["Consultar histórico\nfinanceiro\n(H4)"]
        H5["Registrar folha\nde evolução\n(H5)"]
        H6["Planejar próxima\nconsulta\n(H6)"]
        H7["Carregar e visualizar\nexames\n(H7)"]
    end

    Dentista --> H1
    Dentista --> H2
    Dentista --> H3
    Dentista --> H4
    Dentista --> H5
    Dentista --> H6
    Dentista --> H7

    H5 -. "mesmo registro" .-> H6
```

---

### Diagrama 2 — Entidade-Relacionamento (ER)

Representa as tabelas do banco de dados PostgreSQL, seus principais atributos e os relacionamentos entre elas. `paciente` é a entidade central; todas as demais dependem dela via chave estrangeira `paciente_id`.

```mermaid
erDiagram
    PACIENTE {
        int     id               PK
        string  nome
        string  cpf              UK
        string  rg
        string  data_nascimento
        string  sexo
        string  naturalidade
        string  estado_civil
        string  profissao
        string  telefone
        string  endereco
        string  cep
        string  cidade
        string  endereco_comercial
        string  telefone_comercial
        string  nome_pai
        string  nome_mae
        string  responsavel
        string  indicacao
    }

    FICHA_CLINICA {
        int     id                            PK
        int     paciente_id                   FK
        string  queixa_principal
        string  tratamento_medico
        boolean diabetico
        boolean gravida
        boolean febre_reumatica
        boolean operou_amigdalas
        boolean traumatismo_facial
        boolean tratamento_ortodontico_anterior
        string  alergias
        string  medicamentos_em_uso
        string  sistema_cardiovascular
        string  sistema_respiratorio
        string  sistema_sanguineo_linfatico
        string  sistema_gastrointestinal
        string  sistema_nervoso
        string  sistema_urinario_endocrino
        string  tipo_sanguineo
        string  outras_patologias
        string  observacoes_adicionais
    }

    PAGAMENTO {
        int    id               PK
        int    paciente_id      FK
        float  valor
        string data_pagamento
        string descricao
        string forma_pagamento
    }

    EVOLUCAO {
        int    id                  PK
        int    paciente_id         FK
        string data
        string trabalho_realizado
        string proxima_visita
    }

    EXAME {
        int    id               PK
        int    paciente_id      FK
        string descricao
        string data_exame
        string arquivo_nome
        string arquivo_caminho
        string tipo_arquivo
    }

    PACIENTE ||--o| FICHA_CLINICA : "possui (1:1)"
    PACIENTE ||--o{ PAGAMENTO     : "registra (1:N)"
    PACIENTE ||--o{ EVOLUCAO      : "evolui (1:N)"
    PACIENTE ||--o{ EXAME         : "anexa (1:N)"
```

> **Notas de design:** a relação `PACIENTE ↔ FICHA_CLINICA` é 1:1 (garantida por `UNIQUE` em `paciente_id`), pois cada paciente tem exatamente uma anamnese. As demais entidades são 1:N, pois um paciente acumula múltiplos pagamentos, consultas e exames ao longo do tratamento. Não há `ON DELETE CASCADE` no banco; a exclusão em cascata é feita manualmente pelo backend antes de remover o paciente.

---

### Diagrama 3 — Sequência: Registro de Exame

Ilustra o fluxo completo da **História 7** — do clique do dentista até a exibição do arquivo no browser — e evidencia a separação de responsabilidades entre as camadas da aplicação.

```mermaid
sequenceDiagram
    actor       Dentista
    participant FE  as Frontend (React + Axios)
    participant API as Backend (FastAPI)
    participant DB  as PostgreSQL
    participant FS  as Disco (uploads/exames/)

    Dentista ->> FE  : Clica em "🩻 Exames" do paciente
    FE       ->> API : GET /pacientes/{id}/exames
    API      ->> DB  : SELECT * FROM exame WHERE paciente_id = {id}
    DB       -->> API: Lista de metadados
    API      -->> FE : JSON com exames existentes
    FE       -->> Dentista : Exibe lista de exames

    Dentista ->> FE  : Preenche descrição, data e seleciona arquivo
    Dentista ->> FE  : Clica "📤 Enviar exame"
    FE       ->> API : POST /pacientes/{id}/exames (multipart/form-data)
    API      ->> API : Valida extensão (lista branca: pdf, png, jpg…)
    API      ->> FS  : Grava arquivo com nome único (uuid4 + extensão)
    API      ->> DB  : INSERT INTO exame (descricao, caminho, mime_type…)
    DB       -->> API: Registro salvo com id gerado
    API      -->> FE : JSON do novo exame (200 OK)
    FE       ->> API : GET /pacientes/{id}/exames  ── recarrega lista
    API      ->> DB  : SELECT * FROM exame WHERE paciente_id = {id}
    DB       -->> API: Lista de metadados atualizada
    API      -->> FE : JSON com lista atualizada
    FE       -->> Dentista : Lista atualizada

    Dentista ->> FE  : Clica "👁 Ver" em um exame
    Note over FE,Dentista : FE apenas renderiza o link href. O browser abre a URL em nova aba diretamente, sem Axios.
    Dentista ->> API : GET /pacientes/{id}/exames/{exame_id}/arquivo
    API      ->> DB  : SELECT arquivo_caminho, tipo_arquivo WHERE id = {exame_id}
    DB       -->> API: Metadados do exame
    API      ->> FS  : Lê bytes do arquivo
    FS       -->> API: Conteúdo binário
    API      -->> Dentista : FileResponse (Content-Disposition: inline)
    Note over Dentista : PDF/imagem abre diretamente no browser
```
