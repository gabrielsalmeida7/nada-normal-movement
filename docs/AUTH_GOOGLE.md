# Login com Google (Supabase)

O login com Google **não causa problema no banco**: o Supabase usa a mesma tabela `auth.users` e o mesmo `profiles` (por `auth.uid()`). O usuário pode se cadastrar por email/senha ou por Google; o perfil é criado pelo trigger ao primeiro login.

## Como ativar no Supabase

1. No **Dashboard** do projeto: **Authentication** → **Providers** → **Google**.
2. Ative o provider e preencha **Client ID** e **Client Secret** do Google Cloud Console.
3. Em **Redirect URL**, use a URL que o Supabase mostra (ex.: `https://xxx.supabase.co/auth/v1/callback`) e cadastre essa mesma URL no Google (em "URIs de redirecionamento autorizados").
4. No Google Cloud Console, crie credenciais do tipo **OAuth 2.0 – ID do cliente** (aplicativo da Web) e use a redirect URL do Supabase.

Depois de salvar, os botões "Entrar com Google" e "Cadastrar com Google" no site passam a funcionar.

## Confirmação de email

Se em **Authentication** → **Providers** → **Email** a opção **Confirm email** estiver ativada:

- Cadastro por **email/senha**: o usuário só consegue entrar depois de clicar no link enviado por email.
- Cadastro por **Google**: o usuário já entra na hora (o Google confirma o email).

Para testes sem enviar email, você pode desativar **Confirm email** temporariamente no Supabase.
