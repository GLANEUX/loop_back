# TP Dev Legacy — Maintenance & modernisation

Mission de maintenance sur le back-end Loop : sécuriser, monter de version, corriger, faire évoluer — **sans rien casser** (filet de tests avant/après, changelogs lus, commits atomiques, rollback documenté).

## Tableau de bord avant / après

| Indicateur | Avant | Après |
|---|---|---|
| Vulnérabilités `npm audit` | **38** (1 critique, 17 high, 17 mod, 3 low) | **20** (modérées only) |
| Dépendances majeures montées | — | **2** (Jest 29→30, uuid 13→14) |
| Build / lint | OK / 2 warnings | OK / **0 warning**, `tsc` propre |
| Tests | 111 | **114** (+1 régression C2, +2 feature C3) |

## Chantier 1 — Mise à jour & adaptation
- **Sécurité** : `npm audit fix` (non-breaking) → critique + tous les high + low éliminés (dont `@nestjs/core` 11.1.6→11.1.27, faille d'injection `path-to-regexp`).
- **Majeure Jest 29 → 30** (+ `@types/jest` 30, `ts-jest` 29.4.11) : guide de migration lu, analyse d'exposition des breaking changes, adaptation `jest.SpyInstance` → `jest.Spied`.
- **Majeure uuid 13 → 14** : Node 20 / TS 5.9 déjà conformes, `import { v4 }` inchangé.
- Non-régression : suite verte, `tsc --noEmit` propre, build OK.
- **Rollback** : `git revert e6143fb 0c7f55f` ou `cp package-lock.json.bak package-lock.json && npm ci`.

## Chantier 2 — Correctif (fuite des profils bloqués)
- **Symptôme** : un profil bloqué pouvait réapparaître dans `GET /messages/threads`.
- **Cause racine** : `swipe()` (re)formait un match via `ensureMatch` **sans vérifier `isBlocked`** (alors que `sendMessage` le faisait). Un swipe direct restaurait le match cassé par le blocage.
- **Fix** : garde `isBlocked` avant `ensureMatch` + **test de non-régression** (rouge → vert).

## Chantier 3 — Évolutif (liste des bloqués enrichie)
- `GET /user/blocks` : ajout du champ **`blocked_at`**, tri **plus récent d'abord**, paramètre **`?search=`** (prénom / nom / pseudo). 2 tests ajoutés.

## Méthode
Branche dédiée + commits atomiques (1 commit = 1 intention), filet de tests posé avant chaque modification, changelogs cités, bug reproduit avant correction, plan de rollback. Journal de bord et compte-rendu complets dans `livrable/`.
