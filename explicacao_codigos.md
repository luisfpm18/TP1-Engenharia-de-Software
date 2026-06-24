# Guia de Apresentação — Prontuário Odontológico

Documento de estudo preparado para a arguição acadêmica da disciplina de Engenharia de Software (TP1). Reúne as decisões técnicas, a organização do código e os principais trechos do sistema, mapeados às sete histórias de usuário previstas no README.

**Sistema:** Prontuário odontológico digital que substitui o registro em papel por uma plataforma única para cadastro de pacientes, anamnese, folha de evolução, planejamento, controle financeiro e armazenamento de exames (radiografias e PDFs).

**Equipe:** Bernardo Borges Machado, Leonardo Cesar Cota de Castro, Luis Felipe Pimenta Marcos — todos atuando em Full Stack.

---

## 1. Decisões de Arquitetura e Tecnologias

O sistema segue uma arquitetura **cliente-servidor com separação clara entre frontend e backend**, comunicando-se exclusivamente por HTTP/JSON (REST). Há duas pastas de topo independentes — [backend/](backend/) e [frontend/](frontend/) — cada uma com seu próprio gerenciador de dependências e ciclo de vida.

### 1.1 Frontend

| Tecnologia | Papel | Por que foi escolhida |
|---|---|---|
| **React 18 + TypeScript** | Biblioteca de UI declarativa com tipagem estática. | Permite construir a SPA com componentes reativos; o TypeScript dá segurança nas interfaces que espelham os modelos do backend (`Paciente`, `FichaClinica`, `Pagamento`, `Evolucao`, `Exame`). |
| **Vite** | Bundler / dev server. | Hot Reload muito rápido durante o desenvolvimento e build de produção otimizado, sem a complexidade do Webpack. |
| **Axios** | Cliente HTTP. | API mais limpa que `fetch` para `GET/POST/PUT/DELETE`, suporte nativo a JSON e tratamento de erros via `err.response.data.detail` — usado em todas as chamadas para `http://localhost:8000`. |
| **CSS-in-JS (objetos `style`)** | Estilização. | Estilos ficam ao lado da marcação em [App.tsx](frontend/src/App.tsx) através das constantes `ESTILO_GERAL`, `ESTILO_CARD`, `ESTILO_INPUT_BASE`, etc. Simples para um projeto de uma única tela e evita CSS global vazando entre seções. |

### 1.2 Backend

| Tecnologia | Papel | Por que foi escolhida |
|---|---|---|
| **Python 3.13 + FastAPI** | Framework web assíncrono. | Geração automática de docs (`/docs`), validação por type hints e integração nativa com Pydantic. Excelente para APIs REST pequenas e médias. |
| **Uvicorn** | Servidor ASGI. | Recomendado pela FastAPI; roda a aplicação em desenvolvimento e produção. |
| **SQLModel** | ORM (combinação SQLAlchemy + Pydantic). | Permite definir, na mesma classe, a **tabela do banco** e o **schema de validação** (ver [models.py](backend/models.py)). Reduz duplicação de código. |
| **psycopg2-binary** | Driver PostgreSQL. | Conexão nativa do SQLAlchemy/SQLModel com o Postgres. |
| **python-dotenv** | Carregamento de variáveis de ambiente. | Lê a `DATABASE_URL` do arquivo `.env` em [database.py](backend/database.py). |
| **python-multipart** | Parsing de `multipart/form-data`. | Necessário para o upload de exames via `UploadFile` na rota `POST /pacientes/{id}/exames`. |

### 1.3 Banco de Dados

**PostgreSQL** foi escolhido por ser o RDBMS open-source mais robusto, com suporte a tipos avançados, integridade referencial (chaves estrangeiras `paciente_id`) e por integrar-se de forma transparente ao SQLModel.

### 1.4 Comunicação e CORS

Como o frontend (Vite, porta variável) e o backend (`uvicorn`, porta 8000) rodam em origens diferentes, o backend habilita CORS via `CORSMiddleware` ([main.py:78-86](backend/main.py#L78-L86)), aceitando qualquer porta de `localhost` ou `127.0.0.1` durante desenvolvimento.

---

## 2. Organização de Diretórios

```
tp1-odonto/
├── README.md                # Objetivo, equipe, stack e histórias de usuário
├── backend/                 # API REST em FastAPI
│   ├── main.py              # Ponto de entrada: rotas, CORS, migrações idempotentes
│   ├── models.py            # Modelos SQLModel (tabelas) + schemas Pydantic
│   ├── database.py          # Engine SQLAlchemy + factory de Session
│   ├── requirements.txt     # Dependências Python
│   ├── .env.example         # Modelo de variáveis de ambiente
│   └── uploads/exames/      # Arquivos físicos dos exames (PDFs/imagens)
└── frontend/                # SPA React + TypeScript
    ├── index.html           # Container raiz (#root) e import do main.tsx
    ├── vite.config.ts       # Configuração do Vite
    └── src/
        ├── main.tsx         # Boot do React (createRoot)
        ├── App.tsx          # Toda a aplicação: estado, telas e chamadas Axios
        ├── App.css          # Estilos residuais do template Vite
        ├── index.css        # Variáveis globais (cores, tipografia)
        └── assets/          # Imagens e ícones
```

### O que vive onde

- **Backend — "rotas / controllers":** todos os endpoints estão concentrados em [main.py](backend/main.py), agrupados por recurso (Paciente, Ficha, Pagamento, Evolução, Exame). Não há divisão em routers separados porque a API ainda é pequena.
- **Backend — "models":** [models.py](backend/models.py) contém **dois tipos de classes**: as que herdam de `SQLModel(..., table=True)` são tabelas reais no Postgres; as que herdam de `BaseModel` (Pydantic) são DTOs de entrada (`*Create`, `*Update`).
- **Backend — "infra de banco":** [database.py](backend/database.py) cria o `engine` e o gerador `get_session`, isolando a configuração de conexão do resto do código.
- **Frontend — "telas":** Não há React Router. O componente [App.tsx](frontend/src/App.tsx) decide qual tela renderizar usando **guards condicionais** sobre os estados `pacienteExamesAberto`, `pacienteEvolucaoAberto`, `pacienteFinanceiroAberto`, `pacienteFichaAberta`. Quando todos são `null`, mostra a tela principal (cadastro + lista).
- **Frontend — "componentes":** Em vez de extrair componentes, o `App.tsx` reúne formulários e tabelas inline. Funções utilitárias (`formatarCPF`, `formatarTelefone`, `formatarData`, `formatarCEP`) ficam no topo do arquivo.

---

## 3. Análise do Frontend (.tsx, .html, .css)

### 3.1 Inicialização

A montagem do React acontece em [main.tsx](frontend/src/main.tsx):

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

O `index.html` declara apenas a `<div id="root">` e carrega o módulo:

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

### 3.2 Estilização

A estilização adota dois canais complementares:

1. **`index.css`** define variáveis CSS globais (cores, fontes, suporte a dark mode) que sobrevivem entre as telas. Exemplo: `--accent: #aa3bff`, `--bg: #fff`, e o tema escuro automático via `@media (prefers-color-scheme: dark)`.
2. **CSS-in-JS** dentro do `App.tsx` define constantes reutilizáveis aplicadas inline a cada elemento. Isso garante **proporcionalidade visual** entre telas (todos os inputs partem do mesmo padding, raio de borda e tamanho de fonte):

```tsx
const ESTILO_INPUT_BASE = {
  padding: '12px', fontSize: '16px', border: '1px solid #ddd',
  borderRadius: '6px', color: '#333', marginTop: '5px',
  boxSizing: 'border-box' as const,  // evita transbordo lateral
};
const ESTILO_BOTAO_BASE = {
  padding: '12px 20px', border: 'none', borderRadius: '6px',
  cursor: 'pointer', fontWeight: 'bold', fontSize: '15px',
};
```

### 3.3 Modelo de Navegação (sem React Router)

Cada tela "se desbloqueia" ao popular um estado que aponta para o paciente selecionado. O `App` testa esses estados na ordem em que aparecem no arquivo e retorna o JSX correspondente, voltando à lista quando o estado é zerado:

```tsx
if (pacienteExamesAberto) {  return ( /* tela Exames */ ) }
if (pacienteEvolucaoAberto) { return ( /* tela Evolução */ ) }
if (pacienteFinanceiroAberto) { return ( /* tela Financeiro */ ) }
if (pacienteFichaAberta) {  return ( /* tela Ficha Clínica */ ) }
return ( /* tela principal: cadastro + lista de pacientes */ )
```

### 3.4 Tela 1 — Cadastro e Lista de Pacientes (História 1)

A tela principal contém **um formulário multi-seção** (Identificação, Endereço residencial, Endereço comercial, Filiação e indicação) e, abaixo, a lista de pacientes cadastrados ([App.tsx:1032-1283](frontend/src/App.tsx#L1032-L1283)).

Pontos centrais:

- **Máscaras em tempo real:** funções como `formatarCPF` e `formatarTelefone` rodam a cada `onChange`. Para o telefone, o handler precisa **recolocar o cursor na posição correta** após a re-formatação:

```tsx
const handleTelefoneChange = (e) => {
  const input = e.target;
  const cursorPos = input.selectionStart ?? input.value.length;
  const digitsBeforeCursor = input.value.slice(0, cursorPos).replace(/\D/g, '').length;
  const formatado = formatarTelefone(input.value);
  setTelefone(formatado);
  window.requestAnimationFrame(() => {           // espera o React re-renderizar
    let digitCount = 0, newCursor = formatado.length;
    for (let i = 0; i < formatado.length; i++) {
      if (/\d/.test(formatado[i])) digitCount++;
      if (digitCount === digitsBeforeCursor) { newCursor = i + 1; break; }
    }
    input.setSelectionRange(newCursor, newCursor);
  });
}
```

- **Validação visual do CPF** antes mesmo do `submit`: o handler limpa o input com regex e exibe um erro inline (`erroCpfVisual`) se não houver 11 dígitos.
- **Lista expansível:** cada `<li>` mostra o resumo do paciente (nome, CPF, DN, telefone) e, ao clicar em "🔽 Ver mais", expande os detalhes (Identificação completa, endereços residencial/comercial, filiação) lidos do mesmo objeto `paciente`.
- **Botões de ação por paciente:** "Ficha Clínica", "Evolução", "Exames", "Financeiro", "Editar", "Excluir" — cada um seta o estado responsável por trocar a tela renderizada.

### 3.5 Tela 2 — Anamnese Clínica (Histórias 1 e 2)

Renderizada quando `pacienteFichaAberta` está preenchido ([App.tsx:913-1027](frontend/src/App.tsx#L913-L1027)). É um formulário longo que cobre:

- **Queixa principal** e **tratamento médico/cirúrgico atual** (textareas).
- **Checkboxes críticos** em destaque azul: diabético, grávida, febre reumática, operou amígdalas, traumatismo facial, tratamento ortodôntico anterior — exatamente os campos que o dentista precisa ver antes de procedimentos invasivos (atende diretamente a história 2).
- **Tipo sanguíneo** e **outras patologias**.
- **Histórico detalhado por sistemas** renderizado por um `.map()` sobre um array de descritores, evitando repetição:

```tsx
{[
  { label: "5. Sistema Cardiovascular (Pressão, próteses)", campo: "sistema_cardiovascular" },
  { label: "6. Sistema Respiratório (Asma, sinusite)", campo: "sistema_respiratorio" },
  /* ... */
].map((item) => (
  <div key={item.campo}>
    <label>{item.label}</label>
    <input
      value={ficha[item.campo as keyof FichaClinica] as string}
      onChange={(e) => atualizarCampoFicha(item.campo as keyof FichaClinica, e.target.value)}
    />
  </div>
))}
```

A função `atualizarCampoFicha` aplica uma atualização imutável ao estado:

```tsx
const atualizarCampoFicha = (campo: keyof FichaClinica, valor: any) => {
  setFicha(prev => ({ ...prev, [campo]: valor }))
}
```

O submit chama `POST /pacientes/{id}/ficha` enviando o objeto `ficha` completo.

### 3.6 Tela 3 — Financeiro (Histórias 3 e 4)

Ativa quando `pacienteFinanceiroAberto` é setado. Contém:

- Um formulário de pagamento (valor, data, descrição, forma) que serve **tanto para criar quanto editar**, decidindo pela existência de `pagamentoEditandoId`:

```tsx
if (pagamentoEditandoId !== null) {
  axios.put(`http://localhost:8000/pacientes/${pacienteId}/pagamentos/${pagamentoEditandoId}`, payload)
} else {
  axios.post(`http://localhost:8000/pacientes/${pacienteId}/pagamentos`, payload)
}
```

- Uma tabela com o **histórico de pagamentos**, com a linha em edição destacada em azul (`backgroundColor: pagamentoEditandoId === pag.id ? '#e3f2fd' : 'transparent'`).
- O valor é formatado para o padrão brasileiro: `R$ {pag.valor.toFixed(2).replace('.', ',')}`.

### 3.7 Tela 4 — Folha de Evolução (Histórias 5 e 6)

Reúne, num único registro por consulta, o **trabalho realizado** (história 5) e o **planejamento da próxima visita** (história 6). Mesma mecânica criar/editar do financeiro, usando `evolucaoEditandoId`.

### 3.8 Tela 5 — Exames (História 7)

Tela que faz **upload de arquivos** via `FormData`, suportando PDFs e imagens:

```tsx
const enviarExame = (e) => {
  e.preventDefault()
  const formData = new FormData()
  formData.append("descricao", exameDescricao)
  if (exameData) formData.append("data_exame", exameData)
  formData.append("arquivo", exameArquivo)

  setExameUploading(true)
  axios.post(`http://localhost:8000/pacientes/${id}/exames`, formData)
    .then(() => { limparFormularioExame(); recarregarExames(id); })
    .finally(() => setExameUploading(false))
}
```

O link "👁 Ver" abre o arquivo direto em nova aba, apontando para `GET /pacientes/{id}/exames/{exameId}/arquivo`, que devolve o binário com `Content-Disposition: inline`.

---

## 4. Análise do Backend e APIs (.py)

A API é totalmente declarada em [main.py](backend/main.py) e organizada em cinco blocos: Pacientes, Ficha Clínica, Pagamentos, Evolução e Exames.

### 4.1 Lista de Endpoints

| Método | Rota | Função | História |
|---|---|---|---|
| `GET`  | `/` | Healthcheck simples | — |
| `POST` | `/pacientes/` | Cria paciente (CPF único) | 1 |
| `GET`  | `/pacientes/` | Lista pacientes | 1, 2 |
| `PUT`  | `/pacientes/{id}` | Atualiza paciente | 1 |
| `DELETE` | `/pacientes/{id}` | Exclui paciente + filhos (cascata manual) | 1 |
| `GET`  | `/pacientes/{id}/ficha` | Lê ficha clínica | 2 |
| `POST` | `/pacientes/{id}/ficha` | Cria/atualiza ficha clínica (upsert) | 1, 2 |
| `POST` | `/pacientes/{id}/pagamentos` | Registra pagamento | 3 |
| `GET`  | `/pacientes/{id}/pagamentos` | Histórico financeiro | 4 |
| `PUT`  | `/pacientes/{id}/pagamentos/{pid}` | Edita pagamento | 3 |
| `DELETE` | `/pacientes/{id}/pagamentos/{pid}` | Exclui pagamento | 3 |
| `POST` | `/pacientes/{id}/evolucao` | Registra trabalho realizado | 5 |
| `GET`  | `/pacientes/{id}/evolucao` | Lista evoluções | 5, 6 |
| `PUT`  | `/pacientes/{id}/evolucao/{eid}` | Edita registro de evolução | 5, 6 |
| `DELETE` | `/pacientes/{id}/evolucao/{eid}` | Exclui registro de evolução | 5, 6 |
| `POST` | `/pacientes/{id}/exames` | Upload de exame (multipart) | 7 |
| `GET`  | `/pacientes/{id}/exames` | Lista exames do paciente | 7 |
| `GET`  | `/pacientes/{id}/exames/{exid}/arquivo` | Baixa/visualiza o arquivo do exame | 7 |
| `DELETE` | `/pacientes/{id}/exames/{exid}` | Exclui exame (DB + arquivo do disco) | 7 |

### 4.2 Regras de Negócio Importantes

- **CPF é único e numérico:** antes de inserir, a rota `POST /pacientes/` faz `re.sub(r'[^0-9]', '', paciente.cpf)`, recusa qualquer CPF com tamanho diferente de 11 e captura `IntegrityError` para retornar mensagem amigável "CPF já cadastrado".
- **A ficha clínica é 1-para-1 com o paciente:** o modelo `FichaClinica.paciente_id` tem `unique=True`. A rota `POST .../ficha` faz **upsert manual** — se já existe, atualiza; senão, cria.
- **Cascata manual no DELETE de paciente:** como o schema não declara `ON DELETE CASCADE`, o backend percorre `Evolucao`, `Pagamento`, `Exame` e `FichaClinica` e apaga cada um antes de remover o paciente, inclusive **apagando o arquivo físico do exame em disco**.
- **Apenas metadados de exame ficam no banco:** o binário é gravado em `backend/uploads/exames/` com nome único `uuid4().hex + extensão`, evitando colisão entre arquivos homônimos.
- **Migração idempotente no startup:** a função `aplicar_migracoes` executa `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para todos os campos novos. Isso resolve o limite do `SQLModel.metadata.create_all`, que não adiciona colunas em tabelas pré-existentes.

### 4.3 Funções Centrais Comentadas

**(a) `criar_paciente` — entrada principal do cadastro:**

```python
@app.post("/pacientes/", response_model=Paciente)
def criar_paciente(paciente: PacienteCreate):
    cpf_limpo = re.sub(r'[^0-9]', '', paciente.cpf)
    telefone_limpo = re.sub(r'[^0-9]', '', paciente.telefone)
    if len(cpf_limpo) != 11:
        raise HTTPException(status_code=400, detail="O CPF deve conter exatamente 11 números.")

    dados = paciente.model_dump()
    dados["cpf"] = cpf_limpo
    dados["telefone"] = telefone_limpo
    if dados.get("telefone_comercial"):
        dados["telefone_comercial"] = re.sub(r'[^0-9]', '', dados["telefone_comercial"])

    paciente_db = Paciente(**dados)
    with Session(engine) as session:
        session.add(paciente_db)
        try:
            session.commit()
            session.refresh(paciente_db)
            return paciente_db
        except IntegrityError as e:
            session.rollback()
            msg = str(getattr(e, "orig", e)).lower()
            if "unique" in msg or "duplicate" in msg:
                raise HTTPException(status_code=400, detail="CPF já cadastrado.")
            raise HTTPException(status_code=400, detail=f"Erro ao salvar paciente: {e.orig}")
```

Faz três coisas essenciais: normaliza valores (CPF/telefones só com dígitos), persiste no Postgres e converte erros do banco em respostas HTTP claras.

**(b) `salvar_ficha` — upsert da anamnese (1-para-1 com paciente):**

```python
@app.post("/pacientes/{paciente_id}/ficha")
def salvar_ficha(paciente_id: int, dados_ficha: FichaClinica):
    with Session(engine) as session:
        if not session.get(Paciente, paciente_id):
            raise HTTPException(status_code=404, detail="Paciente não encontrado.")
        ficha_existente = session.exec(
            select(FichaClinica).where(FichaClinica.paciente_id == paciente_id)
        ).first()

        campos = ["queixa_principal", "tratamento_medico", "diabetico", "gravida", ...]
        if ficha_existente:
            for campo in campos:
                setattr(ficha_existente, campo, getattr(dados_ficha, campo))
            session.add(ficha_existente)
        else:
            dados_ficha.paciente_id = paciente_id
            session.add(dados_ficha)
        session.commit()
        return {"message": "Ficha clínica salva com sucesso"}
```

Usa `setattr`/`getattr` para copiar 20 campos sem repetir código e mantém a relação 1-para-1 garantida pelo `unique=True` do modelo.

**(c) `upload_exame` — recebe `multipart/form-data` e grava em disco:**

```python
@app.post("/pacientes/{paciente_id}/exames", response_model=Exame)
async def upload_exame(
    paciente_id: int,
    descricao: str = Form(...),
    data_exame: Optional[str] = Form(None),
    arquivo: UploadFile = File(...),
):
    with Session(engine) as session:
        if not session.get(Paciente, paciente_id):
            raise HTTPException(status_code=404, detail="Paciente não encontrado.")

        extensao = Path(arquivo.filename or "arquivo").suffix.lower()
        if extensao not in EXTENSOES_PERMITIDAS:
            raise HTTPException(status_code=400, detail="Formato não suportado.")

        nome_unico = f"{uuid.uuid4().hex}{extensao}"
        caminho_disco = UPLOAD_DIR / nome_unico
        conteudo = await arquivo.read()
        caminho_disco.write_bytes(conteudo)

        novo_exame = Exame(
            paciente_id=paciente_id, descricao=descricao, data_exame=data_exame,
            arquivo_nome=arquivo.filename, arquivo_caminho=str(caminho_disco),
            tipo_arquivo=arquivo.content_type or "application/octet-stream",
        )
        session.add(novo_exame); session.commit(); session.refresh(novo_exame)
        return novo_exame
```

Pontos importantes: lista branca de extensões (`{.pdf, .png, .jpg, ...}`), nome único por UUID e separação entre binário (disco) e metadados (banco).

---

## 5. Banco de Dados e Consultas SQL

### 5.1 Conexão

O `engine` é criado em [database.py](backend/database.py) a partir da `DATABASE_URL` do `.env`:

```python
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=True)  # echo=True imprime SQL no terminal

def get_session():
    with Session(engine) as session:
        yield session
```

`echo=True` é didático: todo SQL emitido pelo ORM aparece nos logs.

### 5.2 Tabelas (definidas em [models.py](backend/models.py))

**`paciente`** — dados cadastrais (História 1).

| Coluna | Tipo | Restrição |
|---|---|---|
| `id` | INT | PK, autoincrement |
| `nome` | VARCHAR | NOT NULL |
| `cpf` | VARCHAR | UNIQUE, NOT NULL |
| `rg`, `data_nascimento`, `sexo`, `naturalidade`, `estado_civil`, `profissao` | VARCHAR | NULL |
| `telefone` | VARCHAR | NOT NULL |
| `endereco`, `cep`, `cidade` | VARCHAR | NULL |
| `endereco_comercial`, `cep_comercial`, `cidade_comercial`, `telefone_comercial` | VARCHAR | NULL |
| `nome_pai`, `profissao_pai`, `nome_mae`, `profissao_mae`, `responsavel`, `indicacao` | VARCHAR | NULL |

**`fichaclinica`** — anamnese (História 2). Relação **1:1** com paciente.

| Coluna | Tipo | Restrição |
|---|---|---|
| `id` | INT | PK |
| `paciente_id` | INT | FK → `paciente.id`, UNIQUE |
| `queixa_principal`, `tratamento_medico`, `alergias`, `medicamentos_em_uso` | VARCHAR | NULL |
| `diabetico`, `gravida`, `febre_reumatica`, `operou_amigdalas`, `traumatismo_facial`, `tratamento_ortodontico_anterior` | BOOLEAN | DEFAULT FALSE |
| `sistema_cardiovascular`, `sistema_respiratorio`, `sistema_sanguineo_linfatico`, `sistema_gastrointestinal`, `sistema_nervoso`, `sistema_urinario_endocrino`, `historico_familiar_lifestyle` | VARCHAR | NULL |
| `tipo_sanguineo`, `outras_patologias`, `observacoes_adicionais` | VARCHAR | NULL |

**`pagamento`** — financeiro (Histórias 3 e 4). Relação **N:1** com paciente.

| Coluna | Tipo |
|---|---|
| `id` | INT PK |
| `paciente_id` | INT FK → `paciente.id` |
| `valor` | FLOAT |
| `data_pagamento` | VARCHAR `DD/MM/AAAA` |
| `descricao` | VARCHAR |
| `forma_pagamento` | VARCHAR |

**`evolucao`** — folha de evolução + planejamento (Histórias 5 e 6). **N:1**.

| Coluna | Tipo |
|---|---|
| `id` | INT PK |
| `paciente_id` | INT FK → `paciente.id` |
| `data` | VARCHAR |
| `trabalho_realizado` | VARCHAR |
| `proxima_visita` | VARCHAR NULL |

**`exame`** — metadados de exame (História 7). **N:1**. Binário fica em disco.

| Coluna | Tipo |
|---|---|
| `id` | INT PK |
| `paciente_id` | INT FK → `paciente.id` |
| `descricao`, `arquivo_nome`, `arquivo_caminho`, `tipo_arquivo` | VARCHAR |
| `data_exame` | VARCHAR NULL |

### 5.3 Como as Consultas são Feitas (SQLModel ORM)

O projeto **não usa SQL puro** — todas as operações passam pelo SQLModel, que gera o SQL automaticamente.

**SELECT por chave estrangeira** (listar pagamentos de um paciente):

```python
session.exec(
    select(Pagamento).where(Pagamento.paciente_id == paciente_id)
).all()
```

SQL gerado:
```sql
SELECT id, paciente_id, valor, data_pagamento, descricao, forma_pagamento
FROM pagamento WHERE paciente_id = :paciente_id;
```

**SELECT com `ORDER BY`** (listar pacientes e evoluções):

```python
session.exec(select(Paciente).order_by(Paciente.id)).all()
session.exec(select(Evolucao).where(Evolucao.paciente_id == paciente_id).order_by(Evolucao.id)).all()
```

**INSERT** (sempre `session.add(obj)` + `commit` + `refresh` para recuperar o `id`):

```python
novo = Pagamento(paciente_id=paciente_id, valor=..., data_pagamento=..., descricao=..., forma_pagamento=...)
session.add(novo); session.commit(); session.refresh(novo)
```

**UPDATE parcial** com `model_dump(exclude_unset=True)` (envia ao banco só o que o cliente mandou):

```python
update_data = paciente_update.model_dump(exclude_unset=True)
for campo, valor in update_data.items():
    setattr(paciente_db, campo, valor)
session.add(paciente_db); session.commit()
```

**DELETE em cascata manual** (exclusão de paciente):

```python
for evolucao in session.exec(select(Evolucao).where(Evolucao.paciente_id == paciente_id)).all():
    session.delete(evolucao)
for pagamento in session.exec(select(Pagamento).where(Pagamento.paciente_id == paciente_id)).all():
    session.delete(pagamento)
for exame in session.exec(select(Exame).where(Exame.paciente_id == paciente_id)).all():
    Path(exame.arquivo_caminho).unlink(missing_ok=True)  # remove o binário do disco
    session.delete(exame)
ficha = session.exec(select(FichaClinica).where(FichaClinica.paciente_id == paciente_id)).first()
if ficha: session.delete(ficha)
session.delete(paciente); session.commit()
```

**DDL idempotente no startup** — a única operação SQL "crua":

```python
def aplicar_migracoes(engine):
    statements = [
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS sexo VARCHAR",
        "ALTER TABLE paciente ADD COLUMN IF NOT EXISTS naturalidade VARCHAR",
        # ...
        "ALTER TABLE fichaclinica ADD COLUMN IF NOT EXISTS febre_reumatica BOOLEAN NOT NULL DEFAULT FALSE",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.exec_driver_sql(stmt)
```

Roda dentro do `lifespan` da FastAPI, antes de aceitar requisições.

---

## 6. Dicionário de Arquivos Chave

### 6.1 [backend/main.py](backend/main.py) — ~430 linhas

**O que está implementado:** todo o roteamento HTTP da aplicação, configuração de CORS, ciclo de vida (`lifespan`), migrações idempotentes e a lógica de upload/leitura de exames.

Principais funções:

- `aplicar_migracoes(engine)` — executa `ALTER TABLE IF NOT EXISTS` para todos os campos novos, evitando a limitação do `create_all`.
- `lifespan(app)` — async context manager: cria tabelas, aplica migrações e garante a pasta de uploads.
- `criar_paciente` / `atualizar_paciente` / `listar_pacientes` / `excluir_paciente` — CRUD de paciente com normalização de CPF/telefone e cascata manual no DELETE.
- `ler_ficha` / `salvar_ficha` — leitura e upsert da anamnese (1:1).
- `registrar_pagamento` / `listar_pagamentos` / `atualizar_pagamento` / `excluir_pagamento` — CRUD financeiro.
- `registrar_evolucao` / `listar_evolucoes` / `atualizar_evolucao` / `excluir_evolucao` — folha de evolução.
- `upload_exame` / `listar_exames` / `baixar_arquivo_exame` / `excluir_exame` — gerencia binários no disco + metadados no banco; `FileResponse` com `Content-Disposition: inline` para o browser exibir PDF/imagem direto.

### 6.2 [backend/models.py](backend/models.py) — 197 linhas

**O que está implementado:** todas as classes que representam **tabelas** (SQLModel + `table=True`) e os **DTOs Pydantic** usados para validar requests.

- `Paciente`, `PacienteCreate`, `PacienteUpdate` — pessoa física com todos os campos da ficha em papel.
- `FichaClinica` — anamnese completa (queixa, checkboxes críticos, histórico por sistemas, ortodontia).
- `Pagamento`, `PagamentoCreate`, `PagamentoUpdate` — pagamentos N:1 paciente.
- `Evolucao`, `EvolucaoCreate`, `EvolucaoUpdate` — trabalho realizado + planejamento.
- `Exame` — metadados (binário fica em disco).

O padrão `Create` / `Update` (Pydantic puro) **separa o schema de entrada do schema da tabela**, permitindo validações diferentes (ex.: `Update` tem todos os campos opcionais).

### 6.3 [backend/database.py](backend/database.py) — 14 linhas

**O que está implementado:** carregamento do `.env`, instanciação do `engine` SQLAlchemy/SQLModel apontado para o Postgres e a função geradora `get_session`. Pequeno mas crítico — é a única fonte da `DATABASE_URL` em todo o backend.

### 6.4 [frontend/src/App.tsx](frontend/src/App.tsx) — 1286 linhas

**O que está implementado:** todo o frontend. Concentra estado, lógica de UI, formatação, chamadas à API e renderização das cinco telas.

Estrutura interna do arquivo:

1. **Constantes de estilo** (`ESTILO_GERAL`, `ESTILO_CARD`, `ESTILO_INPUT_BASE`, etc.) — sistema de design embutido.
2. **Funções de máscara** — `formatarCPF`, `formatarTelefone`, `formatarData`, `formatarCEP`.
3. **Interfaces TypeScript** — `Paciente`, `FichaClinica`, `Pagamento`, `Evolucao`, `Exame`, `DadosExtras`.
4. **Componente `App`:**
   - **Estado:** ~30 `useState` agrupados por funcionalidade (cadastro, ficha, financeiro, evolução, exames). Os "campos extras" do paciente foram condensados num único objeto `dadosExtras` para reduzir verbosidade.
   - **Efeito de carga inicial:** `useEffect(() => buscarPacientes(), [])`.
   - **Handlers de cursor:** `handleCpfChange`, `handleDataChange`, `handleTelefoneChange`, `handleTelefoneComercialChange` — reposicionam o cursor após a máscara reformatar o input.
   - **Submit de paciente:** `handleSubmit` — decide entre `POST` e `PUT` usando `pacienteEditando` e trata erros com `mensagemErro` (prioriza `err.response.data.detail`).
   - **Funções por feature:** `abrirFicha` / `salvarFicha`, `abrirFinanceiro` / `salvarPagamento` / `excluirPagamento`, `abrirEvolucao` / `salvarEvolucao` / `excluirEvolucao`, `abrirExames` / `enviarExame` / `excluirExame`.
   - **Render condicional:** cinco telas, escolhidas pelo primeiro estado `pacienteXAberto` que não for `null`.

### 6.5 [frontend/src/main.tsx](frontend/src/main.tsx) — 10 linhas

**O que está implementado:** bootstrap do React. Cria a root no `#root` do `index.html` e renderiza `<App />` dentro de `<StrictMode>`.

### 6.6 [frontend/src/index.css](frontend/src/index.css) — 111 linhas

**O que está implementado:** variáveis de tema (cores, fontes, sombras), regras tipográficas globais (`h1`, `h2`, `code`) e suporte automático a dark mode via `@media (prefers-color-scheme: dark)`. Define também o container `#root` com largura máxima de 1126 px e centralização horizontal.

### 6.7 [frontend/index.html](frontend/index.html) — 13 linhas

**O que está implementado:** shell HTML mínimo do Vite. Define o `<div id="root">` onde o React monta a aplicação e carrega `main.tsx` como módulo ES.

---

## Mapeamento Histórias → Implementação (rápida revisão antes da arguição)

| História | Onde olhar primeiro |
|---|---|
| 1. Cadastro e Anamnese | `POST /pacientes/` + `POST /pacientes/{id}/ficha`; tela 1 e tela 2 do `App.tsx`. |
| 2. Consulta de Ficha | `GET /pacientes/{id}/ficha`; função `abrirFicha`; destaque visual aos campos críticos (diabético, grávida, alergias). |
| 3. Registro de Pagamento | `POST /pacientes/{id}/pagamentos`; função `salvarPagamento`. |
| 4. Histórico Financeiro | `GET /pacientes/{id}/pagamentos`; tabela na tela Financeiro. |
| 5. Folha de Evolução | `POST/GET /pacientes/{id}/evolucao`; campo `trabalho_realizado` do modelo `Evolucao`. |
| 6. Planejamento de Tratamento | Mesma tabela `evolucao`, campo `proxima_visita`. |
| 7. Registro de Exames | `POST /pacientes/{id}/exames` (multipart) + `GET .../arquivo` (inline); funções `enviarExame` e `urlExame`. |
