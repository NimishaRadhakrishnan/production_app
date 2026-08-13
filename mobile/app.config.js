// Converted from app.json (JSON) to app.config.js (JS) specifically to
// support an environment-driven backend URL - a JSON file can't read
// process.env, a .js config can.
//
// Every field below is copied verbatim from the previous app.json - see
// the "don't rewrite these without a specific reason" note on the
// location/camera permission strings in particular. Nothing here was
// rewritten; this is a format conversion, not a content change.
//
// The one addition is `extra.apiUrl`, for runtime introspection only
// (e.g. showing "Connected to: <url>" somewhere for debugging). The
// actual value api.ts's fetch calls use does NOT come from here - it
// reads process.env.EXPO_PUBLIC_API_URL directly, which Metro inlines
// into the JS bundle automatically (first-class in SDK 49, see
// https://docs.expo.dev/guides/environment-variables/, which explicitly
// recommends process.env.EXPO_PUBLIC_* over the Constants.expoConfig.extra
// pattern this file also sets up below). Both exist here for clarity:
// extra.apiUrl documents what's-configured, process.env is what's
// actually used.
module.exports = {
  expo: {
    name: "Vishakan Biotech FFM",
    slug: "vishakan-biotech-ffm",
    version: "1.0.0",
    sdkVersion: "49.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.vishakanbiotech.ffm",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription:
          "Vishakan Biotech FFM needs camera access so field officers can attach a photo to crop issue reports and visit logs.",
        NSLocationWhenInUseUsageDescription:
          "Vishakan Biotech FFM uses your location to record accurate check-in/check-out positions and verify field visits while you're using the app.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Vishakan Biotech FFM tracks field officer location throughout company working hours (9 AM\u20136 PM) while checked in, for attendance verification and field-work confirmation. Tracking stops as soon as you check out.",
        NSLocationAlwaysUsageDescription:
          "Vishakan Biotech FFM tracks field officer location throughout company working hours (9 AM\u20136 PM) while checked in, for attendance verification and field-work confirmation. Tracking stops as soon as you check out.",
        UIBackgroundModes: ["location"],
      },
    },
    android: {
      package: "com.vishakanbiotech.ffm",
      versionCode: 1,
      permissions: ["CAMERA"],
    },
    plugins: [
      [
        "expo-image-picker",
        {
          cameraPermission:
            "Vishakan Biotech FFM needs camera access so field officers can attach a photo to crop issue reports and visit logs.",
          microphonePermission: false,
          photosPermission: false,
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Vishakan Biotech FFM tracks field officer location throughout company working hours (9 AM\u20136 PM) while checked in, for attendance verification and field-work confirmation. Tracking stops as soon as you check out.",
          locationAlwaysPermission:
            "Vishakan Biotech FFM tracks field officer location throughout company working hours (9 AM\u20136 PM) while checked in, for attendance verification and field-work confirmation. Tracking stops as soon as you check out.",
          locationWhenInUsePermission:
            "Vishakan Biotech FFM uses your location to record accurate check-in/check-out positions and verify field visits while you're using the app.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://backend-bgfz.onrender.com/api/v1",
    },
  },
};
