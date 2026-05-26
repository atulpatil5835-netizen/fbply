# FBPly Android Release Notes

## App Identity

- App name: FBPly
- Package id: `com.fbply.app`
- Positioning: Calm financial clarity for real-life purchases.
- Primary category: Finance

## Build Flow

1. `npm run lint`
2. `npm run build`
3. `npm run cap:sync`
4. `npm run android:debug`
5. `npm run android:bundle`
6. Open Android Studio with `npm run android:open`
7. Create a properly signed Android App Bundle from Android Studio for Play Store upload.

Local notes for this machine:

- Android SDK: `C:/Users/Atul/AppData/Local/Android/Sdk`
- Android Studio JDK: `C:/Program Files/Android/Android Studio/jbr`
- Generated release bundle path: `android/app/build/outputs/bundle/release/app-release.aab`
- The `android:debug` and `android:bundle` npm scripts auto-detect those local paths on this Windows machine.

## Runtime Notes

- Voice entry uses browser-native speech recognition and asks for confirmation before saving.
- PDF and CSV export use Android's share sheet inside the native app.
- Local app data uses WebView storage; Supabase remains optional through environment variables.
- Microphone permission is optional and only needed for voice expense entry.

## Play Store Copy Draft

Short description:
Calm expense tracking and purchase comfort planning.

Full description:
FBPly helps you understand monthly flexibility, track expenses lightly, plan purchases with less stress, and keep financial decisions practical. It focuses on breathing room, custom commitments, savings buckets, shared expenses, reports, and calm guidance instead of complicated finance dashboards.
