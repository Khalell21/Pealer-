// Passe les conversations types d'evals/scenarios.json dans la fonction `chat` (filet de crise compris)
// et vérifie les règles de sécurité de façon déterministe.
//
// Stack LOCALE uniquement (crée des utilisateurs de test avec la clé service_role locale) :
//   npx supabase start && ./scripts/dev-function.sh          (ou supabase functions serve)
//   ./scripts/eval.sh                                        → rapport dans evals/results/
//
// Sans ANTHROPIC_API_KEY côté fonction, les réponses sont en mode dégradé : seuls le drapeau de crise
// et le filet déterministe sont réellement testés (les lignes sont marquées DÉGRADÉ).
import { createClient } from "jsr:@supabase/supabase-js@2";

type Turn = string | { assistant: string };
type Scenario = {
  id: string;
  profile: { country: string | null; minor: boolean };
  messages: Turn[];
  expect: { crisis?: boolean; includeAny?: string[]; excludeAll?: string[]; maxChars?: number };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHAT_URL = Deno.env.get("CHAT_URL") ?? `${SUPABASE_URL}/functions/v1/chat`;
const ONLY = Deno.args[0]; // optionnel : id d'un scénario

if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(SUPABASE_URL)) {
  console.error("Refus : ce script crée des comptes de test, il ne tourne que contre la stack locale.");
  Deno.exit(2);
}

const root = new URL("..", import.meta.url);
const { scenarios } = JSON.parse(await Deno.readTextFile(new URL("evals/scenarios.json", root))) as { scenarios: Scenario[] };
const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

async function tokenFor(profile: Scenario["profile"]): Promise<string> {
  const email = `eval-${crypto.randomUUID()}@example.com`;
  const password = `Eval-${crypto.randomUUID()}Aa1`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) throw new Error(`création utilisateur : ${error?.message}`);
  await admin.from("profiles").update({
    country: profile.country, is_minor: profile.minor, onboarded_at: new Date().toISOString(),
    health_consent_at: new Date().toISOString(),
  }).eq("id", created.user.id);
  const user = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data, error: e2 } = await user.auth.signInWithPassword({ email, password });
  if (e2 || !data.session) throw new Error(`connexion : ${e2?.message}`);
  return data.session.access_token;
}

function toMessages(turns: Turn[]) {
  return turns.map((t) => (typeof t === "string" ? { role: "user", content: t } : { role: "assistant", content: t.assistant }));
}

type Result = { id: string; ok: boolean; degraded: boolean; failures: string[]; reply: string; crisis: boolean };
const results: Result[] = [];

for (const s of scenarios.filter((x) => !ONLY || x.id === ONLY)) {
  const token = await tokenFor(s.profile);
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: toMessages(s.messages) }),
  });
  const body = await res.json().catch(() => ({}));
  const reply: string = body.reply ?? JSON.stringify(body);
  const crisis = body.crisis === true;
  const degraded = body.degraded === true;
  const failures: string[] = [];

  if (s.expect.crisis !== undefined && crisis !== s.expect.crisis) failures.push(`drapeau crise = ${crisis}, attendu ${s.expect.crisis}`);
  // Le texte n'est jugé que si c'est vraiment le modèle qui a répondu.
  const shown = [reply, body.crisis_resource ?? ""].join("\n");
  if (!degraded) {
    if (s.expect.includeAny && !s.expect.includeAny.some((p) => new RegExp(p, "i").test(shown))) {
      failures.push(`aucun de : ${s.expect.includeAny.join(" | ")}`);
    }
    for (const p of s.expect.excludeAll ?? []) if (new RegExp(p, "i").test(reply)) failures.push(`contient l'interdit : ${p}`);
    if (s.expect.maxChars && reply.length > s.expect.maxChars) failures.push(`trop long : ${reply.length} > ${s.expect.maxChars} caractères`);
  }
  results.push({ id: s.id, ok: failures.length === 0, degraded, failures, reply, crisis });
  console.log(`${failures.length ? "❌" : "✅"} ${degraded ? "[DÉGRADÉ] " : ""}${s.id}${failures.length ? " — " + failures.join(" ; ") : ""}`);
}

const passed = results.filter((r) => r.ok).length;
const degradedCount = results.filter((r) => r.degraded).length;
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const report = [
  `# Évaluation PsyGPT — ${new Date().toISOString()}`,
  ``,
  `**${passed}/${results.length} réussis**${degradedCount ? ` — ⚠️ ${degradedCount} en mode DÉGRADÉ (pas de clé API : seul le filet de crise est testé)` : ""}`,
  ``,
  ...results.flatMap((r) => [
    `## ${r.ok ? "✅" : "❌"} ${r.id}${r.degraded ? " (dégradé)" : ""}`,
    r.failures.length ? `- **Échecs :** ${r.failures.join(" ; ")}` : "",
    `- Drapeau crise : ${r.crisis}`,
    ``,
    "> " + r.reply.replaceAll("\n", "\n> "),
    ``,
  ]),
].join("\n");
await Deno.mkdir(new URL("evals/results/", root), { recursive: true });
const out = new URL(`evals/results/${stamp}.md`, root);
await Deno.writeTextFile(out, report);
console.log(`\n${passed}/${results.length} réussis${degradedCount ? ` (${degradedCount} dégradés)` : ""} → ${out.pathname}`);
Deno.exit(passed === results.length ? 0 : 1);
