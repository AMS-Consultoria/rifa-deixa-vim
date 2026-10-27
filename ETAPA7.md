# Etapa 7 — últimos participantes e lista independente

**Estado:** implementação e testes concluídos; publicação no GitHub em andamento.

## Arquivos

- index.html: cartões de participantes recentes e tela independente “Participantes registrados”.
- tests/smoke.cjs: regressão de ordenação, agrupamento, campos de resumo, navegação e privacidade.
- ETAPA7.md: este relatório.

## Implementação

- A tela principal mostra os cinco participantes com movimentação mais recente na campanha atual.
- Cada pessoa aparece uma vez, agrupada pelo identificador de participante. Homônimos com IDs distintos continuam separados.
- Cada cartão mostra todos os números, quantidade vendida e reservada, valores recebidos e pendentes e data/hora da última movimentação.
- A ordenação usa a data de atualização mais recente entre os números da pessoa. Em caso de empate, o maior número vem primeiro.
- “Ver todos os participantes” abre uma página própria, restrita ao administrador, com a lista completa da campanha selecionada. “Voltar” retorna à tela principal.
- A lista detalhada se atualiza após pagamentos e outras alterações. A tela fecha e limpa os dados se o acesso administrativo terminar.
- Busca e filtros não foram incluídos; pertencem à Etapa 8.

## Banco de dados

Nenhuma alteração ou migração foi necessária. A etapa usa o vínculo de participante, situação, pagamento, valor e data de atualização já existentes em cada número. Nenhum registro de produção foi alterado.

## Testes

- node tests/smoke.cjs: aprovado — agrupamento de números, homônimos distintos, cinco mais recentes, campos financeiros, abertura/retorno da tela e limpeza ao sair.
- node tests/access.cjs: aprovado — perfis, login, isolamento e sessão.
- node tests/finance-db.cjs com PGlite: aprovado.
- node tests/participants-db.cjs com PGlite: aprovado.
- node tests/access-db.cjs com PGlite: aprovado.
- git diff --check: aprovado.

A tela pública será conferida após a publicação. A lista administrativa foi validada pelos testes automatizados.

## Backup

Backup do código antes da Etapa 7: outputs/rifa-etapa7-backup-codigo-20261027.zip (SHA-256: 33C073496719547A6874056C18D598FD9693E21F759DB8B1FFB2822E61FF4CDD). Arquivo local, fora do repositório.

## Próxima etapa

Etapa 8: adicionar busca por nome, telefone e número, filtros de situação, edição e fluxos completos na página de participantes.

