# Scovio.io

Scovio.io transforme les signaux vus sur le terrain en actions commerciales prêtes à lancer.

Le produit part d'un geste simple : prendre en photo un fourgon floqué, une enseigne, un panneau de chantier ou une vitrine pendant la journée. Le soir, Scovio importe les photos, identifie les entreprises, enrichit les données, trouve des sociétés similaires dans la même zone, puis prépare un plan d'appel exploitable pour le lendemain.

Scovio n'est pas un CRM complet, ni un outil d'emailing, ni un SaaS multi-équipes. C'est un outil personnel de capture et de qualification terrain, conçu pour ne pas perdre les opportunités commerciales croisées dans la rue.

## Pourquoi

Sur le terrain, les bons prospects apparaissent souvent hors d'un contexte de prospection formel : un artisan croisé dans une zone, une flotte de véhicules, un commerce local, un chantier visible, une signalétique d'entreprise. Sans outil dédié, le signal finit dans une note, une photo oubliée, ou un traitement manuel trop long.

Scovio réduit cette friction :

- une photo devient une fiche entreprise qualifiée ;
- les métadonnées de lieu et de date aident à identifier le bon établissement ;
- l'enrichissement Sirene/Pappers donne le contexte légal et commercial ;
- les confrères du même métier et du même département multiplient la valeur d'une capture ;
- le plan d'attaque regroupe les leads par zone et métier avec scripts, angles et emails prêts à copier.

## Parcours Produit

1. Le commercial prend des photos pendant sa journée terrain.
2. En fin de journée, il importe les photos en lot dans Scovio.
3. Scovio lit les données EXIF, localise la capture et extrait les informations visibles.
4. Le lead est rapproché d'une entreprise officielle via Sirene puis Pappers.
5. Scovio calcule un score de confiance et un score de pertinence.
6. Les entreprises similaires sont ajoutées comme confrères à contacter.
7. Le plan d'attaque du lendemain est généré avec ordre d'appel, angle, script et email.
8. Les leads peuvent être exportés en CSV ou poussés vers un CRM via webhook.

## Capacités Actuelles

- Import multi-photos avec aperçu, compression et traitement en file.
- Lecture EXIF côté navigateur : GPS, date de prise de vue, adresse, ville et département.
- Reverse geocoding via `api-adresse.data.gouv.fr`.
- Traitement Supabase Edge Function pour extraction visuelle et enrichissement.
- Identification entreprise via cascade Sirene puis Pappers.
- Création de leads enrichis avec SIREN/SIRET, NAF, dirigeant, effectif, adresse et contexte business.
- Recherche de confrères par code NAF et département.
- CRM interne avec filtres, tri, statuts, scores, notes et actions rapides.
- Détail lead avec contexte terrain, données enrichies, scripts et entreprises similaires.
- Génération d'un plan d'attaque groupé par métier et zone.
- Export CSV.
- Webhooks configurables vers Make, Zapier, n8n ou un CRM maison.
- PWA responsive avec navigation desktop et mobile.

## Positionnement

Scovio vise d'abord l'usage quotidien d'un commercial ou fondateur qui prospecte lui-même. Le produit privilégie la vitesse d'exploitation et la qualité du signal plutôt que la couverture fonctionnelle d'un CRM.

Ce que Scovio fait :

- capter un signal terrain ;
- identifier l'entreprise derrière ce signal ;
- enrichir et qualifier le prospect ;
- transformer une capture isolée en séquence d'appels cohérente ;
- envoyer les données vers l'outil commercial déjà utilisé.

Ce que Scovio ne fait pas :

- gérer des pipelines, deals ou tâches CRM complets ;
- envoyer automatiquement des emails ;
- remplacer la validation humaine quand l'identification est ambiguë ;
- gérer plusieurs équipes, rôles, offres ou facturation.

## Architecture Technique

Le projet suit une architecture en couches pour séparer le métier, les cas d'usage et les intégrations.

```txt
src/
  domain/           logique métier pure, types, scores, formatters
  application/      services applicatifs et ports
  infrastructure/   Supabase, navigateur, CSV, EXIF, compression image
  presentation/     hooks de présentation et realtime
  hooks/            hooks React par ressource
  pages/            écrans produit
  components/       composants UI réutilisables

supabase/
  migrations/       schéma Postgres, RLS, storage, indexes
  functions/        process-capture, search-confreres, generate-plan, webhook-push
```

Stack principale :

- React 19, Vite, TypeScript, Tailwind CSS.
- Supabase Auth, Postgres, Storage, Realtime et Edge Functions.
- Claude Vision pour l'extraction depuis photo.
- Claude pour les résumés, angles, scripts, emails et plans d'attaque.
- Sirene INSEE et Pappers pour l'enrichissement entreprise.
- `exifr` pour la lecture EXIF côté client.
- Playwright pour les tests end-to-end.

## Données

Le modèle principal s'organise autour de cinq tables :

- `captures` : photo importée, métadonnées EXIF, statut de traitement, données extraites.
- `leads` : entreprise identifiée ou confrère, données enrichies, scores, scripts, statuts, notes.
- `plans` : plan d'attaque généré pour une date cible.
- `webhook_configs` : destinations CRM et mappings de champs.
- `webhook_logs` : historique des pushes et réponses webhook.

Les données sont protégées par RLS Supabase. Les photos sont stockées dans le bucket privé `captures`, organisé par `user_id`.

## Configuration

Copier `.env.example` vers `.env.local`, puis renseigner :

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

ANTHROPIC_API_KEY=
PAPPERS_API_KEY=
INSEE_CONSUMER_KEY=
INSEE_CONSUMER_SECRET=
```

Variables utiles en local ou en test :

```bash
VITE_E2E_AUTH=false
VITE_DISABLE_AUTH=false
```

## Lancer Le Projet

Installer les dépendances :

```bash
npm install
```

Démarrer l'application :

```bash
npm run dev
```

Construire la version de production :

```bash
npm run build
```

Lancer les tests end-to-end :

```bash
npm run test:e2e
```

## Supabase

Appliquer les migrations :

```bash
supabase db push
```

Déployer les Edge Functions :

```bash
supabase functions deploy process-capture search-confreres generate-plan webhook-push
```

Configurer les secrets Edge Functions :

```bash
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set PAPPERS_API_KEY=...
supabase secrets set INSEE_CONSUMER_KEY=...
supabase secrets set INSEE_CONSUMER_SECRET=...
```

## Usage CRM

Scovio reste webhook-first. L'objectif est de pousser les leads qualifiés vers l'outil existant plutôt que de recréer un CRM complet.

Une configuration webhook peut cibler :

- Make ;
- Zapier ;
- n8n ;
- un endpoint CRM interne ;
- une API métier exposée par un outil tiers.

Le mapping de champs permet d'adapter le payload Scovio au format attendu par la destination.

## Direction Produit

Les prochains arbitrages doivent rester guidés par l'usage terrain :

- réduire le temps entre capture et appel ;
- améliorer la fiabilité du matching entreprise ;
- rendre les scores plus explicables ;
- faciliter la correction manuelle quand le signal est ambigu ;
- garder le plan d'attaque plus utile qu'un simple export de leads.
