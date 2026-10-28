# Etapa 17 — lista única de participantes e navegação para adicionar números

## O que mudou

- Busca e filtros financeiros/de situação controlam uma única lista de participantes, eliminando a repetição visual entre a lista geral e o relatório.
- Os totais financeiros e o CSV continuam disponíveis. A exportação respeita a busca e o filtro escolhidos.
- Cada participante aparece uma vez na lista; nomes iguais com cadastros diferentes permanecem separados para proteger homônimos.
- A ficha mantém a abertura para confirmação e o lembrete pelo WhatsApp quando há reserva pendente e telefone informado.
- Ao adicionar números pela ficha na página de participantes, o app retorna à grade, conserva o cadastro escolhido e reabre a ficha depois de salvar.
- A seleção de campanha reverte para a opção atual se houver sincronização em andamento ou falha ao carregar.
- Limpar dados conserva a campanha selecionada no seletor.

## Verificação

Executados com sucesso:

- `node --check tests/smoke.cjs`
- `node tests/smoke.cjs`

Os testes cobrem a lista unificada e os filtros, lembrete de WhatsApp, cadastro de número a partir da página de participantes, campanha após limpeza e os fluxos existentes das etapas anteriores.

Não há migração SQL nesta etapa. Nenhum dado do Supabase foi alterado.
