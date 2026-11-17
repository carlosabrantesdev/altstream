# AltStream: autenticação, chat e perfil

O login Google existente continua sendo gerenciado pelo Cognito/Amplify em
`services/auth.ts` e `AuthProvider`. O perfil personalizado fica separado da
identidade de login: editar o nome ou a foto não altera a conta Google nem o JWT.

## Executar localmente

Preserve as variáveis de login e catálogo do seu `.env`. A nova configuração é:

```dotenv
NEXT_PUBLIC_PROFILE_API_URL=https://go9l700cm8.execute-api.us-east-1.amazonaws.com/profile
```

```sh
npm install
npm run dev
```

Abra `https://localhost:3000/profile` ou clique no avatar do cabeçalho. A seta ao
lado do avatar abre o menu com a opção de sair. O e-mail do perfil é editável;
o acesso continua pela mesma conta Google.

## Fluxo de perfil

1. O usuário entra com Google/Cognito como antes.
2. O navegador chama diretamente `GET https://go9l700cm8.execute-api.us-east-1.amazonaws.com/profile`.
3. A requisição inclui o ID token Cognito no header `Authorization: Bearer <token>`.
4. Se a Lambda responder `404` com `Perfil nao cadastrado`, o formulário começa
   com o nome, e-mail e foto do Google. Falhas de rede ou de rota não são tratadas
   como um perfil novo.
5. Todo salvamento usa `PUT /profile`, inclusive o primeiro cadastro.
   O JSON contém `nome`, `email` e, quando uma foto foi selecionada, `imagem`
   (Base64 puro) e `tipoImagem` (por exemplo, `image/jpeg`), conforme a Lambda
   original. Esses dois campos transportam o arquivo; a tabela continua guardando
   apenas a chave S3 em `foto`. Sem uma foto nova, eles são omitidos.
6. A Lambda identifica o usuário pelo `sub` validado no authorizer. O `userId` é
   apenas a chave interna da tabela; não aparece no formulário nem vem do corpo
   da requisição. O e-mail de contato é lido do JSON, sem alterar o login Cognito.
7. O nome e a foto salvos passam a aparecer no cabeçalho. Recarregar a página
   recupera o perfil novamente da AWS. Sair ou trocar de conta cancela as
   requisições anteriores e descarta o estado do perfil.

Limites: nome até 150 caracteres, e-mail até 254, foto JPG/PNG/WebP até 4 MB.
Salvar apenas o texto mantém a foto existente. “Descartar alterações”
restaura os últimos dados carregados, sem enviar uma requisição de gravação.

O catálogo Django e o chat WebSocket continuam com suas integrações existentes.
O chat usa `NEXT_PUBLIC_CHAT_WEBSOCKET_URL`; a URL HTTP de perfil é independente.

## Ajuste necessário na Lambda existente

Se a resposta já contém `foto: "profiles/...jpg"`, o upload foi concluído. Esse
valor é a chave do S3. A função em execução ainda precisa fornecer um endereço
HTTPS assinado para exibição; criar uma pasta no frontend não resolve esse caso.

Para corrigir apenas a leitura da imagem na Lambda original (que usa `BUCKET`,
`TABLE` e `resposta`), substitua a criação do cliente S3 e adicione esta função:

```python
from botocore.config import Config

s3 = boto3.client(
    "s3",
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
)

def perfil_com_url(item):
    perfil = dict(item)
    foto = item.get("foto")
    if foto:
        perfil["fotoUrl"] = foto if foto.startswith("https://") else s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": BUCKET,
                "Key": foto,
                "ResponseCacheControl": "private, no-store",
            },
            ExpiresIn=3600,
        )
    return perfil
```

No retorno de sucesso do PUT, depois de `TABLE.put_item(Item=item)`, use:

```python
return resposta(200, {
    "mensagem": "Perfil atualizado",
    "perfil": perfil_com_url(item),
})
```

No retorno de sucesso do GET, use:

```python
return resposta(200, perfil_com_url(item))
```

Clique em **Deploy** na Lambda e depois em **Recarregar perfil** no site. A foto
já enviada pode ser exibida sem outro upload. A role da Lambda precisa permitir
`s3:GetObject`. `fotoUrl` é apenas um campo da resposta, não um atributo novo da
tabela. O frontend já reconhece esse campo. Esse patch ainda não foi publicado
automaticamente na AWS.

### Alternativa: substituir a função completa

O código completo abaixo substitui a Lambda enviada anteriormente. Ele implementa
GET e PUT com os três campos solicitados. Mantenha `BUCKET_NAME` e
`TABLE_NAME` com os recursos que você já criou. Publique o código na função
existente e integre as duas rotas `/profile` à mesma função.

A execução precisa de `s3:PutObject` e **`s3:GetObject`** nos objetos do bucket e
`dynamodb:GetItem`/`dynamodb:PutItem` na tabela. As duas rotas devem continuar
protegidas pelo JWT authorizer Cognito.

No DynamoDB, o item tem somente a chave `userId` e os dados `nome`, `email`, `foto`.
Uma foto enviada fica no S3; a tabela guarda sua chave. A resposta da API tem apenas
`nome`, `email` e `foto`, com uma URL temporária para exibir a imagem. Não grave
essa URL temporária na tabela. Ao atualizar um item antigo, o código substitui
o item e remove campos extras que existiam na versão anterior.

| Método | Comportamento |
| --- | --- |
| GET `/profile` | Retorna os três campos; `404` se o perfil não existe. |
| PUT `/profile` | Cria ou atualiza os dados e a foto opcional; `200` no sucesso. |

O frontend também aceita o envelope `{ "perfil": { ... } }` e o antigo campo
de resposta `fotoUrl`, mas não exige metadados adicionais para carregar o perfil.

Se o PUT retornar `foto: ""` mesmo após selecionar uma imagem, confira se o corpo
contém `imagem` e `tipoImagem`. Uma data URL enviada apenas em `foto` era ignorada
pela Lambda original. Depois de gravar, a Lambda deve retornar a chave em `foto`
ou uma URL HTTPS para exibição. Uma chave como `profiles/usuario.jpg` confirma o
registro, mas ainda precisa de uma URL assinada para a imagem aparecer no site.
O código abaixo gera essa URL na resposta e não altera os campos da tabela.

Referência: [URLs pré-assinadas do S3](https://docs.aws.amazon.com/boto3/latest/guide/s3-presigned-urls.html).

## Domínio e CORS na AWS

O perfil usa diretamente o endpoint padrão da HTTP API `go9l700cm8`, com o caminho
`/profile`. O chat permanece em `wss://api.carlosabrantes.dengoso.web.ufersa.dev.br`.
As requisições de perfil não passam por localhost nem por uma rota intermediária
do Next.js.

Na consulta feita em 17/11/2026, o endpoint de perfil retornou `401` sem token,
como esperado para uma rota protegida. O preflight OPTIONS retornou `404` sem
headers CORS, tanto para localhost quanto para o domínio de produção. O CORS ainda
precisa ser configurado para permitir as chamadas diretas do navegador.

Configure o CORS da HTTP API com as origens `https://localhost:3000` e
`https://carlosabrantes.dengoso.web.ufersa.dev.br`, métodos `GET` e `PUT`, e headers
`Authorization` e `Content-Type`. O preflight OPTIONS deve responder sem exigir
JWT; GET e PUT continuam protegidos pelo authorizer Cognito. Nenhuma alteração
foi publicada na AWS automaticamente.
[Documentação de CORS da HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html).

## Produção no Amplify

O endereço informado já é o padrão em `services/profile.ts`. Para sobrescrevê-lo,
defina `NEXT_PUBLIC_PROFILE_API_URL` nas variáveis de ambiente da aplicação Amplify
antes do build. Essa configuração contém somente o endereço público da API;
nenhuma credencial AWS deve ser colocada no frontend.

Preserve os valores Cognito de produção e os retornos de login/logout já
cadastrados. O `.env` local usa localhost e não deve substituir essas configurações.

## Entrega

Após publicar a Lambda, faça login, abra `/profile`, escolha uma foto diferente
da do Google e salve. Recarregue a página para confirmar a persistência. Para a
avaliação, capture o objeto em `SEUNOME-profile-2026.2`, o item da tabela
`SEUNOME-message-2026.2` e a página de perfil com o domínio de produção visível.

## Código da Lambda para publicar

Este código é para a função existente na AWS. Não há uma cópia de backend AWS
nem uma pasta de testes no repositório.

```python
import base64
import binascii
import json
import os
import re
import uuid
from urllib.parse import urlsplit

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

s3 = boto3.client(
    "s3",
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
)
table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
bucket = os.environ["BUCKET_NAME"]
types = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
max_image = 4 * 1024 * 1024


def response(status, data):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Cache-Control": "no-store"},
        "body": json.dumps(data, ensure_ascii=False),
    }


def profile_response(item):
    photo = item.get("foto", "")
    if photo:
        url = urlsplit(photo)
        if url.scheme == "https" and url.netloc and not url.username and not url.password:
            pass  # Foto inicial fornecida pelo Google.
        elif photo.startswith(f"profiles/{item['userId']}/") or photo.startswith(f"profiles/{item['userId']}."):
            photo = s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": photo, "ResponseCacheControl": "private, no-store"},
                ExpiresIn=3600,
            )
        else:
            photo = ""
    return {"nome": item.get("nome", ""), "email": item.get("email", ""), "foto": photo}


def lambda_handler(event, context):
    request = event.get("requestContext", {})
    method = request.get("http", {}).get("method")
    claims = request.get("authorizer", {}).get("jwt", {}).get("claims", {})
    user_id = claims.get("sub")
    if not isinstance(user_id, str) or not user_id:
        return response(401, {"erro": "Usuario nao autenticado"})
    if method not in ("GET", "PUT"):
        return response(405, {"erro": "Metodo nao permitido"})

    try:
        existing = table.get_item(Key={"userId": user_id}, ConsistentRead=True).get("Item")
        if method == "GET":
            if existing is None:
                return response(404, {"erro": "Perfil nao cadastrado"})
            return response(200, profile_response(existing))

        raw = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw, validate=True).decode("utf-8")
        data = json.loads(raw)
        if not isinstance(data, dict) or set(data) - {"nome", "email", "foto", "imagem", "tipoImagem"}:
            return response(400, {"erro": "Campos de perfil invalidos"})
        if ("foto" in data and "imagem" in data) or ("tipoImagem" in data and "imagem" not in data):
            return response(400, {"erro": "Envie a foto em um unico formato"})
        name = data.get("nome")
        email = data.get("email")
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 150:
            return response(400, {"erro": "Informe um nome com ate 150 caracteres"})
        if not isinstance(email, str) or len(email.strip()) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email.strip()):
            return response(400, {"erro": "Informe um email valido"})

        photo = existing.get("foto", "") if existing else claims.get("picture", "")
        if not isinstance(photo, str):
            photo = ""
        if "foto" in data or "imagem" in data:
            if "imagem" in data:
                encoded_image = data["imagem"]
                image_type = data.get("tipoImagem")
                if not isinstance(encoded_image, str):
                    return response(400, {"erro": "Foto Base64 invalida"})
                if not isinstance(image_type, str) or image_type not in types:
                    return response(415, {"erro": "Escolha uma foto JPG, PNG ou WebP"})
                uploaded = f"data:{image_type};base64,{encoded_image}"
            else:
                uploaded = data["foto"]
            if not isinstance(uploaded, str):
                return response(400, {"erro": "Foto invalida"})
            if not uploaded:
                photo = ""
            else:
                prefix, separator, encoded = uploaded.partition(",")
                mime = prefix.removeprefix("data:").removesuffix(";base64")
                if not separator or prefix != f"data:{mime};base64" or mime not in types:
                    return response(415, {"erro": "Escolha uma foto JPG, PNG ou WebP"})
                if len(encoded) > 4 * ((max_image + 2) // 3):
                    return response(413, {"erro": "A foto deve ter no maximo 4 MB"})
                try:
                    image = base64.b64decode(encoded, validate=True)
                except (ValueError, binascii.Error):
                    return response(400, {"erro": "Foto Base64 invalida"})
                if not image or len(image) > max_image:
                    return response(413, {"erro": "Foto vazia ou acima de 4 MB"})
                valid = (
                    (mime == "image/jpeg" and image.startswith(b"\xff\xd8\xff"))
                    or (mime == "image/png" and image.startswith(b"\x89PNG\r\n\x1a\n"))
                    or (mime == "image/webp" and image[:4] == b"RIFF" and image[8:12] == b"WEBP")
                )
                if not valid:
                    return response(415, {"erro": "Conteudo da foto invalido"})
                photo = f"profiles/{user_id}/{uuid.uuid4().hex}.{types[mime]}"
                s3.put_object(Bucket=bucket, Key=photo, Body=image, ContentType=mime)

        item = {"userId": user_id, "nome": name.strip(), "email": email.strip(), "foto": photo}
        result = profile_response(item)
        table.put_item(Item=item)
        return response(200, result)
    except (ValueError, TypeError, UnicodeError):
        return response(400, {"erro": "JSON invalido"})
    except ClientError as error:
        code = error.response.get("Error", {}).get("Code")
        print("Falha AWS no perfil:", code)
        return response(500, {"erro": "Nao foi possivel acessar o perfil"})
```
