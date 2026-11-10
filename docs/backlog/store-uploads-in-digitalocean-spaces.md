---
priority: p1
depends_on: []
components: [backend, deployment]
branch: backlog/store-uploads-in-digitalocean-spaces
status: incomplete
---
# Store uploaded files in DigitalOcean Spaces, cached locally

## Objective

Uploaded files (file items, images and video embedded in documents, task attachments) are stored in DigitalOcean Spaces instead of the app server's local disk, with a local cache on the app server in front of Spaces.

## Requirements / notes

- Alex, 2026-11-09: "Use Digital Ocean Spaces for storage" and "Cache locally".
- Active Storage gets a DigitalOcean Spaces service (S3-compatible: endpoint, region, bucket, access key, secret) in `backend/config/storage.yml`, used in production. Development and test keep the local disk service.
- Keys go in the encrypted Rails credentials or Coolify's environment variables, never in the repo or a frontend build argument. New variables go in `docker-compose.coolify.yml`, `docs/deployment.md` and `docs/services.md` in the same commit.
- "Cache locally": reads are served from a cache on the app server when the file is there, and fetched from Spaces (then kept) when not. Decide the mechanism (for example an nginx proxy cache in front of the Spaces URLs, or Active Storage proxy mode with a cache) and the cache size and eviction; write the choice in the feature doc.
- Existing files on local disk are copied to Spaces once (a rake task, safe to rerun), and checked before the local copies are removed.
- Adding a gem (`aws-sdk-s3`) and an external service needs Alex's go-ahead per conventions.md; this request is that go-ahead for Spaces itself.

## Open questions for Alex

- The per-Space quota default (`storage-quota-per-space-and-a-per-file-size-limit` holds 1 GB, not merged): still open.
- Which Spaces region and bucket, and whether the bucket is private (signed URLs through the app) or uses the Spaces CDN.

## Acceptance criteria

- In production, a new upload lands in the Spaces bucket, and downloading it works for anyone who can open its folder (and no one else).
- A second download of the same file is served from the local cache.
- The migration task copies every existing file and reports any it could not.
- Tests cover the service configuration and the copy task; `docs/features/uploaded_files.md`, `docs/deployment.md` and `docs/services.md` are updated and this file is removed.

## Blocked

Nothing is built yet. Needs Alex: the Spaces region and bucket, whether the bucket is private (signed URLs through the app) or on the Spaces CDN, the per-Space quota default, and the access key and secret in Coolify or the Rails credentials. It also adds the aws-sdk-s3 gem and an nginx or Active Storage proxy cache (new infrastructure). Once those are answered, build the storage.yml service, the cache and the copy rake task, then run rails test and the copy task against a staging bucket.
