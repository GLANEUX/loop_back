# Plan de mission — TP Dev Legacy (Loop Back)

> Projet : **loop_back** (NestJS 11 + TypeScript + TypeORM + PostgreSQL + Socket.io)
> Méthode notée : filet de tests AVANT, changelog lu, reproduction, Git/PR propre, rollback.

---

## 0. État des lieux — colonne « AVANT » (à capturer en screenshots)

| Indicateur | Avant (mesuré le 2026-06-16) |
|---|---|
| Vulnérabilités `npm audit` | **38** (1 critique, 17 high, 17 moderate, 3 low) |
| Dépendances obsolètes `npm outdated` | ~32 packages, 9 majeures disponibles |
| Build (`npm run build`) | à capturer |
| Lint (`npm run lint`) | à capturer |
| Tests (`npm test`) | 19 specs + 4 e2e — à capturer au vert |

**Captures obligatoires à faire MAINTENANT** : `npm audit`, `npm outdated`, `npm test`, `npm run build`, `npm run lint`.

**À nettoyer d'abord (hors périmètre)** : la modif locale `package.json` introduit une coquille
`tsconfig-spaths` (script `seed`) — annuler / restaurer avant de commencer.

---

## Préparation commune (méthode legacy)

1. Capturer l'état « Avant » (ci-dessus).
2. **Backup rollback** : sauvegarder `package-lock.json` (tag git ou copie) = point de retour.
3. Une **branche dédiée par chantier**, commits atomiques (1 commit = 1 intention) :
   - `chore/c1-jest-30` + `chore/c1-security-fix`
   - `fix/c2-<bug>`
   - `feat/c3-<feature>`
4. **Journal de bord** horodaté tenu au fil de l'eau (annexe attendue).

---

## Chantier 1 — Mise à jour & adaptation (5 pts) — cœur

### Volet A — Faille de sécurité corrigée (rapide, fort gain quantifié)
- `npm audit fix` ciblé : `@nestjs/core` 11.1.6 → 11.1.27 (faille **high** injection via
  `path-to-regexp`), + `body-parser` (DoS), `ajv` (ReDoS).
- **Preuve** : `npm audit` avant/après → chute du nombre de vulns.
- Vérifier build + tests verts après.

### Volet B — Montée MAJEURE avec breaking change : **Jest 29 → 30**
- Cibles : `jest 29.7.0 → 30.x` + `@types/jest 29 → 30` (+ aligner `ts-jest`).
- **AVANT** : lancer la suite complète au vert (filet figé).
- **Lire le guide de migration Jest 30** et citer les breaking changes rencontrés
  (ex. jsdom retiré des defaults, changements de config par défaut, compat `ts-jest`).
- **Refacto d'adaptation** : ajuster le bloc `jest` du `package.json` (transform, defaults),
  et tout `.spec.ts` impacté.
- **Non-régression** : la suite repasse au vert → capture.
- **Rollback documenté** :
  ```
  git revert <commit-c1> && cp package-lock.json.bak package-lock.json && npm ci
  ```

### Gain quantifié à montrer
Vulns : 38 → X ; deps obsolètes : N → M ; tests toujours verts.

---

## Chantier 2 — Correctif (3 pts)

> Méthode : **reproduire → cause racine → corriger → test de non-régression**.
> ⚠️ Reproduire AVANT de corriger (pas de fix à l'aveugle). Valider la cause par un test rouge d'abord.

### Candidat recommandé — Fuite : profils bloqués exposés dans les threads
- **Fichier** : `src/modules/messages/messages.service.ts` (`listThreads`, ~l.302-398).
- **Symptôme** : un profil bloqué (blocage actif) réapparaît dans `GET /messages/threads`
  après restauration de match.
- **Cause racine probable** : `listThreads()` ne filtre pas via `getBlockedProfileIds()`.
- **Repro** : A bloque B → B renvoie un message (match restauré) → A voit B dans ses threads.
- **Test** : spec qui fige « un profil bloqué n'apparaît jamais dans les threads ».

### Candidat alternatif — `getBlockedProfileIds()` ajoute des IDs parasites
- **Fichier** : `src/modules/users/users.service.ts` (~l.124-136).
- **Symptôme** : la méthode ajoute le propre `profileId` du demandeur à la liste d'exclusion
  (ajoute `blockerProfileId` = soi-même), polluant `excludedIds` en discovery.
- **Test unitaire** facile et déterministe.

> Choix final du bug C2 = à confirmer après reproduction réelle (étape obligatoire du TP).

---

## Chantier 3 — Évolutif (2 pts)

### Recommandé — Faire évoluer « Liste de mes utilisateurs bloqués »
- **Fichiers** : `src/modules/users/users.service.ts` (`listBlockedUsers`) +
  `users.controller.ts` (query params).
- **Évolution** : pagination (`limit`/`offset`), date de blocage (`createdAt` du Block),
  + recherche optionnelle par pseudo.
- **Testée** : spec sur pagination + format de sortie.
- Cohérent avec la branche `feat/block` en cours.

### Alternatives
- Filtrage des messages reçus de profils bloqués (`listMessages`) — plus ambitieux.
- Endpoint de déblocage enrichi (`was_blocked`, audit log) — plus léger.

---

## Clôture & livrable

- Tableau de bord colonne « Après » + capture `npm audit` après.
- Historique Git propre + **PR** avec description (accès lecture `@celianlb`).
- Journal de bord horodaté (annexe).
- **Compte-rendu PDF** : page de garde, reprise en main, avant/après, fiche de cadrage,
  C1/C2/C3 (diff + changelog + tests verts + repro), bilan & rétro legacy.
- Secrets masqués dans toutes les captures.

## Mapping barème (/20)
- Méthode legacy (6) : filet, changelog cité, repro, Git/PR, rollback.
- C1 (5) : Jest 30 + faille corrigée + refacto + non-régression + gain quantifié.
- C2 (3) : cause racine + test de non-régression.
- C3 (2) : feature testée, intégrée proprement.
- Preuves (2) : tableau avant/après, diffs, captures, historique Git.
- Journal & rétro (2).
- Bonus (+1) : migration épineuse bien gérée / filet exemplaire / doc laissée.
