# AGENTS.md — Tarot Chama Sofia

## Missão

Assumir e finalizar o projeto standalone existente do Tarot Chama Sofia. Não recriar do zero.

## Produção

https://tarot.chamasofia.com.br

## Prioridade P0

`VENDA → PAGAMENTO → TAROT → PDF → E-BOOK`

## Guardrails

- Localize/importar primeiro o código existente.
- Preserve stack e arquitetura quando saudáveis.
- Nunca exponha ou commite secrets.
- Não apagar ou recriar D1/R2/banco de produção.
- Não tornar o e-book público.
- Não liberar leitura por clique em Pix; somente após pagamento confirmado.
- Tiragem server-side, sem repetição, persistida após criação.
- Páginas privadas devem usar token imprevisível e não indexável.
- Testar PDF real antes de declarar sucesso.
- Testar produção após deploy; exit code 0 não é prova suficiente.

## Novo baralho oficial

Quando disponibilizado no workspace, integrar `Tarot_ChamaSofia_Export_v1.zip` como fonte oficial de conteúdo/assets. Priorizar WebP na UI, thumbnails em listagens e PNG de alta resolução apenas quando necessário no PDF.

## Git

Antes de editar, registrar branch/SHA. Commits pequenos e claros. Nunca force-push em branch compartilhada sem necessidade explícita.
