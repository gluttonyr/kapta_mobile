import { withAppBuildGradle } from "expo/config-plugins";

// CMake 3.22.1's ninja can't handle Windows paths over 260 chars (react-native-gesture-handler codegen);
// 3.31.6 ships ninja 1.12, which does once LongPathsEnabled=1. Kept as a plugin so `expo prebuild` re-applies it.
// Windows only: EAS builds on Linux, which has no 260-char limit and may not have this CMake version.
const withCmake = (cfg) =>
  process.platform !== "win32" ? cfg : withAppBuildGradle(cfg, (c) => {
    if (!c.modResults.contents.includes('version "3.31.6"')) {
      c.modResults.contents += '\nandroid { externalNativeBuild { cmake { version "3.31.6" } } }\n';
    }
    return c;
  });

export default ({ config }) => withCmake({
  ...config,
  name: "Kapta",
  slug: "kapta",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "kapta",
  userInterfaceStyle: "dark",
  android: {
    // Not Mati-Pay's package: Kapta installs next to it instead of replacing it.
    package: "com.urbain_diligence.kapta",
    adaptiveIcon: {
      backgroundColor: "#0F172A",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: { output: "single", favicon: "./assets/images/favicon.png" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0F172A",
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
      },
    ],
    // modules/sms-reader is autolinked from modules/; its AndroidManifest (permissions, receivers, service) is merged by Gradle, so no config plugin is needed.
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    ...config.extra,
    // Kapta license server. The client's backend URL is not here: it comes with the license.
    // Set KAPTA_API_URL for the build; the default reaches a local server from the Android emulator.
    kaptaApiUrl: process.env.KAPTA_API_URL || "http://10.0.2.2:3001",
    // No EAS project yet (Mati-Pay's belongs to Matistore): `npx eas-cli init` adds Kapta's own id here.
  },
});
