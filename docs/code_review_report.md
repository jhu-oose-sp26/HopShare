# HopShare Code Review Report

**Project:** HopShare — Campus Ridesharing Coordination Platform  
**Review Date:** April 2026  
**Stack:** Node.js + Express + MongoDB (backend) · React + Vite (frontend)

---

## Team Contributions

| Member | Code-Review Activities |
|--------|----------------------|
| All members | Full walkthrough of backend routes, frontend hooks, and component layer; identified issues and agreed on priorities |
| Louis Hu | Reviewed backend routes (`posts.js`, `chat.js`); identified DRY violations and missing coordinate validation |
| Fengqi Hu | Reviewed `notifications.js` and `db.js`; identified god-function issue and missing DB indexes |
| Han | Reviewed frontend hooks and `App.jsx`; identified duplicated socket configuration and test gaps |

---

## 1. Design

### Findings

The backend has no controller or service layer. All business logic — validation, DB queries, cache management, real-time broadcasts — lives directly inside route handler callbacks. This violates the **Single Responsibility Principle (SRP)**: route handlers should handle HTTP concerns only, not business logic.

The most extreme case is `PATCH /notifications/:id/respond` in [`backend/routes/notifications.js`](../backend/routes/notifications.js). It is a single ~170-line function handling four completely unrelated notification types (`join_list`, `ride_request`, `friend_request`, and generic). Each branch is an independent workflow; they should be separate functions.

**Duplicated utility functions (DRY violation):** `sanitizeString`, `validateEmail`, `normalizeEmail`, and `toObjectId` are defined identically in both [`backend/routes/posts.js`](../backend/routes/posts.js) (lines 35–100) and [`backend/routes/chat.js`](../backend/routes/chat.js) (lines 10–39). Any bug fix or change must be made in two places.

**Frontend socket URL duplication:** The logic to resolve the Socket.io server URL (a ~12-line IIFE) is copy-pasted verbatim in [`frontend/src/App.jsx`](../frontend/src/App.jsx), [`frontend/src/hooks/usePosts.js`](../frontend/src/hooks/usePosts.js), and [`frontend/src/hooks/useNotifications.js`](../frontend/src/hooks/useNotifications.js). The three copies also disagree: `usePosts.js` defaults `API_ROOT` to `'/api'` while the other two default to `''`.

### Recommended Improvements

- **Extract `backend/utils/validation.js`** — move all shared validators (`sanitizeString`, `validateEmail`, `normalizeEmail`, `toObjectId`, `escapeRegex`, `toFiniteNumber`) into one module and import from there in all routes. This applies the DRY principle and means validation logic has a single, testable home.
- **Decompose the notification respond handler** — extract four focused functions: `handleJoinListResponse`, `handleRideRequestResponse`, `handleFriendRequestResponse`, `sendRideReplyNotification`. The route handler becomes a short dispatch. Adding a new notification type then requires adding one function, not editing the existing handler (Open/Closed Principle).
- **Create `frontend/src/lib/socket.js`** — a single module that exports `API_ROOT` and `SOCKET_URL`. All three files that currently duplicate this logic would import from there.
- **Introduce a service layer** — move business logic out of route files into dedicated service modules (e.g., `PostService`, `NotificationService`) to properly apply SRP. This is a larger refactor for a future iteration.

---

## 2. Complexity

### Findings

- `posts.js` is 928 lines covering CRUD, ride joining, ride taking, member/driver removal, starring, cache management, and Google-ID enrichment — all in one file. A new contributor cannot understand it in a single session.
- The `chat.js` access-control policy (`isActiveRideParticipant`, `hasChatHistory`, `hasReadOnlyAccess`) is correct but requires callers to combine all three checks manually. The intent of the overall authorization rule is not obvious from the call site.
- The `encodeEmail` helper (replacing `.` with `(dot)` for MongoDB field-name compatibility) appears in both `App.jsx` and `chat.js` with no shared definition and no comment explaining *why* the encoding is needed.

### Recommended Improvements

- Split `posts.js` into logical modules: `routes/posts/crud.js`, `routes/posts/membership.js`, `routes/posts/starring.js`.
- Wrap the three chat access-control checks into a single `canAccessChat(post, chat, email)` helper that returns a clear boolean with a reason string.
- Move `encodeEmail` to the shared utilities module and add a short comment explaining that MongoDB does not allow `.` in field names when used as document keys.

---

## 3. Tests

### Findings

**Backend:** Zero automated tests. All routes — auth, posts, chat, notifications, friends — are exercised only through manual browser use. Mission-critical paths (ride join/accept, friend request, chat message) have no automated safety net.

**Frontend:** One test file exists ([`frontend/src/lib/utils.test.js`](../frontend/src/lib/utils.test.js)) with 2 tests for `filterPostsByRouteRadius` and `getRouteCenter`. No tests for hooks, pages, or components.

**Untested utility functions:** `formatTime` and `formatDate` in [`frontend/src/lib/utils.js`](../frontend/src/lib/utils.js) are used in every post card and ride detail view but have no coverage.

### Recommended Improvements

- **Frontend — add unit tests for `formatTime` and `formatDate`** in `utils.test.js`. These are pure functions, easy to test:
  - `formatTime('00:00')` → `'12:00 AM'`
  - `formatTime('14:30')` → `'2:30 PM'`
  - `formatDate('2025-03-15')` → `'03-15-2025'`
- **Backend — add integration tests** for at least the happy path of each critical route using a test MongoDB instance. Priority order: `POST /posts`, `POST /posts/:id/join`, `PATCH /notifications/:id/respond`, `POST /auth/google`.
- **Frontend hooks** — test `usePosts` and `useNotifications` by mocking socket events and verifying state updates.

---

## 4. Naming

### Findings

Names are generally clear and intention-revealing: `isActiveRideParticipant`, `hasChatHistory`, `invalidatePostsCache`, `enrichPostsWithGoogleIds`. The naming convention is consistent within each file.

Minor issues:
- The backend uses `senderName`/`senderId` while some endpoints also use `actorName`/`actorEmail` for the equivalent concept in the same request body. This inconsistency makes the API harder to use.
- `encodeEmail` is a misleading name — it is not URL encoding or Base64; it replaces dots with `(dot)`. A name like `mongoKeyFromEmail` or `encodeEmailAsKey` would be more precise.
- In `friends.js`, the helper `getFriendsDoc` creates a document if none exists (a side effect not suggested by a "get" name). `getOrCreateFriendsDoc` would be more accurate.

### Recommended Improvements

- Standardise on `senderName`/`senderId` across all notification endpoints.
- Rename `encodeEmail` → `encodeEmailAsMongoKey` and add a one-line comment explaining the MongoDB restriction.
- Rename `getFriendsDoc` → `getOrCreateFriendsDoc`.

---

## 5. Comments

### Findings

Most existing comments are useful and explain the *why*:
- `// Archive all posts where trip.date is in the past (throttled to once per 5 minutes)` — explains the throttle design decision.
- `// Change Stream will broadcast to all clients. No local state update needed` — explains why the UI doesn't update state after a mutation.
- `// Only update picture from Google if user doesn't have a custom avatar` — explains a non-obvious conditional.

However, some comments are redundant noise that restate what the code already says:
- `// Delete the related trips` immediately above `db.collection('trips').deleteMany({ postId })` — the code is self-explanatory.
- `// Mark as read` immediately above `$set: { read: true }`.

Missing explanatory comments:
- `encodeEmail` in both `chat.js` and `App.jsx` has no comment explaining the MongoDB field-name restriction that necessitates it. A future developer will find this confusing.
- The in-memory `postsCache` in `posts.js` has no comment explaining why a server-side in-memory cache is used instead of client-side caching or a Redis layer.

### Recommended Improvements

- Remove comments that restate the code verbatim.
- Add a comment above every `encodeEmail` call explaining the MongoDB restriction.
- Add a comment above the `postsCache` variable explaining the trade-off (fast but per-process; will not work behind a load balancer).

---

## 6. Style

### Findings

- Backend code is consistently CommonJS (`require`/`module.exports`); frontend uses ES modules. Both are correct for their environments.
- `const`/`let` are used throughout; no `var`.
- Indentation and brace style are consistent.
- Some `catch` blocks silently swallow errors with no logging: `catch {}` in `App.jsx` (unread count fetch, line 50) and `catch { /* ignore parse errors */ }` in `usePosts.js`. Silent failure makes debugging production issues very hard. At minimum these should `console.error` in development.
- `toObjectId` is defined at the *bottom* of `chat.js` (line 616) but used throughout the file. JavaScript hoists function declarations but not `const` expressions — this definition uses `const` and `new ObjectId()`, meaning if the reference is ever evaluated before line 616 at module load time it would fail. The function should be at the top.
- `posts.js` uses a `try { ... } catch (validationError) { return ... }` pattern nested inside an outer `try/catch`. This two-level nesting within a single route handler reduces readability; a validation helper that throws and a single top-level catch would be cleaner.

### Recommended Improvements

- Replace all silent `catch {}` with `catch (err) { console.error(...) }` at minimum.
- Move `toObjectId` to the top of `chat.js` (or better, import it from the shared utilities module).

---

## 7. Documentation

### Findings

The repository has a `docs/` folder with design documents, an SRS, and retrospectives, but **no installation or run guide** for a new contributor. The only setup instructions are in `CLAUDE.md`, which is an AI-tooling configuration file and is not visible to a standard contributor.

There is no `README.md` at the repository root.

The API has no machine-readable documentation (no OpenAPI/Swagger spec). A contributor wanting to understand the available endpoints must read all route files.

### Recommended Improvements

- Add a `README.md` at the root covering: prerequisites (Node, pnpm, MongoDB Atlas), environment variable setup (`.env` format), how to run the backend and frontend locally, and how to run tests.
- Consider adding a brief API endpoint reference in `docs/` listing each route, its method, required fields, and example response. This does not need to be a full Swagger spec — even a Markdown table would significantly reduce onboarding time.

---

## SOLID Principles Evaluation

| Principle | Assessment | Location |
|-----------|-----------|----------|
| **S** — Single Responsibility | Violated. Route files mix HTTP, validation, business logic, and DB access. Worst case: `notifications.js` respond handler (170 lines, 4 notification types). | `backend/routes/*.js` |
| **O** — Open/Closed | Violated for notifications: adding a new notification type requires editing the existing handler. Extracting per-type functions would fix this. | `backend/routes/notifications.js:88` |
| **L** — Liskov Substitution | Not applicable (no class hierarchy). | — |
| **I** — Interface Segregation | Mostly satisfied. React hooks expose focused APIs; `usePosts` does not bleed notification concerns. | `frontend/src/hooks/` |
| **D** — Dependency Inversion | Violated. Routes call `getDB()` directly (concrete dependency). A repository/service abstraction would allow the business logic to be tested without a real database. | `backend/routes/*.js` |

---

## Summary Table

| Category | Issue | Severity | Recommended Fix |
|----------|-------|----------|-----------------|
| Design | Validation logic duplicated across `posts.js` and `chat.js` | Medium | Extract `backend/utils/validation.js` |
| Design | Socket URL resolution duplicated across 3 frontend files | Low | Extract `frontend/src/lib/socket.js` |
| Design | Notification respond handler is a 170-line god function | Medium | Decompose into per-type handler functions |
| Complexity | `posts.js` is 928 lines with 8+ responsibilities | Medium | Split into sub-modules |
| Tests | Backend has zero automated tests | High | Add integration tests for critical routes |
| Tests | `formatTime` and `formatDate` have no unit tests | Low | Add tests in `utils.test.js` |
| Naming | `encodeEmail` misleading; `getFriendsDoc` has hidden side effects | Low | Rename to `encodeEmailAsMongoKey` / `getOrCreateFriendsDoc` |
| Naming | `senderName`/`actorName` inconsistency across endpoints | Low | Standardise on `senderName`/`senderId` |
| Comments | `encodeEmail` workaround has no explanation anywhere | Low | Add comment explaining MongoDB field-name restriction |
| Style | Silent `catch {}` blocks in `App.jsx` and `usePosts.js` | Low | Add `console.error` logging |
| Style | `toObjectId` defined at bottom of `chat.js` but used throughout | Low | Move to top / extract to shared utils |
| Style | Missing coordinate range validation (lat/lng bounds not checked) | Medium | Add `validateCoordinate(lat, lng)` in `validateTripLocations` |
| Documentation | No `README.md` or installation guide | Medium | Add `README.md` with setup instructions |
| Architecture | No server-side auth on protected endpoints | High | Add session/token verification middleware |
| Performance | Missing DB indexes for common query patterns | Medium | Add indexes on `notifications.recipientId`, `chats.participants`, `posts.user.email` |
