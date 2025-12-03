export default {
  expo: {
    name: "Wish Me Not",
    slug: "wish-me-not",
    version: "1.0.0",
    scheme: "wishmenot",
    orientation: "portrait",
    icon: "./assets/New Splash-Icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/New Splash-Icon.png",
      resizeMode: "contain",
      backgroundColor: "#1a2332"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.wishmenot.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/New Splash-Icon.png",
        backgroundColor: "#1a2332"
      },
      package: "com.wishmenot.app",
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/New Splash-Icon.png",
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
