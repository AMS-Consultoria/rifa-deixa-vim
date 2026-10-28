# Etapa 12 — aplicativo instalável no Android (PWA)

## O que mudou

- O site continua abrindo pelo link normal e também pode ser instalado pelo botão **Instalar aplicativo** quando o navegador oferece a instalação.
- O manifesto define nome, ícones, escopo do GitHub Pages e modo `standalone`, para abrir sem as barras e abas do navegador.
- O ícone rubi e dourado foi criado em PNG nos tamanhos exigidos para Android, com variação adaptável e ícone da tela inicial do iOS.
- O service worker deixa as navegações online consultarem a versão mais recente do site em cada abertura/atualização. Ele não grava nem intercepta chamadas do Supabase; os dados da campanha continuam vindo do banco.
- Se uma versão nova do service worker for ativada, a tela recarrega para aplicar os arquivos novos. A página comum continua funcionando no navegador.

## Instalar no Android

1. Abra o site atualizado no Chrome do Android.
2. Toque em **Instalar aplicativo**. Se o botão não abrir o aviso do navegador, use o menu ⋮ do Chrome e escolha **Instalar aplicativo** ou **Adicionar à tela inicial**.
3. Confirme. O ícone Rifa Deixa Vim aparecerá junto aos aplicativos do Android.

É necessário estar conectado à internet para acessar campanhas e salvar alterações no Supabase. Atualizações publicadas serão carregadas ao abrir ou atualizar o app; se ele já estiver aberto durante uma publicação, feche e abra novamente ou atualize a página.

## Arquivos e teste

- `manifest.webmanifest`
- `sw.js`
- `icons/rifa-192.png`, `icons/rifa-512.png`, `icons/rifa-maskable-512.png` e `icons/apple-touch-icon.png`
- Execute `node tests/smoke.cjs` para validar instalação, nome/escopo, ícones, prompt de instalação, atualização de navegação e os fluxos anteriores.
