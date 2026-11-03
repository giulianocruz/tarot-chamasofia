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

## Auditoria e correção em produção — 03/11/2026

O frontend standalone é servido por uma origem remota através do contêiner Nginx `tarot-root-redirect-proxy`, configurado em `/opt/tarot-root-redirect-proxy` na VPS. **A recuperação/importação do código completo do frontend continua pendente**; o arquivo `ops/proxy/quality-hotfix.js` guarda a versão rastreável do hotfix aplicado no proxy, não substitui os fontes do aplicativo.

- **Correção publicada:** a primeira síntese da `Carta Única` foi simplificada para evitar nome de carta repetido, formulação mecânica e pontos finais duplicados. A atualização não altera interpretação completa, preço ou API de pagamentos.
- **Arquivo ativo:** `/opt/tarot-root-redirect-proxy/quality-hotfix.js`, montado em `/etc/nginx/quality-hotfix.js` pelo Docker. SHA-256 após a correção: `c2607f32b4a04243e260dd9fcf78d6cd13c26a7a35bd47dbb511cdef16f3f963`.
- **Backup/reversão:** `/opt/tarot-root-redirect-proxy/backups/preview-quality-20261103T034607Z/quality-hotfix.js`. Restaurar somente com conferência da versão ativa e validação posterior; o arquivo está montado por *bind mount*, portanto a troca precisa respeitar o inode ou recriar o contêiner de forma controlada.
- **Testes locais:** `node tests/preview-quality.test.cjs` (cinco cenários, 5/5). Testado também em navegador Chrome com uma pergunta de teste, lendo a versão publicada, sem erros JavaScript.
- **Pré-checkout:** `node tests/precheckout-safe.test.cjs` (requer Puppeteer e Chrome; defina `CHROME_PATH` se necessário). Este teste intercepta **todos os métodos HTTP de escrita**, bloqueando pedidos, leads e Pix reais. Valida o percurso mobile até a tela de pagamento, preço da oferta, exigência de e-mail e ausência de confirmação falsa.
- **Precificação confirmada:** o produto navega por `/consulta` e requisita `/api/pricing?offer=consulta` (R$ 9,90 no dia da auditoria). A consulta com `offer=tarot` indicava R$ 12,90; são ofertas distintas. Não fixar valores no teste e não mudar preços sem verificar a regra de negócio.
- **Pós-pagamento — acesso inválido (03/11/2026):** `node tests/postpayment-guard.test.cjs` (Puppeteer e Chrome) consulta exclusivamente dados públicos e identificadores deliberadamente inexistentes; intercepta e bloqueia qualquer método HTTP de escrita no navegador. `/api/orders/<token-inválido>` e `/api/leads/<token-inválido>` respondem HTTP 404; `/leitura/<token-inválido>` exibe “Não encontramos esta leitura”, com `noindex, nofollow`, sem falso Pix confirmado e sem dados privados. O retorno HTTP da página dinâmica é 200 (*soft 404* mitigado por `noindex`); não modificar proxy/roteamento sem avaliar impacto em leituras legítimas. Teste executado novamente a partir do commit `1122f5c92e64c74e0bba9be2aa996f175e10ccb0` com `POSTPAYMENT_GUARD=PASS`.
- **Catálogo público de livros:** `GET /api/books/status` retornou `available=false, size=0` para o slug `preto-velho`, enquanto outros três registros estavam disponíveis. A biblioteca principal anuncia materiais gratuitos de Preto Velho, mas pode usar outra fonte/armazenamento; confirmar o link real e o escopo antes de concluir que há falha de entrega. Nenhum arquivo foi liberado ou alterado nesta rodada.
- **Pendente:** confirmação real de pagamento e entrega do PDF/e-book, recuperação do frontend e homologação de checkout idempotente. Testes com tokens inexistentes e pré-checkout **não** comprovam entrega após compra.

## Próximo passo

Clonar este repositório no Antigravity IDE, recuperar/importar o código standalone existente e então integrar o pacote oficial de cartas `Tarot_ChamaSofia_Export_v1.zip`.
