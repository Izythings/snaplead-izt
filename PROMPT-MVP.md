# Prompt — LeadSnap MVP one-shot

Lis `CLAUDE.md` et `ADR-leadsnap.md` à la racine. Ce sont tes specs. Construis le MVP complet en suivant l'ordre des sprints.

## Ce que tu dois faire

1. **Init projet** : Vite + React + TypeScript + Tailwind. Setup PWA (manifest.json, service worker basique). Routing avec react-router-dom. Layout : sidebar nav dark mode, pages vides. Auth Supabase magic link email.

2. **Supabase** : Crée la migration SQL complète (toutes les tables : captures, leads, plans, webhook_configs, webhook_logs + RLS + indexes + storage bucket). Crée `src/lib/supabase.ts` avec le client. Crée `src/lib/types.ts` avec les types TypeScript correspondant au schéma.

3. **Import + Extraction** : Page Import avec PhotoDropzone (drag & drop multi + sélection fichiers). Au drop : parse EXIF avec `exifr` (lat/lng/datetime), reverse geocode via `api-adresse.data.gouv.fr/reverse`, affiche preview + métadonnées EXIF. Upload vers Supabase Storage dans le dossier `{user_id}/`. Crée la capture en DB avec les champs EXIF. Edge Function `process-capture` : récupère l'image en base64, appelle Claude Vision avec le prompt d'extraction du CLAUDE.md, parse le JSON retourné, merge EXIF si ville manquante, cascade Sirene → Pappers, calcule le score de confiance, crée le lead enrichi. Page Captures : liste avec Supabase Realtime sur le statut.

4. **Confrères** : Edge Function `search-confreres` : après enrichissement, si code_naf + departement existent, appelle Pappers recherche même NAF + même dept, exclut le SIREN du lead principal, crée les leads confrères (is_from_photo=FALSE, parent_lead_id). Affiche la section confrères dans LeadDetail.

5. **Plan d'attaque** : Edge Function `generate-plan` : récupère les leads photo du jour + confrères associés, groupe par métier/zone, appelle Claude avec le prompt du CLAUDE.md, stocke le plan structuré. Page PlanAttaque : affichage groupé, lead principal mis en avant, confrères en dessous, scripts et emails copiables, ordre d'appel numéroté, résumé en haut, export CSV.

6. **Webhook** : Edge Function `webhook-push` : récupère le lead, construit le payload (field_mapping si configuré, sinon payload par défaut complet), POST vers l'URL du webhook avec les headers configurés, log le résultat. Page Settings : CRUD webhook configs, bouton test, tableau des logs. Bouton "Push to CRM" sur LeadDetail + bouton bulk "Push all" sur PlanAttaque.

7. **Dashboard** : compteurs (captures/leads/confrères/contactés/pushés), liens rapides, 5 dernières captures. Statuts lead (contacted/archived). Champ notes. Responsive mobile.

## Contraintes

- Suis le design du CLAUDE.md : dark mode #0a0a0a, JetBrains Mono pour les données, DM Sans pour le texte, couleurs confiance vert/orange/rouge.
- Chaque Edge Function doit avoir un bon error handling : try/catch, log l'erreur dans la capture/le log, status=failed avec error_message.
- Cache Pappers : avant d'appeler l'API, vérifie si le SIREN est déjà enrichi en base.
- Les boutons "Copier" doivent utiliser `navigator.clipboard.writeText`.
- Le CSV doit suivre le format exact du CLAUDE.md.
- Pas de librairie UI lourde (pas de MUI, pas de Chakra). Tailwind brut.
- Installe exifr pour le parsing EXIF côté client.
- Toutes les Edge Functions en Deno/TypeScript (standard Supabase).

## Variables d'environnement

Les Edge Functions attendent ces secrets Supabase :
```
ANTHROPIC_API_KEY
PAPPERS_API_KEY
INSEE_CONSUMER_KEY
INSEE_CONSUMER_SECRET
```

Le frontend attend ces env vars :
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Crée un `.env.example` avec toutes les variables listées.

## Livrables attendus

- Projet complet qui tourne avec `npm run dev`
- Migration SQL prête à exécuter avec `supabase db push`
- Edge Functions prêtes à déployer avec `supabase functions deploy`
- `.env.example` documenté
- Tout le code, pas de placeholder, pas de TODO, pas de "implement later"
