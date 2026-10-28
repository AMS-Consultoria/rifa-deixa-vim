# Etapa 15 — padrão visual para voltar, fechar e cancelar

## O que mudou

- Botões secundários de navegação, cancelamento e fechamento agora compartilham altura, alinhamento, espaçamento e acabamento.
- A seta para a esquerda identifica **Voltar** e **Voltar à rifa**.
- O X identifica **Cancelar**, **Fechar ficha** e ações de saída dos diálogos.
- Os rótulos existentes foram mantidos para deixar claro o efeito de cada ação.
- Os ícones são decorativos e ocultos da leitura assistiva; os nomes dos botões continuam acessíveis.

## Banco e verificação

Não requer migração do Supabase. `node --check tests/smoke.cjs` e `node tests/smoke.cjs` verificam que os botões de navegação usam os ícones e rótulos corretos junto com os fluxos existentes.
