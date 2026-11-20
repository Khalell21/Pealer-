// Edge Function : conversation PSAI.
// - Le system prompt est un SECRET serveur (PSAI_SYSTEM_PROMPT) : jamais dans le bundle de l'app.
// - Sans état : l'historique reste sur l'appareil, rien n'est stocké ni loggé ici (données de santé, RGPD art. 9).
// - Filet de crise déterministe en plus des consignes du prompt.
import Anthropic from "npm:@anthropic-ai/sdk@1.10.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { crisisResource, isHighRisk, safeFallbackReply } from "../_shared/crisis.ts";

const MODEL = "claude-opus-5-5";
const MAX_TURNS = 60;            // messages d'historique acceptés
const MAX_CHARS_PER_MSG = 8000;

// Sans clé : l'app reste utilisable en mode dégradé (message sûr + ressource de crise).
const anthropic = Deno.env.get("ANTHROPIC_API_KEY") ? new Anthropic() : null;

// Prompt système en base64 (PSAI_SYSTEM_PROMPT_B64) pour survivre aux fichiers .env et à `secrets set`.
const SYSTEM_PROMPT = decodePrompt();

function decodePrompt(): string {
  const b64 = Deno.env.get("PSAI_SYSTEM_PROMPT_B64");
  if (b64) return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
  return Deno.env.get("PSAI_SYSTEM_PROMPT") ?? "";
}

// Quota gratuit par jour (0 = illimité). Le prix n'est pas encore fixé : réglable sans redéployer le code.
const FREE_MESSAGES_PER_DAY = Number(Deno.env.get("FREE_MESSAGES_PER_DAY") ?? "0");

type ChatBody = { messages: Anthropic.MessageParam[] };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SYSTEM_PROMPT) return json({ error: "server_misconfigured" }, 500);

  // 1) Utilisateur authentifié uniquement (le JWT, jamais un id envoyé par le client).
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  // 2) Validation stricte de l'entrée.
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const messages = sanitize(body.messages);
  if (!messages) return json({ error: "invalid_messages" }, 400);
  // Pays et statut mineur lus en base (déclarés à l'onboarding), pas envoyés par l'app à chaque appel.
  const { data: profile } = await supabase.from("profiles").select("country, is_minor").eq("id", user.id).single();
  const country: string | undefined = profile?.country ?? undefined;
  const minor = profile?.is_minor === true;

  // Compteur d'usage (sans contenu), côté serveur.
  const { data: usage, error: usageError } = await supabase.rpc("record_message").single<{ messages_today: number; active_days_30d: number }>();
  if (usageError || !usage) return json({ error: "usage_unavailable" }, 500);

  const lastUser = textOf(messages[messages.length - 1]);
  const highRisk = isHighRisk(lastUser);

  // 3) Contexte opérateur variable APRÈS le prompt fixe (le prompt fixe reste en cache).
  // Le quota ne bloque JAMAIS un message de crise.
  if (FREE_MESSAGES_PER_DAY > 0 && usage.messages_today > FREE_MESSAGES_PER_DAY && !highRisk) {
    // TODO RevenueCat : vérifier l'entitlement côté serveur avant de refuser.
    return json({ error: "quota_reached", crisis_resource: crisisResource(country, minor) }, 402);
  }

  const context: string[] = [
    `Pays de l'utilisateur : ${country ?? "inconnu"}. Ressources à utiliser en cas de crise : ${crisisResource(country, minor)}`,
  ];
  if (minor) context.push("L'utilisateur a déclaré être mineur : module adolescents actif, de façon permanente.");
  if (usage.active_days_30d >= 20) {
    context.push(`L'utilisateur a utilisé l'app ${usage.active_days_30d} jours sur les 30 derniers : applique le garde-fou de prévention de la dépendance.`);
  }
  if (highRisk) context.push("Signal de risque élevé détecté dans le dernier message : applique le protocole de crise.");

  if (!anthropic) {
    console.error("anthropic_key_missing");
    return json({ reply: safeFallbackReply(country, minor), crisis: highRisk, degraded: true }, 200);
  }

  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      cache_control: { type: "ephemeral" }, // met aussi l'historique en cache (coût ÷ ~10 sur la partie relue)
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: context.join("\n") },
      ],
      messages,
    });

    if (response.stop_reason === "refusal") {
      return json({ reply: safeFallbackReply(country, minor), crisis: true }, 200);
    }
    let reply = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    if (!reply) reply = safeFallbackReply(country, minor);

    // Filet déterministe : en cas de risque élevé, la ressource est TOUJOURS affichée par l'app.
    return json({ reply, crisis: highRisk, crisis_resource: highRisk ? crisisResource(country, minor) : undefined }, 200);
  } catch (err) {
    // Ne jamais logger le contenu de la conversation.
    const status = err instanceof Anthropic.APIError ? err.status : "network";
    console.error("anthropic_error", status);
    return json({ reply: safeFallbackReply(country, minor), crisis: highRisk, degraded: true }, 200);
  }
});

function sanitize(input: unknown): Anthropic.MessageParam[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: Anthropic.MessageParam[] = [];
  for (const m of input.slice(-MAX_TURNS)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    out.push({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MSG) });
  }
  // L'API exige que la conversation commence et se termine par un message utilisateur ici.
  while (out.length && out[0].role !== "user") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}

function textOf(m: Anthropic.MessageParam): string {
  return typeof m.content === "string" ? m.content : "";
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
