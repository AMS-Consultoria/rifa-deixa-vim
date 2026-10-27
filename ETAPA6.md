# Etapa 6 — tela principal atualizada

**Estado:** concluída. Migração aplicada e verificada no Supabase; arquivos publicados na branch main.

## Arquivos

- index.html: nova ordem visual, ações em grade, resumo financeiro, prévia de cinco participantes e backup/restauração nas configurações.
- supabase/migrations/20261027_etapa6_resumo_financeiro.sql: função agregada por campanha, sem dados pessoais.
- tests/smoke.cjs: regressão da interface, pagamentos, reserva, cinco participantes e valores financeiros.
- tests/finance-db.cjs: teste PostgreSQL temporário da função financeira, isolamento de campanhas, acesso anônimo agregado e preservação de dados.

## Funcionalidades

- Ordem principal: entidade e Configurações, campanha e Nova Campanha, rifa e prêmio, indicadores, três cartões financeiros, cartela, quatro ações principais, últimos cinco participantes e botão para ver todos.
- Ações principais em duas colunas: Cadastrar participante, Reservar números, Confirmar pagamento e Realizar sorteio.
- Reservar números mantém a situação como reserva. Confirmar pagamento abre os participantes com reservas pendentes e reutiliza a ficha existente.
- Total recebido considera cada número pago uma vez. Total a receber considera apenas reservas pendentes. Total geral soma os dois, sem duplicar.
- A prévia administrativa mostra até cinco participantes distintos, ordenados pela atualização mais recente do bilhete; o botão alterna para a listagem completa. A página independente e os filtros detalhados ficam para as Etapas 7 e 8.
- Os controles de backup, restauração e importação local ficam apenas na página Configurações.
- O visual preto, vermelho e dourado, a grade de botões em duas colunas e os controles responsivos foram preservados.

## Banco de dados

A migração foi testada em PostgreSQL temporário e aplicada no Supabase de produção após backup. Ela cria uma função de leitura agregada e concede execução a visitantes e usuários autenticados. Não cria/recria tabelas, não modifica registros e não expõe nomes ou telefones. As contagens de registros após a migração permaneceram iguais ao backup: 2 campanhas, 2 configurações, 250 números, 5 participantes, 0 sorteios, 0 usuários, 0 vínculos e 1 administrador.

Os totais verificados em produção foram R$ 120,00 recebido, R$ 40,00 pendente e R$ 160,00 geral na campanha com 100 números; e R$ 15,00 recebido, R$ 0,00 pendente e R$ 15,00 geral na campanha com 150 números.

## Testes

- node tests/smoke.cjs: aprovado.
- node tests/access.cjs: aprovado.
- node tests/finance-db.cjs com PGlite: aprovado.
- node tests/participants-db.cjs com PGlite: aprovado.
- node tests/access-db.cjs com PGlite: aprovado.
- git diff --check: aprovado.

A prévia por navegador local não abriu neste ambiente; a execução funcional foi coberta pelos testes automatizados. A tela pública foi conferida após a implantação no GitHub Pages.

## Backup

Backup do código anterior à Etapa 6: outputs/rifa-etapa6-backup-codigo-20261027.zip (SHA-256: FAE50E614EF05E0E1624B2EC8DF48F31A7B8B9989D8A0BDBAE4F707A64ABCD5A). Backup dos dados de produção antes da migração: outputs/rifa-etapa6-backup-dados-20261027-pre-migracao.csv (SHA-256: 373EBC9824FE254305B28C8E9DE6A0B95767030EB8B4A6BD2810DFF6A18CA06A). Ambos os backups são arquivos locais, fora do repositório.

## Próxima etapa

Etapa 7: detalhar os cinco participantes mais recentes e abrir a listagem completa em tela independente.

