# Etapa 16 — permitir limpeza administrativa de bilhetes protegidos

## Correção

A trava da Etapa 5 impedia alterar ou excluir bilhetes pagos e bilhetes no histórico, inclusive dentro dos procedimentos administrativos de limpeza/exclusão. A nova migração permite essa operação somente dentro das funções administrativas de limpeza ou exclusão, para a campanha cujo identificador foi validado e apenas durante a instrução autorizada. A proteção continua ativa para qualquer outra alteração ou exclusão.

## Supabase

Aplicar `supabase/migrations/20261028_etapa16_liberar_limpeza_confirmada.sql` no SQL Editor. A migração altera funções e o gatilho de proteção; não atualiza nem exclui registros ao ser aplicada. Depois dela, a limpeza e a exclusão continuam sendo iniciadas no app por um administrador e pela confirmação da campanha selecionada.

## Verificação

`node --check tests/smoke.cjs` e `node tests/smoke.cjs` validam as chamadas da interface e os guardas da migração. Não se executam operações destrutivas em dados reais nos testes locais.
