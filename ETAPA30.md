# Etapa 30 — dividir a faixa Pix e WhatsApp

A faixa inferior da arte 9 × 14 agora fica dividida em duas colunas iguais quando há chave Pix: WhatsApp em uma metade e tipo/chave Pix na outra. Chaves longas podem ocupar até duas linhas. Sem chave Pix, o WhatsApp continua centralizado na faixa inteira.

Arquivos para enviar à raiz de `AMS-Consultoria/rifa-deixa-vim`:

- `index.html`
- `tests/smoke.cjs`
- `ETAPA30.md`

Verificação local: `node tests/smoke.cjs` passou, incluindo a separação das duas informações. Nenhuma alteração no Supabase.

Título do commit: `Etapa 30: dividir rodapé da arte Pix e WhatsApp`

Descrição: `Divide a faixa inferior da arte em duas metades para exibir WhatsApp e chave Pix lado a lado, com o tipo da chave e quebra de linha para chaves longas. Sem alterações no Supabase.`
