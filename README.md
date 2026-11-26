# AltStream

AltStream é uma plataforma de streaming voltada à descoberta e à exibição de
séries e episódios com títulos **copyright-free** (livres de direitos autorais).
O projeto reúne um catálogo de conteúdo, busca, reprodução de vídeos e recursos
de usuário em uma interface responsiva.

![Demonstração principal do AltStream](https://i.ibb.co/hFXTwN7X/Screenshot-1.png)
![Demonstração adicional do AltStream](https://i.ibb.co/21npYV89/Screenshot-2.png)

## Sobre o projeto

O AltStream oferece:

- Catálogo de séries e episódios, com páginas de detalhes.
- Busca de conteúdo e player de vídeo.
- Autenticação de usuários com Amazon Cognito.
- Lista pessoal, histórico de reprodução e interações com episódios.
- Perfil de usuário e assistente de chat.
- Painel administrativo para gerenciar séries e episódios.

## Tecnologias

- **Frontend:** Next.js, React, TypeScript e Tailwind CSS.
- **Backend:** Django e Django REST Framework.
- **Banco de dados local:** SQLite.
- **Autenticação:** Amazon Cognito/Amplify.

## Requisitos

- Python 3 e pip.
- Node.js e npm.

## Como executar localmente

O backend e o frontend rodam em terminais separados.

### 1. Inicie o backend

Na raiz do repositório:

```bash
cd Backend
python -m venv .venv
```

Ative o ambiente virtual:

```powershell
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS/Linux
source .venv/bin/activate
```

Instale as dependências, prepare o banco e inicie a API:

```bash
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

O backend ficará disponível em `http://localhost:8000`.

### 2. Configure e inicie o frontend

Em outro terminal, na raiz do repositório, crie
`Frontend/altstream/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_COGNITO_USER_POOL_ID=seu-user-pool-id
NEXT_PUBLIC_COGNITO_CLIENT_ID=seu-client-id
NEXT_PUBLIC_COGNITO_DOMAIN=seu-dominio-cognito
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN=https://localhost:3000/login
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT=https://localhost:3000
```

Substitua os valores de Cognito pelos da sua aplicação e cadastre as URLs de
callback e saída na configuração do Cognito. `NEXT_PUBLIC_API_URL` deve apontar
para o backend em execução.

Instale as dependências e inicie o servidor:

```bash
cd Frontend/altstream
npm ci
npm run dev
```

Abra `https://localhost:3000`. O comando de desenvolvimento do Next.js usa
HTTPS local; o navegador pode pedir confirmação para o certificado local.

> O perfil e o chat também podem depender de serviços AWS configurados à parte.
> Para detalhes dessas integrações, consulte o
> [guia do frontend](Frontend/altstream/README.md).

## Estrutura

```text
altstream/
├── Backend/              # API Django, modelos e lógica de negócio
├── Frontend/altstream/   # Aplicação Next.js
└── README.md
```

---

Desenvolvido por Carlos Abrantes.
