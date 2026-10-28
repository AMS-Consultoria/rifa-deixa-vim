# Etapa 11 — escolha visual da situação do número

## Entrega

- Nos formulários de cadastro de um número e de vários números, a situação é escolhida por dois botões: **Reservado** (laranja) e **Vendido** (verde).
- O botão selecionado mostra ✓, borda de destaque e estado acessível `aria-pressed`. Ao escolher o outro, o destaque e o ✓ mudam junto.
- As ações existentes continuam salvando os valores `reservado` ou `vendido`; as regras de pagamento, permissões e acesso administrativo permanecem as mesmas.
- Quando o fluxo obriga a situação (por exemplo, reservar números), os botões ficam desabilitados de acordo com a regra atual.

## Verificação

Execute `node tests/smoke.cjs`. O teste verifica o estado inicial, a troca do ✓ entre os botões e a sincronização dos valores nos formulários individual e em lote, além dos fluxos já cobertos das etapas anteriores.
