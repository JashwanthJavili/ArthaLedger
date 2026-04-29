Firebase Realtime Database rules in this repo are available at `firebase.rules.json`.

Current local file: `firebase.rules.json` contains strict per-user rules:

```
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

Apply these rules in the Firebase Console (Realtime Database -> Rules) to allow authenticated users to read/write only their own `users/$uid` data.

Steps:
1. Open Firebase Console: https://console.firebase.google.com/
2. Select your project.
3. Navigate to "Realtime Database" -> "Rules".
4. Replace the existing rules with the content of `firebase.rules.json` and "Publish".

If you prefer to allow development writes temporarily, use this permissive rule (ONLY for local/dev):

```
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Important: revert permissive rules before shipping.

After publishing rules, re-login in the app and try creating a project — it should succeed for the authenticated user.
