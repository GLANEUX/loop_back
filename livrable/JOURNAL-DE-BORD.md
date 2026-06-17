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
- `11hXX` — Lecture du guide officiel (upgrading-to-jest30) AVANT upgrade. `grep` des patterns
  cassants : 0 matcher déprécié, 1 seul `jest.SpyInstance` (health.service.spec.ts).
- `11hXX` — `npm i -D jest@^30 @types/jest@^30 ts-jest@latest` → jest 30.4.2, ts-jest 29.4.11.
  Bonus vulns 21 → 20.
- `11hXX` — `npm test` direct → **111/111** (ts-jest ne type-check pas au runtime).
- `11hXX` — Vérif type-check : `@types/jest` 30 garde `SpyInstance` (alias) → `tsc` propre.
  Modernisation quand même : `SpyInstance` → `jest.Spied`. tsc propre, 111/111, build OK. Commit.

### C1 — Bonus 2ᵉ majeure uuid 13 → 14
- `12hXX` — Lecture changelog uuid v14 (Node ≥20, TS ≥5.4.3 — déjà OK ; `import { v4 }` inchangé).
  Upgrade `uuid@^14`. tsc/tests/build OK + sanity runtime v4. Sans refacto (peu épineux).

### C2 — Correctif (fuite profils bloqués)
- `13hXX` — Symptôme : un profil bloqué réapparaît dans `GET /messages/threads`.
- `13hXX` — Repro (test rouge) : `swipe()` restaure un match soft-deleted malgré le blocage.
- `13hXX` — **Cause racine** : `swipe()`/`ensureMatch` ne vérifiait pas `isBlocked` (alors que
  `sendMessage` oui) ; `blockUser` ne supprime que le match, pas les swipes `isLike`.
- `14hXX` — Fix : garde `isBlocked` avant `ensureMatch`. Test rouge → vert. Suite 112/112. Commit.

### C3 — Évolutif
- `15hXX` — Feature `<…>` implémentée + test.

### Clôture
- `16hXX` — `npm audit` après : `<X>` vulns. Tableau « Après » rempli.
- `16hXX` — PR ouverte, accès lecture `@celianlb`.
