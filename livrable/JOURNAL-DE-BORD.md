# Journal de bord — Dev Legacy (2026-06-16)

> Log horodaté de la journée, **y compris les impasses** (c'est valorisé).
> Format : `HHhMM — action → observation → décision`.

- `09h00` — Lecture de l'énoncé, prise en main du projet. État au retour : `<…>`
- `09hXX` — Capture de l'état « Avant » : `npm audit` (38 vulns), `npm outdated`, `npm test`.
- `09hXX` — Backup `package-lock.json` (point de rollback).

### C1 — Sécurité
- `10hXX` — `npm audit fix` ciblé `@nestjs/core` → `<résultat, vulns restantes>`.

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
