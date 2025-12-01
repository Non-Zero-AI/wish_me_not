export default {
  expo: {
    name: "Wish Me Not",
    slug: "wish-me-not",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/Wish Me Not Logo.png",
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
        foregroundImage: "./assets/Wish Me Not Logo.png",
        backgroundColor: "#1a2332"
      },
      package: "com.wishmenot.app",
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/Wish Me Not Logo.png",
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
