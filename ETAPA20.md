# Etapa 20 — corrigir fidelidade do vídeo do sorteio

## Problema encontrado

O relógio dos 15 segundos era iniciado antes da apresentação de 10 segundos. Quando a roleta aparecia, o progresso já estava adiantado. A arte gravada também não desenhava a barra de progresso e o WebM enviado pelo usuário tinha linha de tempo de aproximadamente 8,4 segundos.

## Correção

- A gravação começa quando a preparação termina, sem contar a demora da rede ou da escolha do usuário.
- A foto do prêmio e a apresentação ficam visíveis no aplicativo e no vídeo durante 10 segundos, com contagem e barra animada.
- A roleta inicia seu próprio relógio depois da apresentação e dura 15 segundos completos.
- Número, tempo restante e progresso do vídeo usam os mesmos valores da roleta exibida no aplicativo.
- Uma faixa de áudio silenciosa mantém a linha de tempo ativa também nos trechos sem som; o som escolhido para a roleta continua incluído.
- A gravação tenta MP4 antes de WebM. O download e o compartilhamento usam a extensão verdadeira do arquivo. Se o navegador não gravar MP4, o aplicativo avisa que o WebM pode não ser aceito como vídeo no WhatsApp.
- O encerramento aprovado permanece com 3 segundos.

## Arquivos para enviar

- `index.html`
- `tests/smoke.cjs`
- `ETAPA20.md`

## Verificação

`node tests/smoke.cjs` passou com a apresentação, o começo da roleta após 10 segundos, o progresso inicial em zero, resultado e saída MP4 simulada. O teste com navegador real não pôde ser executado no ambiente local porque o Edge em modo automatizado encerrou ao abrir. Depois da publicação, verificar um sorteio de teste no aparelho: apresentação de 10 segundos, roleta de 15 segundos, encerramento de 3 segundos, barra avançando e arquivo MP4 quando o navegador oferecer suporte.
