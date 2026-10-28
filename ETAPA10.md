# Etapa 10 — Foto do prêmio na campanha e arte separada

## Entrega

- O formulário **Configurações > Editar campanha** permite selecionar JPG, PNG ou WebP de até 8 MB e mostra uma prévia antes de salvar.
- A foto fica no Supabase Storage em bucket privado, associada ao identificador da campanha. Apenas uma sessão administrativa autorizada pode consultar ou substituir a imagem.
- A arte da campanha mantém o formato 1080 × 1680 (9:14), os contadores, as páginas numeradas em blocos de até 100 e o WhatsApp de contato. Quando a foto está cadastrada, o gerador acrescenta uma arte vertical independente do prêmio e inclui todas as imagens na mesma ação de compartilhamento pelo WhatsApp.
- O texto do critério de sorteio fica centralizado horizontal e verticalmente dentro da faixa, com espaço entre o prêmio, a faixa e os contadores. A foto separada do prêmio é desenhada sem moldura ou fundo. Na prévia, a navegação usa botões anterior/próxima com o mesmo tamanho e exibe apenas “Imagem 1/3”, centralizado entre eles.
- Sem foto cadastrada, o aplicativo continua gerando e compartilhando apenas as páginas com números.

## Aplicação no Supabase

Arquivo: `supabase/migrations/20261027_etapa10_imagem_premio_storage.sql`.

Antes de usar o upload, abra o SQL Editor do projeto Supabase de produção, cole o conteúdo dessa migração e execute. Ela configura o bucket privado `rifa-premios` (limite de 8 MB e tipos de imagem permitidos) e as políticas de acesso por administrador e campanha. Não cria, apaga nem altera tabelas ou registros das rifas. As políticas de Storage com os mesmos nomes são substituídas para permitir reexecução segura.

## Publicação no GitHub

Depois de enviar `index.html`, `ETAPA10.md`, `tests/smoke.cjs` e a migração SQL para a branch de publicação do repositório, aguarde o GitHub Pages atualizar. A foto só poderá ser salva depois que a migração do Storage estiver aplicada.

## Verificação local

Execute `node tests/smoke.cjs`. O teste cobre a posição vertical do critério, as artes para campanhas de 100, 120, 150 e 200 números, a seleção e gravação simulada da foto, a geração da arte do prêmio sem borda/fundo, o indicador Imagem 1/3, os botões de mesmo tamanho e o compartilhamento conjunto das cartelas e da foto. A migração também é conferida para bucket privado, limite/tipos e políticas de administrador/campanha, sem comandos de exclusão de tabelas ou dados.
