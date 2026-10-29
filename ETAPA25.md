# Etapa 25 — aprimorar painel final do vídeo

O painel final do vídeo agora destaca o nome da rifa em fonte maior. Abaixo do prêmio, exibe a data e o horário local em que o resultado foi concluído, no formato `dd/mm/aaaa às hh:mm`.

Arquivos para enviar à raiz de `AMS-Consultoria/rifa-deixa-vim`:

- `index.html`
- `tests/smoke.cjs`
- `ETAPA25.md`

Verificação local: `node tests/smoke.cjs`, incluindo a presença da data e hora e do nome ampliado no painel final. Nenhuma alteração no Supabase.

Título do commit: `Etapa 25: destacar rifa e data no vídeo`

Descrição: `Aumenta e personaliza com o nome da rifa o rodapé do painel final do vídeo. Exibe abaixo do prêmio a data e o horário em que o sorteio foi concluído. Sem alterações no Supabase.`
