## Production and deployment

### Hands off production

- Deploys happen only through GitHub Actions on push to `main` (or a manual run of the Deploy workflow). The README's "Deploy" section is the operational runbook. Capistrano, Passenger, and RVM are gone, so ignore any mention of them.
- The VPS hosts other apps. **Do not SSH to production, run commands against the prod database or Spaces, or change GitHub secrets or variables.** Hand those steps to the user as exact commands.
- Secrets live in the encrypted Rails credentials (`backend/config/credentials.yml.enc`, key in the gitignored `backend/config/master.key`) and in GitHub Actions secrets. Never print them, commit them, or put them in `VITE_*` variables (those ship to the browser).

### Project settings

| Setting | Project value |
| --- | --- |
| App identifier / Docker image | `ironyoung-web` / `ghcr.io/kriogenx0/ironyoung-web:latest` |
| Production branch | `main` |
| Domain and aliases | `ironyoung.com` |
| VPS SSH target | `deploy@ironyoung.com` (shared host) |
| Remote app directory | `/var/www/ironyoung.com` |
| Certificate contact | set as `CERTBOT_EMAIL` in `deploy/deploy.sh` |
| Backend directory / Compose service / container port | `backend` / `api` / `3000` |
| Frontend directory / build output | `web` / `web/dist` (`index.html`, `pricing.html`, `app.html`, ...) |
| Runtime versions | Ruby 3.3.5 (`backend/.ruby-version`), Node 22 (workflows), MySQL 8.4 |
| Managed MySQL cluster | `DATABASE_HOST` secret, port `25060` (`DATABASE_PORT` variable) |
| App database names | `DATABASE_NAME` or credentials `database.prod.name` (default `iron_young`) |
| Spaces bucket / region | `mitera` / `nyc3`, every key under `pp/` (the bucket is shared with other projects) |
| Spaces origin endpoint | `https://nyc3.digitaloceanspaces.com` |
| Resend sender | `info@ironyoung.com` (hardcoded in `ApplicationMailer`) |
| Shared host bootstrap repository | `~/Sites/server-config` (bootstrapping only; never this app's deploy) |

### Where this repo differs from the standard

The standard below is the target. As of 2026-09-27 this repo departs from it in these ways. Fix one only when the user asks, or when you're already changing that area, and say which item you addressed.

- **Host key not pinned:** the workflow runs `ssh-keyscan` at deploy time instead of using a verified known-hosts entry.
- **Spaces config:** the keys come from encrypted credentials (`spaces:`), not `SPACES_*` environment variables, and the bucket, endpoint, and prefix are hardcoded in `backend/config/storage.yml`. Instead of a production startup check, the Deploy test job fails if `RAILS_MASTER_KEY` can't decrypt the keys. The optional CDN host is the one Spaces setting read from the environment (`SPACES_CDN_HOST`).
- **`.env` writing:** `deploy.sh` doesn't validate database settings before writing, writes the file in place rather than atomically, and silently skips empty values. It does use `umask 077` and mode `0600`.
- **Old uploads:** the Compose `storage` volume still holds pre-Spaces uploads until `storage:migrate_to_spaces` runs.

### Deployment standard

This is the deployment standard, with this project's values filled in. Preserve this architecture when you implement features or change infrastructure.

#### Architecture and ownership

- GitHub Actions runs CI and builds production artifacts. The VPS receives a completed backend Docker image and frontend build over SSH.
- Run the backend with Docker Compose on the existing Ubuntu VPS. Host nginx serves the frontend and terminates HTTPS, forwarding API requests to the container over a loopback port.
- Use the existing DigitalOcean managed MySQL cluster. Production Compose does not run a database container. Create app-specific databases on that cluster; do not provision a new cluster by default.
- Store production uploads in DigitalOcean Spaces. Keep local disk storage for development/test and temporary runtime files.
- The shared host bootstrap owns Docker, Compose, nginx, certbot, the deploy account, shared nginx snippets, and common host permissions. The application repository owns its remote app directory, Compose file, runtime environment, nginx vhost, certificate invocation, and deployment script.
- Preserve this image-transfer deployment model. Do not introduce a registry, build source on the VPS, or replace it with another hosting/deployment platform unless requested.
- The VPS hosts other applications. Scope changes to this app's containers, files, nginx vhost, databases, and storage. Avoid global Docker pruning, host-wide service restarts, or changing shared infrastructure as part of routine deployment.

#### Repository contract

Maintain these files, or documented equivalents:

```text
.github/workflows/ci.yml
.github/workflows/deploy.yml
backend/Dockerfile
backend/bin/docker-entrypoint
docker-compose.yml                  # local development
docker-compose.prod.yml             # prebuilt production image
deploy/deploy.sh                     # repeatable app deployment
deploy/server_setup.sh               # one-time app database setup
deploy/server/sites-available/ironyoung.com.bootstrap.conf
deploy/server/sites-available/ironyoung.com.conf
deploy/server/sudoers.d/ironyoung-web
.env.example                        # names/placeholders only; explicitly unignored
README.md                           # setup, secrets, checks, deploy and recovery
```

#### CI and deployment gate

1. Run CI on pushes, pull requests, and manual dispatch. Use read-only repository permissions unless a job requires more.
2. Backend CI starts a disposable MySQL service, waits for readiness, installs locked dependencies, prepares test databases, and runs the full test suite. Never connect CI tests to production MySQL, Spaces, or email/payment services.
3. Frontend CI runs `npm ci`, `npm run lint`, and `npm run build`, including type checking and any project-specific static page checks. Run existing frontend tests where present.
4. Keep runtime versions consistent across version files, Dockerfiles, and workflows. Use lockfiles and bounded job timeouts.
5. Deploy automatically on pushes to `main`; allow manual deployment of the production branch. Deploy only the exact commit whose required backend and frontend checks passed. Separate workflows firing on the same push do not establish a dependency: use reusable CI jobs or equivalent jobs with explicit `needs` in the deploy workflow.
6. Serialize production deployments with a deployment concurrency group and `cancel-in-progress: false`. Do not interrupt an active remote deployment with a newer push.
7. Build the frontend with its production public settings, normally `VITE_API_BASE_URL=/api/v1`. Build the backend Dockerfile's `production` stage in Actions for the VPS architecture.
8. Load the built image on the runner, then transfer it using `docker save ... | gzip | ssh ... 'gunzip | docker load'`. Enable pipeline failure propagation. Transfer the frontend artifact and run the repository's `deploy/deploy.sh` from CI.

Use a GitHub secret for the deploy SSH key and a verified known-hosts entry for the VPS. Pin the server identity; do not disable host-key checking.

#### Runtime configuration and secrets

GitHub Actions explicitly passes an allowlist of settings to the deployment script. The script writes a complete remote `.env` over SSH with `umask 077` and mode `0600`. Validate required values first, encode values safely for Compose, and replace the file atomically. Do not print secrets or depend on manually edited values surviving the next deployment.

| Setting | Handling |
| --- | --- |
| `DEPLOY_SSH_KEY` | Actions secret, CI only |
| Verified SSH known-hosts entry | CI configuration, independently verified |
| `RAILS_MASTER_KEY`, `SECRET_KEY_BASE` | Runtime secrets for Rails projects |
| `DATABASE_HOST`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Runtime connection settings; password is secret |
| `DATABASE_PORT` | Runtime setting, normally `25060` |
| `DATABASE_NAME`, optional cable database name | App-specific configuration; wire into the framework if using these variables |
| `SPACES_ACCESS_KEY_ID`, `SPACES_SECRET_ACCESS_KEY` | Runtime secrets |
| `SPACES_BUCKET`, `SPACES_REGION`, `SPACES_ENDPOINT` | Runtime settings |
| `RESEND_API_KEY`, `MAIL_FROM` | Runtime email key and verified sender |
| `HOST_PORT` | Assigned once on VPS and preserved across deployments |
| Optional Google, Stripe, analytics settings | Explicitly wire only integrations used by this app |

Environment variables take precedence over any documented encrypted-credentials fallback. Never bake production secrets into images, frontend bundles, build arguments, or Git. `VITE_*` settings are public browser configuration, even when their values originate in GitHub Secrets. Adding a runtime setting requires updating the workflow, deploy-script allowlist, application configuration, and documentation together.

#### VPS deployment sequence

Make `deploy/deploy.sh` fail fast and safe to rerun:

1. Validate required configuration and built frontend files before changing the host.
2. Ensure `/var/www/ironyoung.com` exists and belongs to the deploy account. Copy production Compose as `docker-compose.yml` and install the frontend under `web/`.
3. Reuse `HOST_PORT` from the app's existing `.env`, or allocate an available loopback port on first deployment. Persist it and render it into nginx. Handle allocation conflicts with other deployments.
4. Write the runtime environment using the explicit allowlist. Production Compose uses `env_file: .env`, `restart: unless-stopped`, and `127.0.0.1:${HOST_PORT}:3000` for the backend port. Run the application as a non-root container user.
5. Start the loaded image with `docker compose up -d --force-recreate --no-deps --pull never api`. Do not build on the host or pull an unrelated image.
6. For Rails, the server entrypoint runs `bin/rails db:prepare` before `exec` of the server. Coordinate migrations if additional processes are introduced. Never reset databases or load demo seeds in production.
7. Wait for Docker health to become healthy with a bounded timeout. A Rails `/up` endpoint must verify a real database query and return an error status if it fails. Use `127.0.0.1` in the container check. On failure, report status and recent container logs and fail deployment.
8. On first deploy, install an HTTP-only nginx vhost with the ACME challenge path. Obtain the certificate using `certbot certonly --webroot -w /var/www/certbot` for the configured domains. Only then install the HTTPS vhost.
9. Run `nginx -t` before reloading nginx. Use webroot certificate renewal and the host's renewal timer; ensure renewed certificates are reloaded. Keep certificate commands consistent with the app-specific sudoers grant.
10. Verify the public frontend and a real API response over HTTPS. An internal container check alone does not verify nginx, DNS, or TLS. Report the deployed commit and verification results.

One-time sudoers installation belongs to the host administrator. Validate it with `visudo` and scope permissions to this app's paths and certificate command; the deploy account must not grant itself additional permissions.

#### nginx and TLS

Serve static frontend assets from the app's `web/` directory. Proxy `/api/`, `/cable` when used, and `/rails/active_storage/` for Rails attachments. Forward the original host, client forwarding headers, and HTTPS scheme; support WebSocket upgrade headers on `/cable`.

Redirect HTTP and configured aliases to the canonical HTTPS origin. Use the host's shared ACME and SSL snippets. Cache fingerprinted assets for a long duration, but keep HTML refreshable. Configure only real SPA route prefixes to receive the app shell, preserving generated marketing pages and actual 404 responses. Set upload limits appropriate to the app.

Configure framework proxy/SSL handling, secure cookies, mailer URLs, attachment URLs, and frontend links for the same public HTTPS origin.

#### DigitalOcean managed MySQL

Use app-specific databases with `utf8mb4` on the existing cluster, and a database user scoped to them where available. Add the VPS to the cluster's Trusted Sources; allow a setup machine only when needed. Use TLS for production connections (`ssl_mode: required` in this Rails reference); configure CA verification where supported. Keep database credentials out of command-line arguments and logs.

Rails with Solid Cable uses a separate cable database on the same cluster, with `db/cable_migrate` migrations. This architecture does not require Redis for Action Cable. Add other persistent job/cache services only when the application actually needs them. Document backup retention and restoration for the existing managed database before risky migrations.

#### DigitalOcean Spaces uploads

Use the existing app-designated Space with credentials scoped to the required bucket. Keep objects private by default and serve authorized uploads through signed URLs or application authorization. Use the regional origin endpoint for S3 operations; a CDN hostname is a separate delivery setting. Configure bucket CORS for the app's origins when browser direct uploads are used.

For Rails, add `aws-sdk-s3` and configure Active Storage, for example:

```yaml
# backend/config/storage.yml
spaces:
  service: S3
  access_key_id: <%= ENV['SPACES_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['SPACES_SECRET_ACCESS_KEY'] %>
  region: <%= ENV['SPACES_REGION'] %>
  bucket: <%= ENV['SPACES_BUCKET'] %>
  endpoint: <%= ENV['SPACES_ENDPOINT'] %>
```

Select `config.active_storage.service = :spaces` in production and validate these settings at production startup. Development/test use disk services and must boot without Spaces secrets. Keep attachment metadata in MySQL. Verify upload, authorized download, and deletion with a disposable object.

Changing the configured service does not migrate existing uploads. Copy and verify existing objects and update their stored service references through a deliberate migration before retiring local storage. Preserve originals until migration is verified.

References: [Rails Active Storage](https://guides.rubyonrails.org/active_storage_overview.html), [Spaces S3 endpoint and credentials](https://docs.digitalocean.com/reference/api/spaces/).

#### Supporting platform services

- **Resend:** standard transactional email provider. Configure the API key, verified sending domain and its required DNS records, sender address, and canonical HTTPS links. Stub delivery in tests; validate delivery using a controlled recipient during rollout.
- **Let's Encrypt / certbot:** HTTPS certificates managed on the VPS with nginx and webroot challenges.
- **GitHub Actions and repository secrets:** CI, build, deployment orchestration, and secret delivery.
- **Google sign-in, when used:** configure the client ID on both backend and frontend, register production and local browser origins, and validate ID tokens on the backend. Do not bundle a client secret.
- **Stripe, when used:** configure API keys, webhook signing secret, public publishable key, and app-specific price IDs. Keep test/live settings distinct and verify webhook signatures. Include backend settings in the runtime allowlist.
- **Analytics, error reporting, and uptime monitoring, when used:** document the selected service and configuration. Keep administrative tokens on the server. Do not introduce new paid services automatically.

#### Validation, recovery, and reporting

Before delivering deployment changes, run relevant application checks and validate shell scripts, workflows, Compose, and nginx configuration in suitable environments. For the Rails/React reference, the application checks are `bin/rails test` in the prepared backend test environment and `npm ci`, `npm run lint`, `npm run build` in `web/`.

Retain a known-good image and matching frontend build for recovery; preferably label artifacts with the commit SHA even if deployment uses `latest`. Document how to reload the previous image, restore the matching frontend, recreate the service, and recheck health. Schema changes must remain compatible with rollback, or have a documented recovery procedure. Do not automatically run destructive down migrations.

This Compose recreation method may cause a brief interruption and is not an atomic or zero-downtime deployment. Do not claim otherwise. A deployment is complete only after remote health and public checks pass. Distinguish local validation from an actual deployment, report anything unverified, and keep the README aligned with the final configuration.
