# Scovi

Scovi est un CRM personnel de prospection B2B. Il transforme des captures terrain ou des fichiers CSV en entreprises et contacts qualifiables, puis permet de lancer et suivre des campagnes email via n8n.

Le produit est actuellement conçu pour un utilisateur unique. Il couvre le parcours complet : collecte, enrichissement, qualification, sélection, campagne et suivi.

## Parcours Produit

### Import photo

1. Import de plusieurs photos de véhicules, enseignes, vitrines ou panneaux.
2. Lecture EXIF côté navigateur : GPS, date, ville, département et adresse.
3. Extraction visuelle par Claude.
4. Identification via Sirene puis Pappers.
5. Qualification automatique de l'entreprise.
6. Génération du résumé, de l'angle commercial, du script d'appel et de l'email.
7. Recherche optionnelle d'entreprises similaires par NAF et département.

### Import CSV

Scovi accepte :

- un CSV unique contenant entreprise et contact ;
- une paire de fichiers entreprises + contacts, comme les exports Leadbay placés dans `Documents/`.

Les deux fichiers sont fusionnés grâce à l'identifiant externe de l'entreprise. Les doublons sont mis à jour via une clé d'import stable.

Un import manuel ne déclenche aucune qualification automatique. Les scores entreprise et contact restent à `N/A` jusqu'à une action explicite.

### Qualification

Depuis la liste ou une fiche, le bouton `Qualifier` propose :

- `Lead uniquement` : score la pertinence de l'entreprise ;
- `Contacts uniquement` : classe les interlocuteurs ;
- `Lead et contacts` : exécute les deux.

La qualification entreprise prend en compte l'activité, l'effectif, la contactabilité, l'identification légale et la localisation.

La qualification contact distingue :

- décideur ;
- sponsor opérationnel ;
- influenceur administratif ou commercial ;
- utilisateur terrain ;
- contact à qualifier.

Les scores et justifications sont persistés en base. La sélection d'une ligne peut qualifier tous les contacts liés à la même entreprise.

Cette qualification manuelle est actuellement déterministe et n'appelle aucune API payante. Elle exploite uniquement les données déjà présentes dans Scovi.

### CRM et campagnes

La page Leads propose :

- sélection multiple ou sélection de tous les résultats filtrés ;
- actions groupées de qualification et de lancement de campagne ;
- filtres par recherche, activité, NAF, effectif, score, `N/A`, source, statut de qualification, campagne, présence d'email et dates ;
- compteurs séparés pour les lignes et les entreprises uniques ;
- suivi de campagne : prêt, en file, J0 envoyé, relances, réponse, terminé ou erreur.

La fiche lead affiche l'entreprise, le contact sélectionné, les autres contacts classés, la stratégie d'approche recommandée et les contenus commerciaux.

## Campagnes n8n

Le fichier réimportable se trouve dans :

```txt
Documents/scovi_cold_email_sequence.json
```

Avant le lancement, une configuration webhook active avec le déclencheur `manual` doit pointer vers l'URL de production du webhook n8n.

Le workflow :

1. reçoit un contact depuis Scovi ;
2. envoie le premier email avec Gmail ;
3. attend trois jours et vérifie les réponses ;
4. envoie une première relance si nécessaire ;
5. attend quatre jours supplémentaires ;
6. envoie la relance finale si nécessaire ;
7. remonte chaque événement dans Scovi.

Le callback est protégé par :

- le JWT public Supabase ;
- un secret applicatif `CAMPAIGN_CALLBACK_SECRET`.

La clé `service_role` n'est jamais transmise à n8n.

## Modèle d'email

Les imports CSV utilisent un modèle direct présentant KarayCRM, proposant une visioconférence de 15 minutes et contenant le lien Calendly :

```txt
https://calendly.com/pablo-karaycrm/30min
```

Les futurs leads photo suivent la même structure. Un nom n'est utilisé que s'il est connu ; sinon l'email commence par `Bonjour,`.

## Architecture

```txt
src/
  domain/           logique métier pure et types
  application/      cas d'usage et ports
  infrastructure/   Supabase, CSV, EXIF et traitement navigateur
  presentation/     hooks de présentation et realtime
  hooks/            hooks React par ressource
  pages/            écrans produit
  components/       composants UI

supabase/
  migrations/
    001_initial_schema.sql
    002_no_auth_local_mode.sql
    003_lead_import_campaigns.sql
    004_qualification_workflow.sql
    005_digital_footprint.sql
  functions/
    process-capture/
    search-confreres/
    generate-plan/
    webhook-push/
    campaign-status/
    qualify-leads/
    enrich-digital/
```

Stack :

- React 19, TypeScript, Vite et Tailwind CSS ;
- Supabase Postgres, Auth, Storage, Realtime et Edge Functions ;
- Claude pour la vision et la génération commerciale ;
- Sirene INSEE et Pappers pour l'enrichissement entreprise ;
- Google Places API (New) pour la présence digitale ;
- n8n et Gmail pour les séquences email ;
- Playwright pour les tests end-to-end.

## Données

Tables principales :

- `captures` : photos, EXIF et statut de traitement ;
- `leads` : entreprises, contacts, qualification, campagne et contenus commerciaux ;
- `plans` : plans d'appel générés ;
- `webhook_configs` : destination n8n ou autre intégration ;
- `webhook_logs` : historique des appels sortants.

Les champs de qualification entreprise et contact sont séparés des scores de confiance d'identification. Un score absent doit être présenté comme `N/A`, jamais comme zéro.

## Configuration

Variables frontend :

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_E2E_AUTH=false
VITE_DISABLE_AUTH=false
```

Secrets Supabase :

```bash
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set PAPPERS_API_KEY=...
supabase secrets set INSEE_API_KEY=...
supabase secrets set CAMPAIGN_CALLBACK_SECRET=...
supabase secrets set GOOGLE_PLACES_API_KEY=...
```

L'ancien couple `INSEE_CONSUMER_KEY` / `INSEE_CONSUMER_SECRET` reste supporté comme solution de repli.

## Développement

```bash
npm install
npm run dev
npm run build
npm run test:e2e
```

Application locale :

```txt
http://localhost:5173/
```

## Déploiement Supabase

```bash
supabase db push
supabase functions deploy process-capture enrich-digital search-confreres generate-plan webhook-push campaign-status qualify-leads
```

`campaign-status` doit conserver la vérification JWT Supabase. Ne pas la déployer avec `--no-verify-jwt`.

## Limites Actuelles

Scovi ne réalise pas encore :

- l'audit de qualité ou d'obsolescence des sites détectés ;
- le crawl de sites pour trouver des personnes ou emails ;
- la vérification d'emails via Hunter ou Dropcontact ;
- le scraping de PagesJaunes ;
- la gestion multi-utilisateur, des équipes ou de la facturation.

Le scraping PagesJaunes n'est pas prévu en raison de ses conditions d'utilisation. Toute future prospection enrichie doit conserver la source des données, permettre l'opposition et respecter les règles de prospection B2B.
