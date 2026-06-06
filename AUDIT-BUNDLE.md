# Audit bundle et performance frontend - Scovi

Date de mesure : 6 juin 2026

## 1. Resume executif

Le build frontend est actuellement monolithique :

| Ressource | Minifie | Gzip |
| --- | ---: | ---: |
| JavaScript initial | 605,6 kB | 178,9 kB |
| CSS | 29,0 kB | 6,2 kB |

Les sept pages sont importees statiquement dans `src/App.tsx`. Une visite du dashboard
telecharge donc aussi le CRM, le detail d'un lead, les reglages, le plan d'appel et le
parseur EXIF reserve a l'import photo.

Le meilleur premier changement est le lazy-loading des routes. Un build experimental,
ensuite restaure, donne :

| Ressource | Avant | Apres | Gain |
| --- | ---: | ---: | ---: |
| JS initial minifie | 605,6 kB | 470,4 kB | -22,3 % |
| JS initial gzip | 178,9 kB | 136,9 kB | -23,5 % |

Cette seule modification supprime aussi l'avertissement Vite sur le chunk initial
superieur a 500 kB.

## 2. Attribution du poids actuel

Attribution estimee a partir des mappings de la source map du fichier minifie :

| Groupe | Poids minifie approx. | Part |
| --- | ---: | ---: |
| React DOM | 176,9 kB | 29,9 % |
| Supabase, tous modules cumules | 200,0 kB | 33,9 % |
| `exifr` full | 72,6 kB | 12,3 % |
| Code applicatif | 70,5 kB | 11,9 % |
| React Router | 37,2 kB | 6,3 % |
| `lucide-react` | 14,4 kB | 2,4 % |
| React + scheduler | 12,5 kB | 2,1 % |

Detail Supabase minifie :

| Module | Poids approx. |
| --- | ---: |
| `@supabase/auth-js` | 96,1 kB |
| `@supabase/realtime-js` + Phoenix | 54,8 kB |
| `@supabase/storage-js` | 21,2 kB |
| `@supabase/postgrest-js` | 15,7 kB |
| `@supabase/supabase-js` | 9,4 kB |
| `@supabase/functions-js` | 2,7 kB |

Ces chiffres ne sont pas des tailles gzip independantes. Ils servent a prioriser les
travaux, pas a additionner des gains gzip theoriques.

## 3. Causes principales

### P0 - Toutes les routes sont chargees au demarrage

`src/App.tsx` importe directement les sept pages. Cela force Rollup a produire un seul
graphe initial.

Impact mesure :

- 135,2 kB minifies retires du chunk initial avec `React.lazy`.
- 42,0 kB gzip retires du chargement initial.
- `/import` devient un chunk de 79,8 kB / 28,4 kB gzip.
- Les autres chunks de page restent compris entre 1 et 15,7 kB minifies.

Recommandation :

- Utiliser `lazy(() => import(...))` pour chaque page.
- Encadrer les routes avec un `Suspense` unique et un fallback stable.
- Ne pas lazy-loader le shell, la navigation ou le provider de toast.
- Ne pas precharger `/import` au demarrage. Un prechargement sur intention
  (`pointerenter`, `focus`, `touchstart`) peut etre ajoute ensuite.

Risque : faible. Les composants de page sont deja des exports par defaut et les routes
n'ont pas de dependance synchrone externe.

### P1 - Le bundle EXIF complet est utilise dans le navigateur

`src/infrastructure/browser/exif.ts` importe `exifr` via son entree par defaut, qui pointe
vers `full.esm.mjs`.

La bibliotheque fournit :

- `full` : 74 kB sur disque, destine principalement a Node.
- `lite` : 44 kB, JPEG + HEIC, TIFF/EXIF + XMP.
- `mini` : 28 kB, principalement JPEG, sans dictionnaires complets.

Scovi doit conserver HEIC pour la capture iPhone. `mini` n'est donc pas un choix sur.
`lite` contient les API `gps()` et `parse()` ainsi que les tags `DateTimeOriginal` et
`CreateDate` utilises par l'application.

Build experimental avec routes lazy + `exifr/lite` :

| Chunk Import | `full` | `lite` | Gain |
| --- | ---: | ---: | ---: |
| Minifie | 79,8 kB | 50,5 kB | -36,7 % |
| Gzip | 28,4 kB | 17,2 kB | -39,3 % |

Recommandation :

- Importer explicitement `exifr/dist/lite.esm.mjs`.
- Ajouter une declaration TypeScript locale si le sous-chemin n'expose pas ses types.
- Tester avec de vrais fichiers JPEG et HEIC issus d'iPhone et Android.
- Verifier GPS present, GPS absent, date EXIF presente et image sans EXIF.

Risque : moyen tant que les fixtures HEIC reelles ne sont pas ajoutees aux tests.

### P1 - Supabase represente un tiers du JavaScript

`createClient()` importe Auth, PostgREST, Realtime, Storage et Functions. Le projet utilise
effectivement ces cinq fonctions, mais pas toutes sur chaque route :

- Auth : shell et connexion.
- PostgREST : dashboard, captures, leads, plan et reglages.
- Realtime : hooks de captures et leads.
- Storage : import photo uniquement.
- Functions : import, plan, recherche de confreres et webhooks.

Le lazy-loading des pages ne retire pas Supabase du chunk initial, car `App.tsx`,
`useSession.ts` et `StatusToast.tsx` importent directement le client global.

Recommandation court terme :

- Garder le client Supabase unique.
- Accepter environ 137 kB gzip initiaux apres lazy-loading.
- Ne pas remplacer `createClient()` dans la premiere passe : le risque auth/realtime est
  superieur au gain.

Option avancee, a traiter separement :

- Evaluer des clients modulaires ou charges par capacite.
- Garder Auth + PostgREST au demarrage.
- Charger Storage et Functions avec les fonctionnalites qui les utilisent.
- Mesurer avant de fusionner : le gain maximal apparent sur Storage + Functions est
  d'environ 24 kB minifies, mais la complexite et les duplications de clients peuvent
  annuler ce gain.

Risque : eleve. Risques principaux : sessions dupliquees, headers divergents, refresh de
token, canaux Realtime non nettoyes et comportement local sans authentification.

### P2 - Dependances declarees mais inutilisees

Ces dependances n'ont plus aucun import dans `src/` :

- `motion`
- `clsx`
- `tailwind-merge`

Elles ne sont pas presentes dans le bundle de production grace au tree-shaking. Leur
suppression ne reduira donc pas les 178,9 kB gzip actuels.

Elle reduira :

- la taille de `node_modules`;
- le temps d'installation CI;
- la surface de maintenance et d'audit de securite.

Risque : faible apres un `rg` final et le passage des tests.

### P2 - `manualChunks` ne constitue pas une reduction

Separer React, Supabase et le code applicatif avec `manualChunks` peut :

- stabiliser le cache navigateur;
- eviter un fichier individuel superieur au seuil Vite;
- faciliter l'analyse.

Cela ne reduit pas automatiquement les octets necessaires au premier affichage. Utiliser
`manualChunks` seul pour faire disparaitre l'avertissement serait cosmetique.

Recommandation :

- Appliquer d'abord le lazy-loading.
- Ajouter des chunks vendeurs seulement si les mesures de cache inter-deploiements le
  justifient.
- Eviter une granularite excessive qui multiplie les requetes.

### P3 - Le service worker n'apporte aucune strategie de cache

`public/sw.js` s'installe mais son handler `fetch` est vide. Il ne reduit aucun transfert
et donne une impression de PWA sans benefice hors ligne.

Recommandation :

- Soit supprimer son enregistrement tant qu'aucun cache n'est defini.
- Soit utiliser une strategie explicite pour les assets hashes de Vite.
- Ne jamais mettre en cache les reponses Supabase sensibles sans politique documentee.

Ce sujet n'affecte pas la taille du premier chargement, mais affecte les visites suivantes.

## 4. Elements qui ne sont pas des problemes prioritaires

### CSS

29,0 kB minifies / 6,2 kB gzip est raisonnable pour l'application. Aucun travail urgent.

### Lucide

Les imports nommes sont correctement tree-shakes. Seules les icones utilisees apparaissent
dans le bundle, pour environ 14,4 kB minifies. Remplacer la bibliotheque aurait peu de ROI.

### Code applicatif

Le code applicatif represente environ 70,5 kB minifies. Les deux plus grosses pages sont :

- `LeadDetail.tsx` : 17,8 kB de source representee.
- `LeadsCRM.tsx` : 14,1 kB de source representee.

Le lazy-loading les isole deja efficacement. Une refactorisation purement structurelle ne
doit pas etre vendue comme une optimisation reseau.

### Migration de routeur ou de framework

Migrer React Router vers TanStack Start uniquement pour reduire ce bundle n'est pas
justifie. Le poids dominant vient de React DOM, Supabase et EXIF, pas de la declaration
des routes. Une migration augmenterait fortement le risque fonctionnel.

## 5. Plan recommande

### Phase 1 - Gain certain, faible risque

1. Lazy-loader les sept pages.
2. Ajouter un fallback `Suspense` accessible et sans changement de layout.
3. Retirer `motion`, `clsx` et `tailwind-merge`.
4. Conserver Supabase tel quel.
5. Executer build et Playwright desktop/mobile.

Resultat attendu :

- chunk initial proche de 470 kB minifies / 137 kB gzip;
- aucun chunk initial au-dessus de 500 kB;
- routes principales sans regression.

### Phase 2 - Optimisation du parcours Import

1. Passer de `exifr/full` a `exifr/lite`.
2. Ajouter des fixtures JPEG et HEIC.
3. Tester GPS, date EXIF et absence de metadonnees.
4. Verifier l'import depuis Safari iOS.

Resultat attendu :

- chunk `/import` proche de 50,5 kB / 17,2 kB gzip.

### Phase 3 - Seulement apres nouvelles mesures

1. Ajouter un rapport de bundle reproductible en CI.
2. Mesurer Web Vitals et temps de parsing sur mobile milieu de gamme.
3. Evaluer le decoupage Supabase uniquement si le JS initial reste un probleme observe.
4. Ajouter eventuellement un cache de service worker pour les assets hashes.

## 6. Criteres d'acceptation

- `npm run build` passe en TypeScript strict.
- Aucun chunk initial ne depasse 500 kB minifies.
- `npm run test:e2e` passe sur desktop et mobile.
- Aucun debordement horizontal sur `/`, `/import`, `/captures`, `/leads`, `/plan`.
- Le deep-link direct vers chaque route fonctionne apres rechargement.
- Le fallback `Suspense` possede un statut lisible par les technologies d'assistance.
- L'import JPEG et HEIC conserve GPS et date EXIF.
- L'authentification, Realtime, Storage et Functions Supabase restent fonctionnels.

## 7. Instructions de mise en oeuvre pour Opus

Scope impose :

- Ne pas modifier les services metier ni les contrats `DataGateway`.
- Ne pas migrer de routeur ou de framework.
- Implementer d'abord uniquement la phase 1.
- Fournir les tailles avant/apres dans le compte rendu.
- Ne pas utiliser `manualChunks` comme substitut au lazy-loading.
- Traiter `exifr/lite` dans un commit separe avec tests de fichiers reels.
- Ne pas decouper Supabase sans benchmark distinct et plan de non-regression auth.

Commandes de verification :

```bash
npm run build
npm run test:e2e
find dist/assets -maxdepth 1 -type f -print0 | xargs -0 ls -lhS
```

## 8. Methodologie

- Build Vite de production.
- Mesure des tailles minifiees et gzip emises par Vite.
- Build avec source map pour attribution approximative des octets minifies.
- Build experimental avec `React.lazy`, ensuite restaure.
- Build experimental avec `React.lazy` + `exifr/lite`, ensuite restaure.
- Inspection des imports et des dependances declarees.

Les builds experimentaux servent a etablir les ordres de grandeur. Ils ne remplacent pas
les tests fonctionnels de l'implementation finale.
