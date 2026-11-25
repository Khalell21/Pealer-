# Politique de confidentialité — PsyGPT

> ⚠️ **BROUILLON — à faire relire par un juriste avant publication.** Rédigé à partir du fonctionnement
> réel de l'application (code du dépôt). Les passages `[À COMPLÉTER]` dépendent de décisions ou de
> contrats qui ne sont pas encore pris.

*Dernière mise à jour : [À COMPLÉTER]*

## 1. Qui est responsable de vos données ?

[À COMPLÉTER : nom ou raison sociale, adresse, email de contact]
Contact pour toute question sur vos données : [À COMPLÉTER : email dédié, ex. confidentialite@…]

## 2. Ce que fait PsyGPT, en bref

PsyGPT est un espace d'écoute fonctionnant avec une **intelligence artificielle**. Ce n'est ni un
professionnel de santé ni un service d'urgence. **Nous ne conservons pas vos conversations.**

## 3. Les données que nous traitons

| Donnée | Pourquoi | Base légale (RGPD) | Durée de conservation |
|---|---|---|---|
| Adresse email et mot de passe (chiffré, jamais lisible) | Créer et sécuriser votre compte | Exécution du service (art. 6.1.b) | Jusqu'à la suppression du compte |
| Pays | Vous afficher les bons numéros d'aide | Exécution du service (art. 6.1.b) | Jusqu'à la suppression du compte |
| Tranche d'âge (« moins de 18 ans » ou non) | Adapter l'accompagnement et protéger les mineurs | Obligation de protection des mineurs, consentement | Jusqu'à la suppression du compte |
| Date de votre consentement | Prouver que vous avez accepté | Obligation légale (art. 7.1) | Jusqu'à la suppression du compte |
| Nombre de messages par jour (jamais leur contenu) | Quota d'utilisation, prévention de la dépendance | Intérêt légitime (art. 6.1.f) | **30 jours**, puis effacement automatique |
| Compteur de messages sur la dernière minute | Empêcher les abus automatisés | Intérêt légitime (art. 6.1.f) | Remplacé à chaque minute |
| **Contenu de vos messages** | Vous répondre | **Consentement explicite** aux données de santé (art. 9.2.a) | **Non conservé par PsyGPT** : voir section 4 |

Vos messages peuvent révéler des informations sur votre santé. C'est pourquoi nous vous demandons
un **consentement explicite** avant la première utilisation. Vous pouvez le retirer à tout moment
en supprimant votre compte.

Nous n'utilisons **aucun outil de publicité ni de mesure d'audience**, et nous ne vendons aucune donnée.

## 4. Où vont vos messages ?

- Sur votre téléphone : la conversation reste en mémoire pendant que l'application est ouverte,
  puis disparaît. Elle n'est pas enregistrée sur l'appareil.
- Sur nos serveurs (Supabase, hébergés dans l'Union européenne) : vos messages **transitent**
  pour être transmis à l'IA, sans être enregistrés ni inscrits dans les journaux techniques.
- Chez **Anthropic** (fournisseur de l'IA Claude, États-Unis) : vos messages sont traités pour
  produire la réponse. [À COMPLÉTER : durée de conservation par Anthropic prévue au contrat API,
  et confirmation qu'ils ne servent pas à entraîner les modèles.] Ce transfert hors de l'UE est
  encadré par [À COMPLÉTER : clauses contractuelles types de la Commission européenne / DPA Anthropic].

## 5. Nos sous-traitants

| Prestataire | Rôle | Localisation |
|---|---|---|
| Supabase | Hébergement du compte et des serveurs | Union européenne [À COMPLÉTER : région exacte] |
| Anthropic | Génération des réponses par l'IA | États-Unis |
| [À COMPLÉTER : prestataire d'envoi d'emails] | Emails de confirmation | [À COMPLÉTER] |
| RevenueCat, Apple, Google | Abonnements (si vous en souscrivez un) | [À COMPLÉTER] |

## 6. Mineurs

PsyGPT est ouvert aux mineurs, avec un accompagnement adapté. En France, l'accord d'un parent est
nécessaire **en dessous de 15 ans** (ailleurs : selon l'âge fixé par votre pays, entre 13 et 16 ans).
[À COMPLÉTER : décrire le parcours d'accord parental une fois développé.]

Quand un utilisateur déclare être mineur, ce statut ne peut plus être modifié depuis l'application.

## 7. Vos droits

Vous pouvez à tout moment :
- **supprimer votre compte** directement dans l'application (Réglages → Supprimer mon compte) :
  vos données sont effacées de nos serveurs et votre abonné RevenueCat est supprimé ;
- demander l'accès, la rectification ou la portabilité de vos données : [À COMPLÉTER : email] ;
- retirer votre consentement (en supprimant votre compte) ;
- introduire une réclamation auprès de la **CNIL** (www.cnil.fr) ou de l'autorité de votre pays.

## 8. Sécurité

Connexions chiffrées, mots de passe jamais stockés en clair, accès aux données limité à chaque
utilisateur (contrôle au niveau de la base de données), clés techniques jamais présentes dans
l'application, aucune conversation journalisée.

## 9. En cas d'urgence

PsyGPT ne remplace pas les secours. Si vous êtes en danger, appelez le **112** (ou le numéro
d'urgence de votre pays) ; en France, le **3114** (prévention du suicide, 24h/24, gratuit).
