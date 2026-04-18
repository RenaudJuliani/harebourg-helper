# V2 Auto-Detection — Manual Testing Checklist

Run through this before shipping V2.

## Setup
- [ ] Fresh macOS user session (no cached permissions)
- [ ] Dofus running in fullscreen on main display
- [ ] Combat Harebourg engaged, first turn

## Happy path
- [ ] Click "Détecter" → entities populate within 1s
- [ ] Harebourg is correctly identified and placed
- [ ] Banner appears: "Clique sur ta case pour te désigner"
- [ ] Clicking a blue (ally) entity → it becomes 'me', banner disappears
- [ ] Re-clicking "Détecter" after movement → entities re-populate correctly

## Permission flow
- [ ] First launch: clicking "Détecter" triggers macOS permission prompt
- [ ] Denying permission → toast "Permission refusée…" appears
- [ ] Grant permission in System Preferences → retry "Détecter" → works

## Error cases
- [ ] Dofus closed → "Dofus introuvable" toast
- [ ] Dofus minimized → "Dofus est minimisé" toast
- [ ] Dofus on world map (not combat) → "Map non reconnue" toast
- [ ] Dofus in a non-Harebourg combat → "Map non reconnue" toast (acceptable false positive or false negative here)

## Edge cases
- [ ] Dofus in windowed mode, small window → detection still works
- [ ] Dofus on secondary monitor → detection works
- [ ] Multiple entities occluding each other → at worst 1 missed, noted in warning
- [ ] Low-confidence detections → yellow/red outline visible; clicking the entity clears the outline

## Damier alignment
- [ ] Open tool map side-by-side with game screenshot → light/dark pattern matches (no offset)
- [ ] Toggle mode, verify damier still correct

## Persistence
- [ ] Close app with some entities placed
- [ ] Reopen app → entities restored
- [ ] Legacy save file (if any) with `meStart` / `neutral` kinds → migrates cleanly to `me` / `enemy`
