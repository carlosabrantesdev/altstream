# AltStream

AltStream é uma plataforma de streaming de séries, composta por um backend robusto em Django e um frontend moderno em Next.js.

## Tecnologias Utilizadas

### Backend
- **Django**: Framework web de alto nível para Python.
- **Django REST Framework (DRF)**: Para a criação de APIs RESTful.
- **SQLite**: Banco de dados utilizado para desenvolvimento.

### Frontend
- **Next.js**: Framework React para renderização híbrida (SSR/Static).
- **TypeScript**: Para maior segurança e tipagem do código.
- **Tailwind CSS**: Para estilização rápida e responsiva.

## Estrutura do Projeto

```
altstream/
├── Backend/        # API Django, Modelos e Lógica de Negócio
└── Frontend/       # Interface do Usuário em Next.js
```

## Como Executar o Projeto

### Backend
1. Navegue até a pasta do backend:
   ```bash
   cd Backend
   ```
2. Crie e ative um ambiente virtual:
   ```bash
   python -m venv venv
   # No Windows:
   .\venv\Scripts\activate
   ```
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
4. Execute as migrações do banco de dados:
   ```bash
   python manage.py migrate
   ```
5. Inicie o servidor:
   ```bash
   python manage.py runserver
   ```

### Frontend
1. Navegue até a pasta do frontend:
   ```bash
   cd Frontend/altstream
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

Para configurar o login Cognito/Google, o chat e o perfil com S3/DynamoDB,
consulte [o guia do frontend](Frontend/altstream/README.md).

## Funcionalidades
- Cadastro e Login de usuários.
- Listagem de séries e episódios.
- Player de vídeo integrado.
- Sistema de curtidas/descurtidas em episódios.
- Busca de conteúdos.
- Painel administrativo para gestão de séries.
- Edição de nome, e-mail e foto de perfil, com persistência no DynamoDB e S3.

---
Desenvolvido por Carlos Abrantes
