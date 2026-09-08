# Rainbow Android prototype

This folder contains the native Android prototype required for the real Rainbow Current Front Home Screen widget.

The normal Rainbow website remains hosted on GitHub Pages. The Android app is a small WebView wrapper around that site plus a native Android widget.

## What this prototype does

- Opens the normal Rainbow GitHub Pages interface inside the Android app.
- Provides a native bridge to the mobile widget setting in Rainbow.
- Stores the PluralKit token in Android encrypted app storage when widget access is enabled.
- Registers a real Android Home Screen widget.
- Loads the current fronters directly from the PluralKit API.
- Shows the current fronter names and a running front timer.
- Supports manual widget refresh.
- Requests a background refresh approximately every 15 minutes while widget access is enabled.

The Android widget requires an internet connection to refresh PluralKit data.

## Build in Android Studio

1. Install Android Studio.
2. Clone or download the RainbowPK repository.
3. In Android Studio, choose **Open**.
4. Select the `android-app` folder.
5. Allow Gradle to sync and install any requested Android SDK components.
6. Connect your Android phone with USB debugging enabled, or use an Android emulator.
7. Select the `app` run configuration.
8. Press **Run**.

For an APK, use:

**Build > Build App Bundles or APKs > Build APKs**

Android Studio will show the generated APK location when the build completes.

## First setup

1. Install and open the native Rainbow app.
2. Sign in to Rainbow normally.
3. Enable **Keep me signed in**.
4. Open **Settings**.
5. Find **Current Front widget**.
6. Confirm all requirements are checked.
7. Enable **Home Screen widget**.

When enabled from the native Android app, Rainbow sends the remembered PluralKit token through the native bridge. Android stores that copy using encrypted app storage.

## Add the widget

After enabling widget access:

1. Return to the Android Home Screen.
2. Long press an empty area.
3. Choose **Widgets**.
4. Find **Rainbow**.
5. Select **Current Front** and place it on the Home Screen.

The exact launcher wording varies by Android device.

## Privacy

The Home Screen widget can expose current fronter names to anyone who can see the phone screen.

Only enable it on a device you trust.

The token is not placed in the widget UI and is not committed to this repository.

Disabling widget access clears the Android app's encrypted token copy and stops scheduled widget refresh work.

## Prototype limitations

- Android only for now.
- Member avatars are not shown in the first native widget prototype.
- Android background refresh intervals are controlled by the operating system and are not guaranteed to run at an exact time.
- The widget timer is based on PluralKit's current switch timestamp.
- A normal browser-installed PWA cannot register this launcher widget. The native Android app must be installed.
