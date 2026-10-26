# Etapa 3 — Login e controle de acesso

Etapa implementada e testada. Migração aplicada no Supabase em 26/10/2026 após autorização. Cadastro direto sem confirmação de e-mail autorizado e ativado. Publicação da implementação autorizada pelo usuário.

## Arquivos

- `index.html`: tela inicial, cadastro por usuário, entrada, perfis, sessões, consulta própria e vínculo administrativo de contas/números.
- `supabase/migrations/20261026_etapa3_acesso.sql`: cadastro de identificadores, vínculos, RLS, funções e triggers.
- `tests/smoke.cjs`: adaptação do ambiente de regressão ao listener de autenticação.
- `tests/access.cjs`: cenários isolados de acesso e falhas.
- `tests/access-db.cjs`: testes de integração em PostgreSQL temporário.
- `ETAPA3.md`: relatório.

## Funcionalidades

- Tela inicial com Entrar, Criar usuário e Continuar como visitante.
- Cadastro por nome de usuário e senha. Login de 3 a 30 caracteres, letras, números e sublinhado; começa com letra e ignora maiúsculas.
- Senha individual com pelo menos 12 caracteres, letras e números. O cadastro não oferece escolha de perfil administrativo.
- O administrador existente mantém sua conta e pode continuar entrando com seu acesso anterior.
- Administrador mantém gerenciamento completo; usuário consulta campanhas e somente seus números vinculados; visitante consulta informações públicas sem dados pessoais.
- Sessão válida restaurada; saída em outra aba, troca de conta, expiração e falhas limpam os dados privados.
- Saída incompleta mantém botão visível para tentar novamente e bloqueia troca de modo.
- Administrador pode vincular um usuário cadastrado a um número ocupado; o vínculo só concede consulta e não altera participante ou pagamento.
- Liberação do número ou mudança de pessoa/telefone retira o acesso antigo. Confirmação de pagamento sem troca de pessoa preserva o vínculo.
- Cadastro único de participantes e seleção de vários números permanecem nas Etapas 4 e 5.

## Banco e autenticação

Criadas `rifa_usuarios` e `rifa_acessos_numeros`, com RLS e sem senhas. Senhas permanecem exclusivamente no Supabase Auth. Identificadores de login são registrados por trigger na transação de criação da conta, com unicidade. Uma trigger impede desalinhar o identificador do Auth e o login.

Como Supabase Auth usa e-mail ou telefone internamente, o app transforma nomes de usuário em identificadores internos no domínio reservado `rifa-deixa-vim.invalid`. Esses identificadores não representam caixas postais e não são solicitados ao usuário. A confirmação por e-mail foi desligada conforme pedido. Recuperação por e-mail não está disponível para essas contas de login; essa etapa não adiciona recuperação de senha.

O perfil administrativo continua definido exclusivamente em `rifa_administradores`; metadados enviados no cadastro não concedem acesso. A consulta própria usa `auth.uid()` e não recebe um usuário escolhido pelo cliente. Visitantes não podem consultar cadastros de login ou conceder vínculos.

Comparação exata com o backup após a migração: configurações, 150 bilhetes, sorteios, campanhas e administrador permanecem idênticos. Uma campanha; 149 números disponíveis, uma reserva, nenhuma venda e nenhum sorteio. Nenhum usuário fictício foi criado no Supabase.

## Testes e resultados

- `node tests/smoke.cjs`: aprovado; campanhas, configurações, roleta de 15 segundos, modos, ganhador, histórico e login existentes.
- `node tests/access.cjs`: aprovado; visitante, usuário, administrador, cadastro por login, senha/confirmacão inválidas, sessão automática, consulta própria, negação de ações administrativas, falhas de rede/logout, vínculo explícito, saída em outra aba e resposta de autenticação atrasada.
- `tests/access-db.cjs` com PGlite 0.5.12 em memória: aprovado; execução da migração, nomes únicos e reservados, identificação imutável, preservação dos bilhetes, RLS, bloqueio de autoatribuição, isolamento de contas/campanhas e revogação/preservação de vínculos nas situações previstas.
- Para reproduzir o teste SQL, usar PGLITE_MODULE apontando para o módulo `@electric-sql/pglite` em um ambiente de desenvolvimento. A biblioteca não é dependência do app publicado.
- `git -c core.whitespace=cr-at-eol diff --check`: aprovado.
- SQL Editor de produção: migração concluída, RLS ativa, função de vínculo negada a visitante e comparação exata com backup aprovada.
- Prévia separada sem conexão com Supabase: padrao / 123 entrou como Usuário, mostrou somente os números fictícios 07 pago e 14 reservado e não ofereceu funções administrativas. A senha fraca existe apenas nesse ambiente de teste separado.
- Prévia inicial anterior conferida em largura de celular e prévia de teste atual em largura de computador. Layout preservado.
- Não foram criadas contas reais para testar cadastros. O teste completo com novas contas reais fica para o uso autorizado no aplicativo publicado.

## Backups

- `outputs/rifa-etapa3-backup-codigo.zip`: código anterior à etapa, incluindo ajuste de altura dos controles.
- `outputs/rifa-etapa3-backup-codigo.bundle`: histórico anterior.
- `outputs/rifa-etapa3-backup-dados-2026-10-26.json`: backup de dados exportado imediatamente antes da migração; privado.
- `outputs/rifa-etapa3-verificacao-dados.json`: resultado da comparação posterior, sem dados pessoais.
- Versões anteriores à troca de e-mail por usuário preservadas em `outputs/rifa-etapa3-antes-login-usuario.html` e `.sql`.

## Ambiente de teste

A prévia padrao / 123 fica fora do repositório, em `work/rifa-etapa3-teste`, e usa exclusivamente dados fictícios e um cliente de autenticação simulado. Não é publicada nem usa chave ou sessão do Supabase real. Login automático compartilhado não é usado.

## Próxima etapa

Etapa 4 — Cadastro único de participantes, após aprovação do usuário para continuar.

## Referências

- [Supabase Auth com senha](https://supabase.com/docs/guides/auth/passwords).
- [Eventos de autenticação](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).
- [Validação de formato usada pelo Supabase Auth](https://github.com/supabase/auth/blob/master/internal/api/mail.go).
