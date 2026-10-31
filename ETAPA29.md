# Etapa 29 — recarregar Pix antes de gerar a arte

Antes de desenhar as imagens da campanha, o aplicativo busca novamente os dados Pix da campanha selecionada. Isso evita que a chave e o tipo fiquem ausentes por dados desatualizados na tela.

Arquivos para enviar à raiz de `AMS-Consultoria/rifa-deixa-vim`:

- `index.html`
- `tests/smoke.cjs`
- `ETAPA29.md`

Verificação local: `node tests/smoke.cjs` passou. Nenhuma alteração no Supabase.

Título do commit: `Etapa 29: recarregar Pix antes de criar arte`

Descrição: `Atualiza os dados Pix da campanha selecionada imediatamente antes de gerar a arte 9 × 14, para que o tipo e a chave cadastrados sejam incluídos na imagem. Sem alterações no Supabase.`
