# Etapa 5 — vários números por participante

**Estado:** concluída. Migração aplicada e verificada no Supabase; arquivos publicados na branch `main`.

## Escopo entregue

- Seleção visual de vários números disponíveis, com confirmação, cancelamento e bloqueio de números já sorteados.
- Cadastro de participante ligado a vários números de uma campanha, incluindo escolha de cadastro existente e confirmação explícita de homônimo.
- Ficha administrativa agrupada por participante, com valores e estados individuais por número.
- Pagamento de uma reserva ou de várias reservas do mesmo participante em uma única confirmação.
- Liberação de reservas não pagas em seleção única ou conjunta.
- Bilhetes pagos e números presentes no histórico oficial protegidos contra edição ou exclusão; o vínculo de acesso de usuário a um bilhete pago continua disponível sem alterar seus dados.
- RPCs transacionais com bloqueios ordenados, validação integral do lote e autorização administrativa.

## Arquivos desta etapa

- `index.html`: seleção em lote, ficha de participante, pagamentos, liberações e proteção de bilhetes.
- `supabase/migrations/20261026_etapa5_multiplos_numeros.sql`: RPCs e gatilhos aplicados ao Supabase de produção.
- `tests/smoke.cjs`: testes funcionais e de regressão de campanhas, roleta, login, participantes e fluxos em lote.
- `tests/participants-db.cjs`: testes das migrações das Etapas 4 e 5 em PostgreSQL temporário.

## Verificação local

- `node tests/smoke.cjs`: aprovado — seleção múltipla, inclusão em cadastro existente, homônimo, pagamentos individual e conjunto, liberação, número sorteado bloqueado, login, campanhas e roleta.
- `node tests/access.cjs`: aprovado — visitante/usuário/administrador; bilhete pago mantém o vínculo de acesso disponível, com os dados e comandos de venda bloqueados.
- `tests/participants-db.cjs` com PGlite 0.5.11 temporário: aprovado — preservação de dados legados, RPCs, lote tudo-ou-nada, pagamentos, liberação, proteção de pago/sorteado/exclusão e bloqueio anônimo.
- `tests/access-db.cjs` com PGlite: aprovado — regressão de RLS, perfis e isolamento de contas/campanhas.
- `git -c core.whitespace=cr-at-eol diff --check`: aprovado.

O PGlite foi instalado em `work/pglite-test` apenas para a execução local; não foi adicionado às dependências do aplicativo. Os dados de teste são fictícios. A migração foi executada no Supabase de produção após backup dos dados.

## Backup

Backup do código antes das alterações locais: `outputs/rifa-etapa5-backup-codigo-20261026-inicial.zip`. Backup dos dados antes da migração: `outputs/rifa-etapa5-backup-dados-20261027-pre-migracao.csv` (arquivo local privado, fora do repositório).

## Verificação em produção

Após a migração, foram conferidos 2 campanhas, 2 configurações, 250 números, 4 participantes, 0 sorteios, 0 usuários, 0 vínculos e 1 administrador, iguais ao backup anterior. As três RPCs públicas da Etapa 5 e os dois gatilhos de proteção estão instalados.
