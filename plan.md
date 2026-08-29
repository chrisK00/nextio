# Follow-up plan

Only the items below remain relevant. Episode progression, authentication hardening, dependency upgrades, caching, CSS splitting, and entity normalization were intentionally skipped or deferred.

## 1. Sync throughput — pending decision

### What happens today

`LibrarySyncWorker` triggers `ILibrarySyncService.SyncAllAsync`. That method loads every followed show, then processes the collection with a normal `foreach`. For each show, `SyncShowAsync` makes one TMDb details request and updates that show’s tracked EF entity. The next show does not start until that request finishes. EF calls `SaveChangesAsync` once after the loop.

The global semaphore in `TmdbApi` limits TMDb requests across the application to 10 at a time. Because this sync loop is sequential, it normally sees only one sync request at a time. The old local `SemaphoreSlim(50)` was added in commit `650b466` alongside removal of a 300 ms delay, apparently to prepare for rate-limited work, but it did not make this loop concurrent: the code acquired a slot, awaited one request, released the slot, and only then continued.

### Why it may have been written this way

The sequential form is simple, keeps one EF `DbContext` and one tracked entity set in one operation, preserves deterministic result ordering, and avoids concurrent writes to shared `List`/counter state. It also naturally limits TMDb traffic to one request per sync. The trade-off is that a library with many shows waits for every request in series.

### Desired future behavior

If throughput becomes important, load the entities first, then run a small bounded number of independent TMDb fetches concurrently. Each task should return a plain sync result and must not use the shared EF `DbContext`. After all tasks complete, apply results to tracked entities sequentially and call `SaveChangesAsync` once. The global TMDb semaphore remains in place as a second, application-wide rate-limit guard.

The bound should be deliberately small (for example 5–10), not 50: concurrency reduces waiting but increases TMDb/server load. We should add timing and failure tests before changing this behavior. This item is pending because the current sequential behavior may be intentional protection for a small self-hosted deployment.

## 2. Import reliability — implemented, verify later

### What happens today

The browser reads an exported JSON file, then imports TV shows one at a time. For each TV show it first calls the add endpoint and then sends watched episodes in one batch. Movies are also added one at a time, with a separate watched-state request when needed. This sequential order prevents request storms and allows partial progress if a later item fails. Existing entries are upserted by the backend, so re-importing does not intentionally duplicate them.

After all import requests finish, the page refreshes its library and starts a full TMDb sync. The old code used `setTimeout(..., 500)` because the author likely wanted to let the UI/API writes settle before syncing; however, every import request was already awaited, so the delay was not a correctness guarantee. It also detached the sync from the import operation: loading was cleared and the UI could say the import succeeded even if sync later failed, and any exception from the timer task was not handled by the import `try/catch`.

### Current desired behavior

The follow-up sync is now awaited directly. The import remains sequential to preserve predictable partial-import behavior and avoid overwhelming the API. A sync failure is now caught by the same import error path instead of becoming an unobserved background failure. The next improvement, if needed, is a separate result message distinguishing “library import succeeded” from “metadata sync failed”; that is a UX enhancement, not a reason to parallelize imports.
