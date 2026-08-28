# Tarot Chama Sofia

Repositório canônico do produto **Tarot Chama Sofia**, publicado em `tarot.chamasofia.com.br`.

## Objetivo

Centralizar o código standalone do produto comercial de Tarot, separado do projeto legado `giulianocruz/chamasofia`.

Fluxo principal do produto:

`Pergunta → Pix → confirmação → tiragem → interpretação → PDF → e-book`

## Estado atual

Este repositório foi inicializado para receber o código recuperado do projeto criado anteriormente. **Não recriar o projeto do zero** antes de localizar/importar o código existente.

## Regras

- Nunca commitar `.env`, tokens, senhas ou secrets.
- Não commitar banco de produção.
- Não tornar o e-book privado publicamente acessível.
- Preservar D1/R2/Cloudflare existentes quando forem identificados.
- Toda mudança deve ser testada antes de deploy.
- Registrar o SHA efetivamente publicado em produção.

## Produção

- URL: https://tarot.chamasofia.com.br
- Stack e infraestrutura: a confirmar após recuperação do código standalone.

## Próximo passo

Clonar este repositório no Antigravity IDE, recuperar/importar o código standalone existente e então integrar o pacote oficial de cartas `Tarot_ChamaSofia_Export_v1.zip`.
