# Harebourg map measurements

Source: `src-tauri/assets/harebourg-ground-truth.png` (tactical reference render).
Authoritative data confirmed by Renaud (Dofus player) on 2026-04-18.

## Dimensions

- **Width (W)** = 20
- **Height (H)** = 20

## Row widths (oval shape)

Each row is centered within the 20-wide span. Cells outside the row's width are `'obstacle'` (non-walkable, outside the oval playable area).

```
Row widths: [4, 8, 12, 14, 16, 16, 18, 18, 20, 20, 20, 20, 18, 18, 16, 16, 14, 12, 8, 4]
```

Visual (# = floor, . = outside):
```
      x: 01234567890123456789
              1111111111
y=00:    ........####........
y=01:    ......########......
y=02:    ....############....
y=03:    ...##############...
y=04:    ..################..
y=05:    ..################..
y=06:    .##################.
y=07:    .##################.
y=08:    ####################
y=09:    ####################
y=10:    ####################
y=11:    ####################
y=12:    .##################.
y=13:    .##################.
y=14:    ..################..
y=15:    ..################..
y=16:    ...##############...
y=17:    ....############....
y=18:    ......########......
y=19:    ........####........
```

## Holes (pit cells) — 7 total

- `(11, 2)` — upper area, between center and top
- `(4, 8)`, `(5, 8)` — mid-left pair
- `(13, 11)`, `(16, 11)` — mid-right band
- `(13, 12)` — below `(13, 11)`
- `(4, 14)` — lower-left

## Obstacles (wooden blocks) — 6 blocks, 20 cells total

| Block | Cells | Shape |
|-------|-------|-------|
| Top | `(10,0), (11,0), (10,1), (11,1)` | 2x2 |
| Mid-left | `(4,5), (5,5), (4,6), (5,6), (4,7), (5,7)` | 2x3 |
| Center (blue pool) | `(9,9), (10,9), (9,10), (10,10)` | 2x2 |
| Mid-right | `(14,11), (15,11), (14,12), (15,12)` | 2x2 |
| Lower-left | `(3,14)` | 1x1 |
| Bottom edge | `(13,18)` | 1x1 |

## Damier (checkerboard) parity

- `DAMIER_ORIGIN_PARITY = 'light'`
- Tile `(0, 0)` = lighter brown shade. Tiles where `(x + y)` is even share that shade; odd `(x + y)` are darker brown.

## Totals

- Grid size: 20 × 20 = 400 cells
- Outside (clipped corners): 108 cells (400 - 292 inside oval)
- Inside oval: 292 cells
  - Floor: 292 - 7 holes - 20 obstacle cells = **265 floor cells**
  - Holes: 7
  - Wooden-block obstacles: 20 cells (6 blocks)
