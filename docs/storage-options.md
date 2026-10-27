# Storage options for Inertia

Date: 2026-10-08  
Status: proposal, not an implemented storage migration.

## Recommendation

Keep **database-backed hosted workspaces** and **optional local task files** as two clearly identified ways to use Inertia. Store large hosted attachments in object storage when ready. Initially connect the two modes through explicit import/export, not continuous bidirectional synchronization.

This preserves the gradual native-app direction without sacrificing the existing web app, folder dashboards, task queries, and relationships. It also leaves room for people to keep files in iCloud Drive, Dropbox, or a compatible synced folder.

The decision is primarily about **who owns the authoritative copy and how people collaborate**, rather than which storage engine is cheapest.

## What exists today

- The Rails app stores document content as JSON in MySQL. Tasks, epics, events, users, folders, and associations are database records. See [Document](../backend/app/models/document.rb) and [the schema](../backend/db/schema.rb).
- Attachments use Active Storage; the configured storage services are currently disk-based, not a live object-store deployment. See [storage configuration](../backend/config/storage.yml).
- The native app opens local task files using the same public entity shapes. Files remain independent of server records. Milestones are events; sprints and comments are file extensions.
- The [v4 task format](task-file-format.md) is not a complete workspace archive: referenced requirements documents, folders, and attachments are not bundled. Shared models do not yet provide import/export or synchronization.

## Four different meanings of “storage”

| Approach | Authoritative data | Main advantage | Main cost |
| --- | --- | --- | --- |
| Database entities | MySQL rows and document JSON | Queries, relationships, server authorization | Offline editing needs a cache and synchronization protocol |
| Whole file in a database | One JSON/BLOB value per file | Central management of a self-contained file | Still requires parsing/indexing for task-level queries |
| Whole file in blob/object storage | Object bytes, usually with database metadata | Good fit for attachments, exports, snapshots | Task queries and concurrent edits need additional systems |
| User-owned files | Files opened through the operating system | Portability, local use, choice of sync provider | Conflicts, availability, discovery, and cross-file links |

A “no files” product can still use object storage behind the scenes. Conversely, a file-based product can maintain a local database index for search. These are not mutually exclusive technical choices.

## Database-first hosted workspaces

Tasks, dates, assignments, and event associations remain normal records; rich document content can remain JSON. This fits questions such as “show overdue tasks across every subfolder” or “show all milestones for this component.” Relationships and indexes make these natural server queries.

Database transactions can update related records together. They do **not** automatically resolve two people changing the same document: the application still needs version checks, an operation-based collaboration protocol, or another explicit concurrency strategy.

The server can enforce workspace permissions and maintain activity history. Backup and recovery are the operator's responsibility, including attachments as well as database records. Revoking access stops future authorized access, but cannot retract copies someone already downloaded.

Offline operation is possible with a local cache and queued changes; it is not free simply because the native app exists. That design must reconcile deletions, changed permissions, conflicting edits, and duplicate submissions.

**Best fit:** a shared product workspace whose web, macOS, and mobile clients need the same live view.

## Whole files in blob storage

An object store could hold each task file under a stable key, with a database record for ownership, title, revision, and object location. This is useful for snapshots and exports, but moving the live task collection into an object does not eliminate the database requirements of the product.

To find all tasks due tomorrow, the server must either read and parse each relevant file or maintain a derived task index. That index needs reliable rebuilding and an explicit freshness policy. Making both the index and file independently editable creates competing authoritative copies.

For updates, write an immutable revision and conditionally advance the current revision pointer. A database transaction cannot atomically commit an external object upload; handle failed uploads, unreferenced objects, retry idempotency, and cleanup. Amazon S3 supports conditional writes using ETags to reject stale overwrites; that detects a conflict but does not merge edits. Other S3-compatible providers must be checked for the exact operations used. [AWS conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html).

Putting the same file into a MySQL BLOB instead makes metadata and bytes transactionally manageable together, but increases database backup/replication volume. A JSON column permits some structured queries, yet a single whole-workspace JSON document still requires deliberate indexing and concurrency design. Neither option automatically behaves like normalized Task/Event records.

**Best fit:** attachments, immutable history, portable exports, and infrequently edited documents. I would not move Inertia's live task graph into blobs merely to support Dropbox.

Rails Active Storage already separates attachment metadata from stored bytes and supports cloud storage services. It is the natural starting point for hosted attachment storage, rather than putting videos or images into task JSON. [Rails Active Storage guide](https://guides.rubyonrails.org/active_storage_overview.html).

## User-owned files in iCloud Drive or Dropbox

The user opens a file, edits it, and saves it. Their selected provider synchronizes that file. This is a compelling native-app experience: no Inertia account is necessary for local work, the user chooses where files live, and the file remains available outside the service.

There are two distinct integration levels:

1. **Open a file from a synced location.** Use native document/open/save APIs; the installed provider handles transport. This is the smallest next step for macOS and for a Dropbox clone that exposes normal files.
2. **Integrate a provider directly.** Add account linking, API access, remote browsing, download/upload state, revision handling, and recovery. This is a much larger commitment and may be needed for a browser-based experience.

Do not treat iCloud Drive as a generic server-side object bucket. Design and validate its native document lifecycle separately. Apple's document APIs expose conflicting versions, and applications still need a resolution policy. A save finishing locally is not proof that another device has received it. [Apple document synchronization](https://developer.apple.com/documentation/uikit/synchronizing-documents-in-the-icloud-environment).

Dropbox's API provides revision-aware write modes; a direct connector should use those instead of unconditional replacement. Again, revision checks do not understand task semantics. [Dropbox file API specification](https://github.com/dropbox/dropbox-api-spec/blob/main/files.stone).

Offline editing works only when the needed file and attachments are downloaded. Provider placeholders, eviction, revoked access, renames, and remote deletion must be handled. A web client cannot silently browse someone's local iCloud Drive; it needs explicit file selection or a separately designed connector.

**Best fit:** individual work, portable projects, and users who value control over where their data lives.

## The conflict that matters

Alice changes task A's due date offline. Bob changes task B's status in another copy of the same file.

Replacing the entire file with the last uploaded copy can lose one person's work, even though they edited different tasks. Keeping both versions avoids loss but leaves a reconciliation task. An automatic merge needs stable identities, a common base revision, and rules for field edits and deletion.

If Alice edits task A while Bob deletes it, “merge the JSON” is insufficient: the app must decide whether to restore it, retain the deletion, or ask. Restoring a parent without its event links or subtasks can also break relationships.

For an initial file mode, preserve conflicting copies and provide recovery guidance; do not promise simultaneous collaboration. Advanced merging is a separate feature. Do not place a live database plus its journal files into a general file-sync folder as a shortcut—export a consistent snapshot instead.

## Product implications

| Capability | Hosted database | User-owned files |
| --- | --- | --- |
| Folder dashboard across projects | Server query | Index of accessible, downloaded files |
| Offline editing | Requires local cache and reconciliation | Natural for downloaded files; conflicts still apply |
| Team permissions | Server-enforced identities and policies | Provider/file access; embedded users are not access control |
| Browser access | Existing API model | Upload/open flow or direct provider integration |
| Move/copy/archive | App operations | File operations plus reference/index maintenance |
| Recovery | Coordinated DB and attachment backups | File versions/backups plus conflict recovery |
| User portability | Requires a useful export | Built into the format, subject to linked-content completeness |

A file-centric project needs a defined boundary. One file per component makes a component easy to move, but increases the conflict scope. One file per task reduces that scope but makes moving a project and preserving relationships harder.

For now, keep one task collection per task file. Before promising portable requirements projects, define how requirements documents and attachments travel with it: a package/archive with a manifest is a candidate, not yet part of v4.

## A reversible implementation sequence

1. Keep hosted data authoritative in MySQL. Use object storage for attachments and generated exports when operationally justified.
2. Harden native file handling: save/reopen, external changes, moved files, missing downloads, conflicting versions, and recovery. Test real iCloud and Dropbox locations before claiming supported sync.
3. Add explicit “Export a copy” and “Import as a new project.” Preserve relationships by remapping file IDs to newly created database IDs. Embedded user names/emails must not silently become authenticated users or invitations.
4. Clearly label local files versus hosted workspaces. An exported copy is independent; editing it does not update the original.
5. Revisit continuous sync only after usage demonstrates the need. Specify revision ancestry, identity mapping, deletion tombstones, conflict handling, and permission changes first.

For the Dropbox clone, prefer a documented file contract and normal filesystem integration first. If it exposes a remote API only, implement a dedicated adapter later; its consistency and conflict guarantees cannot be assumed to match Dropbox.

## How to choose

Choose **hosted database-first** if collaboration, global task queries, and browser access are the core product.

Choose **file-first** if the main product promise is “my projects live in my folders, work offline, and remain mine without a service.”

Choose the **two-mode approach recommended here** if both matter. Accept the modest UI distinction now to avoid the much larger obligation of pretending two independent copies are always synchronized.

Cost should be measured rather than assumed: compare database capacity and backup volume against object requests, transfer, retained versions, indexing workers, and engineering/support time. For small task JSON, synchronization complexity may matter more than byte-storage cost. No pricing or performance benchmark is claimed here.
