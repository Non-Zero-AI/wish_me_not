# Supabase Integration Roadmap

## Phase 1: Setup & Dependencies (CURRENT)
- [ ] Install `@supabase/supabase-js` and `react-native-url-polyfill`
- [ ] Create `src/lib/supabase.js` client initialization
- [ ] Configure environment variables (using constants for now)

## Phase 2: Database Schema Design
- [ ] Create `profiles` table (extends Auth)
    - `id` (uuid, references auth.users)
    - `first_name` (text)
    - `last_name` (text)
    - `avatar_url` (text)
    - `email` (text)
- [ ] Create `items` table (Wishlist)
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `name` (text)
    - `price` (text)
    - `image_url` (text)
    - `product_url` (text)
    - `is_claimed` (boolean)
    - `claimed_by` (uuid, references auth.users, nullable)
- [ ] Create `friends` table
    - `user_id` (uuid, references auth.users)
    - `friend_id` (uuid, references auth.users)
    - `status` (text: 'pending', 'accepted')
- [ ] Create `circles` (Communities)
    - `id` (uuid)
    - `name` (text)
    - `description` (text)
    - `created_by` (uuid)
- [ ] Create `posts` (Social Feed)
    - `id` (uuid)
    - `user_id` (uuid)
    - `content` (text)
    - `image_url` (text)
    - `created_at` (timestamp)

## Phase 3: Refactoring App Logic
- [ ] **Auth**:
    - Replace `AuthContext` to use `supabase.auth.signUp`, `signInWithPassword`, `signOut`.
    - Update `SignUpScreen` and `OnboardingScreen` (Login) to use new AuthContext methods.
- [ ] **Profiles**:
    - Create trigger to auto-create profile on signup.
    - Update `fetchUserInfo` to query `profiles` table.
- [ ] **Wishlist**:
    - Update `getUserWishlist` to query `items` table.
    - Update `addProduct` to insert into `items` table.
    - Update `deleteProduct` to delete from `items` table.
    - Update `claimGift` to update `is_claimed` and `claimed_by` in `items` table.
- [ ] **Friends**:
    - Update `getUserFriends` to query `friends` table joined with `profiles`.
    - Update `addFriend` / `deleteFriend` logic.

## Phase 4: New Features (Social)
- [ ] Implement Circles (Communities) UI and Logic
- [ ] Implement Feed (Posts, Likes, Comments)

## Reference Credentials
- **Project URL**: `https://ycjzbzynkjwmermsmnph.supabase.co`
- **Anon Key**: (See `src/lib/supabase.js` or source code, do not commit to public repo if possible, but okay for client-side app)
