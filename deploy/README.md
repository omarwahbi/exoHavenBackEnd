# Deploying the backend

How the Strapi backend gets from this repo to `admin.exohaven-iq.com`, and how the
staging copy works.

```
merge to main ──► GitHub Actions builds omarwahbi/exohaven-strapi:sha-xxxxxxx
                         │
          ┌──────────────┴───────────────┐
          ▼                              ▼
  staging (~/exohaven-staging)     production (~/exohaven)
  STRAPI_TAG=main or a sha         STRAPI_TAG=sha-xxxxxxx (pinned)
  DB rebuilt nightly from backup   real DB
  127.0.0.1:1338                   127.0.0.1:1337
  staging-admin.exohaven-iq.com    admin.exohaven-iq.com
```

Rule of thumb: a version reaches production only after it ran on staging, and
production always runs an image built by GitHub Actions from `main`, never one
built by hand.

## 1. One-time setup

### GitHub Actions → Docker Hub
1. Docker Hub → Account settings → Personal access tokens → create a token with
   **Read & Write** access.
2. GitHub → this repo → Settings → Secrets and variables → Actions → add
   `DOCKERHUB_USERNAME` (`omarwahbi`) and `DOCKERHUB_TOKEN` (the token).

Every merge to `main` then pushes `omarwahbi/exohaven-strapi:sha-<commit>` and
`:main`. Pull requests only build the image (nothing is pushed), so a broken
Dockerfile shows up as a red check on the PR.

### Production: move to the compose file in this folder
Do this once, when deploying the first image built by GitHub Actions.

1. Take a fresh backup: `bash ~/exohaven_backup.sh`
2. Check how nginx reaches Strapi, because Strapi will listen on `127.0.0.1:1337`
   only:
   `grep -rn "1337\|exohaven" /etc/nginx/`
   If nginx proxies to `127.0.0.1:1337` or `localhost:1337`, nothing changes. If you
   find nothing, stop and check how `admin.exohaven-iq.com` reaches Strapi first.
3. Keep the old file: `cp ~/exohaven/docker-compose.yml ~/exohaven/docker-compose.old.yml`
4. Create `~/exohaven/.env` from `.env.production.example`, copying the secret
   values from the old compose file, then `chmod 600 ~/exohaven/.env`. Set
   `STRAPI_TAG` to the `sha-…` tag of the image to deploy.
5. Copy `docker-compose.yml` from this folder to `~/exohaven/docker-compose.yml`.
6. Stop the old frontend container, which the site no longer uses (it runs on Vercel):
   `docker stop exohaven-nextjs && docker rm exohaven-nextjs`
7. `cd ~/exohaven && docker compose up -d`, then run the checks in section 2.

Postgres is no longer published on port 5432. Strapi reaches it over the Docker
network, and the backup script uses `docker exec`.

### Staging
1. DNS: add an `A` record `staging-admin` → the server's IP (same as `admin`).
2. Folder:
   ```sh
   mkdir -p ~/exohaven-staging && cd ~/exohaven-staging
   # from this repo's deploy/ folder:
   #   docker-compose.staging.yml → docker-compose.yml
   #   refresh-staging.sh, .env.staging.example → .env (fill in, chmod 600)
   chmod +x refresh-staging.sh
   ```
   Use new random secrets (`openssl rand -base64 32`), not production's, and never
   add ImageKit keys. Staging's database is a copy of production's, so with the keys,
   deleting an image on staging would delete it from ImageKit for the live site.
   Without them, staging stores new uploads locally.
3. First run: `./refresh-staging.sh`. It restores the newest backup and ends with
   `staging OK: N published items`.
4. nginx: add a server block for `staging-admin.exohaven-iq.com` that proxies to
   `http://127.0.0.1:1338`, the same way the `admin` block proxies to 1337, and issue
   its certificate with acme.sh like the existing one.
5. Cron (`crontab -e`): make the shop backup daily and refresh staging after it:
   ```
   0 3 * * * /root/exohaven_backup.sh > /root/exohaven_backup.log 2>&1
   30 3 * * * /root/exohaven-staging/refresh-staging.sh > /root/exohaven-staging/refresh.log 2>&1
   ```
   The nightly refresh is also a restore test: if a backup is broken, the refresh
   fails, `refresh.log` says so, and staging keeps the previous day's data.
6. Vercel → frontend project → Settings → Environment Variables: set
   `NEXT_PUBLIC_API_URL=https://staging-admin.exohaven-iq.com` for **Preview** only
   (Production keeps `https://admin.exohaven-iq.com`). Every frontend PR preview then
   runs against staging.

## 2. Releasing a new backend version

1. Merge the PR. Wait for the "Docker image" action to finish and note the tag
   (`sha-` + the first 7 characters of the merge commit).
2. Staging: set `STRAPI_TAG=sha-xxxxxxx` in `~/exohaven-staging/.env` and run
   `./refresh-staging.sh`. Click through the admin and a frontend preview.
3. Production:
   ```sh
   bash ~/exohaven_backup.sh                 # fresh backup first
   cd ~/exohaven
   sed -i 's/^STRAPI_TAG=.*/STRAPI_TAG=sha-xxxxxxx/' .env
   docker compose up -d strapi
   docker compose logs -f strapi             # Ctrl+C once it says the server started
   ```
4. Check:
   - `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:1337/_health` → `204`
   - https://exohaven-iq.com loads products and categories
   - in the admin, upload a test image (it should reach ImageKit), then delete it

### Rollback
Set `STRAPI_TAG` back to the previous tag and run `docker compose up -d strapi`.
If the new version changed the database (Strapi upgrades can), also restore the
backup taken in step 3. Ask before doing that on production.
