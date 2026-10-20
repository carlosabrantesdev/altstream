# Frontend AltStream: Cognito e chat WebSocket

O login usa Google pelo Amazon Cognito, com AWS Amplify Auth e OAuth Authorization
Code com PKCE. O SDK processa o retorno do login e renova os tokens da sessão.
O frontend não precisa de credenciais AWS, segredo do App Client nem chave Gemini.

## Configuração

1. Configure o `.env` com os valores abaixo. Preserve a URL da API
   REST já usada pelo catálogo em `NEXT_PUBLIC_API_URL`.
2. Preencha o User Pool ID, App Client ID e domínio de login do Cognito.
3. No App Client, habilite Google, Authorization Code Grant e os escopos
   `openid` e `email`. Use um App Client público sem client secret. O escopo
   `profile` não está habilitado no App Client informado e causa `invalid_scope`.
4. Use `https://localhost:3000/login` como callback e adicione esse mesmo endereço
   em **Allowed sign-out URLs**. Em produção, use os endereços da tabela abaixo.
5. Mapeie os atributos do Google `email`, `name` e `picture` no Cognito para
   preencher nome e avatar.
6. Configure as variáveis `NEXT_PUBLIC_*` de produção no ambiente de build da
   hospedagem, usando `/login` para entrada e a raiz para saída, e faça novo build
   após alterá-las. O `.env` local é ignorado pelo Git.

```sh
npm install
npm run dev
```

As variáveis antigas `NEXT_PUBLIC_FIREBASE_*` podem ser removidas do ambiente.

Configuração de produção informada:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `us-east-1_75pkAftAA` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | `7i0jkjlgva8t24lf2kh8rqau7n` |
| `NEXT_PUBLIC_COGNITO_DOMAIN` | `us-east-175pkaftaa.auth.us-east-1.amazoncognito.com` |
| `NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN` | `https://carlosabrantes.dengoso.web.ufersa.dev.br/login` |
| `NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT` | `https://carlosabrantes.dengoso.web.ufersa.dev.br` |

Esses valores já foram aplicados ao `.env`. A rota `/login` também recebe o retorno:
o `AuthProvider` conclui o fluxo OAuth, e a página encaminha a sessão autenticada
para a página inicial. As rotas `/callback` e `/auth/callback` continuam disponíveis,
mas não são usadas na configuração atual.

### Login em localhost

O arquivo `.env.development.local` sobrescreve somente os retornos do login e
logout durante `npm run dev`:

```dotenv
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN=https://localhost:3000/login
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT=https://localhost:3000/login
```

No App Client `7i0jkjlgva8t24lf2kh8rqau7n` do Cognito, use:

- **URLs de callback permitidas:** `https://localhost:3000/login` e
  `https://carlosabrantes.dengoso.web.ufersa.dev.br/login`
- **URLs de saída permitidas:** `https://localhost:3000/login` e
  `https://carlosabrantes.dengoso.web.ufersa.dev.br`

O callback local `/login`, o callback de produção `/login` e a saída de produção
na raiz foram conferidos no endpoint público do Cognito. **A saída local HTTPS
ainda precisa ser adicionada:** na lista enviada, localhost aparece em HTTP,
enquanto o servidor local atende apenas HTTPS.

As listas têm finalidades diferentes. **Allowed callback URLs** permite o
`redirect_uri` do login; **Allowed sign-out URLs** permite o `logout_uri` da saída.
Cadastrar `/callback` apenas na lista de saída não permite usá-lo no login.
A correspondência inclui protocolo, porta, caminho e barra final.

O comando `npm run dev` inicia o Next.js com `--experimental-https --port 3000`,
para atender às URLs HTTPS cadastradas. Na primeira execução, o Next.js usa
`mkcert` para preparar o certificado local e pode solicitar permissão do sistema.
Os certificados ficam em `certificates/`, ignorado pelo Git. O navegador precisa
confiar no certificado local para concluir o fluxo.

Pare o servidor anterior, execute `npm run dev`, depois abra
`https://localhost:3000/login` e tente novamente. Confirme no terminal que o
servidor iniciou com HTTPS; se a geração do certificado falhar, o Next.js pode
voltar para HTTP, que não corresponde às URLs cadastradas.
Inicie uma nova tentativa pelo botão do site, em vez de recarregar a página de
erro do Cognito, que pertence à tentativa anterior.
Se usar outra porta, altere as duas URLs no arquivo e no Cognito. Acesse com
`localhost`, pois `127.0.0.1`, o IP da rede e outro protocolo são origens diferentes.

O erro `redirect is coming from a different origin` acontece quando o retorno
configurado não corresponde à origem em que o login começou. Uma tentativa
iniciada em localhost não pode usar o callback de produção, pois os dados do
fluxo OAuth ficam no armazenamento da origem que iniciou o login.

O Next.js carrega `.env.development.local` somente em desenvolvimento. O build
de produção continua usando as URLs do `.env` ou da hospedagem. Esse arquivo
local é ignorado pelo Git e deve ser recriado em outras máquinas.

### Diagnóstico confirmado no Cognito

Em 20/10/2026 foram feitas consultas públicas sem autenticar contas:

| Solicitação | Resultado |
| --- | --- |
| Login com `https://localhost:3000/callback` | `redirect_mismatch` |
| Login com `/login` e escopos `openid email profile` | `invalid_request` / `invalid_scope` |
| Login com `/login` e escopos `openid email` | Redireciona para a página de login Cognito sem erro nos parâmetros |
| Login com `https://www.carlosabrantes.dengoso.web.ufersa.dev.br/login` | `redirect_mismatch` no App Client consultado |
| Saída para `https://carlosabrantes.dengoso.web.ufersa.dev.br` | Redireciona para a raiz de produção |
| Saída para `https://localhost:3000/login` | Não retorna ao localhost; falta autorizar a URL HTTPS |

Use o domínio de produção **sem `www`** para iniciar o login com a configuração
atual. Se adicionar outro domínio, cadastre o callback no mesmo App Client e
configure o frontend para iniciar e terminar o OAuth nessa mesma origem.

Essas consultas verificam a aceitação dos parâmetros; não substituem o teste de
login com uma conta Google e a troca do código por tokens no navegador.

## Chat

Ao abrir o chat autenticado, o frontend obtém o **ID token** do Cognito e conecta a:

```text
wss://api.carlosabrantes.dengoso.web.ufersa.dev.br?Authorization=<idToken>
```

A Lambda authorizer de `$connect` deve ler
`event.queryStringParameters.Authorization` e validar o JWT do pool/client
configurado. Configure a origem de identidade como query string `Authorization`.
Não use um header HTTP obrigatório, pois o WebSocket nativo do navegador não
permite defini-lo. Evite registrar o token ou a URL autenticada nos logs.

O contrato confirmado da Lambda `chat-gemini`, ligada à rota `$default`, é uma
resposta completa por pergunta. `services/chat.ts` envia:

```json
{
  "message": "Me recomende uma série"
}
```

Não é necessário enviar `action` para `$default`. A Lambda recebida usa apenas
a pergunta atual ao chamar o Gemini, por isso não enviamos histórico. A conversa
fica visível na interface enquanto o chat estiver aberto, mas a IA não recebe
o contexto das perguntas anteriores.

Resposta de sucesso:

```json
{ "type": "response", "message": "Aqui estão algumas sugestões..." }
```

Resposta de erro:

```json
{ "type": "error", "message": "Erro ao processar a pergunta" }
```

A Lambda já envia a resposta para o `connectionId` com `post_to_connection`.
O retorno HTTP `{ "statusCode": 200, "body": "OK" }` não é a resposta exibida no chat.

O botão e a tecla Enter enviam a pergunta. Há limite de uma pergunta pendente,
timeout de conexão de 15 segundos e de resposta de 90 segundos. A próxima
tentativa reconecta com um token atualizado se necessário; perguntas não são
reenviadas automaticamente. Fechar o chat ou sair da conta encerra a conexão e
limpa a conversa local.

## API REST existente

O catálogo continua usando `services/api.ts`; o chat não chama mais `/core/ai/chat/`.
Lista, progresso, curtidas e administração agora enviam o ID token Cognito como
`Authorization: Bearer <token>`. A permissão de administrador é consultada em
`/core/check-admin/`, sem depender da antiga custom claim Firebase no navegador.

**O backend deste repositório ainda usa `FirebaseAuthentication` em
`Backend/core/auth.py`. Esses endpoints protegidos não aceitarão o novo token
até o backend ser migrado para validar Cognito**, incluindo assinatura/JWKS,
issuer, expiração, `token_use=id`, audience/App Client e permissões administrativas.
O vínculo dos usuários antigos (`firebase_uid`) também exige uma estratégia de
migração no backend. A autorização do WebSocket não migra a API REST.

## Correção necessária no authorizer informado

A função fornecida apenas decodifica o payload e verifica `exp`, sem validar a
assinatura. Isso permite aceitar um JWT falsificado. Remova também o log de todo
o evento, que contém o token. No pacote da **Lambda**, instale `aws-jwt-verify`
e substitua a validação por:

```js
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: 'us-east-1_75pkAftAA',
  tokenUse: 'id',
  clientId: '7i0jkjlgva8t24lf2kh8rqau7n',
});

const policy = (principalId, effect, resource) => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [{
      Action: 'execute-api:Invoke',
      Effect: effect,
      Resource: resource,
    }],
  },
});

export const handler = async (event) => {
  const token = event.queryStringParameters?.Authorization
    || event.headers?.Authorization
    || event.headers?.authorization;
  try {
    if (typeof token !== 'string') throw new Error('Token ausente');
    const payload = await verifier.verify(token.replace(/^Bearer\s+/i, ''));
    return policy(payload.sub, 'Allow', event.methodArn);
  } catch {
    return policy('unauthorizedUser', 'Deny', event.methodArn);
  }
};
```

Esse trecho é uma orientação para corrigir sua Lambda; nenhuma função ou
configuração foi publicada na AWS por esta alteração de frontend.

## Verificação

```sh
npm test
npx tsc --noEmit
npm run build
```

Para validar a integração real: faça login, confirme o perfil após recarregar,
abra o chat, envie uma pergunta e confira a resposta. Teste logout, falha de rede
e uma nova tentativa. O login real exige acesso ao Google e execução na origem
cadastrada no Cognito; testes locais simulam o SDK e o WebSocket, sem acessar contas.

Referências:
- [Login social com Amplify](https://docs.amplify.aws/gen1/nextjs/build-a-backend/auth/add-social-provider/)
- [Sessões e renovação de tokens](https://docs.amplify.aws/gen1/react/build-a-backend/auth/manage-user-session/)
- [Authorizer WebSocket](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-lambda-auth.html)
- [Rotas e respostas WebSocket](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-routes-integrations.html)
- [Verificação de JWT Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)
- [HTTPS local no Next.js](https://nextjs.org/docs/app/api-reference/cli/next#using-https-during-development)
