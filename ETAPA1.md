# Etapa 1 — Configurações

A página de Configurações foi preparada em `index.html`, exclusiva do administrador. Permite editar entidade, campanha, rifa, prêmio, quantidade, preço, critério e situação. O título e o resumo do aplicativo passam a usar a configuração do banco. A interface consulta bilhetes em páginas de 500 para comportar até 10.000 números.

## Banco

A migração `supabase/migrations/20261025_etapa1_configuracoes.sql` foi aplicada ao projeto Supabase **Rifa Deixa Vim** (`bxiugnskskzhigyguyqp`) em 26/10/2026, após autorização do usuário. Ela criou `rifa_configuracoes`, ampliou a restrição de número de 100 para 10.000, e criou as funções `rifa_salvar_configuracoes` e `rifa_estado_publico`. Não apagou nem recriou `rifa_numeros` ou `rifa_sorteios`.

Antes e depois: 100 bilhetes, 5 vendidos, 1 reservado, R$ 25,00 recebidos e nenhum sorteio salvo. A configuração inicial preserva os nomes e valores existentes. O backup de dados anterior à migração está na pasta `outputs` da tarefa e contém informações pessoais.

RLS está ativo em `rifa_configuracoes`. `anon` pode ler, mas não atualizar a tabela nem executar a função de gravação. `authenticated` pode chamar a função; ela verifica a presença do usuário em `rifa_administradores`. A função pública devolve apenas número, situação e total recebido.

## Verificações

- `node tests/smoke.cjs`: passou, incluindo configurações, redução inválida, preço histórico preservado, paginação com 1.100 bilhetes e funcionalidades anteriores.
- `git diff --check`: sem erros de whitespace.
- SQL Editor: migração concluída; nova restrição até 10.000 conferida; ACL/RLS conferidos; função pública retornou 100 números e total R$ 25,00.
- Função de gravação executada em transação de teste com `ROLLBACK`, sem persistir alterações.
- Aplicativo atualmente publicado permaneceu sincronizado após a migração.

A prévia local no navegador não ficou acessível neste ambiente. Após a implantação no GitHub Pages, confirmar visualmente a nova página e o fluxo administrativo.
