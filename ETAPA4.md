# Etapa 4 — Cadastro único de participantes

**Estado:** concluída e publicada. Migração aplicada e validada no Supabase; arquivos publicados na branch `main`.

## 1. Etapa

Cadastro único de participantes, conforme o escopo da Etapa 4.

## 2. Arquivos

- `index.html`: formulário de participante, seleção de cadastro existente, tratamento de homônimos, listagem agrupada e salvamento transacional.
- `supabase/migrations/20261026_etapa4_participantes.sql`: migração aplicada no Supabase e versionada no GitHub.
- `tests/smoke.cjs`: cobertura isolada de cadastro, nomes com acentos/caixa/espaços, seleção existente e homônimo.
- `tests/participants-db.cjs`: teste PostgreSQL isolado da migração, RLS, compatibilidade de importação e integridade.

## 3. Funcionalidades

- O formulário passa a pedir nome completo e telefone opcional.
- O banco normaliza nomes sem diferenciar acentos, caixa ou espaços extras.
- Antes de salvar, a função administrativa procura participantes com o mesmo nome.
- Em caso de correspondência, o salvamento é bloqueado até o administrador escolher um cadastro existente ou confirmar que se trata de homônimo.
- A busca e o salvamento usam o mesmo bloqueio transacional no PostgreSQL, para evitar duplicidade em operações concorrentes.
- A lista administrativa mostra cada identidade uma vez e reúne os números já associados ao mesmo cadastro.
- A data de criação fica registrada e aparece ao identificar cadastros existentes.
- O gatilho também protege importações e alterações administrativas diretas: associa uma identidade inequívoca, cria um novo cadastro quando não há correspondência ou rejeita caso ambíguo.

## 4. Banco de dados

A migração proposta cria `rifa_participantes`, adiciona `participante_id` aos bilhetes, configura RLS e inclui a função administrativa de salvamento.

Na preparação dos dados legados, cada bilhete ocupado recebe um cadastro separado. Comprador, telefone, situação, pagamento e valor do bilhete não são alterados, e registros com nomes iguais não são fundidos automaticamente; isso evita juntar homônimos sem confirmação.

A migração foi aplicada no Supabase após backup dos dados. A validação confirmou 2 configurações, 250 números, 0 sorteios, 2 campanhas, 1 administrador, 0 usuários e 0 vínculos de acesso, iguais ao backup anterior. Os 4 números ocupados foram vinculados a 4 participantes; não há número ocupado sem vínculo nem número disponível com vínculo. RLS está ativo, acesso anônimo à tabela e à função está bloqueado, e a função administrativa está liberada para usuários autenticados.

## 5–6. Testes e resultados

- `node tests/smoke.cjs`: aprovado — novo fluxo e regressões de campanhas, configurações, roleta, histórico e login.
- `node tests/access.cjs`: aprovado — visitantes, usuários, administrador, sessão, isolamento e falhas de acesso.
- `node tests/access-db.cjs`: aprovado anteriormente — regressão da migração de acesso, RLS e isolamento.
- `node tests/participants-db.cjs` com PGlite: aprovado anteriormente — migração isolada, preservação dos campos existentes, normalização, seleção de cadastro, confirmação de homônimo, proteção das importações e bloqueio de acesso anônimo.
- `git -c core.whitespace=cr-at-eol diff --check`: aprovado.

Os testes de banco foram feitos em PostgreSQL temporário, com dados fictícios. Nenhuma conta, participação ou sorteio de teste foi criado no projeto real.

## 7. Backup

- Antes das alterações: `outputs/rifa-etapa4-backup-codigo-20261026-200417.zip`.
- Pacote de revisão: `outputs/rifa-etapa4-codigo-preparado.zip`.

- Backup pré-migração do Supabase: `outputs/rifa-etapa4-backup-dados-20261026-203012.csv` e `.json`. SHA-256 JSON: `411E411FCA6011424EE11A8FD63687A133D2ED351346F1E0997BD400EADBFD22`.

## 8. Problemas e limitações

- Cadastros legados com nomes iguais permanecem separados até alguém confirmar se são a mesma pessoa ou homônimos.
- Publicação confirmada em `main`; commit do aplicativo: `5c4deb14f1af582e4280a004a3dd9881679bc335`. A página do GitHub Pages foi aberta como visitante e sincronizou os números sem mostrar dados privados.
- A publicação foi autorizada e concluída.

## 9. Próxima etapa prevista

A próxima etapa do plano é a **Etapa 5 — vários números por participante**, incluindo seleção em lote e pagamentos individuais/conjuntos.



