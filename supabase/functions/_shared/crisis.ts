// Filet de sécurité DÉTERMINISTE, indépendant du modèle.
// Le system prompt demande déjà au modèle de gérer les crises ; ce module garantit que,
// même si le modèle répond mal, refuse ou plante, l'utilisateur voit une ressource d'aide.
//
// ⚠️ À VÉRIFIER AVANT LANCEMENT : ces numéros n'ont pas pu être recoupés avec une source en ligne
// au moment de l'écriture. Chaque ligne doit être vérifiée (site officiel de l'organisme) et revue
// au moins une fois par an. Un pays absent retombe sur 112 + findahelpline.com, jamais sur un
// numéro d'un autre pays.

const HIGH_RISK_PATTERNS: RegExp[] = [
  /mieux sans moi/i,
  /(je suis|être) un fardeau/i,
  /[àa] quoi (ça|ca) sert de continuer/i,
  /je pense [àa] partir/i,
  /(en finir|me tuer|me suicider|suicide|mettre fin [àa] mes jours)/i,
  /(plus envie de vivre|envie de mourir|disparaître pour de bon)/i,
  /(me faire du mal|me scarifier|me couper)/i,
  // EN — l'app est multilingue
  /(kill myself|end it all|suicid|better off without me|want to die|self[- ]harm)/i,
];

export function isHighRisk(text: string): boolean {
  return HIGH_RISK_PATTERNS.some((re) => re.test(text));
}

type CountryLines = {
  emergency: string;   // urgence vitale
  crisis?: string;     // écoute / prévention du suicide
  youth?: string;      // ligne jeunesse
};

const EU_YOUTH = "116 111 (ligne d'aide pour enfants et ados)";

// Clé : code pays ISO 3166-1 alpha-2.
const LINES: Record<string, CountryLines> = {
  FR: { emergency: "112 (ou 15 SAMU)", crisis: "3114 (prévention du suicide, 24h/24, gratuit)", youth: "119 (enfance en danger) ou Fil Santé Jeunes 0 800 235 236" },
  BE: { emergency: "112", crisis: "0800 32 123 (Centre de Prévention du Suicide) ou 1813 (Zelfmoordlijn)", youth: EU_YOUTH },
  CH: { emergency: "144 (ambulance) ou 112", crisis: "143 (La Main Tendue)", youth: "147 (Pro Juventute)" },
  LU: { emergency: "112", crisis: "45 45 45 (SOS Détresse)", youth: EU_YOUTH },
  DE: { emergency: "112", crisis: "0800 111 0 111 ou 0800 111 0 222 (TelefonSeelsorge)", youth: EU_YOUTH },
  AT: { emergency: "112", crisis: "142 (TelefonSeelsorge)", youth: EU_YOUTH },
  ES: { emergency: "112", crisis: "024 (línea de atención a la conducta suicida)", youth: EU_YOUTH },
  IT: { emergency: "112", crisis: "02 2327 2327 (Telefono Amico)", youth: EU_YOUTH },
  PT: { emergency: "112", crisis: "808 24 24 24 (SNS 24, aconselhamento psicológico)", youth: EU_YOUTH },
  NL: { emergency: "112", crisis: "113 ou 0800-0113 (113 Zelfmoordpreventie)", youth: EU_YOUTH },
  IE: { emergency: "112 ou 999", crisis: "116 123 (Samaritans)", youth: EU_YOUTH },
  GB: { emergency: "999 ou 112", crisis: "116 123 (Samaritans)" },
  DK: { emergency: "112", crisis: "70 201 201 (Livslinien)", youth: EU_YOUTH },
  SE: { emergency: "112", crisis: "90101 (Självmordslinjen)", youth: EU_YOUTH },
  NO: { emergency: "112 (ou 113 ambulance)", crisis: "116 123 (Mental Helse)", youth: EU_YOUTH },
  FI: { emergency: "112", crisis: "09 2525 0111 (MIELI)", youth: EU_YOUTH },
  PL: { emergency: "112", crisis: "116 123 (Kryzysowy Telefon Zaufania)", youth: EU_YOUTH },
  US: { emergency: "911", crisis: "988 (Suicide & Crisis Lifeline)" },
  CA: { emergency: "911", crisis: "988 (ligne d'aide en cas de crise suicidaire)" },
  AU: { emergency: "000", crisis: "13 11 14 (Lifeline)" },
  NZ: { emergency: "111", crisis: "1737 (Need to Talk?)" },
};

// Pays de l'UE/EEE sans ligne d'écoute renseignée : le 112 et le 116 111 restent valables.
const EU_EEA = new Set(["BG", "CY", "CZ", "EE", "GR", "HR", "HU", "IS", "LI", "LT", "LV", "MT", "RO", "SI", "SK"]);

export function crisisResource(country?: string, minor = false): string {
  const cc = country?.toUpperCase();
  const lines = cc ? LINES[cc] ?? (EU_EEA.has(cc) ? { emergency: "112", youth: EU_YOUTH } : undefined) : undefined;

  if (!lines) {
    return "Si tu es en danger maintenant : appelle le 112 (urgences en Europe, et redirigé depuis de nombreux mobiles ailleurs), ou trouve une ligne d'écoute dans ton pays sur findahelpline.com.";
  }
  const parts = [`Urgence : ${lines.emergency}.`];
  parts.push(lines.crisis ? `Écoute 24h/24 : ${lines.crisis}.` : "Ligne d'écoute de ton pays : findahelpline.com.");
  if (minor && lines.youth) parts.push(`Pour les jeunes : ${lines.youth}.`);
  return parts.join(" ");
}

export function safeFallbackReply(country?: string, minor = false): string {
  return `Je suis là, et ce que tu vis compte. Je n'arrive pas à te répondre correctement pour l'instant. ${crisisResource(country, minor)}`;
}

// Numéro à composer pour le bouton d'appel (chiffres uniquement).
const DIAL: Record<string, string> = { US: "911", CA: "911", AU: "000", NZ: "111", GB: "999" };
export function emergencyNumber(country?: string): string {
  return (country && DIAL[country.toUpperCase()]) || "112";
}
