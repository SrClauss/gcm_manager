# SIG-GCM — Sistema Integrado de Gestão para Guardas Civis

Sistema completo de gestão para Guarda Civil Municipal, desenvolvido como PWA (Progressive Web App) com suporte offline, sincronização automática e painel administrativo web.

## Stack Tecnológico

| Camada      | Tecnologia                                |
|-------------|-------------------------------------------|
| Frontend    | React 18 + TypeScript + Vite + PWA        |
| UI          | Material UI (MUI) v5                      |
| Offline DB  | Dexie.js (IndexedDB wrapper)              |
| Backend     | Python 3.11 + FastAPI (async)             |
| Banco       | PostgreSQL 15 + PostGIS 3.4               |
| Auth        | JWT (access + refresh tokens) + bcrypt    |
| Deploy      | Docker + Docker Compose                   |

## Módulos

| Módulo | Descrição |
|--------|-----------|
| **A — Talão de Ocorrência Digital** | Registro completo de ocorrências com GPS, envolvidos, apreensões e narrativa |
| **B — Relatório de Serviço Motorizado** | Controle de turno, KM, travessia escolar, rondas e abordagens |
| **C — Gestão de Frota** | Checklist de viatura (saída/entrada), bloqueio por problema crítico |
| **D — Gestão de Efetivo e Escalas** | Cadastro de GCMs, criação de escalas, cautela de equipamentos |
| **E — Inteligência / CECOM** | Mapa tático em tempo real, mancha criminal, BI e exportação |

## Níveis de Acesso

| Perfil | Área | Permissões |
|--------|------|------------|
| `agent` | PWA Mobile | Ocorrências, checklist, relatório de serviço |
| `inspector` | PWA + Admin | Aprovação de relatórios, gestão de equipe |
| `dispatcher` | Admin | Mapa tático, despacho de viaturas |
| `commander` | Admin | Dashboards, mancha criminal, relatórios completos |

## Início Rápido (Docker)

```bash
# Clone o repositório
git clone https://github.com/SrClauss/gcm_manager.git
cd gcm_manager

# Configure as variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env com SECRET_KEY segura e dados do banco

# Suba todos os serviços
docker compose up --build -d

# A aplicação estará disponível em:
# Frontend PWA:  http://localhost
# Backend API:   http://localhost:8000/api/docs
```

## Desenvolvimento Local

### Backend

```bash
cd backend

# Criar virtualenv e instalar dependências
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure o .env
cp .env.example .env
# Ajuste DATABASE_URL para seu PostgreSQL local

# Iniciar servidor de desenvolvimento
uvicorn app.main:app --reload --port 8000
```

> A documentação interativa da API estará em `http://localhost:8000/api/docs`

### Frontend

```bash
cd frontend

npm install
npm run dev
# Abre em http://localhost:5173
```

### Banco de Dados

```bash
# Subir apenas o PostgreSQL via Docker
docker compose up db -d

# Ou instale PostgreSQL localmente e habilite o PostGIS:
# CREATE EXTENSION postgis;
```

## Funcionamento Offline (PWA)

O PWA utiliza **Service Workers** (via `vite-plugin-pwa` / Workbox) e **IndexedDB** (Dexie.js) para:

1. **Cache dos assets** — A aplicação carrega sem internet após o primeiro acesso.
2. **Fila de sincronização** — Ocorrências, checklists e relatórios preenchidos offline ficam na fila (`syncQueue`) do IndexedDB.
3. **Sync automático** — Quando a conexão retorna, os itens são enviados automaticamente para a API FastAPI.
4. **Indicador visual** — O componente `SyncIndicator` exibe um badge com o número de itens pendentes.

## Estrutura do Projeto

```
gcm_manager/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, segurança (JWT/bcrypt), banco
│   │   ├── models/         # Modelos SQLAlchemy (Occurrence, Fleet, Personnel…)
│   │   ├── schemas/        # Schemas Pydantic
│   │   └── routers/        # Endpoints FastAPI por módulo
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   └── manifest.json   # PWA manifest
│   ├── src/
│   │   ├── contexts/       # AuthContext (JWT + refresh)
│   │   ├── db/             # Dexie.js (IndexedDB offline)
│   │   ├── pages/
│   │   │   ├── agent/      # Interface mobile-first (GCM)
│   │   │   └── admin/      # Painel desktop (Inspetor/Comandante)
│   │   ├── services/       # Cliente axios para a API
│   │   └── components/     # PrivateRoute, SyncIndicator
│   ├── vite.config.ts      # Vite + PWA
│   └── Dockerfile
└── docker-compose.yml      # PostgreSQL/PostGIS + Backend + Frontend
```

## Segurança / LGPD

- Senhas armazenadas com **bcrypt** (hash + salt automático).
- Autenticação via **JWT** com access token (30 min) e refresh token (7 dias).
- Rotas protegidas por **role** (perfil de acesso).
- Uploads de imagens validados por **magic bytes** (não pela extensão do arquivo).
- Ambiente de produção deve configurar `SECRET_KEY` forte e HTTPS.

## Variáveis de Ambiente (Backend)

Veja `backend/.env.example` para a lista completa. As principais:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL de conexão async ao PostgreSQL |
| `SECRET_KEY` | Chave secreta para assinar JWTs (min. 32 chars) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiração do access token (padrão: 30) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Expiração do refresh token (padrão: 7) |
| `CORS_ORIGINS` | Lista JSON de origens permitidas |
| `UPLOAD_DIR` | Diretório para upload de arquivos |
