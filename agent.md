# Agent.md

**Objectif**
Mémo perso pour développer, tester et maintenir le back Loop en local.

**En 60 secondes**
1. Démarrer l'environnement dev depuis la racine :
```bash
docker compose -f docker/dev/docker-compose.yml up --build -d
```
2. Vérifier les conteneurs :
```bash
docker compose -f docker/dev/docker-compose.yml ps
```
3. Ouvrir la doc : `http://localhost:3001/docs`

Option équivalente :
```bash
cd docker/dev
docker compose up --build -d
```

**Prérequis**
- Docker
- npm
- git

**Stack**
- Node.js 20 (image Docker)
- NestJS + TypeScript
- TypeORM + PostgreSQL 16
- Swagger (NestJS Swagger) sur `/docs`
- Jest (unit + e2e)
- Zod (validation)
- Winston (logs JSON)
- Postman collection : `postman/loop-back.postman_collection.json`

**Architecture rapide**
- Point d'entrée : `src/main.ts`
- Module racine : `src/app.module.ts`
- Modules : `auth`, `users`, `discovery`, `health`
- Entités principales : users, profiles, sessions, swipes, matches, instruments, genres, health_check
- Throttling global : 100 req / 60s (sauf `/health` et `/docs`)
- Référence DB métier : `loop_db.txt` + diagramme `loop_db.png`
- Note : `loop_db` est une cible fonctionnelle, l'implémentation TypeORM en couvre une partie.

**Docker (dev)**
- Compose : `docker/dev/docker-compose.yml`
- Conteneurs : `loop_api_dev` (API, 3001), `loop_db_dev` (Postgres, 5432), `loop_pgadmin_dev` (PgAdmin, 5050)
- PgAdmin : `http://localhost:5050` (identifiants dans le compose)
- Env chargé : `.env.development`

**Docker (test)**
- Compose : `docker/test/docker-compose.yml`
- Conteneur : `loop_db_test` (Postgres, 5433)

**Docker (prod)**
- Compose : `docker/prod/docker-compose.yml`
- Conteneurs : `loop_api` (8080 interne, 3001 exposé), `loop_db`
- Env chargé : `.env.production`
- Traefik activé via labels

**Où lancer les commandes (important)**
- Tous les scripts npm se lancent dans le conteneur API (sauf `test:e2e`) :
```bash
docker compose -f docker/dev/docker-compose.yml exec api npm run <script>
```
- Ouvrir un shell dans l'API :
```bash
docker compose -f docker/dev/docker-compose.yml exec api sh
```
- Installer des dépendances (recommandé dans le conteneur) :
```bash
docker compose -f docker/dev/docker-compose.yml exec api npm install <pkg>
```

**Migrations**
- Dossier : `db/migrations`
- DataSource : `db/data-source.ts`
- Générer une migration (dev) :
```bash
docker compose -f docker/dev/docker-compose.yml exec api npm run migration:generate -- -n AddSomething
```
- Appliquer les migrations (dev) :
```bash
docker compose -f docker/dev/docker-compose.yml exec api npm run migration:run:dev
```
- Revert :
```bash
docker compose -f docker/dev/docker-compose.yml exec api npm run migration:revert
```
- En prod (dans `docker/prod`) : `npm run migration:run:prod`

**Environnement**
- Chargement auto via `src/config/configuration.ts` : `.env.${NODE_ENV}`
- Template : `sample.env`
- Dev actuel :
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://loop_user:loop_pass@db:5432/loop_dev?schema=app"
DATABASE_URL_MIGRATIONS="postgresql://loop_migrator:loop_migrator_pass@db:5432/loop_dev?schema=app"
JWT_SECRET=superSecretKey
LOG_LEVEL=debug
```
- `.env.test` et `.env.production` existent
- Note : `DATABASE_URL_MIGRATIONS` est présent mais n'est pas utilisé par le code pour l'instant.

**Auth & sécurité**
- Auth par sessions (token aléatoire, hashé en base)
- Token : `Authorization: Bearer <accessToken>`
- Durée de session : 7 jours
- Rate limits auth : register 5/min/IP, login 10/min/IP et 5/min/IP+email
- Rate limit mémoire (reset au redémarrage du conteneur)

**Endpoints clés**
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /user/me`
- `DELETE /user/me`
- `GET /user/me/profile`
- `PATCH /user/me/profile`
- `PATCH /user/me/avatar` (multipart)
- `GET /user/me/avatar`
- `GET /user/profiles` (admin only)
- `GET /user/profiles/:id/avatar`
- `GET /genres`
- `GET /instruments`
- `GET /discovery/queue?limit=20`
- `POST /swipes`
- `GET /matches`
- `GET /health`

**Conventions de réponse & erreurs**
- Format d'erreur global : `statusCode`, `message`, `error`, `timestamp`, `path`, `requestId`
- Erreurs Zod : `message.issues[]` avec `path` + `message`

**Tests**
- Lint :
```bash
docker compose -f docker/dev/docker-compose.yml exec api npm run lint
```
- Unit :
```bash
docker compose -f docker/dev/docker-compose.yml exec api npm run test
```
- E2E (drop DB, nécessite Postgres test sur `localhost:5433`) :
```bash
docker compose -f docker/test/docker-compose.yml up -d
npm run test:e2e
```
Note : `test:e2e` se lance depuis l'hôte car `.env.test` pointe sur `localhost:5433`.
- Test ciblé :
```bash
docker compose -f docker/dev/docker-compose.yml exec api npm run test -- users.service.spec.ts
```
- Objectif couverture : > 70%

**Swagger & Postman**
- Swagger : `http://localhost:3001/docs`
- Postman : `postman/loop-back.postman_collection.json`

**Exemples cURL**
```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@loop.local","pseudo":"loopster","password":"Test1234!","role":"user"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@loop.local","password":"Test1234!"}'

# Me (après login)
TOKEN="<accessToken>"
curl http://localhost:3001/user/me -H "Authorization: Bearer $TOKEN"

# Discovery queue
curl "http://localhost:3001/discovery/queue?limit=20" -H "Authorization: Bearer $TOKEN"
```

**Git & CI/CD**
- Ne jamais push sur `main`
- Créer des branches `feat/<mon-feature>`
- CI : `.github/workflows/deploy.yml`
- Pipeline : lint + tests + e2e + build, puis déploiement VPS, migrations, health check

**Troubleshooting**
- API down : `docker compose -f docker/dev/docker-compose.yml logs -f api`
- DB down : `docker compose -f docker/dev/docker-compose.yml ps` et vérifier `loop_db_dev`
- Migrations KO : relancer `npm run migration:run:dev` dans l'API
- E2E KO : vérifier que `docker/test` tourne et que `localhost:5433` est libre
- Lint/Tests KO en CI : reproduire localement avec les mêmes scripts

**Roadmap / TODO**
- Clarifier seeds/fixtures
- Compléter la doc sur le déploiement manuel
- Aligner le schéma `loop_db` et l'implémentation TypeORM
- Ajouter monitoring/alerting et logs centralisés
