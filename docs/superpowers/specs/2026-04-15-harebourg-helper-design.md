# Harebourg Helper — Design

**Date :** 2026-04-15
**Statut :** v1 specification, ready for implementation planning

## Contexte et objectif

Le combat contre le Comte Harebourg (boss du donjon Frigost 3 dans Dofus Unity) a une mécanique particulière : en fonction du pourcentage de points de vie du personnage attaquant au début de son tour, une rotation de confusion (90°, 180°, ou 270°, sens horaire ou anti-horaire) est appliquée aux sorts. Chaque coup reçu au corps-à-corps ajoute 90° dans le sens anti-horaire à cette rotation (plafonné à 10 coups). Résultat : la case réellement touchée par un sort n'est pas celle ciblée ; elle est la rotation de la cible autour du lanceur selon l'angle effectif.

L'objectif du projet est de fournir au joueur un outil de bureau qui lui permet, pendant son tour, de déterminer en quelques secondes **sur quelle case cliquer en jeu pour que la redirection amène son sort sur la cible souhaitée** (typiquement le Comte lui-même).

Un simulateur web existant (`comteharebourg.com/simulator`) répond à une partie du besoin mais est limité : une seule position pour le joueur, pas de gestion d'alliés ou d'invocations, pas d'intégration à Dofus. Le présent outil reprend son modèle d'interaction (clic gauche = soi, clic droit = cible, case verte = réponse), l'enrichit (position début de tour vs position de tir, alliés, entités neutres), et prépare l'architecture pour une v2 qui détectera automatiquement l'état du combat depuis un screenshot de Dofus.

## Scope de la v1 et hors-scope

**Inclus en v1 :**

- Saisie manuelle complète : placement des entités, sélection de la plage PV, incrément/décrément des coups CàC reçus, cible.
- Calcul de la redirection en mode forward (aim → impact) et reverse (target → aim).
- Vérification de la ligne de vue (LDV) entre la position de tir et la case cliquée.
- Map préset de la salle du Comte Harebourg avec obstacles et trous pré-placés.
- Mode d'édition simple pour corriger/ajuster la map (toggle obstacle ou trou).
- Types d'entités : moi (position de tir), moi (début de tour), Comte Harebourg, alliés (multiples), entités neutres (multiples).
- App desktop cross-platform (macOS et Windows) via Tauri.
- Raccourcis clavier globaux configurables par l'utilisateur.
- Persistance locale des modifications de map et des préférences.

**Exclus explicitement de la v1 (YAGNI) :**

- Détection d'image / OCR (prévu en v2).
- Gestion des portées de sorts et des formes (ligne, diagonale, AoE) — la connaissance du jeu reste la responsabilité du joueur.
- Mode multijoueur ou collaboratif.
- Plusieurs maps.
- Historique des tours / undo-redo au-delà du reset de tour.
- Stats, logs de combat.
- Tests end-to-end automatisés.
- Signing / notarization des builds.
- Thème clair (dark-only).

## Mécanique du boss et règles implémentées

### Confusion de base selon le pourcentage de PV

Cinq plages de PV, cinq rotations associées. Mapping provisoire, **à vérifier in-game avant release** :

| Plage PV        | Rotation de base     |
|-----------------|----------------------|
| 100% – 90%      | 90° sens horaire     |
| 89% – 75%       | 270° sens anti-horaire |
| 74% – 45%       | 180°                 |
| 44% – 30%       | 90° sens anti-horaire |
| 29% – 0%        | 270° sens horaire    |

Cette table vit dans une constante `CONFUSION_TABLE` clairement documentée dans `src/core/confusion.ts`, corrigeable en deux lignes si l'appariement exact diffère.

### Modification par coups de corps-à-corps

Chaque coup CàC reçu depuis le début du tour décale la rotation de 90° dans le sens anti-horaire. Au-delà de 10 coups, la rotation cesse de changer.

### Portée et LDV

La portée des sorts **n'est pas modélisée** : le joueur connaît sa portée et sa forme de sort ; l'outil se limite au calcul géométrique pur.

La LDV est vérifiée entre la position de tir du joueur et la case cliquée (le aim), pas entre la position et l'impact. Les cellules traversées sont évaluées :

- `floor` → la ligne passe.
- `hole` → la ligne passe (trou = gap visuel, la ligne de vue passe par-dessus).
- `obstacle` → la ligne est bloquée.

L'algorithme utilisé est Bresenham sur le modèle cartésien interne.

## Architecture

### Principes

- **Couches découplées** avec un sens d'import strict et acyclique : `core` → `state` → `ui`, plus `services` pour les effets externes.
- **Core 100% pur** : logique métier en TypeScript sans aucune dépendance React ou DOM, directement testable en isolation.
- **Même Core en v1 et v2** : la différence entre v1 (manuelle) et v2 (détection image) est l'origine des données, pas le calcul.
- **Rendu SVG** de la grille iso : performance suffisante jusqu'à plusieurs milliers de cellules, clics gérés nativement, debug aisé.
- **Modèle interne cartésien, rendu iso** : la logique manipule des coordonnées carrées simples ; la projection iso est isolée dans une seule fonction de rendu. Les rotations de confusion (multiples de 90°) et la LDV (Bresenham) sont triviales dans ce modèle.
- **Tauri day-1** : shell natif minimal en v1, front-load le coût d'infrastructure pour que la v2 se concentre uniquement sur le problème difficile (détection).

### Stack

- **Tauri 2** (coquille native, Rust minimal en v1).
- **React 18 + TypeScript + Vite** (frontend).
- **Zustand** avec **slice pattern** (un seul store composé de quatre slices).
- **Vitest** pour les tests unitaires du Core et des slices.
- **Biome** pour lint et formatage (outil unique, rapide).
- **GitHub Actions** pour la CI avec builds matrix macOS + Windows.

### Organisation du repo

```
harebourg-helper/
├── src-tauri/                         shell Tauri (Rust, minimal en v1)
│   ├── src/main.rs                    window + global shortcuts + fs persist
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                               frontend TypeScript
│   ├── core/                          logique pure, zéro dép UI
│   │   ├── types.ts
│   │   ├── confusion.ts
│   │   ├── geometry.ts
│   │   ├── redirection.ts
│   │   ├── solver.ts
│   │   └── los.ts
│   │
│   ├── state/                         Zustand (slice pattern)
│   │   ├── slices/
│   │   │   ├── mapSlice.ts
│   │   │   ├── entitySlice.ts
│   │   │   ├── turnSlice.ts
│   │   │   └── settingsSlice.ts
│   │   ├── selectors.ts               dérivés, appellent core/
│   │   └── store.ts                   composition finale
│   │
│   ├── ui/
│   │   ├── app/                       AppShell, SettingsModal
│   │   ├── grid/                      GridView, MapLayer, EntityLayer, OverlayLayer
│   │   │   ├── iso.ts                 projection iso ↔ cartésien
│   │   │   └── Cell.tsx               mémorisé
│   │   ├── panels/                    Left / Right / HpRangeSelector, etc.
│   │   └── theme.ts
│   │
│   ├── services/                      effets externes
│   │   ├── persistence.ts             settings.json + custom-maps.json
│   │   └── shortcuts.ts               bind/unbind global shortcuts
│   │
│   ├── data/
│   │   └── harebourg-map.ts           preset de la salle
│   │
│   └── main.tsx
│
├── tests/
│   ├── core/
│   └── state/
│
├── docs/superpowers/specs/
│   └── 2026-04-15-harebourg-helper-design.md
│
├── .github/workflows/build.yml        CI matrix macOS + Windows
├── biome.json, vitest.config.ts, vite.config.ts
├── package.json, tsconfig.json
```

## Modèle de données

```ts
// ── Coordonnées ──────────────────────────────────
export type Cell = { x: number; y: number };

// ── Map ──────────────────────────────────────────
export type CellKind = 'floor' | 'hole' | 'obstacle';
// floor    : praticable, LDV OK
// hole     : non-praticable, LDV OK
// obstacle : non-praticable, bloque LDV

export type GameMap = {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: CellKind[][]; // [y][x]
};

// ── Entités ──────────────────────────────────────
export type EntityKind =
  | 'me'         // unique, position de tir
  | 'meStart'    // unique, position début de tour
  | 'harebourg'  // unique
  | 'ally'       // multiple
  | 'neutral';   // multiple

export type Entity = {
  id: string;
  kind: EntityKind;
  cell: Cell;
  label?: string;
};

// ── État de tour ─────────────────────────────────
export type HpRange =
  | 'r100_90' | 'r89_75' | 'r74_45' | 'r44_30' | 'r29_0';

export type Rotation = {
  degrees: 0 | 90 | 180 | 270;
  direction: 'cw' | 'ccw';
};

export type TurnState = {
  hpRange: HpRange;
  meleeHits: number; // 0..10
  targetCell: Cell | null;
};

// ── Résultat ─────────────────────────────────────
export type RedirectionResult =
  | { kind: 'ok'; aimCell: Cell; impactCell: Cell }
  | { kind: 'blocked'; reason: 'los' | 'out_of_map' | 'no_solution' };

// ── Mode applicatif ──────────────────────────────
export type AppMode = 'combat' | 'edit';
```

### Règles de placement

Une cellule cible (rouge) ou une position d'entité (quelle qu'elle soit) ne peut être posée que sur une cellule `floor`. Le placement sur `hole` ou `obstacle` est refusé silencieusement (aucune popup ; le cursor au hover indique `not-allowed`). Cette règle est encapsulée dans un unique guard `canPlaceEntity(cell, map)` appelé par tous les points d'entrée de placement.

## Logique métier (Core)

### `confusion.ts`

```ts
const BASE_CONFUSION: Record<HpRange, Rotation> = {
  r100_90: { degrees: 90,  direction: 'cw' },
  r89_75:  { degrees: 270, direction: 'ccw' },
  r74_45:  { degrees: 180, direction: 'cw' },
  r44_30:  { degrees: 90,  direction: 'ccw' },
  r29_0:   { degrees: 270, direction: 'cw' },
};

export function computeConfusion(state: TurnState): Rotation {
  const base = BASE_CONFUSION[state.hpRange];
  const hits = Math.min(Math.max(state.meleeHits, 0), 10);
  return rotateRotation(base, hits * 90, 'ccw');
}
```

### `geometry.ts`

- `rotateCellAround(pivot, target, rotation)` : rotation exacte à multiples de 90°, pas d'arithmétique flottante.
- `cartesianToIso(c)` et `isoToCartesian(px, py)` : projection pour le rendu, aucune utilisation dans la logique.

### `redirection.ts` — forward

`forwardRedirection(source, aim, rotation, map)` :

1. Calcule `impact = rotateCellAround(source, aim, rotation)`.
2. Vérifie que `impact` est dans les bornes de la map et sur `floor` ou `hole`. Un impact sur `obstacle` renvoie `blocked: 'no_solution'` (décision de design ; on peut l'assouplir plus tard si besoin).
3. Vérifie la LDV entre `source` et `aim`. Bloquée → `blocked: 'los'`.
4. Sinon → `ok`.

### `solver.ts` — reverse

`reverseSolve(source, target, rotation, map)` :

La rotation étant bijective, il existe au plus une case de clic `aim` pour un `target` donné : `aim = rotateCellAround(source, target, inverse(rotation))`. On applique alors les mêmes vérifications (bornes, LDV). Complexité O(1).

### `los.ts`

Algorithme de Bresenham entre deux cellules cartésiennes. Renvoie `false` si une cellule traversée est `obstacle`, `true` sinon. Cas trivial : A = B renvoie `true`.

### Flux de calcul à chaque clic / hover

```
utilisateur pose la cible rouge
     │
     ▼
turnStore change → sélecteur dérive `rotation` via computeConfusion
     │
     ▼
sélecteur dérive `result = reverseSolve(me.cell, target, rotation, map)`
     │
     ▼
OverlayLayer s'abonne à `result` :
  - case verte si ok
  - message "aucune solution" si no_solution
  - ligne + avertissement si los
```

Tous les dérivés sont calculés par sélecteurs Zustand ; aucun `useEffect` manuel.

## UI et layout

### Arbre de composants

```
App
├─ AppShell
│  ├─ LeftPanel
│  │  ├─ HpRangeSelector       5 boutons
│  │  ├─ MeleeHitsCounter      +/-
│  │  ├─ ConfusionDisplay      "180° ⟲"
│  │  └─ ModeToggle            combat ↔ edit
│  ├─ GridView                 SVG root
│  │  ├─ MapLayer
│  │  │  └─ Cell[]             React.memo
│  │  ├─ EntityLayer
│  │  │  └─ EntityMarker[]
│  │  └─ OverlayLayer
│  └─ RightPanel
│     ├─ EntityPalette         placer allié / neutre
│     ├─ MapEditorTools        légende edit mode
│     └─ SettingsButton
└─ SettingsModal               rebind raccourcis
```

### Règles de découpage

- Chaque composant < 150 lignes et une seule responsabilité.
- Aucun composant ne contient de logique métier. Handlers → actions du store ou fonctions du Core.
- Les trois `Layer` SVG sont séparés pour éviter les re-renders en cascade.
- `React.memo` sur `Cell`, `EntityMarker` et les widgets de panneau.

### Interactions

| Action                                     | Mode   | Résultat                                          |
|--------------------------------------------|--------|---------------------------------------------------|
| Clic gauche sur cellule                    | combat | place `me` (position de tir)                      |
| Shift + clic gauche sur cellule            | combat | place `meStart` (position début de tour)          |
| Clic droit (ou 2 doigts trackpad)          | combat | place `targetCell` (rouge)                        |
| Hover sur cellule                          | combat | affiche forward (impact prévu)                    |
| Clic sur bouton plage PV                   | combat | met à jour `turn.hpRange`                         |
| Clic sur +/-                               | combat | incrémente/décrémente `turn.meleeHits` (clamp)    |
| Clic sur entité existante                  | combat | sélection, puis Del pour supprimer                |
| Clic gauche sur cellule                    | edit   | toggle obstacle                                   |
| Clic droit sur cellule                     | edit   | toggle trou                                       |
| Raccourci clavier global (configurable)    | both   | reset tour, swap positions, toggle mode, etc.     |

### Responsivité

- Largeur minimum 1100 px. En dessous, les panneaux deviennent rétractables.
- Grille auto-fit à l'espace disponible.
- Fenêtre Tauri par défaut 1280×800, redimensionnable, position mémorisée.

## État et flux de données

Un seul store Zustand assemblé via le slice pattern depuis quatre slices indépendantes, chacune dans son propre fichier :

- `mapSlice` : map courante, actions de toggle obstacle/trou, reset.
- `entitySlice` : liste d'entités, placement, suppression.
- `turnSlice` : plage PV, coups CàC, cible rouge, reset tour.
- `settingsSlice` : mode applicatif, bindings de raccourcis, préférences UI.

Les sélecteurs dérivés (rotation courante, forward result, reverse result, LDV) ne sont PAS dans le store. Ce sont des pures fonctions appelées côté composant avec `useStore(selector)`.

Les actions passent toutes par un guard unique pour le placement (`canPlaceEntity`) afin d'appliquer la règle "floor-only" de façon centralisée.

## Persistance

Deux fichiers JSON dans le dossier de config applicative (`$APPCONFIG/harebourg-helper/`, résolu par Tauri selon l'OS) :

- **`settings.json`** : bindings de raccourcis, taille/position de fenêtre, plage PV par défaut au démarrage, toggle always-on-top.
- **`custom-maps.json`** : **diff** par rapport au preset d'origine (liste des cellules modifiées), pas la map complète. Permet un reset à l'original en un clic et préserve les modifs utilisateur si le preset change.

Chargement au démarrage avec fallback sur valeurs par défaut si fichier absent ou corrompu. Sauvegarde automatique debounced à 500 ms via `tauri-plugin-fs`.

## Raccourcis clavier

Un registre d'actions (`ShortcutAction`) avec implémentations pures (fonctions qui mutent le store). Au démarrage, chaque action avec un binding actif est enregistrée via `tauri-plugin-global-shortcut`. Les rebindings runtime sont appliqués sans redémarrage.

### Bindings par défaut (tous réassignables)

| Action                      | Défaut            |
|-----------------------------|-------------------|
| Reset tour                  | Cmd/Ctrl + R      |
| Toggle mode combat ↔ edit   | Cmd/Ctrl + E      |
| Swap start ↔ attack         | Cmd/Ctrl + S      |
| Cycler plage PV vers bas    | Cmd/Ctrl + ↓      |
| +1 coup CàC                 | Cmd/Ctrl + H      |
| -1 coup CàC                 | Cmd/Ctrl + Shift+H|

Chaque raccourci a un flag "global vs fenêtre" (défaut global), et un bouton "Réinitialiser aux défauts" dans les paramètres.

## Performance

Budget : 16 ms par frame en toutes circonstances.

- Core en pur TypeScript avec complexité O(1) ou O(n≤300) : < 1 ms.
- SVG avec `React.memo` sur `Cell` et sélecteurs fins : hover ne re-render que 2-3 cellules.
- Tauri utilise le webview système (pas Chromium embarqué) : démarrage < 300 ms, RAM ~30 MB.
- Vérification des perfs via React DevTools Profiler pendant le dev, pas au feeling.

## Tests

Trois niveaux, pas plus :

- **Unit tests (Vitest) sur `core/`** : couverture > 90%, obligatoire. Table exhaustive pour `confusion` (5 × 11 = 55 cas), rotations pour toutes les combinaisons (0/90/180/270 × cw/ccw), happy path et échecs typés pour `redirection`, `solver`, `los`.
- **Tests de slices (`state/`)** : en isolation grâce au slice pattern. On teste les guards (placement refusé sur obstacle/trou, clamp des coups CàC).
- **Tests manuels de l'UI** : pas de Playwright/Cypress en v1. Si un bug UI se reproduit, on ajoute un test ciblé après coup.

Règle : tout bug trouvé à l'usage est reproduit par un test avant d'être corrigé.

## CI/CD

Un seul workflow GitHub Actions (`.github/workflows/build.yml`) déclenché sur push :

1. Lint + format (Biome) — bloquant.
2. Typecheck (`tsc --noEmit`) — bloquant.
3. Unit tests (Vitest) — bloquant.
4. Build Tauri macOS (`macos-latest`, artefact `.dmg`).
5. Build Tauri Windows (`windows-latest`, artefacts `.msi` et `.exe`).

Les deux builds s'exécutent en parallèle. Artefacts publiés sur chaque release GitHub. Pas de signing / notarization en v1.

## Points à confirmer in-game avant release

- Mapping exact plage PV → rotation (la `CONFUSION_TABLE`) : à valider par un test en combat ou depuis une source officielle.
- Dimensions exactes et placement précis des obstacles et trous sur la map Harebourg : à affiner depuis un screenshot HD du jeu ou par correction manuelle en mode édition.

## Plan d'évolution v2 (détection image)

La v2 se greffe sans toucher le Core ni le modèle de données :

1. **`src-tauri/src/frame_source.rs`** : trait `FrameSource` avec impls `#[cfg(target_os = ...)]` pour ScreenCaptureKit (macOS) et Windows Graphics Capture. Capture la fenêtre Dofus à la demande.
2. **`src-tauri/src/analyzer.rs`** : prend une frame, extrait position cellulaire des entités (template matching ou modèle ML léger), OCR du PV actuel, dérive la plage PV.
3. **`src/services/detection.ts`** : bridge TS qui déclenche la capture via Tauri, reçoit un `DetectionResult`, écrit dans les mêmes slices Zustand que les clics manuels.
4. **UI** : un bouton "Analyser le jeu" + raccourci global (ex : Cmd+Shift+A). Les panneaux manuels restent disponibles pour corriger en cas d'erreur de détection.

Aucune modification de `core/`, `state/slices/`, `ui/grid/`, `ui/panels/`. Le Core traite les données uniformément, qu'elles viennent d'un clic humain ou d'une reconnaissance d'image.
