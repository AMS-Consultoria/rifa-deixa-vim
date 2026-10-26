# Etapa 2 — Múltiplas Campanhas

## Estado

Migração principal e ajuste de compatibilidade aplicados no Supabase em 26/10/2026, após autorização específica do usuário. Implementação do aplicativo preparada localmente. Publicação no GitHub autorizada pelo usuário em 26/10/2026.

## Implementação

- Seletor de campanhas e entrada “+ Nova Campanha”.
- Configurações como ponto de entrada para editar a campanha selecionada ou criar outra.
- Configurações, bilhetes e histórico vinculados à campanha selecionada.
- Criação de campanha com cartela própria, sem copiar vendas da Campanha 01.
- Login administrativo mantido; RPCs de criação e edição verificam o administrador.
- A mudança dos controles de backup fica para a etapa definida no prompt mestre.

## Banco aplicado

- `supabase/migrations/20261026_etapa2_multiplas_campanhas.sql`: vínculo dos dados existentes à Campanha 01, chave composta de bilhetes, RLS e funções públicas/administrativas.
- `supabase/migrations/20261026_etapa2_compatibilidade_historico.sql`: campanha padrão no histórico para manter a gravação de sorteios pelo aplicativo anterior até sua atualização.
- Nenhuma tabela ou registro foi apagado ou recriado.

## Validação após aplicação

- 1 campanha e 150 bilhetes vinculados à Campanha 01.
- 149 disponíveis, 1 reservado, 0 vendidos e 0 sorteios, como no backup oficial.
- Consulta pública legada e consulta por campanha retornam os 100 números configurados.
- RLS ativa nas quatro tabelas; visitante sem permissão para executar a criação de campanhas.
- App publicado atualizado pelo botão de sincronização: 99 disponíveis, 1 reservado e 0 vendidos.
- Testes locais incluem fluxo legado, criação e seleção com dados simulados, isolamento de campanhas, roleta, histórico e login. A criação de uma campanha real não foi usada como teste no banco de produção.

## Backups

- Código: `outputs/rifa-etapa2-backup-codigo.bundle` e `outputs/rifa-etapa2-backup-codigo.zip`.
- Dados oficiais antes da migração: `outputs/rifa-etapa2-backup-dados-atual-2026-10-26.json`.
- Backup anterior preservado, sem restauração. O usuário confirmou o banco atual como fonte oficial.
- Os backups de dados contêm informações pessoais e permanecem privados.

## Próxima ação

Publicar a atualização autorizada no GitHub e conferir a implantação no GitHub Pages.

