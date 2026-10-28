# Etapa 9 — Backup, Pix, WhatsApp e arte da campanha

A Etapa 9 inclui melhorias de código e uma migração para o Supabase. Em 27/10/2026, o usuário executou a migração no Editor SQL do projeto bxiugnskskzhigyguyqp e apresentou captura com o resultado “Success. No rows returned” após o commit. A estrutura de produção não foi consultada diretamente pela automação.

## O que foi implementado

- Edição e criação de campanha com tipo de chave Pix, chave Pix e número de WhatsApp.
- Dados Pix/WhatsApp guardados em uma tabela sem acesso direto público. RPCs verificam se a sessão pertence a um administrador.
- Backup v4 por campanha com configuração, participantes, bilhetes, estados de pagamento, dados Pix/WhatsApp e histórico completo de sorteios.
- Compatibilidade de leitura com os arquivos v3 já exportados pelo aplicativo.
- Prévia e validação antes da restauração. A aplicação baixa um backup preventivo e restaura apenas a campanha selecionada.
- A restauração acrescenta registros em números livres e preserva números já reservados, vendidos ou registrados em sorteio. O histórico é combinado sem duplicar IDs.
- Artes PNG 1080 × 1680 (proporção 9:14), com até 100 números por imagem. A navegação mostra as páginas seguintes; o envio pelo WhatsApp compartilha todas juntas. Cada página exibe os dados da campanha, contadores, números coloridos por estado e o WhatsApp em destaque.
- O fundo decorativo fixo em estilo rubi e dourado é reaproveitado em todas as imagens; os dados da campanha são desenhados por cima. Cada página organiza até 100 números em dez colunas, com células horizontais compactas. A numeração da continuação começa na primeira célula, alinhada ao início da página anterior. O menu de compartilhamento envia todas as páginas juntas; a pessoa escolhe um contato ou o Status e confirma no WhatsApp.

## Migração

Arquivo: `supabase/migrations/20261027_etapa9_backup_dados_pagamento.sql`

A migração cria somente a tabela privada e as funções necessárias. Não recria nem apaga tabelas, campanhas ou registros. A execução em produção foi autorizada e o sucesso foi apresentado pelo usuário. A publicação do código no GitHub continua pendente por erro 403 da integração; os novos recursos ainda não foram disponibilizados no GitHub Pages.

## Verificações

- `tests/smoke.cjs`: fluxos de campanha, backup v3/v4, prévia/restauração, backup preventivo, Pix/WhatsApp, compartilhamento e arte para 100, 120 e 150 números.
- `tests/backup-db.cjs`: permissões no PostgreSQL, privacidade dos dados, atualização atômica, isolamento entre campanhas e preservação de números ocupados/sorteados.
