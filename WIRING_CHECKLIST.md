# Wiring & Integration Checklist

_Use this file as a living document to track wiring/config issues and cross-codebase conflicts. Update items as you fix or re-scope them._

---

## 1. Navigation & Routing

- [ ] **HomeScreen: drawer call without a drawer navigator**  
  - **File**: `src/screens/HomeScreen.js`  
  - **Problem**: Uses `navigation.openDrawer()` while no Drawer navigator is mounted in `App.js`.  
  - **Planned resolution**: Either reintroduce a Drawer navigator at the root, or replace this with the SideMenu toggle from `ModalContext`.

- [ ] **FriendsScreen: custom bottom nav route names don’t match actual tab routes**  
  - **File**: `src/screens/FriendsScreen.js`  
  - **Problem**: Navigates to `"Friends"`, `"Messages"`, `"Profile"` while `App.js` defines `Home`, `FriendsStack`, `DMs`, `ProfileStack`.  
  - **Planned resolution**: Prefer removing this custom bottom nav and rely on `MainTabs`. If kept, align route names with actual tab routes.

- [ ] **Bottom tab bar vs per-screen nav (Home/Friends/Messages)**  
  - **Files**: `App.js`, `src/screens/HomeScreen.js`, `src/screens/FriendsScreen.js`, `src/screens/DMScreen.js`  
  - **Problem**: Redesigned Home/Messages screens expect a unified neon bottom tab bar, but the app currently mixes the built-in `MainTabs` bar (Home/DMs) with a custom per-screen bottom nav in `FriendsScreen`. This creates inconsistent nav behavior and duplicated tab logic.  
  - **Planned resolution**: Implement a single custom `tabBar` for `MainTabs` that matches the new design (Home / Friends / Add / Messages / Profile) and remove the per-screen bottom nav from `FriendsScreen` so all screens share one tab system.

- [ ] **Deep linking config defined but disabled**  
  - **Files**: `App.js`, `app.config.js`  
  - **Problem**: `linking` object is defined in `App.js` but not passed to `NavigationContainer`; web config suggests deep linking/standalone PWA usage.  
  - **Planned resolution**: Decide whether deep links should be supported now. If yes, re-enable `linking={linking}` and validate URL behavior on web; otherwise clearly document that deep linking is intentionally disabled.

---

## 2. Supabase & Auth Wiring

- [ ] **Supabase URL and anon key hard-coded in source**  
  - **File**: `src/lib/supabase.js`  
  - **Problem**: Uses literal `SUPABASE_URL` and `SUPABASE_ANON_KEY` in code. No environment separation for dev/stage/prod.  
  - **Planned resolution**: Read from environment (e.g. `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) and configure per environment.

- [ ] **Google OAuth redirect always points to production URL**  
  - **File**: `src/context/AuthContext.js` (`signInWithGoogle`)  
  - **Problem**: Web redirect is hardcoded to `https://wishmenot.app`, breaking local/staging flows.  
  - **Planned resolution**: Drive redirect URL from env (e.g. `EXPO_PUBLIC_OAUTH_REDIRECT_URL`) and set appropriate values for dev, GH Pages, and prod.

- [ ] **RLS uses auth.* directly in many policies (auth_rls_initplan)**  
  - **Tables / Policies**: `public.profiles`, `public.wishlist_posts`, `public.friends`, `public.circles`, `public.circle_members`, `public.posts`, `public.comments`, `public.likes`, `public.push_tokens`, `public.notifications`, `public.lists`, `public.occasions`, `public.messages`, `public.user_settings`, `public.item_reactions`, etc.  
  - **Problem**: Supabase advisor `auth_rls_initplan` warns that multiple RLS policies call `auth.<function>()` and/or `current_setting()` directly in their `USING` / `WITH CHECK` clauses. This forces PostgreSQL to re-evaluate these functions for every row and can hurt performance at scale.  
  - **Planned resolution**: For each affected policy, wrap auth calls in a SELECT, e.g. replace `auth.uid()` with `(select auth.uid())` per [Supabase docs](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select). Re-run the database linter afterward to confirm that `auth_rls_initplan` warnings are cleared.

- [ ] **Multiple permissive RLS policies per role/action (multiple_permissive_policies)**  
  - **Tables / Policies**: `public.item_reactions` ("Everyone can view reactions", "Users can manage their own reactions"), `public.lists` ("Public lists are viewable by everyone", "Users can manage their own lists"), `public.occasions` ("Friends can view occasions", "Users can manage their own occasions"), `public.wishlist_posts` (various item/post read/insert/update policies).  
  - **Problem**: Supabase advisor `multiple_permissive_policies` flags tables where multiple permissive policies exist for the same `role` and `action` (e.g. `anon` + `SELECT`). PostgreSQL must evaluate each policy for every relevant query, which is suboptimal for performance and makes behavior harder to reason about.  
  - **Planned resolution**: Consolidate overlapping permissive policies into a single, clearer policy per role/action where possible (e.g. one combined `SELECT` policy for public vs own data). Keep more specific restrictions as separate *restrictive* policies if needed. Re-run the advisor to ensure these warnings are resolved.

---

## 3. Notifications

- [ ] **Expo push `projectId` may be undefined**  
  - **File**: `src/services/notifications.js`  
  - **Problem**: Uses `Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId` without fallback/logging; if misconfigured, push registration fails silently.  
  - **Planned resolution**: Ensure `projectId` is configured in Expo/EAS config and add defensive logging + early return when missing.

- [ ] **Client sends push notifications directly to Expo API**  
  - **File**: `src/services/notifications.js` (`sendNotification`)  
  - **Problem**: Client reads `push_tokens` and calls `https://exp.host/--/api/v2/push/send` directly, which is less secure and harder to control.  
  - **Planned resolution**: Move sending logic into a Supabase Edge Function triggered by DB inserts; keep client responsible only for inserting notification rows.

---

## 4. Local Storage & Data Consistency

- [ ] **Friends data: local vs server consistency**  
  - **Files**: `App.js`, `src/screens/HomeScreen.js`, `src/screens/FriendsScreen.js`, `src/services/storage.js`, `src/services/api.js`  
  - **Problem**: Friends are cached in AsyncStorage and also fetched from Supabase; comparison uses `JSON.stringify(serverFriends) !== JSON.stringify(friends)` where `friends` comes from captured state, risking subtle mismatches.  
  - **Planned resolution**: In `loadFriends`, compare against fresh state or always prefer server results when available; consider centralizing friend state in a context.

- [ ] **Wishlist/feed preload and screen-level loading share storage without central coordination**  
  - **Files**: `App.js` (splash preload), `HomeScreen.js`, `services/storage.js`  
  - **Problem**: Splash preload clears and repopulates local user/items/friends; screens also fetch and save. Potential for race conditions or stale reads under edge timing.  
  - **Planned resolution**: Document current behavior and, longer term, consider centralizing preload + cache invalidation strategy in a single data layer.

- [ ] **Local-only UI settings vs future `user_settings` columns**  
  - **Files**: `src/screens/SettingsScreen.js`, `src/services/storage.js`  
  - **Problem**: New Settings toggles (Gift Claims, Likes & Comments, Event Reminders, Email Notifications, Private Account, Two-Factor Authentication) are currently stored only in `AsyncStorage` via `LOCAL_SETTINGS_KEY` and are not reflected in Supabase. Future schema changes to `public.user_settings` must migrate these local-only values or risk behavior drift between devices.  
  - **Planned resolution**: When adding corresponding columns to `user_settings`, extend `getUserSettings` / `updateUserSettings` to include them and add a one-time migration that seeds server values from local or sensible defaults.

- [ ] **DM threads depend solely on local friends cache**  
  - **Files**: `src/screens/DMScreen.js`, `src/services/storage.js`, `src/services/api.js`  
  - **Problem**: The new Messages screen builds its conversation list from `getFriends()` (local AsyncStorage) only; there is no server-backed DM thread model yet. If local friends are cleared or stale, the Messages UI appears empty even though server friendships and future DM content may exist.  
  - **Planned resolution**: Introduce a proper `messages`/`threads` table in Supabase and a `getUserThreads` API. Use DB-backed threads (optionally enriched with friends) as the primary source of truth, with local cache as an optimization only.

---

## 5. Web / GitHub Pages Hosting

- [ ] **Base URL vs homepage vs startUrl mismatch risk**  
  - **Files**: `package.json`, `app.config.js`  
  - **Problem**: GitHub Pages `homepage` is `https://Non-Zero-AI.github.io/wish_me_not` and `experiments.baseUrl` uses `/wish_me_not/` when `GH_PAGES` is true, but `web.startUrl` and `web.scope` are `/`.  
  - **Planned resolution**: Verify exported web build on GH Pages; if needed, adjust `web.startUrl` / `web.scope` to respect `/wish_me_not/` when `GH_PAGES` is set.

---

## 6. Security / Hygiene & Misc

- [ ] **Supabase anon key & project coupling**  
  - **File**: `src/lib/supabase.js`  
  - **Problem**: Repo is tightly bound to a single Supabase project; rotating keys or switching projects requires code edits.  
  - **Planned resolution**: Same as 2.1—environment-based configuration and secrets management.

- [ ] **Dead / legacy code paths**  
  - **File**: `src/services/api.js` (`createUser`) and any other deprecated helpers  
  - **Problem**: Deprecated or unused functions increase confusion when tracing wiring.  
  - **Planned resolution**: Confirm via search whether they’re truly unused; remove or clearly isolate them.

---

## 7. Frontend  DB Integration

- [ ] **Profiles: missing `username` column**  
  - **Tables/Columns**: `public.profiles(id, first_name, last_name, email, avatar_url, created_at)`  
  - **Files**: `src/context/AuthContext.js`, `src/services/api.js`  
  - **Problem**: Frontend reads/writes `profiles.username` (`upsertProfileFromAuthUser`, `isUsernameAvailable`, `updateUsername`), but the live schema has no `username` column.  
  - **Planned resolution**: Either add `username text UNIQUE` to `public.profiles` (preferred, matches current code) or remove/disable username-related logic in the app.

- [ ] **Add Friend by @username relies on `profiles.username` and prefix search**  
  - **Tables/Columns**: `public.profiles(username text)`  
  - **Files**: `src/services/api.js` (`searchUsersByUsernamePrefix`, `findUserByEmail`), `src/screens/DMScreen.js`  
  - **Problem**: The new Messages Add Friend flow performs prefix search on `profiles.username` and displays `@username` suggestions, but this depends on a real `username` column (and ideally an index) existing in Supabase. Without it, Add Friend by username will fail or be slow.  
  - **Planned resolution**: Once `profiles.username` is created, add an index on `username` for fast `ILIKE prefix%` searches and update any migrations/docs to treat username as a first-class, searchable handle.

- [ ] **User settings: missing `default_posts_public` column**  
  - **Tables/Columns**: `public.user_settings(user_id, notify_new_friend, notify_claimed, theme, updated_at, reveal_surprises)`  
  - **Files**: `src/services/api.js` (`addProduct`, `addManualProduct`, `updateUserSettings`, `getUserSettings`)  
  - **Problem**: Frontend expects `user_settings.default_posts_public` to control default visibility of new wishlist posts, but this column does not exist in the schema.  
  - **Planned resolution**: Add `default_posts_public boolean DEFAULT false` to `user_settings`, or change the frontend to derive default visibility from existing fields.

- [ ] **Profiles: email lookup assumes uniqueness but DB does not enforce it**  
  - **Tables/Columns**: `public.profiles(email text NULL)`  
  - **Files**: `src/services/api.js` (`getUserIdByEmail` and all functions that call it)  
  - **Problem**: Code uses `.single()` queries on `profiles.email`, assuming exactly one row per email, but the column is nullable and not unique in the DB. Duplicate or null emails could cause ambiguous query errors.  
  - **Planned resolution**: Add a uniqueness constraint (and ideally NOT NULL) on `profiles.email` or rework lookups to use the auth user UUID instead of email wherever possible.

- [ ] **Friends: local delete vs DB friends table**  
  - **Tables/Columns**: `public.friends(user_id, friend_id, status, created_at)`  
  - **Files**: `src/services/api.js` (`getUserFriends`, `deleteFriend`), `src/screens/FriendsScreen.js`  
  - **Problem**: Schema has a proper `friends` table keyed by `(user_id, friend_id)`, but `deleteFriend` is a stub and `FriendsScreen` only removes entries from local state/AsyncStorage. Friend relationships are never actually removed from the DB.  
  - **Planned resolution**: Implement `deleteFriend` to delete from `public.friends` using the correct UUIDs, and wire `FriendsScreen` to call it, keeping the local cache in sync.

- [ ] **Wishlist posts: privacy/claim fields vs app expectations**  
  - **Tables/Columns**: `public.wishlist_posts(..., is_claimed boolean, claimed_by uuid, is_public boolean, message text, list_id uuid)`  
  - **Files**: `src/services/api.js` (`getUserWishlist`, `claimGift`, `stashItem`, `addManualProduct`)  
  - **Problem**: Schema matches fields, but there are subtle mismatches in how the frontend uses them (e.g. `stashItem` uses `originalPost.is_public || false` while UI often passes `isPublic`, so copies can silently become private). `claimed_by` FKs to `auth.users.id`, but joins assume a matching `profiles` row.  
  - **Planned resolution**: Normalize usage (e.g. prefer `originalPost.is_public ?? originalPost.isPublic ?? false`), and ensure profiles exist for all auth users so claim joins never fail silently.

- [ ] **Edge function `fetch-product` vs local fallback**  
  - **Tables/Columns**: `public.wishlist_posts` (all relevant item fields)  
  - **Files**: `src/services/api.js` (`addProduct`), Supabase Edge Function `fetch-product`  
  - **Problem**: Frontend expects the edge function to return a row compatible with `wishlist_posts`, but on failure it falls back to a purely local placeholder object that may not exist in the DB at all. This can lead to items visible in UI but missing from the database.  
  - **Planned resolution**: Ensure `fetch-product` always inserts into `wishlist_posts` and returns the inserted row; surface a user-facing warning when only the local placeholder path is taken.

---

## 8. Relational Impact & Change Map

_Use this section to understand where a change in one area affects others, so you can apply migrations and code edits in a safe order._

- [ ] **Profiles & usernames**  
  - **Primary change**: Add `profiles.username` column and enforce uniqueness (or remove username logic).  
  - **Touches**:  
    - `AuthContext`: `upsertProfileFromAuthUser` writes `username` on sign-in/sign-up.  
    - `api.js`: `isUsernameAvailable`, `updateUsername`, `fetchUserInfo` shape.  
    - Any UI that displays `@username` (Profile screen, friends/DM views; grep for `@` usage and `username`).  
  - **Relational notes**:  
    - Schema change must land before or together with app releases that rely on `username` to avoid runtime SQL errors.  
    - If you later use `username` in URLs or deep links, ensure it is unique and immutable enough for that purpose.

- [ ] **User settings & default privacy**  
  - **Primary change**: Add `user_settings.default_posts_public` and wire it to settings UI.  
  - **Touches**:  
    - `api.js`: `addProduct`, `addManualProduct` read `default_posts_public`.  
    - Any settings screen that edits notification/privacy preferences.  
    - RLS policies on `user_settings` (must allow the authed user to read/write their own row).  
  - **Relational notes**:  
    - Changing the column or default changes behavior of all future wishlist posts (webhook-based and manual).  
    - When introducing this column, consider a migration that backfills based on your current expected default so behavior doesn’t change unexpectedly at deploy.

- [ ] **Email ↔ UUID lookup (`getUserIdByEmail`)**  
  - **Primary change**: Enforce uniqueness on `profiles.email` and/or move callers to use `user.id` instead of email.  
  - **Touches**:  
    - `api.js`: `getUserIdByEmail`, `getUserFriends`, `getUserWishlist`, `addProduct`, `addManualProduct`, `stashItem`, any other helper that starts from an email.  
    - `AuthContext`: creation/upsert of `profiles` rows must keep `email` in sync with `auth.users`.  
    - Local storage: `services/storage.js` and any code that caches user/email.  
  - **Relational notes**:  
    - Adding a UNIQUE constraint on `profiles.email` can fail if bad data already exists; plan a cleanup migration first if necessary.  
    - If you later support email change flows, ensure both auth and `profiles` update atomically to keep `getUserIdByEmail` reliable.

- [ ] **Friends lifecycle (add / list / delete)**  
  - **Primary change**: Implement real delete in `public.friends` and keep local cache consistent.  
  - **Touches**:  
    - `api.js`: `getUserFriends` (reads from both directions), `deleteFriend` (currently stub).  
    - `FriendsScreen`: delete UI, refresh behavior, local `friends` state and AsyncStorage persistence.  
    - `HomeScreen`: uses `getFriends()` from storage to build the home feed.  
    - Any future notifications or DMs that assume friendships exist.  
  - **Relational notes**:  
    - Once deletion is wired to the DB, ensure that home feed and any other friend-based views re-fetch or invalidate local caches to avoid “ghost” friends.  
    - Because `friends` is keyed by `(user_id, friend_id)`, make sure delete logic handles both directions if your UX treats friendships as symmetric.

- [ ] **Wishlist posts: claiming, copying, privacy**  
  - **Primary change**: Normalize how `is_public`, `is_claimed`, and `claimed_by` are used across claim/stash/add flows.  
  - **Touches**:  
    - `api.js`: `getUserWishlist`, `claimGift`, `stashItem`, `addManualProduct`, `addProduct`.  
    - `HomeScreen`: claim UI, feed sorting, item rendering (`isClaimed`, `wishedBy`, `claimedByEmail`).  
    - Any notifications triggered by claims (future or existing).  
  - **Relational notes**:  
    - Changing how `is_public` or `claimed_by` is set will affect what friends can see and how claimed items appear across multiple screens.  
    - Because `claimed_by` targets `auth.users.id` while joins assume a matching row in `profiles`, ensure profile creation is robust before tightening claim logic.

- [ ] **Supabase client config & environment**  
  - **Primary change**: Move Supabase URL/key into environment config.  
  - **Touches**:  
    - `src/lib/supabase.js`: client initialization.  
    - All services/contexts that import `supabase` (`AuthContext`, `api.js`, `notifications`, etc.).  
    - Build/deploy configuration (Expo env, GitHub Actions, Netlify/Vercel or other hosting).  
  - **Relational notes**:  
    - A misconfigured env var breaks *all* DB access; roll out carefully with environment validation in staging first.  
    - MCP access also depends on the right project and tokens; keep local dev and production aligned so debugging tools match the live project.

- [ ] **Navigation & Side Menu**  
  - **Primary change**: Replace `navigation.openDrawer()` with SideMenu/ModalContext wiring and align Friends bottom nav with `MainTabs`.  
  - **Touches**:  
    - `App.js`: navigator structure for `RootTabs`, `MainTabs`, `FriendsStack`, `ProfileStack`.  
    - `HomeScreen`: header left action and any assumptions about a drawer existing.  
    - `SideMenu`, `ModalContext`: show/hide behavior on web vs native.  
  - **Relational notes**:  
    - Changes to navigator names ripple through all `navigation.navigate('RouteName')` calls; double-check route names whenever you refactor stacks/tabs.  
    - Deep linking config must be kept in sync with any route renames to avoid broken inbound links.

- [ ] **Notifications & push tokens**  
  - **Primary change**: Move push sending to Edge Functions and harden token storage.  
  - **Touches**:  
    - `notifications.js`: `registerForPushNotificationsAsync`, `sendNotification`.  
    - `public.push_tokens`, `public.notifications` tables and their RLS policies.  
    - Any backend triggers or edge functions that will send push on new notification rows.  
  - **Relational notes**:  
    - Once you move sending server-side, ensure the client no longer calls Expo’s push API directly to avoid duplicate sends.  
    - RLS must allow your edge function (via service role) to read tokens and send notifications even when the app client cannot.

---

## 9. Domain Logic & Feature Gaps

_Use this section to track functional gaps, edge cases, and missing features required for a robust social wishlist app._

- [ ] **Wishlist item editing (missing feature)**  
  - **Current state**: No `updateWish` / `editProduct` function exists in the API or UI. Users must delete and re-add items to change them.  
  - **Risks**:  
    - Deleting/re-adding destroys `is_claimed` state, risking duplicate gifts.  
    - Claimers are not notified if an item they claimed changes (price, link, model, etc.).  
  - **Planned resolution**: Implement an `updateWish` API and corresponding UI. When an item is already claimed, either (a) restrict edits to non-critical fields or (b) notify the claimer and optionally clear the claim.

- [ ] **Deletion notification & safety**  
  - **Current state**: `deleteProduct` performs a hard DB delete on `wishlist_posts` with no extra logic.  
  - **Risks**: If a user deletes a claimed item, the claimer loses all record of it and might still buy it.  
  - **Planned resolution**:  
    - Check `is_claimed` before deletion and warn the owner.  
    - Consider soft-deleting claimed items, and/or sending a "This wish was removed" notification to the claimer.

- [ ] **Circles & community privacy (partial wiring)**  
  - **Current state**: DB has `circles` and `circle_members`, and `wishlist_posts.circle_id` exists, but APIs always set `circle_id: null` and the Home feed pulls all friend posts.  
  - **Risks**:  
    - Introducing circles later will conflict with the current "all-or-nothing" friends feed.  
    - Ambiguity: does `is_public = false` mean "only me", "friends only", or "circle only"?  
  - **Planned resolution**: Define a clear privacy model (e.g. Public / Friends / Circle / Private) and update feed queries and item creation flows to set `circle_id` and `is_public` consistently.

- [ ] **Multiple lists & event handling**  
  - **Current state**: `addProduct` grabs the first list (`limit(1)`), `getUserWishlist` flattens all posts with a `listTitle`, and `lists.event_date` is unused.  
  - **Risks**: Users cannot properly organize wishes by event (e.g. "Birthday" vs "Christmas") or see upcoming/past event groupings.  
  - **Planned resolution**: Allow users to pick/create a list when adding a wish, and surface lists/events in the UI (grouping, filtering, or separate tabs).

- [ ] **Social graph integrity (unfriend/block flows)**  
  - **Current state**: `deleteFriend` is a stub; there is no block/ignore mechanism. Some friend data is only removed locally.  
  - **Risks**:  
    - Unfriending may leave server-side relationships intact, leading to confusing feeds.  
    - No way to prevent a user from seeing or interacting with another user (no blocking), which is critical for safety.  
  - **Planned resolution**: Implement real `deleteFriend` against `public.friends` and consider a `blocked_users` (or similar) table, ensuring all social queries respect blocks.

- [ ] **Unified bottom tab bar vs per-screen nav**  
  - **Current state**: The app uses a mix of bottom tab navigation and per-screen navigation (e.g. Friends, Profile).  
  - **Risks**: Inconsistent navigation patterns may confuse users.  
  - **Planned resolution**: Standardize on a unified bottom tab bar for main app sections, ensuring consistent navigation across the app.

- [ ] **Direct Messages: UI present, backend model missing**  
  - **Current state**: `DMScreen` now exposes a Messages UI, Add Friend by email/username, and a threads list derived from local friends, but there is no `messages`/`threads` schema or API for actual DM content, read/unread counts, or typing indicators.  
  - **Risks**: Users may assume DMs are persisted and private when there is no backend storage yet; future DM implementation will need to reconcile any existing UI expectations.  
  - **Planned resolution**: Design a DM schema (threads, messages, participants, read receipts) and corresponding APIs, then wire `DMScreen` to real threads instead of purely local friend data.

- [ ] **Local-only settings vs future Supabase fields**  
  - **Current state**: New settings toggles are stored only in `AsyncStorage` via `LOCAL_SETTINGS_KEY` and are not reflected in Supabase.  
  - **Risks**: Future schema changes to `public.user_settings` must migrate these local-only values or risk behavior drift between devices.  
  - **Planned resolution**: When adding corresponding columns to `user_settings`, extend `getUserSettings` / `updateUserSettings` to include them and add a one-time migration that seeds server values from local or sensible defaults.

- [ ] **Add Friend by email/username depending on profiles.username**  
  - **Current state**: The new Messages Add Friend flow performs prefix search on `profiles.username` and displays `@username` suggestions, but this depends on a real `username` column (and ideally an index) existing in Supabase.  
  - **Risks**: Without a `username` column, Add Friend by username will fail or be slow.  
  - **Planned resolution**: Once `profiles.username` is created, add an index on `username` for fast `ILIKE prefix%` searches and update any migrations/docs to treat username as a first-class, searchable handle.

---

## 10. Critical Product Questions (Ask User Before Big Changes)

_Before implementing major logic or schema changes, the AI should ask the user to clarify these decisions:_

- [ ] **Privacy semantics**  
  - What exactly should `is_public = false` mean today? Private to self, friends-only, or something else?  
  - If circles/communities are introduced, should there be separate privacy levels (Public / Friends / Circle / Private)?

- [ ] **Editing claimed wishes**  
  - When an already-claimed item is edited, should the claim remain, be removed, or require explicit confirmation?  
  - Should claimers receive a notification when a claimed item is materially changed (name, link, price)?

- [ ] **Deletion policy for claimed items**  
  - When a claimed item is deleted by its owner, should it be hard-deleted, soft-deleted, or hidden from everyone except the claimer?  
  - Should claimers get a notification or archive entry when a wish they claimed is removed?

- [ ] **List and event model**  
  - Are lists intended to be one-per-event (e.g. Birthday 2025, Christmas 2025) or more free-form ("Tech", "Books")?  
  - Should a single wish be allowed to appear on multiple lists/events, or strictly one list per wish?

- [ ] **Username behavior**  
  - Are usernames meant to be immutable handles, or can they change freely?  
  - If usernames change, do we need redirects or aliasing for profile URLs or search?

- [ ] **Social safety features**  
  - Do we need blocking, reporting, or muting features in the near term?  
  - If yes, what should blocking do (remove from feeds, prevent messages, hide profile, etc.)?

---

## Process

- When you **fix** an item, update the checkbox to `[x]` and, if helpful, add a short note with commit hash or date.
- When you **discover new wiring or integration issues**, add a new bullet under the relevant section (or a new section) with:
  - Short title
  - Files involved
  - Problem description
  - Planned resolution
