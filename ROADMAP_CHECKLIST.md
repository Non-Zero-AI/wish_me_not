# Roadmap Execution Checklist

_This file tracks the implementation of items from `WIRING_CHECKLIST.md` in a low-conflict sequence._

---

## Phase 0 – Product Decisions (Section 10)

- [ ] **Clarify privacy semantics** for `is_public` and future circles
- [ ] **Decide behavior for editing claimed wishes** (keep/remove claim, notify?)
- [ ] **Define deletion policy** for claimed items (hard vs soft delete)
- [ ] **Finalize list/event model** (one vs multiple lists per wish; event vs category)
- [ ] **Decide username policy** (mutable? redirects?)
- [ ] **Prioritize social safety features** (block, report, mute)

---

## Phase 1 – Core DB Schema Alignment (Section 7)

- [ ] **Add `profiles.username` column**
  - [ ] Create migration to add `username text UNIQUE` to `public.profiles`
  - [ ] (Optional) Backfill from email local-part for existing profiles
  - [ ] Verify `upsertProfileFromAuthUser` and username helpers work without SQL errors

- [ ] **Add `user_settings.default_posts_public` column**
  - [ ] Create migration to add `default_posts_public boolean DEFAULT false` to `public.user_settings`
  - [ ] (Optional) Backfill based on current expected default
  - [ ] Verify `addProduct` / `addManualProduct` read this column correctly

- [ ] **Harden `profiles.email` guarantees**
  - [ ] Audit data for null/duplicate emails
  - [ ] Clean up bad rows if any
  - [ ] Add `NOT NULL` + `UNIQUE` constraint on `profiles.email` (if aligned with auth)
  - [ ] Confirm `getUserIdByEmail` behaves as expected

---

## Phase 2 – Supabase Client & Auth Wiring (Section 2)

- [ ] **Move Supabase URL/key to env**
  - [ ] Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] Update `src/lib/supabase.js` to read from env
  - [ ] Smoke-test app in dev and production builds

- [ ] **Make Google OAuth redirect configurable**
  - [ ] Add `EXPO_PUBLIC_OAUTH_REDIRECT_URL` (or similar)
  - [ ] Update `signInWithGoogle` in `AuthContext` to use env-based redirect
  - [ ] Test sign-in flows on web and native

---

## Phase 3 – Friends & Social Graph Integrity (Sections 4, 7, 8, 9)

- [ ] **Implement real `deleteFriend` logic**
  - [ ] Implement DB delete in `public.friends` using `(user_id, friend_id)`
  - [ ] Decide whether unfriend is one-way or mutual

- [ ] **Align FriendsScreen + cache with DB**
  - [ ] Ensure `FriendsScreen` uses stable IDs (UUIDs where possible)
  - [ ] After deletion, re-fetch from API and update AsyncStorage
  - [ ] Verify Home feed reflects friend removals

- [ ] **(Optional) Introduce blocking**
  - [ ] Design `blocked_users` (or similar) schema
  - [ ] Filter friend lookups and feeds against blocks

---

## Phase 4 – Wishlist Lifecycle (Sections 4, 7, 8, 9)

- [ ] **Normalize wishlist privacy & claim fields**
  - [ ] Ensure all create/copy flows treat `is_public`/`isPublic` consistently
  - [ ] Confirm `claimed_by` and profile join behavior

- [ ] **Add `updateWish` API and UI**
  - [ ] Implement `updateWish` in `api.js`
  - [ ] Wire edit flows in Profile/MyList screens
  - [ ] Apply product decision for editing claimed items

- [ ] **Improve deletion semantics**
  - [ ] Make `deleteProduct` aware of `is_claimed`
  - [ ] Implement chosen deletion policy (warn / soft delete / notify)

- [ ] **Refine `stashItem` behavior**
  - [ ] Align privacy for stashed items
  - [ ] (Optional) Track original item linkage if desired

---

## Phase 5 – Lists, Events & Navigation (Sections 1, 4, 5, 8, 9)

- [ ] **List selection and creation on add**
  - [ ] Update Add Wish UI to select/create a list
  - [ ] Pass `list_id` through to `addProduct` / `addManualProduct`

- [ ] **Event usage and display**
  - [ ] Decide how to use `lists.event_date`
  - [ ] Surface lists/events in Profile or Lists screen (grouping, filtering)

- [ ] **Home & nav cleanup**
  - [ ] Replace `navigation.openDrawer()` in `HomeScreen` with SideMenu/ModalContext
  - [ ] Remove or realign FriendsScreen bottom nav with `MainTabs`
  - [ ] Revisit and, if desired, re-enable deep linking after route names stabilize

---

## Phase 6 – Notifications & Push (Sections 3, 8, 9)

- [ ] **Harden token registration**
  - [ ] Verify `push_tokens` RLS allows user + service role access
  - [ ] Add logging and early returns for missing `projectId` or failed token saves

- [ ] **Move push sending to Edge Functions**
  - [ ] Adjust client to insert into `notifications` instead of calling Expo API
  - [ ] Implement Edge Function to send pushes on new notification rows
  - [ ] Remove direct `fetch('https://exp.host/--/api/v2/push/send')` from client

- [ ] **Integrate notifications with wishlist/friends events**
  - [ ] Trigger notifications on new friends, claims, edits, and deletions (per product decisions)

---

## Phase 7 – Circles / Communities (Optional, Sections 7, 8, 9)

- [ ] **Define circle semantics**
  - [ ] Decide how circles relate to privacy (and to `is_public`)

- [ ] **Wire `circle_id` into flows**
  - [ ] Allow assigning wishes to a circle
  - [ ] Update feed queries to respect circle membership

- [ ] **Iterate on circle UI**
  - [ ] Start with simple use cases (e.g. close friends)
  - [ ] Expand to full community features as needed
