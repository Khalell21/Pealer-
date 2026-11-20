import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { crisisResource, emergencyNumber } from "./src/crisis";
import {
  CHAT_URL,
  DELETE_ACCOUNT_URL,
  PRIVACY_URL,
  TERMS_URL,
  callFunction,
  supabase,
  type ChatReply,
  type ChatTurn,
  type Profile,
} from "./src/supabase";

const APP_NAME = "PsyGPT";

const GREETING =
  "Bonjour. Je suis PsyGPT, une IA d'écoute — pas un professionnel de santé. " +
  "C'est un espace pour parler de ce que tu traverses, sans jugement et à ton rythme. " +
  "Tu peux commencer par le début, ou simplement par ce qui est là maintenant. Je t'écoute.";

const COUNTRIES: { code: string | null; label: string }[] = [
  { code: "FR", label: "France" }, { code: "BE", label: "Belgique" }, { code: "CH", label: "Suisse" },
  { code: "LU", label: "Luxembourg" }, { code: "CA", label: "Canada" }, { code: "DE", label: "Allemagne" },
  { code: "AT", label: "Autriche" }, { code: "ES", label: "Espagne" }, { code: "IT", label: "Italie" },
  { code: "PT", label: "Portugal" }, { code: "NL", label: "Pays-Bas" }, { code: "IE", label: "Irlande" },
  { code: "GB", label: "Royaume-Uni" }, { code: "DK", label: "Danemark" }, { code: "SE", label: "Suède" },
  { code: "NO", label: "Norvège" }, { code: "FI", label: "Finlande" }, { code: "PL", label: "Pologne" },
  { code: "US", label: "États-Unis" }, { code: "AU", label: "Australie" }, { code: "NZ", label: "Nouvelle-Zélande" },
  { code: null, label: "Autre pays" },
];

type Screen = "loading" | "welcome" | "auth" | "profile" | "chat" | "settings";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");
  const [consented, setConsented] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("country, is_minor, onboarded_at, health_consent_at")
      .single<Profile>();
    setProfile(data);
    setScreen(data?.onboarded_at ? "chat" : "profile");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setScreen("welcome");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setScreen("welcome");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadProfile();
  }, [session, loadProfile]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          <View style={styles.headerActions}>
            {session && profile?.onboarded_at && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setScreen(screen === "settings" ? "chat" : "settings")}
                style={styles.headerLink}
              >
                <Text style={styles.headerLinkText}>{screen === "settings" ? "Retour" : "Réglages"}</Text>
              </Pressable>
            )}
            {/* Toujours visible, jamais derrière un paywall. */}
            <Pressable accessibilityRole="button" onPress={() => setShowEmergency((v) => !v)} style={styles.sos}>
              <Text style={styles.sosText}>Aide urgente</Text>
            </Pressable>
          </View>
        </View>

        {showEmergency && <EmergencyPanel country={profile?.country ?? undefined} minor={profile?.is_minor ?? false} />}

        {screen === "loading" && <ActivityIndicator style={{ marginTop: 48 }} />}
        {screen === "welcome" && (
          <Welcome consented={consented} setConsented={setConsented} onContinue={() => setScreen("auth")} />
        )}
        {screen === "auth" && <Auth onBack={() => setScreen("welcome")} />}
        {screen === "profile" && session && <ProfileSetup userId={session.user.id} onDone={loadProfile} />}
        {screen === "chat" && profile && <Chat profile={profile} />}
        {screen === "settings" && profile && <Settings profile={profile} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function EmergencyPanel({ country, minor }: { country?: string; minor: boolean }) {
  return (
    <View style={styles.emergency} accessibilityRole="alert">
      <Text style={styles.emergencyText}>{crisisResource(country, minor)}</Text>
      <Pressable accessibilityRole="button" style={styles.callButton} onPress={() => Linking.openURL(`tel:${emergencyNumber(country)}`)}>
        <Text style={styles.callButtonText}>Appeler le {emergencyNumber(country)}</Text>
      </Pressable>
    </View>
  );
}

function Welcome(props: { consented: boolean; setConsented: (v: boolean) => void; onContinue: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Un espace pour parler, à ton rythme.</Text>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Avant de commencer</Text>
        <Text style={styles.body}>• Tu parles à une intelligence artificielle, pas à un humain ni à un professionnel de santé.</Text>
        <Text style={styles.body}>• PsyGPT ne pose pas de diagnostic et ne remplace pas un suivi médical ou psychologique.</Text>
        <Text style={styles.body}>• En cas de danger, le bouton « Aide urgente » en haut est toujours disponible.</Text>
        <Text style={styles.body}>• Tes conversations restent sur ton appareil : nous ne les stockons pas.</Text>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: props.consented }}
        onPress={() => props.setConsented(!props.consented)}
        style={styles.checkRow}
      >
        <View style={[styles.checkbox, props.consented && styles.checkboxOn]} />
        <Text style={[styles.body, { flex: 1 }]}>
          J'accepte que mes messages, qui peuvent contenir des informations sur ma santé, soient traités par
          l'IA pour me répondre, sans être conservés. Je peux retirer ce consentement en supprimant mon compte.
        </Text>
      </Pressable>
      <LegalLinks />
      <PrimaryButton label="Continuer" disabled={!props.consented} onPress={props.onContinue} />
    </ScrollView>
  );
}

function LegalLinks() {
  const open = (url: string, name: string) =>
    url ? Linking.openURL(url) : Alert.alert(name, "Document à rédiger avant la mise en ligne.");
  return (
    <View style={styles.legal}>
      <Text style={styles.link} onPress={() => open(PRIVACY_URL, "Politique de confidentialité")}>
        Politique de confidentialité
      </Text>
      <Text style={styles.link} onPress={() => open(TERMS_URL, "Conditions d'utilisation")}>
        Conditions d'utilisation
      </Text>
    </View>
  );
}

function Auth({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (mode: "signup" | "signin") => {
    setBusy(true);
    setMessage(null);
    const { error, data } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage(translateAuthError(error.message));
    if (mode === "signup" && !data.session) setMessage("Compte créé. Ouvre le lien reçu par email, puis connecte-toi.");
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Ton compte</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        autoComplete="email" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Mot de passe (10 caractères, majuscule, minuscule, chiffre)"
        secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} />
      {message && <Text style={styles.info}>{message}</Text>}
      <PrimaryButton label="Se connecter" disabled={busy || !email || !password} onPress={() => run("signin")} />
      <SecondaryButton label="Créer un compte" disabled={busy || !email || !password} onPress={() => run("signup")} />
      <SecondaryButton label="Retour" onPress={onBack} />
    </ScrollView>
  );
}

function translateAuthError(msg: string): string {
  if (/not confirmed/i.test(msg)) return "Confirme d'abord ton email (lien reçu par mail).";
  if (/invalid login/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/password/i.test(msg)) return "Mot de passe trop faible : 10 caractères minimum, avec majuscule, minuscule et chiffre.";
  return msg;
}

function ProfileSetup({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [country, setCountry] = useState<string | null | undefined>(undefined);
  const [minor, setMinor] = useState<boolean | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ country, is_minor: minor, onboarded_at: now, health_consent_at: now })
      .eq("id", userId);
    setBusy(false);
    if (error) return Alert.alert("Erreur", "Impossible d'enregistrer ton profil.");
    onDone();
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Deux questions</Text>
      <Text style={styles.body}>Elles servent uniquement à te donner les bons numéros d'aide et à adapter l'accompagnement.</Text>
      <Text style={styles.label}>Dans quel pays es-tu ?</Text>
      <View style={styles.chips}>
        {COUNTRIES.map((c) => (
          <Chip key={c.label} label={c.label} selected={country === c.code} onPress={() => setCountry(c.code)} />
        ))}
      </View>
      <Text style={styles.label}>Quel âge as-tu ?</Text>
      <View style={styles.chips}>
        <Chip label="Moins de 18 ans" selected={minor === true} onPress={() => setMinor(true)} />
        <Chip label="18 ans ou plus" selected={minor === false} onPress={() => setMinor(false)} />
      </View>
      <PrimaryButton label="Commencer" disabled={busy || country === undefined || minor === undefined} onPress={save} />
    </ScrollView>
  );
}

function Chat({ profile }: { profile: Profile }) {
  // Historique en mémoire uniquement (v0) : rien n'est stocké, ni sur l'appareil ni sur le serveur.
  const [turns, setTurns] = useState<ChatTurn[]>([{ role: "assistant", content: GREETING }]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [crisis, setCrisis] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatTurn>>(null);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const next: ChatTurn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setDraft("");
    setSending(true);
    try {
      const { status, data } = await callFunction<ChatReply>(CHAT_URL, { messages: next });
      if (status === 402) {
        setTurns([...next, { role: "assistant", content: "Tu as atteint la limite gratuite du jour. L'aide urgente reste disponible en haut." }]);
      } else {
        setTurns([...next, { role: "assistant", content: data.reply ?? crisisResource(profile.country ?? undefined, profile.is_minor) }]);
        if (data.crisis) setCrisis(data.crisis_resource ?? crisisResource(profile.country ?? undefined, profile.is_minor));
      }
    } catch {
      setTurns([...next, { role: "assistant", content: `Connexion impossible pour l'instant. ${crisisResource(profile.country ?? undefined, profile.is_minor)}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {crisis && (
        <View style={styles.crisisBanner} accessibilityRole="alert">
          <Text style={styles.crisisText}>{crisis}</Text>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={turns}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.botBubble]}>
            <Text style={item.role === "user" ? styles.userText : styles.botText}>{item.content}</Text>
          </View>
        )}
        ListFooterComponent={sending ? <Text style={styles.typing}>PsyGPT écrit…</Text> : undefined}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          placeholder="Écris ce que tu ressens…"
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={4000}
        />
        <Pressable accessibilityRole="button" onPress={send} disabled={!draft.trim() || sending}
          style={[styles.sendButton, (!draft.trim() || sending) && styles.disabled]}>
          <Text style={styles.sendText}>Envoyer</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Settings({ profile }: { profile: Profile }) {
  const country = COUNTRIES.find((c) => c.code === profile.country)?.label ?? "Autre pays";

  const deleteAccount = () => {
    const doDelete = async () => {
      const { status } = await callFunction<{ deleted?: boolean }>(DELETE_ACCOUNT_URL, {});
      if (status === 200) {
        await supabase.auth.signOut();
      } else {
        Alert.alert("Erreur", "La suppression a échoué. Réessaie ou contacte-nous.");
      }
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Supprimer définitivement ton compte et tes données ?")) doDelete();
    } else {
      Alert.alert("Supprimer mon compte", "Ton compte et tes données seront supprimés définitivement.", [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Réglages</Text>
      <Text style={styles.body}>Pays : {country}</Text>
      <Text style={styles.body}>Profil : {profile.is_minor ? "moins de 18 ans" : "18 ans ou plus"}</Text>
      <Text style={styles.small}>Tes conversations ne sont pas conservées : elles disparaissent quand tu fermes l'app.</Text>
      <LegalLinks />
      <SecondaryButton label="Se déconnecter" onPress={() => supabase.auth.signOut()} />
      <Pressable accessibilityRole="button" onPress={deleteAccount} style={styles.dangerButton}>
        <Text style={styles.dangerText}>Supprimer mon compte</Text>
      </Pressable>
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={[styles.primary, disabled && styles.disabled]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={[styles.secondary, disabled && styles.disabled]}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const C = {
  bg: "#F6F4EF", card: "#FFFFFF", ink: "#1F2A37", muted: "#5B6573", accent: "#3F6E66",
  accentSoft: "#DCEAE6", danger: "#B42318", dangerSoft: "#FDECEA", line: "#E3DED4",
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  brand: { fontSize: 20, fontWeight: "700", color: C.accent },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLink: { paddingHorizontal: 8, paddingVertical: 6 },
  headerLinkText: { color: C.accent, fontWeight: "600" },
  sos: { backgroundColor: C.danger, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  sosText: { color: "#fff", fontWeight: "700" },
  emergency: { backgroundColor: C.dangerSoft, padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  emergencyText: { color: C.ink, fontSize: 15, lineHeight: 21 },
  callButton: { alignSelf: "flex-start", backgroundColor: C.danger, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  callButtonText: { color: "#fff", fontWeight: "700" },
  page: { padding: 20, gap: 14, maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: 24, fontWeight: "700", color: C.ink },
  body: { fontSize: 16, lineHeight: 23, color: C.ink },
  small: { fontSize: 14, lineHeight: 20, color: C.muted },
  label: { fontSize: 16, fontWeight: "600", color: C.ink, marginTop: 6 },
  info: { fontSize: 15, color: C.accent },
  notice: { backgroundColor: C.card, borderRadius: 12, padding: 16, gap: 8, borderWidth: 1, borderColor: C.line },
  noticeTitle: { fontSize: 17, fontWeight: "700", color: C.ink },
  checkRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.accent, marginTop: 2 },
  checkboxOn: { backgroundColor: C.accent },
  legal: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  link: { color: C.accent, textDecorationLine: "underline", fontSize: 14 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, fontSize: 16, color: C.ink },
  primary: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondary: { borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.accent },
  secondaryText: { color: C.accent, fontSize: 16, fontWeight: "600" },
  dangerButton: { borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.danger, marginTop: 12 },
  dangerText: { color: C.danger, fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.45 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.ink },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  crisisBanner: { backgroundColor: C.dangerSoft, padding: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  crisisText: { color: C.danger, fontWeight: "600", lineHeight: 20 },
  bubble: { maxWidth: "85%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { alignSelf: "flex-end", backgroundColor: C.accent },
  botBubble: { alignSelf: "flex-start", backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  userText: { color: "#fff", fontSize: 16, lineHeight: 22 },
  botText: { color: C.ink, fontSize: 16, lineHeight: 22 },
  typing: { color: C.muted, fontStyle: "italic", marginTop: 4 },
  composer: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg, alignItems: "flex-end" },
  composerInput: { flex: 1, minHeight: 44, maxHeight: 140, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: C.ink },
  sendButton: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  sendText: { color: "#fff", fontWeight: "700" },
});
