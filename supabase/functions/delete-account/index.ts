// Edge Function : suppression de compte (exigence Apple 5.1.1(v) + RGPD art. 17).
// Appelée depuis l'app avec le JWT de l'utilisateur. La service_role reste ICI, côté serveur.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;

  // 1) Identifier l'appelant à partir de SON jwt (jamais d'un user_id envoyé par le client).
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 2) Purger le stockage de l'utilisateur (adapter les buckets).
  for (const bucket of ["avatars"]) {
    const { data: files } = await admin.storage.from(bucket).list(user.id);
    if (files?.length) {
      await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
    }
  }

  // 3) Supprimer chez les sous-traitants (RevenueCat : DELETE /v1/subscribers/{app_user_id}).
  const rcKey = Deno.env.get("REVENUECAT_SECRET_KEY");
  if (rcKey) {
    await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${rcKey}` },
    });
  }

  // 4) Supprimer l'utilisateur : les tables liées en ON DELETE CASCADE suivent.
  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) return json({ error: "delete_failed" }, 500);

  return json({ deleted: true }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
