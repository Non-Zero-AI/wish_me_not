# Wish Me Not 🎁

The wishlist app you actually want. **Wish Me Not** helps you curate personal wishlists and share them with friends, ensuring you get exactly what you want (and nothing you don't).

## Features

### 📝 for You (My List)

- **Add Items via URL:** Simply paste a link to any product, and the app fetches details automatically.
- **Manage Your List:** Delete items or view them directly in the browser.
- **Sync:** Your list is synced to the cloud, ensuring it's available across devices.

### 👥 for Friends

- **Connect:** Add friends using their email address.
- **View Wishlists:** See what your friends really want.
- **Claim Gifts:** "Wish" for an item on a friend's list to claim it. This marks it as taken so others don't buy the same thing!
- **Real-time Updates:** Friends' lists and availability are updated instantly.

### 📱 Tech Stack

- **Framework:** React Native (Expo SDK 50+)
- **Platform:** iOS, Android, and Web (PWA)
- **Backend:** Serverless Webhooks (n8n automation) for data persistence and logic.
- **Styling:** Custom theme with Dark Mode support.

## How it Works

1. **Onboarding:** Sign up with your name and email.
2. **My List:** Add items you love. The app sends this to our automation backend.
3. **Friends:** Add friends to see their lists. The app fetches their centralized friend list and details.
4. **Gifting:** When you claim a gift, the owner is NOT notified (to keep the surprise!), but other friends will see it as "Claimed".

## Installation (Development)

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the app:
   ```bash
   npx expo start
   ```

## Web / PWA

This app is optimized for the web. You can install it to your home screen:

- **iOS:** Open in Safari -> Share -> Add to Home Screen.
- **Android:** Open in Chrome -> Menu -> Install App.

## Backend Integration

The app communicates with n8n webhooks for:

- User Creation
- Product/Item Management
- Friend Management
- Gift Claiming

---

*Built with ❤️ by Non-Zero AI*
