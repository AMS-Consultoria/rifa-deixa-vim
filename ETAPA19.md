# Etapa 19 — vídeo do sorteio

## O que entrou

- Opção para gravar o vídeo no formulário inicial do sorteio; vem desligada por padrão e a escolha fica salva neste aparelho.
- Vídeo vertical com apresentação de 10 segundos, roleta de 15 segundos e resultado em destaque por mais 3 segundos.
- A apresentação mostra a foto do prêmio armazenada na campanha, o nome do prêmio e o critério do sorteio, com a fala “Agora vamos realizar o sorteio. Boa sorte!”. Sem foto cadastrada, usa o nome do prêmio como abertura.
- O encerramento mostra a saudação ao ganhador identificado, o número sorteado, o nome do ganhador, a foto e o nome do prêmio. Para números sem ganhador confirmado, identifica o resultado sem afirmar que alguém ganhou.
- Depois da gravação, oferece baixar o vídeo WebM ou compartilhar pelo menu do aparelho, quando disponível.
- O fluxo de sorteio e o histórico permanecem como antes. Não foi criada nem alterada nenhuma tabela, função ou dado no Supabase.

## Arquivos desta publicação

- `index.html`
- `tests/smoke.cjs`
- `ETAPA19.md`

## Verificação

Executar `node tests/smoke.cjs`. O teste usa uma foto de prêmio cadastrada e verifica a abertura, o resultado, o download e o compartilhamento.

## Publicação pelo GitHub

Enviar os três arquivos para a raiz do repositório `AMS-Consultoria/rifa-deixa-vim`, substituindo `index.html` e `tests/smoke.cjs` e adicionando `ETAPA19.md`. Usar a mensagem de commit:

`Etapa 19: abertura de 10 segundos no vídeo do sorteio`

Descrição:

`Aumenta a apresentação inicial do vídeo do sorteio para 10 segundos e exibe “Agora vamos realizar o sorteio. Boa sorte!”, mantendo a roleta de 15 segundos e o encerramento aprovado. A abertura e o resultado exibem a foto e o nome do prêmio. Inclui teste automatizado. Sem mudanças no Supabase.`
