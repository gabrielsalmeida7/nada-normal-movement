import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const email = valueAfter("--email")?.trim().toLowerCase();
const userId = valueAfter("--id")?.trim();
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar.");
  process.exit(1);
}

if ((!email && !userId) || (email && userId)) {
  console.error("Use exatamente um seletor: --email usuario@exemplo.com ou --id UUID.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  const perPage = 200;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
}

async function main() {
  let user;

  if (userId) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) throw error;
    user = data.user;
  } else {
    user = await findUserByEmail(email);
  }

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      role: "admin",
    },
  });

  if (error) throw error;

  console.log(`Admin promovido: ${user.email ?? user.id}`);
  console.log("Peça ao usuário para sair e entrar novamente para renovar o JWT.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
