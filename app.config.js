export default {
  expo: {
    name: "Wish Me Not",
    slug: "wish-me-not",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1a2332"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.wishmenot.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1a2332"
      },
      package: "com.wishmenot.app",
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/favicon.png",
      name: "Wish Me Not",
      shortName: "WishMeNot",
      description: "The wishlist app you actually want.",
      backgroundColor: "#1a2332",
      themeColor: "#E2B93B",
      display: "standalone",
      startUrl: "/",
      orientation: "portrait",
      meta: {
        apple: {
          mobileWebAppCapable: "yes",
          mobileWebAppStatusBarStyle: "black-translucent"
        }
      }
    },
    experiments: {
      baseUrl: process.env.GH_PAGES ? "/wish_me_not/" : "/"
    }
  }
};
