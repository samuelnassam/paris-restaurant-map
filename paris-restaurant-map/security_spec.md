# Security Specification for Paris Restaurant Map

## 1. Data Invariants
- Each Restaurant document must have a `userId` strictly matching the authenticated user (`request.auth.uid`).
- Only the owner (`userId == request.auth.uid`) can create, read, update, or delete their restaurants and collections.
- Document IDs must conform to alphanumeric characters, hyphens, and underscores up to 128 characters.
- Query enforcement: List queries must filter by `userId == request.auth.uid` so cross-tenant scraping is impossible.
- Status values are restricted to: `to_try`, `tested`, `favorite`, `to_avoid`.
- Price ranges are restricted to: `€`, `€€`, `€€€`, `€€€€`.
- Rating must be between 0 and 5.
- Required fields on creation: `userId`, `name`, `address`, `lat`, `lng`, `status`, `createdAt`.
- Updates cannot alter `userId` or `createdAt`.

## 2. Dirty Dozen Test Scenarios
1. Anonymous user attempts to create a restaurant -> PERMISSION_DENIED
2. Authenticated user attempts to set `userId` to a different user's UID -> PERMISSION_DENIED
3. User attempts to read another user's restaurant doc directly -> PERMISSION_DENIED
4. User queries restaurants without filtering by their own `userId` -> PERMISSION_DENIED
5. User attempts to update a restaurant and switch the `userId` to someone else -> PERMISSION_DENIED
6. User attempts to delete another user's restaurant -> PERMISSION_DENIED
7. User provides invalid status (e.g. `status: "hacked"`) -> PERMISSION_DENIED
8. User provides oversized name (> 200 chars) -> PERMISSION_DENIED
9. User passes oversized review text (> 5000 chars) -> PERMISSION_DENIED
10. User creates collection with missing `name` -> PERMISSION_DENIED
11. User attempts to update collection owned by another user -> PERMISSION_DENIED
12. User attempts path traversal or oversized document ID (> 128 chars) -> PERMISSION_DENIED
