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
      favicon: "./assets/favicon.png"
    },
    experiments: {
      baseUrl: process.env.GH_PAGES ? "/wish_me_not/" : "/"
    }
  }
};
