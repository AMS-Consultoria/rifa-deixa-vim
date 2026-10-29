# Etapa 24 — corrigir compartilhamento do vídeo

O compartilhamento agora envia os arquivos MP4/WebM com o tipo MIME simples, sem a lista de codecs que podia ser recusada pelo Android. O botão aparece sempre que o aparelho oferece o menu nativo de compartilhamento. Se o aparelho rejeitar o arquivo, o aplicativo baixa o vídeo para que possa ser anexado manualmente no WhatsApp.

Arquivos para enviar à raiz de `AMS-Consultoria/rifa-deixa-vim`:

- `index.html`
- `tests/smoke.cjs`
- `ETAPA24.md`

Verificação local: `node tests/smoke.cjs`, incluindo o tipo MIME recebido pelo compartilhamento simulado.

Título do commit: `Etapa 24: corrigir compartilhamento do vídeo`

Descrição: `Normaliza o tipo MIME dos arquivos de vídeo no compartilhamento nativo para melhorar o suporte no Android. Mantém o botão disponível quando há compartilhamento nativo e baixa o vídeo como alternativa caso o aparelho recuse o arquivo. Sem mudanças no Supabase.`
