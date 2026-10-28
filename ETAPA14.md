# Etapa 14 — limpeza e exclusão segura de campanha

## O que mudou

- O botão de configurações no topo agora mostra somente a engrenagem, com rótulo acessível.
- As duas colunas do cabeçalho do aplicativo e da arte seguem o mesmo alinhamento: a segunda coluna fica à direita. O separador vertical da arte foi removido.
- A condição antiga “números preenchidos” é exibida como “números vendidos”, mantendo o critério cadastrado na campanha.
- **Limpar dados da campanha** reinicia os bilhetes, remove compradores e vínculos de acesso, zera reservas e pagamentos e apaga o histórico de sorteios. Mantém a campanha e suas configurações.
- **Excluir campanha definitivamente** apaga a campanha selecionada e seus dados, mantendo as outras campanhas e as contas de acesso. O sistema impede excluir a última campanha.
- Ambas as operações exigem sessão administrativa e a digitação exata do nome da campanha. As verificações também são feitas no banco.
- Participantes que ainda têm números em outras campanhas e seus dados não são removidos.

## Aplicação no Supabase

Aplicar `supabase/migrations/20261028_etapa14_limpar_excluir_campanha.sql` no SQL Editor do projeto. A migração adiciona duas funções administrativas e uma política limitada para apagar fotos do prêmio. Não recria tabelas nem apaga dados existentes ao ser aplicada.

As operações de limpeza e exclusão só removem dados depois de uma ação iniciada pelo administrador no aplicativo.

## Verificação

`node --check tests/smoke.cjs` e `node tests/smoke.cjs` cobrem a confirmação digitada, as duas chamadas de função, a seleção segura da próxima campanha, o cabeçalho e a política/funções da migração. Nenhum dado real do Supabase é alterado pelos testes.
