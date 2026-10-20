# Confirmação de email e templates no Supabase

## Trocar o texto do email de confirmação (menos genérico)

1. No **Dashboard** do Supabase: **Authentication** → **Email Templates**.
2. Selecione o template **Confirm signup**.
3. Edite o **Subject** e o **Body** (HTML). Você pode usar as variáveis que o Supabase oferece, por exemplo:
   - `{{ .ConfirmationURL }}` – link de confirmação
   - `{{ .Email }}` – email do usuário
   - `{{ .SiteURL }}` – URL do seu site (configurada em Authentication → URL Configuration)

### Exemplo de texto em português (Subject + Body)

**Assunto sugerido:**  
`Confirme seu email – Nada Normal Movement`

**Corpo sugerido (versão simples em texto):**

```html
<h2>Bem-vindo ao Nada Normal Movement</h2>
<p>Clique no link abaixo para confirmar seu email e ativar sua conta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar meu email</a></p>
<p>Se você não se cadastrou, pode ignorar esta mensagem.</p>
<p>— Nada Normal Movement</p>
```

Salve o template. Os próximos emails de confirmação usarão esse texto.

---

## Desativar a confirmação de email

- Em **Authentication** → **Providers** → **Email**: desmarque **Confirm email**.
- Efeito: após se cadastrar, o usuário já fica logado (não precisa clicar em nenhum link).

### Do ponto de vista de segurança, é um problema?

- **Não é “quebrar” a segurança do login:** o Supabase continua autenticando com email/senha ou OAuth. Desativar a confirmação só muda o fluxo depois do cadastro.
- **O que você perde ao desativar:**
  - Garantia de que o email é real e que o usuário tem acesso a ele (alguém pode cadastrar um email alheio).
  - Menos certeza de que os emails de pedido/recuperação vão para um endereço válido.
- **O que você ganha:**
  - Menos atrito: usuário usa o site na hora, sem depender de link no email.
  - Evita problemas de link expirado (`otp_expired`) ou usuário não achando o email.

Para loja pequena / MVP, muitas pessoas deixam a confirmação **desativada** e ativam depois se quiserem garantir melhor o email. Você pode desativar sem criar outro tipo de problema de segurança no auth.

---

## Link de confirmação expirado

Se o usuário clicar no link depois do prazo (ou o link já tiver sido usado), o Supabase redireciona para a URL configurada com erro no hash, por exemplo:

`http://localhost:8080/#error=access_denied&error_code=otp_expired&error_description=...`

O app trata esse caso: mostra um toast com a mensagem **“Link de confirmação expirou ou já foi usado”** e um botão **“Ir para Login”**, e remove o hash da URL. O usuário pode fazer login (se já tiver confirmado antes) ou pedir um novo link (por exemplo, “Esqueci minha senha” ou novo cadastro, conforme o fluxo do Supabase).
