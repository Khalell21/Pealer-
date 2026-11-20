import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// ✅ Uniquement des valeurs PUBLIQUES (URL + clé anon). Aucun secret dans l'app.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// En local, une fonction peut tourner hors conteneur (scripts/dev-chat.sh) : URL surchargeable.
export const CHAT_URL = process.env.EXPO_PUBLIC_CHAT_URL || `${FUNCTIONS_URL}/chat`;
export const DELETE_ACCOUNT_URL = process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL || `${FUNCTIONS_URL}/delete-account`;
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || "";
export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

export type Profile = {
  country: string | null;
  is_minor: boolean;
  onboarded_at: string | null;
  health_consent_at: string | null;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatReply = {
  reply?: string;
  crisis?: boolean;
  crisis_resource?: string;
  degraded?: boolean;
  error?: string;
};

export async function callFunction<T>(url: string, body: unknown): Promise<{ status: number; data: T }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
}
