# Harebourg Helper

Tactical simulator for the Count Harebourg boss fight in Dofus. Desktop app built with Tauri (Rust + React).

## Dev

```bash
npm install
npm run tauri:dev
```

## Tests

```bash
npm run test          # TypeScript (vitest)
npm run typecheck
cd src-tauri && cargo test
```

## macOS: Autorisation d'enregistrement d'écran

La fonction "Détecter" capture la fenêtre Dofus via l'API macOS `CGWindowListCreateImage`,
ce qui nécessite la permission **Enregistrement de l'écran**.

Au premier clic sur "Détecter", macOS te demandera d'autoriser l'app. Si tu as refusé :

1. Ouvre **Préférences Système** → **Confidentialité et sécurité** → **Enregistrement de l'écran**
2. Active la case à côté de **Harebourg Helper**
3. Quitte et relance l'app
4. Clique à nouveau sur **Détecter**
