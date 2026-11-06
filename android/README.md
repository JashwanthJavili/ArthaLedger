# ArthaLedger Android app

A Trusted Web Activity: a small Android shell that opens https://artha-ledger.vercel.app
full screen in Chrome. Generated with Bubblewrap; package `com.arthaledger.app`.

It adds one native feature, **Add from bank SMS** (`SmsImportActivity`):

1. The web app opens `arthaledger://sms-import` (Settings, or a book's menu).
2. The activity explains what it reads, asks for the `READ_SMS` permission, and reads
   the last 30 days of payment messages from bank/UPI senders on the phone (`SmsReader`).
3. It opens `/sms-import` and hands the messages to the page over Chrome's private
   app-to-page channel (postMessage). They never touch the network or browser history.
4. The page (`frontend/src/pages/SmsImportPage.jsx`, parser `frontend/src/lib/smsParse.js`)
   turns them into suggested entries for the user to review and add.

The channel needs the site's `/.well-known/assetlinks.json` to grant this app
`delegate_permission/common.use_as_origin`, signed with the release key below.

## Build

Needs JDK 17+ and the Android SDK (`local.properties` with `sdk.dir=...`).

```sh
./gradlew assembleRelease   # signed APK: app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease     # Play Store bundle: app/build/outputs/bundle/release/app-release.aab
```

Signing reads `keystore.properties` (never committed):

```properties
storeFile=C:/path/to/signing.keystore
storePassword=...
keyAlias=...
keyPassword=...
```

Use the same key as the published app, or phones can't update it and the site's
asset links won't match.

The `debug` build points at `http://localhost:4795` for testing on an emulator
(`adb reverse tcp:4795 tcp:4795`).

## Before each release

- Raise `versionCode` / `versionName` in `app/build.gradle`.
- Copy the signed APK to `frontend/public/download/ArthaLedger.apk` (the website's download).
- Google Play only allows `READ_SMS` for apps it approves; this app would apply under
  "SMS-based money management" with the Permissions Declaration Form.
