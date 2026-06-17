# Journal de bord — Dev Legacy (2026-06-16)

> Log horodaté de la journée, **y compris les impasses** (c'est valorisé).
> Format : `HHhMM — action → observation → décision`.

- `09h00` — Lecture de l'énoncé, analyse du projet (NestJS 11, 19 suites de tests).
- `09hXX` — **Nettoyage Git** : WIP block non commité rangé en 2 commits atomiques sur
  `feat/block` ; coquille `package.json` (`tsconfig-spaths`) réparée ; branche `tp/dev-legacy`
  créée depuis `feat/block`.
- `09hXX` — Backup `package-lock.json` → `package-lock.json.bak` (point de rollback).
- `09hXX` — **Friction build** : `npm run build` → 213 erreurs `TS5033 EACCES`.
  Diagnostic : `dist/` appartenait à `root:root` (conteneur Docker). → `rm -rf dist` → rebuild OK.
- `09hXX` — **Friction tests** : 3 tests rouges (fixtures profil périmées vs nouveaux champs
  obligatoires `phoneNumber`/`audio_presentation`). → fixtures mises à jour → **111/111 verts**.
- `09hXX` — État « Avant » figé : 38 vulns (`npm audit`), ~32 deps obsolètes, build ✅, 111 tests ✅.
  Captures faites : `npm audit`, `npm outdated`, `npm test`.
- `10hXX` — **Friction Docker** : `loop_db_dev` arrêté depuis 2 mois → API en `EAI_AGAIN db`.
  `restart` insuffisant (réseau périmé) → `docker compose up -d --force-recreate` →
  API up sur :3001 ("🚀 API running on port 3001"). Capture `projet-demarre` à faire.

### C1 — Sécurité
- `11hXX` — `npm audit fix --dry-run` pour comprendre l'impact (116 paquets, non-breaking).
- `11hXX` — `npm audit fix` appliqué → **38 → 21 vulns** (critique + 17 high + 3 low éliminés).
  Seul `package-lock.json` modifié. `npm test` → **111/111**. `npm run build` → OK. Commit atomique.

### C1 — Majeure Jest 29 → 30
- `10hXX` — Suite verte avant upgrade (filet figé).
- `10hXX` — Lecture du guide de migration Jest 30 : breaking changes notés `<…>`.
- `11hXX` — `npm i -D jest@30 @types/jest@30` → build/test cassé sur `<…>` → corrigé par `<…>`.
- `11hXX` — Suite verte après adaptation.

### C2 — Correctif
- `13hXX` — Reproduction du bug `<…>` (avant de corriger).
- `13hXX` — Cause racine : `<…>`.
- `14hXX` — Test rouge ajouté → fix → test vert.

### C3 — Évolutif
- `15hXX` — Feature `<…>` implémentée + test.

### Clôture
- `16hXX` — `npm audit` après : `<X>` vulns. Tableau « Après » rempli.
- `16hXX` — PR ouverte, accès lecture `@celianlb`.
