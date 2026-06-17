# Compte-rendu de mission — Dev Legacy

> **Rendu final attendu en PDF.** Ce `.md` est la source : tu le remplis au fil de l'eau,
> tu déposes les captures dans `livrable/captures/<section>/`, puis tu exportes en PDF.
> ⚠️ Masquer tout secret / clé / mot de passe dans les captures.

---

## 0. Page de garde

- **Projet** : Loop — Back-end API (NestJS + TypeScript + TypeORM + PostgreSQL)
- **Équipe & rôles** :
  - `<Nom 1>` — `<rôle / chantiers>`
  - `<Nom 2>` — `<rôle / chantiers>`
- **Lien du dépôt** : `<url repo>`
- **Lien de la PR** (accès lecture `@celianlb`) : `<url PR>`
- **Date de la mission** : 2026-06-16

> *(Groupe)* Qui a fait quoi — voir aussi le détail en fin de chaque chantier.

---

## 1. Reprise en main

- **État du projet au retour** : l'app compile et la majorité des tests passent, mais plusieurs frictions empêchaient un démarrage « propre » immédiat (voir ci-dessous).
- **Temps pour le faire tourner** : `<à compléter>`
- **Frictions rencontrées** :
  1. **Coquille dans `package.json`** : le script `seed` référençait `tsconfig-spaths`
     (au lieu de `tsconfig-paths`) → cassait `npm run seed`. *Corrigé.*
  2. **`dist/` appartenant à `root:root`** (créé par un conteneur Docker en root) :
     `npm run build` échouait avec 213 erreurs `TS5033: EACCES permission denied`
     — **pas une erreur de code**, juste l'impossibilité d'écrire dans `dist/`.
     *Corrigé : suppression de `dist/` puis rebuild OK.*
  3. **3 tests rouges au retour** (`profile.entity.spec.ts`, `discovery.service.spec.ts`) :
     les fixtures n'avaient pas suivi l'ajout des champs profil obligatoires
     (`phoneNumber`, `audio_presentation`). *Corrigé : filet remis à 111/111.*
  4. **Base de données down + réseau Docker périmé** : `loop_db_dev` était arrêté depuis
     2 mois ; l'API tournait mais ne résolvait plus l'hôte `db` (`getaddrinfo EAI_AGAIN db`).
     Un `restart` ne suffisait pas (conteneur API attaché à un état réseau périmé).
     *Corrigé : `docker compose ... up -d --force-recreate` → API up sur le port 3001.*

### Démarrage (procédure reproductible)
> Variables : rien à ajouter — l'app lit `.env.${NODE_ENV}` soit **`.env.development`**, déjà
> complet (`DATABASE_URL` → `db:5432`, `JWT_SECRET`, …). Le `.env` racine (URL Prisma) est un
> résidu **non utilisé** par ce projet NestJS/TypeORM.

```bash
docker compose -f docker/dev/docker-compose.yml up -d --force-recreate
docker compose -f docker/dev/docker-compose.yml exec api npm run migration:run:dev  # si pending
docker logs -f loop_api_dev   # attendre "🚀 API running on port 3001"
```

📸 **Capture obligatoire** : le projet qui démarre → `captures/01-reprise/projet-demarre.png`

---

## 2. Tableau de bord — colonne « Avant »

| Indicateur | Avant |
|---|---|
| Vulnérabilités (`npm audit`) | **38** (1 critique, 17 high, 17 moderate, 3 low) |
| Dépendances obsolètes (`npm outdated`) | ~32 packages, 9 majeures disponibles |
| Build / lint OK ? | Build ✅ OK (après correctif `dist/`) · Lint ✅ 0 erreur, 2 warnings prettier |
| Nb de tests / couverture | **111 tests** (19 suites) — verts après correctif fixtures — couverture `<à compléter via npm run test:cov>` |
| (Back) temps de réponse clé | `<ex. GET /discovery/queue : X ms>` |

📸 **Captures obligatoires** :
- `captures/02-avant/npm-audit-avant.png`
- `captures/02-avant/npm-outdated-avant.png`
- `captures/02-avant/tests-verts-avant.png`

---

## 3. Fiche de cadrage

| Chantier | Détail | « Fait » = quand… |
|---|---|---|
| **C1 — Mise à jour** | Faille : `@nestjs/core` 11.1.6 → 11.1.27 (high, injection path-to-regexp) **+** Majeure : `jest` 29 → 30 (+`@types/jest`, `ts-jest`). **Rollback** : `git revert` + restore `package-lock.json` + `npm ci`. | Vulns réduites, Jest 30 en place, suite verte, gain quantifié documenté |
| **C2 — Correctif** | Bug : `<bug confirmé par repro>` — fichier(s) : `src/modules/messages/messages.service.ts` (`listThreads`) *ou* `src/modules/users/users.service.ts` (`getBlockedProfileIds`) | Reproduit, cause racine identifiée, corrigé, test de non-régression vert |
| **C3 — Évolutif** | Feature : évolution « liste de mes bloqués » (pagination + date de blocage + recherche) — `users.service.ts` (`listBlockedUsers`), `users.controller.ts` | Implémentée, testée, intégrée proprement |

> Rappel énoncé : pas d'upgrade purement cosmétique, pas de réécriture complète.

---

## 4. C1 — Mise à jour & adaptation

### 4.1 Dépendances montées (avant → après)

**Volet sécurité** — `npm audit fix` (non-breaking, sans `--force`) : seul `package-lock.json`
a changé (les bornes `^` de `package.json` couvraient déjà les correctifs).

| Dépendance | Avant | Après | Type |
|---|---|---|---|
| `@nestjs/core` | 11.1.6 | 11.1.27 | faille **high** corrigée (injection path-to-regexp) |
| `ws`, `body-parser`, `@babel/core`, `brace-expansion`… | (transitifs) | corrigés | failles critique/high/low |
| `jest` | 29.7.0 | 30.x | **majeure** (breaking) — *en cours* |
| `@types/jest` | 29.x | 30.x | aligné — *en cours* |

**Résultat sécurité mesuré** : **38 → 21 vulnérabilités** (1 critique + 17 high + 3 low **éliminés** ;
restent 21 modérées). Filet vert maintenu : 111/111.

### 4.2 Breaking changes rencontrés (Jest 30)
- `<breaking change #1 + extrait du changelog officiel>`
- `<breaking change #2>`

📎 **Extrait du changelog / guide de migration** : `<coller le passage cité>`

### 4.3 Code adapté
- `<fichier + nature du refacto : bloc jest{} de package.json, specs impactées…>`

### 4.4 Plan de rollback
```bash
git revert <hash-commit-c1>
cp package-lock.json.bak package-lock.json && npm ci   # retour à l'état figé
```

### 4.5 Preuves
📸 `captures/04-c1/diff-avant-apres.png` · `captures/04-c1/changelog-jest30.png` · `captures/04-c1/tests-verts-c1.png`

### 4.6 Qui a fait quoi
`<nom>`

---

## 5. C2 — Correctif

- **Symptôme observé** : `<ce que voit l'utilisateur / l'API>`
- **Reproduction** (avant fix) : `<étapes / appels API exacts>`
- **Cause racine** : `<le pourquoi technique précis>`
- **Correction** : `<ce qui a été changé + fichier:ligne>`
- **Test de non-régression** : `<nom du test ajouté>`

📸 `captures/05-c2/comportement-avant.png` · `captures/05-c2/comportement-apres.png` · `captures/05-c2/test-c2-vert.png` · `captures/05-c2/diff-c2.png`

### Qui a fait quoi
`<nom>`

---

## 6. C3 — Évolutif

- **Besoin** : `<pourquoi cette feature>`
- **Implémentation** : `<ce qui a été ajouté + fichiers>`
- **Test** : `<nom du test>`

📸 `captures/06-c3/feature-demo.png` · `captures/06-c3/test-c3-vert.png` · `captures/06-c3/diff-c3.png`

### Qui a fait quoi
`<nom>`

---

## 7. Tableau de bord — colonne « Après » + hygiène Git

| Indicateur | Avant | Après |
|---|---|---|
| Vulnérabilités (`npm audit`) | 38 | `<X>` |
| Dépendances obsolètes | ~32 | `<M>` |
| Build / lint OK ? | `<…>` | `<…>` |
| Nb de tests / couverture | `<…>` | `<…>` (tests ajoutés C2/C3) |
| Temps de réponse clé | `<…>` | `<…>` |

📸 `captures/07-apres/npm-audit-apres.png` · `captures/07-apres/historique-git.png` · `captures/07-apres/pr.png`

---

## 8. Bilan & rétro legacy

- **Ce que les vieilles deps / le vieux code ont coûté** : `<temps perdu, pièges>`
- **Ce qu'on changerait dans nos habitudes** : `<tests systématiques, mises à jour régulières (Dependabot), doc .env, commits atomiques…>`

---

## Annexe — Journal de bord
Voir [`JOURNAL-DE-BORD.md`](./JOURNAL-DE-BORD.md).
