# V2 — Auto-détection des entités Harebourg depuis capture Dofus

**Date** : 2026-04-17
**Auteur** : Renaud (avec brainstorming assisté)
**Statut** : Design validé, prêt pour planning d'implémentation

## Contexte & motivation

Le V1 de Harebourg Helper force l'utilisateur à placer manuellement chaque entité (lui, alliés, Harebourg, mobs) sur la map avant de calculer les redirections de sort. C'est fastidieux pendant un combat réel : le joueur doit alt-tab, cliquer dans la palette, cliquer sur la case, répéter pour 5-7 entités, et recommencer à chaque changement notable (déplacement, mort d'un mob, invocation).

V2 automatise ce placement : un clic sur "Détecter" dans l'appli → capture automatique de la fenêtre Dofus → analyse d'image → population des entités sur la map avec indicateurs de confiance. L'utilisateur peut ensuite corriger au clavier/souris si nécessaire.

**Use cases principaux :**
1. Déterminer rapidement où taper pour soi-même
2. Pinger précisément un allié en vocal ("tape la case X")
3. Re-déclencher à volonté au fil du combat pour rafraîchir l'état

## Objectifs & non-objectifs

### Objectifs
- Détection déclenchée à la demande via un bouton dans l'appli
- Capture automatique de la fenêtre Dofus (sans Cmd+Tab, sans sélection manuelle)
- Classification chaque entité : `moi` / `allié` / `ennemi` / `harebourg`
- Indicateur visuel de confiance par entité détectée (outline jaune/rouge si incertain)
- Résolution-indépendant (marche à 1920×1080, QHD, 4K, fenêtré, fullscreen)
- Rendu du damier clair/foncé dans le tool aligné sur celui du jeu pour repérage visuel rapide
- Rust-only pour la partie lourde (offline, déterministe, instantané ≤ 500 ms end-to-end)

### Non-objectifs (V2 explicite)
- Détection auto du "moi" parmi les alliés (l'utilisateur désigne par un clic post-détection)
- Fallback Vision API cloud en cas d'échec (à évaluer seulement si la CV classique échoue en pratique)
- Support d'autres combats que Harebourg
- Raccourci clavier (bloqué par un bug pré-existant, hors scope)
- Polling continu / live updates
- Détection de HP, PM/PA, buffs, line-of-sight game
- LLM local (VLM) pour la détection (décidé explicitement non — voir section "Décisions clés")

## Décisions clés

| # | Décision | Alternative rejetée | Raison |
|---|----------|---------------------|--------|
| D1 | Déclenchement à la demande (bouton) | Once au début / polling continu | Équilibre entre contrôle utilisateur et fréquence de rafraîchissement |
| D2 | Capture auto fenêtre Dofus via `CGWindowListCreateImage` | Plein écran / coller / drag-drop | Une action utilisateur, marche même si Dofus est occluse |
| D3 | Classification en 3 équipes + Harebourg | Classification complète par mob | Harebourg est le seul mob à mécanique spéciale |
| D4 | CV classique Rust (`image` + `imageproc`) | Vision API / LLM local | Map connue + marqueurs universels = priors parfaits pour CV. Latence ~100 ms vs 3-8 s |
| D5 | Remplacement total des entités à chaque détection | Merge intelligent / preview | L'utilisateur l'a explicitement choisi : "à chaque screen repositionne tout" |
| D6 | Désignation du "moi" par clic post-détection | Détection auto via flèche down | Fiabilité > 1 clic économisé |
| D7 | Calibration auto par blob detection | Coords hardcodées pour 1920×1080 | Résolution-indépendant, robuste aux tailles de fenêtre |

## Architecture globale

```
  [Click "Détecter"]
        │
        ▼
  ┌──────────────────────────────────┐
  │ Frontend (React + Redux)         │  invoke Tauri command detect_entities
  │   dispatch detectionStarted()    │
  │   → loading state UI             │
  └──────────────────────────────────┘
        │
        ▼
  ┌──────────────────────────────────┐
  │ Rust backend                     │
  │   1. Capture Dofus window (xcap) │
  │   2. Calibrate grid (blob fit)   │
  │   3. Detect entity markers       │
  │   4. Classify team (HSV colors)  │
  │   5. Identify Harebourg          │
  │   6. Compute confidence          │
  └──────────────────────────────────┘
        │
        ▼
  Return DetectionResult { entities, warnings }
        │
        ▼
  ┌──────────────────────────────────┐
  │ Frontend                         │
  │   dispatch entitiesReplaced()    │
  │   dispatch detectionSucceeded()  │
  │   → render confidence outlines   │
  │   → user clicks cell = "moi"     │
  └──────────────────────────────────┘
```

**Principes :**
- Tout le traitement lourd en Rust (capture + CV)
- Un seul appel Tauri par détection, stateless côté Rust
- Déterministe : mêmes pixels ⇒ mêmes entités détectées

## Dépendances nouvelles

- **Rust (`src-tauri/Cargo.toml`)**
  - `xcap` — capture multi-OS de fenêtres par titre/PID
  - `image` — manipulation bitmap (déjà transitive probablement)
  - `imageproc` — filtres CV, composantes connexes, template matching
- **macOS runtime**
  - Permission "Enregistrement d'écran" (Préférences Système > Confidentialité)

## Tâche 0 : encodage ground truth de la map

**Avant tout autre travail V2**, mettre à jour `src/data/harebourg-map.ts` avec la géométrie exacte de la map, à partir de l'image tactique de référence fournie par l'utilisateur (format simulateur, sans décor).

Éléments à encoder précisément :
- **Dimensions** : largeur et hauteur en cases (V1 dit 15×17, à vérifier)
- **Obstacles** : blocs de bois qui bloquent les cases et servent d'obstacles aux sorts. Observés sur la référence :
  - 1 bloc 2×2 en haut-gauche
  - 1 bloc 2×3 à l'ouest-centre
  - 1 bloc 2×2 au centre
  - 1 bloc 2×2 à l'est-centre
  - 1 bloc 1×1 isolé en bas-centre
  - 1 bloc 1×1 isolé en bas-droite (bord)
  - (Coordonnées exactes à mesurer)
- **Trous** : cases non jouables adjacentes aux obstacles (à compter et positionner)
- **Perimètre** : cases clippées aux bords de l'ovale (jouables vs hors-map)

Cette tâche débloque tout le reste du V2 (calibration grille, détection de cases valides) et corrige possiblement des bugs V1 silencieux.

## Module 1 : Capture de la fenêtre Dofus

**Emplacement** : `src-tauri/src/capture.rs`

**API publique :**
```rust
pub fn capture_dofus_window() -> Result<CapturedImage, CaptureError>;

pub enum CaptureError {
    WindowNotFound,
    WindowMinimized,
    PermissionDenied,
    CaptureFailed(String),
}

pub struct CapturedImage {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>,    // RGBA row-major
    pub scale_factor: f32,  // 2.0 sur Retina
}
```

**Implémentation :**
- `xcap::Window::all()` → filtrer par `title.contains("Dofus")`
- Si aucun match → `WindowNotFound`
- Si plusieurs matches (multi-compte) → prendre le premier (raffiner plus tard si nécessaire)
- `window.capture_image()` → bitmap RGBA
- Détection "minimisée" : si > 95 % des pixels sont proches de noir pur → `WindowMinimized`
- Mapping `xcap::XCapError::PermissionDenied` (ou équivalent) → `CaptureError::PermissionDenied`

## Module 2 : Calibration de grille

**Emplacement** : `src-tauri/src/cv/calibration.rs`

**API publique :**
```rust
pub fn calibrate(image: &CapturedImage) -> Result<GridTransform, CalibrationError>;

pub struct GridTransform {
    pub origin: (f32, f32),   // pixel de la case (0, 0)
    pub tile_w: f32,          // largeur iso d'une case en pixels
    pub tile_h: f32,          // hauteur iso (tile_w / 2 en général)
}

impl GridTransform {
    pub fn cell_to_pixel(&self, x: i32, y: i32) -> (f32, f32);
    pub fn pixel_to_cell(&self, px: f32, py: f32) -> Option<(i32, i32)>;
}

pub enum CalibrationError {
    NotInCombat,           // pas de blob ovale cohérent trouvé
    UnexpectedShape,       // ratio bbox anormal
}
```

**Pipeline :**
1. Convertir RGBA → HSV, filtrer les pixels dans la plage "tuile marron" (valeurs précises à mesurer sur fixtures)
2. Composantes connexes (`imageproc::region_labelling`) → prendre la plus grande
3. Si taille < 5 % de l'image → `NotInCombat`
4. Bounding box de ce blob → `(x_min, y_min, x_max, y_max)`
5. Si ratio `bbox_width / bbox_height` pas dans `[1.6, 2.2]` → `UnexpectedShape` (la map est ovale 2:1 iso)
6. Scale depuis la référence ground truth (établie en Tâche 0) : `tile_w = REF_TILE_W * (bbox_width / REF_BBOX_WIDTH)`
7. `tile_h = tile_w / 2`
8. `origin` = position de la case (0, 0) calculée depuis le coin haut-gauche de la bbox + offset iso (les deux issus de Tâche 0)

**Note** : les constantes `REF_TILE_W`, `REF_BBOX_WIDTH`, `REF_ORIGIN_OFFSET` sont mesurées une fois sur l'image ground truth et stockées dans `src-tauri/src/cv/reference.rs`. La calibration runtime ne fait qu'un scaling proportionnel, pas de géométrie from scratch.

**Fonctions de conversion (projection iso classique) :**
```rust
cell_to_pixel(x, y) = (
    origin.0 + (x - y) as f32 * tile_w / 2.0,
    origin.1 + (x + y) as f32 * tile_h / 2.0,
)
```

## Module 3 : Détection des entités

**Emplacement** : `src-tauri/src/cv/detection.rs`

**Stratégie : cell-first**

On itère les cases du plateau (positions projetées), au lieu de chercher des blobs dans toute l'image. Plus efficace et moins sujet aux faux positifs.

**Pipeline par cellule :**
```
pour chaque (x, y) dans cells_jouables :
    (px, py) = transform.cell_to_pixel(x, y)
    fenêtre = image.crop_around(px, py, tile_w * 1.2)
    
    score_orange = pourcentage pixels HSV in orange_range(fenêtre)
    score_bleu   = pourcentage pixels HSV in blue_range(fenêtre)
    
    si score_orange > 0.15 :
        marqueur = Enemy
        ring_quality = fit_iso_diamond(fenêtre, orange)
    sinon si score_bleu > 0.15 :
        marqueur = Ally
        ring_quality = fit_iso_diamond(fenêtre, blue)
    sinon :
        continue  # case vide
    
    # Harebourg ? seulement pour les cases Enemy
    si marqueur == Enemy :
        zone_sprite = image.crop_above(px, py, sprite_height)
        match_score = template_match(zone_sprite, HAREBOURG_TEMPLATE)
        si match_score > HAREBOURG_THRESHOLD :
            kind = Harebourg
        sinon :
            kind = Generic
    sinon :
        kind = Generic
    
    confidence = 0.6 * ring_quality + 0.4 * (match_score si Enemy else 1.0)
    
    push DetectedEntity { cell: (x, y), team, kind, confidence }
```

**Plages HSV (à calibrer sur fixtures) :**
- Orange ennemi : `H ≈ 10–30°`, `S > 60%`, `V > 50%`
- Bleu allié : `H ≈ 200–230°`, `S > 50%`, `V > 50%`

**Template Harebourg :**
- `src-tauri/assets/harebourg-template.png` — crop du haut du sprite (tête + coiffe pointue) depuis un screenshot haute résolution
- Template matching via `imageproc::template_matching`
- Seuil `HAREBOURG_THRESHOLD = 0.7` (à ajuster empiriquement)
- Fallback heuristique : le sprite le plus **haut** parmi les ennemis (coiffe pointue unique) si template match est ambigu

**Cas durs anticipés :**
- Sprites chevauchant 2 cases (gros mobs) : mitigé par la détection cell-first (chaque case testée indépendamment)
- Ombres portées polluant le mask couleur : mitigé par scoring sur forme (diamond outline) plutôt que blob
- Marqueur "tour actuel" (orange vif pulsant) : plage HSV assez large pour couvrir les deux teintes

## Module 4 : Bridge Tauri et state Redux

**Tauri command** (`src-tauri/src/commands.rs`) :
```rust
#[tauri::command]
async fn detect_entities() -> Result<DetectionResult, DetectionError>;

pub struct DetectionResult {
    pub entities: Vec<DetectedEntity>,
    pub warnings: Vec<String>,
}

pub struct DetectedEntity {
    pub cell: Cell,
    pub team: Team,           // "enemy" | "ally"
    pub kind: EntityKind,     // "harebourg" | "generic"
    pub confidence: f32,
}
```

**Nouveau slice Redux** (`src/state/slices/detectionSlice.ts`) :
```ts
type DetectionState = {
  status: 'idle' | 'detecting' | 'success' | 'error';
  lastResult: DetectionResult | null;
  error: DetectionErrorKind | null;
};
```

**Actions et flux :**
- `detectionStarted()` — le UI passe en loading
- `entitiesReplaced(entities)` — remplace toutes les entités "moi/allié/ennemi/harebourg" dans `entitySlice`, `me` est mis à `null`
- `detectionSucceeded(result)` — stocke le résultat (notamment les confidences) pour affichage
- `detectionFailed(error)` — stocke l'erreur, déclenche le toast

**Breaking change sur `EntityKind` :**
- **Avant** : `'me' | 'meStart' | 'harebourg' | 'ally' | 'neutral'`
- **Après** : `'me' | 'ally' | 'harebourg' | 'enemy'`
- Migration : au chargement des données persistées, mapper `meStart → me` (best effort) et `neutral → enemy`. Trivial.

## Module 5 : UI

**Bouton "Détecter"** (`src/ui/panels/RightPanel.tsx`) :
- Placé au-dessus de `EntityPalette`
- Icône 📷 + label "Détecter"
- États : `idle` (cliquable), `detecting` (désactivé + spinner), `error` (rouge bref, revient à idle)

**Outline de confiance** (`src/ui/grid/EntityLayer.tsx`) :
- Pour chaque entité avec `lastResult.confidence` disponible et `< 0.8` :
  - `0.5 ≤ conf < 0.8` : cercle/outline **jaune** autour de la case
  - `conf < 0.5` : outline **rouge** + petit `?` affiché
- Disparaît dès que l'utilisateur clique/touche l'entité (interprété comme "je valide")

**Damier clair/foncé** (`src/ui/grid/Cell.tsx`) :
- Calcul parité `(x + y) % 2` → deux teintes marron
- Couleurs exactes à calibrer sur screenshots réels (HSV mesuré, valeurs reportées dans `src/ui/theme.ts`)
- La parité d'ancrage (case (0,0) = claire ou foncée) doit matcher celle du jeu — valider en side-by-side

**Flux "désigner moi"** :
- Après `entitiesReplaced`, `me` est `null` et tous les alliés détectés ont `kind: ally`
- Un banner discret "Clique sur ta case pour te désigner" s'affiche au-dessus de la map
- Le premier clic sur une entité `ally` la convertit en `me` et masque le banner
- Si 0 allié détecté : pas de banner (rien à désigner), l'utilisateur peut placer `me` manuellement via la palette comme en V1

**Toasts d'erreur** :
- `WindowNotFound` → "Dofus introuvable. Lance le jeu et réessaie."
- `PermissionDenied` → "Permission refusée. Ouvre Préférences Système → Confidentialité → Enregistrement d'écran et active Harebourg Helper." avec un bouton qui ouvre le panneau (si Tauri le permet).
- `WindowMinimized` → "Dofus est minimisé. Ramène la fenêtre à l'avant-plan."
- `NotInCombat` → "Map non reconnue. Assure-toi d'être en combat Harebourg."
- `NoEntitiesFound` → toast neutre "Aucune entité détectée." (map vide appliquée quand même)

## Gestion d'erreur

**Règle générale** : si la détection échoue à n'importe quelle étape, **l'état courant de la map n'est PAS modifié**. L'utilisateur voit un toast et peut réessayer ou corriger manuellement.

**Exception** : `NoEntitiesFound` (pipeline OK mais aucune entité visible) — applique quand même un remplacement (map devient vide), car c'est un état valide (fin de combat, mob unique détecté tué, etc.).

**Confidence faible** : pas un cas d'erreur, mais une information utilisateur. L'entité est placée, l'outline visuelle indique l'incertitude, à l'utilisateur de valider/corriger.

## Testing

**Fixtures golden** (`tests/fixtures/harebourg/`) :
- Les 7 screenshots fournis (plus le tactical reference)
- Pour chacun : un `expected.json` établi manuellement
- Cas couverts : plein combat, fin de combat, mob summon, marqueur tour-actuel, Harebourg au centre, Harebourg en bord

**Tests Rust unitaires** (`src-tauri/src/cv/tests.rs`) :
- `test_calibration_oval_fit` — sur fixture, vérifier bounding box et origin cohérents
- `test_calibration_non_combat_image` — sur image hors combat → `NotInCombat`
- `test_ring_detection_orange_isolated` — fenêtre isolée contenant un anneau orange → détecté
- `test_ring_detection_blue_isolated` — idem bleu
- `test_harebourg_template_match_positive` — crop du sprite Harebourg → score > seuil
- `test_harebourg_template_match_negative` — crop d'un autre mob → score < seuil
- `test_full_pipeline_fixture_N` (un par fixture) — comparer résultat pipeline vs `expected.json` avec tolérance ±1 case

**Tests frontend** (`src/state/slices/detectionSlice.test.ts`) :
- Cycle d'états `idle → detecting → success/error`
- `entitiesReplaced` remplace bien toutes les entités, `me = null`
- Flux désignation "moi" : 1 clic sur ally → kind devient `me`

**Tests manuels** (`docs/testing/v2-manual-checklist.md`) :
- Premier lancement → prompt de permission macOS → accepter → réessayer
- Dofus fermé → message d'erreur clair
- Dofus minimisé → message spécifique
- Détection hors combat (carte du monde) → `NotInCombat` toast
- Détection réelle en combat Harebourg → entités bien positionnées
- Test sur plusieurs résolutions Dofus (windowed vs fullscreen, principal vs secondaire)

## Risques & points ouverts

- **Permission macOS "Screen Recording"** : première expérience utilisateur = prompt système. Documenter clairement le parcours dans le README.
- **Titre de fenêtre Dofus** : "Dofus" est-il toujours présent dans le titre ? À vérifier avec `xcap::Window::all()` en dev. Potentiellement varie par langue/version.
- **Harebourg avec transformation / forme alternative** : si Harebourg change de sprite en cours de combat (mécanique de boss), le template peut rater. Mitigation = plusieurs templates ou fallback heuristique "sprite le plus haut".
- **Mobs nouveaux ou cosmétiques** : si Ankama ajoute un skin saisonnier à un gardien, ça ne change rien (on détecte le marqueur au pied, pas le sprite). Harebourg en cosmétique spécial : le template peut rater → fallback heuristique prend le relais.
- **Scale factor Retina** : vérifier que `xcap` retourne bien les dimensions en pixels réels et pas en points logiques. À tester au premier dev run.

## Estimation globale

Difficulté par module (à affiner dans le plan d'implémentation) :
- Tâche 0 (encodage map) : 1-2 h (mesures sur image + update TS)
- Module 1 (capture) : 2-3 h
- Module 2 (calibration) : 4-6 h (le plus subtil)
- Module 3 (détection) : 6-8 h (calibration HSV + template)
- Module 4 (bridge + Redux) : 2-3 h
- Module 5 (UI + damier) : 3-4 h
- Tests + polish : 4-6 h

Total ordre de grandeur : **~25-30 h** de dev focalisé.
