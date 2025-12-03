export default {
  expo: {
    name: "Wish Me Not",
    slug: "wish-me-not",
    version: "1.0.0",
    scheme: "wishmenot",
    orientation: "portrait",
    // Use new 1024x1024 icon exported for Apple devices
    icon: "./assets/New Wish Me Not Logo/apple-devices/AppIcon.appiconset/icon-ios-1024x1024.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      // Reuse the 1024x1024 icon as the splash image for consistent branding
      image: "./assets/New Wish Me Not Logo/apple-devices/AppIcon.appiconset/icon-ios-1024x1024.png",
      resizeMode: "contain",
      backgroundColor: "#1a2332"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.wishmenot.app"
    },
    android: {
      adaptiveIcon: {
        // Use the Android-specific storefront icon as the adaptive foreground image
        foregroundImage: "./assets/New Wish Me Not Logo/android/playstore-icon.png",
        backgroundColor: "#1a2332"
      },
      package: "com.wishmenot.app",
      edgeToEdgeEnabled: true
    },
    web: {
      // Match web favicon to the primary 1024x1024 icon
      favicon: "./assets/New Wish Me Not Logo/apple-devices/AppIcon.appiconset/icon-ios-1024x1024.png",
      name: "Wish Me Not",
      shortName: "WishMeNot",
      description: "The wishlist app you actually want.",
      backgroundColor: "#003049",
      themeColor: "#003049",
      display: "standalone",
      startUrl: "/",
      scope: "/",
      orientation: "portrait",
      meta: {
        apple: {
          mobileWebAppCapable: "yes",
          mobileWebAppStatusBarStyle: "black"
        }
      }
    },
    experiments: {
      baseUrl: process.env.GH_PAGES ? "/wish_me_not/" : "/"
    }
  }
};
