// Filet de sécurité DÉTERMINISTE, indépendant du modèle.
// Le system prompt demande déjà au modèle de gérer les crises ; ce module garantit que,
// même si le modèle répond mal, refuse ou plante, l'utilisateur voit une ressource d'aide.

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

// Numéros par pays (ISO 3166-1 alpha-2). Pays inconnu → on ne devine pas : 112 + annuaire international.
const CRISIS_LINES: Record<string, string> = {
  FR: "3114 (prévention du suicide, 24h/24, gratuit)",
  BE: "0800 32 123 (Centre de Prévention du Suicide)",
  CH: "143 (La Main Tendue)",
  CA: "988 (ligne d'aide en cas de crise suicidaire)",
  US: "988 (Suicide & Crisis Lifeline)",
  GB: "116 123 (Samaritans)",
};

export function crisisResource(country?: string): string {
  const line = country ? CRISIS_LINES[country.toUpperCase()] : undefined;
  return line
    ? `Si tu es en danger maintenant : ${line}, ou le 112 en cas d'urgence.`
    : "Si tu es en danger maintenant : appelle le 112 (urgences), ou trouve une ligne d'écoute dans ton pays sur findahelpline.com.";
}

export function safeFallbackReply(country?: string): string {
  return `Je suis là, et ce que tu vis compte. Je n'arrive pas à te répondre correctement pour l'instant. ${crisisResource(country)}`;
}
