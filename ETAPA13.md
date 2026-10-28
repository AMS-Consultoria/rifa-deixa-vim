# Etapa 13 — Prestação de contas da campanha

## O que foi incluído

- Painel administrativo na área de participantes, respeitando a campanha selecionada.
- Totais de valores recebidos, pendentes e comprometidos, calculados a partir dos números já carregados.
- Filtros para reservas pendentes, pagamentos recebidos e todos os participantes.
- Atalho para abrir a ficha do participante e confirmar pagamentos pelo fluxo administrativo já existente.
- Lembrete de cobrança por WhatsApp com texto pronto e confirmação final feita pela pessoa administradora.
- Exportação CSV dos resultados do filtro atual, com compatibilidade com planilhas em português.
- Dados do painel apagados ao encerrar/perder o acesso administrativo.
- Reservas não são liberadas automaticamente. A liberação continua uma ação manual na ficha.

## Banco de dados e publicação

Esta etapa usa as informações que o aplicativo já consulta no Supabase. Não cria, apaga ou altera tabelas, registros, funções ou permissões; não exige migração SQL.

## Verificação

`node --check tests/smoke.cjs` e `node tests/smoke.cjs` passaram. O teste cobre totais, filtros, formatação do link do WhatsApp, criação do CSV e limpeza do painel quando o acesso administrativo termina.
