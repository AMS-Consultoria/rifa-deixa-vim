# Etapa 31 — centralizar chave Pix no rodapé

Na arte 9 × 14, a chave Pix agora usa a mesma fonte do número do WhatsApp e fica centralizada na sua metade do rodapé. Chaves longas quebram em até duas linhas, alinhadas pelo centro.

Arquivos para enviar à raiz de `AMS-Consultoria/rifa-deixa-vim`:

- `index.html`
- `tests/smoke.cjs`
- `ETAPA31.md`

Verificação local: `node tests/smoke.cjs` passou, incluindo tamanho da fonte e centralização do conteúdo Pix. Nenhuma alteração no Supabase.

Título do commit: `Etapa 31: centralizar chave Pix na arte`

Descrição: `Ajusta a chave Pix no rodapé dividido da arte: usa o mesmo tamanho de fonte do contato e centraliza a chave na horizontal e na vertical em sua coluna. Sem alterações no Supabase.`
