package com.arthaledger.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;

import org.json.JSONObject;

import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

/**
 * "Add from bank SMS". The web app opens arthaledger://sms-import; this
 * activity explains what it reads, asks for the SMS permission, reads recent
 * bank/UPI messages on the phone, and opens the app's review page. The
 * messages reach that page over Chrome's private app-to-page channel
 * (postMessage), so they never touch the network or the browser history.
 */
public class SmsImportActivity extends Activity {

    private static final int REQUEST_SMS = 41;
    private static final Pattern ID = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
    /** Google Chrome, then its Beta, Dev and Canary channels. */
    private static final String[] CHROME_PACKAGES = {
            "com.android.chrome", "com.chrome.beta", "com.chrome.dev", "com.chrome.canary"};

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    private Context strings;          // resources in the language the web app uses
    private int days = 30;
    private String bookParam = null;  // "projectId/bookId", already checked
    private String langParam = "en";

    private CustomTabsServiceConnection connection;
    private CustomTabsSession session;
    private String payload;
    private boolean validated;
    private boolean channelRequested;
    private boolean channelReady;
    private boolean pageOpened;
    private int resends;

    /** Resend every 2 s for up to 30 s until the page confirms it has the messages. */
    private static final long RESEND_MS = 2000;
    private static final int MAX_RESENDS = 15;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        readParams(getIntent() != null ? getIntent().getData() : null);
        strings = localized(langParam);

        // Always ask first, even when the permission is already granted: any
        // web page can open arthaledger://sms-import, so a read only ever
        // happens after the person taps Continue here.
        showDisclosure();
    }

    // ── Parameters from the web app ──────────────────────────────────────────

    private void readParams(@Nullable Uri data) {
        if (data == null) return;
        String d = data.getQueryParameter("days");
        if ("7".equals(d) || "30".equals(d) || "90".equals(d)) days = Integer.parseInt(d);
        String l = data.getQueryParameter("lang");
        if ("te".equals(l) || "ta".equals(l) || "hi".equals(l)) langParam = l;
        String b = data.getQueryParameter("book");
        if (b != null) {
            String[] parts = b.split("/", -1);
            if (parts.length == 2 && ID.matcher(parts[0]).matches() && ID.matcher(parts[1]).matches()) {
                bookParam = b;
            }
        }
    }

    private Context localized(String lang) {
        Configuration config = new Configuration(getResources().getConfiguration());
        config.setLocale(new Locale(lang));
        return createConfigurationContext(config);
    }

    private String s(int id) {
        return strings.getString(id);
    }

    // ── Permission, with a clear explanation first ───────────────────────────

    private boolean hasSmsPermission() {
        return checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    private AlertDialog.Builder dialog() {
        return new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Light_Dialog_Alert)
                .setCancelable(true)
                .setOnCancelListener(d -> openPage("cancelled"));
    }

    private void showDisclosure() {
        dialog()
                .setTitle(s(R.string.sms_disclosure_title))
                .setMessage(s(R.string.sms_disclosure_body))
                .setPositiveButton(s(R.string.sms_continue), (d, w) -> {
                    if (hasSmsPermission()) {
                        readMessages();
                    } else {
                        requestPermissions(new String[]{Manifest.permission.READ_SMS}, REQUEST_SMS);
                    }
                })
                .setNegativeButton(s(R.string.sms_not_now), (d, w) -> openPage("cancelled"))
                .show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQUEST_SMS) return;
        if (results.length == 0) {
            // The prompt was dismissed without an answer
            openPage("cancelled");
            return;
        }
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            readMessages();
        } else if (!shouldShowRequestPermissionRationale(Manifest.permission.READ_SMS)) {
            // "Don't ask again": Android won't show its prompt any more
            dialog()
                    .setTitle(s(R.string.sms_blocked_title))
                    .setMessage(s(R.string.sms_blocked_body))
                    .setPositiveButton(s(R.string.sms_open_settings), (d, w) -> {
                        startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                Uri.fromParts("package", getPackageName(), null)));
                        finish();
                    })
                    .setNegativeButton(s(R.string.sms_not_now), (d, w) -> openPage("denied"))
                    .show();
        } else {
            openPage("denied");
        }
    }

    // ── Reading ──────────────────────────────────────────────────────────────

    private void readMessages() {
        worker.execute(() -> {
            String json;
            try {
                SmsReader.Result r = SmsReader.read(this, days);
                json = new JSONObject()
                        .put("type", "artha-sms")
                        .put("version", 1)
                        .put("days", days)
                        .put("truncated", r.truncated)
                        .put("items", r.items)
                        .toString();
            } catch (Exception e) {
                json = null;
            }
            final String result = json;
            main.post(() -> {
                if (isFinishing() || isDestroyed()) return;
                if (result == null) {
                    openPage("error");
                } else {
                    payload = result;
                    connectAndOpen();
                }
            });
        });
    }

    // ── Opening the review page with the messages ────────────────────────────

    private Uri origin() {
        return Uri.parse(BuildConfig.WEB_ORIGIN);
    }

    private Uri pageUrl(@Nullable String status) {
        Uri.Builder b = Uri.parse(BuildConfig.WEB_ORIGIN + "/sms-import").buildUpon()
                .appendQueryParameter("app", BuildConfig.APP_FEATURES);
        if (bookParam != null) b.appendQueryParameter("book", bookParam);
        if (status != null) b.appendQueryParameter("status", status);
        return b.build();
    }

    /** Opens the review page without messages (cancelled, denied, error). */
    private void openPage(String status) {
        if (pageOpened) return;
        pageOpened = true;
        launch(pageUrl(status), null);
        finish();
    }

    /**
     * The browser the messages may be handed to: genuine Google Chrome only.
     * The browser itself answers the "is this the real site?" check, so an
     * app merely posing as a browser must never get the messages. A package
     * named like Chrome counts only if it came with the phone or from the
     * Play Store (a fake can't take that name when the real one is there).
     */
    @Nullable
    private String trustedChrome() {
        PackageManager pm = getPackageManager();
        for (String pkg : CHROME_PACKAGES) {
            try {
                ApplicationInfo info = pm.getApplicationInfo(pkg, 0);
                if (!info.enabled) continue;
                boolean system = (info.flags & (ApplicationInfo.FLAG_SYSTEM | ApplicationInfo.FLAG_UPDATED_SYSTEM_APP)) != 0;
                boolean fromPlay = "com.android.vending".equals(installerOf(pm, pkg));
                if (!system && !fromPlay) continue;
                Intent service = new Intent(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION).setPackage(pkg);
                if (pm.resolveService(service, 0) != null) return pkg;
            } catch (PackageManager.NameNotFoundException ignored) {
                // not installed
            }
        }
        return null;
    }

    @Nullable
    private static String installerOf(PackageManager pm, String pkg) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                return pm.getInstallSourceInfo(pkg).getInstallingPackageName();
            }
            return pm.getInstallerPackageName(pkg);
        } catch (Exception e) {
            return null;
        }
    }

    private void connectAndOpen() {
        String chrome = trustedChrome();
        if (chrome == null) {
            Toast.makeText(this, s(R.string.sms_need_chrome), Toast.LENGTH_LONG).show();
            openPage("nochrome");
            return;
        }
        connection = new CustomTabsServiceConnection() {
            @Override
            public void onCustomTabsServiceConnected(@NonNull ComponentName name, @NonNull CustomTabsClient client) {
                // Chrome only accepts a relationship check after warmup
                client.warmup(0L);
                session = client.newSession(callback);
                if (session == null) {
                    openPage("error");
                    return;
                }
                // The page only accepts messages that come as its own origin
                session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, origin(), null);
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {
                session = null;
            }
        };
        boolean bound = CustomTabsClient.bindCustomTabsService(this, chrome, connection);
        if (!bound) {
            connection = null;
            openPage("error");
        }
    }

    private final CustomTabsCallback callback = new CustomTabsCallback() {
        @Override
        public void onRelationshipValidationResult(int relation, @NonNull Uri requestedOrigin, boolean result, @Nullable Bundle extras) {
            main.post(() -> {
                validated = result;
                if (pageOpened || isDestroyed()) return;
                if (!result || session == null) {
                    // Without a verified relationship the page can't trust the
                    // messages, so it opens without them and explains.
                    openPage("unverified");
                    return;
                }
                pageOpened = true;
                launch(pageUrl(null), session);
                main.postDelayed(resend, RESEND_MS);
            });
        }

        @Override
        public void onNavigationEvent(int navigationEvent, @Nullable Bundle extras) {
            if (navigationEvent != TAB_SHOWN && navigationEvent != NAVIGATION_STARTED
                    && navigationEvent != NAVIGATION_FINISHED) return;
            // A finished load is a new page: any channel to the page before it is gone
            boolean newPage = navigationEvent == NAVIGATION_FINISHED;
            main.post(() -> askForChannel(newPage));
        }

        @Override
        public void onMessageChannelReady(@Nullable Bundle extras) {
            main.post(() -> {
                channelReady = true;
                sendPayload();
            });
        }

        @Override
        public void onPostMessage(@NonNull String message, @Nullable Bundle extras) {
            // The page says it has the messages: drop our copy and stop resending
            if (message.contains("\"artha-sms-ack\"")) main.post(() -> {
                payload = null;
                main.removeCallbacks(resend);
            });
        }
    };

    /**
     * Asks Chrome for a channel to the page. Chrome may open one while the
     * previous page is still on screen (a slow phone, or the app's tab being
     * reused), and that one dies when the new page arrives, so this is asked
     * again for every new page until the page confirms it has the messages.
     */
    private void askForChannel(boolean newPage) {
        if (!validated || session == null || payload == null) return;
        if (newPage) channelRequested = false;
        if (channelRequested) return;
        // If Chrome says no (too early), the next event or resend asks again
        channelRequested = session.requestPostMessageChannel(origin(), origin(), new Bundle());
        if (channelRequested) channelReady = false;
    }

    private void sendPayload() {
        if (session != null && payload != null && channelReady) session.postMessage(payload, null);
    }

    /** Until the page says it has them: send again, on a fresh channel if need be. */
    private final Runnable resend = new Runnable() {
        @Override
        public void run() {
            if (payload == null || session == null || isDestroyed()) return;
            if (++resends > MAX_RESENDS) return;
            askForChannel(resends % 3 == 0);   // a fresh channel every few tries
            sendPayload();
            main.postDelayed(this, RESEND_MS);
        }
    };

    private void launch(Uri url, @Nullable CustomTabsSession withSession) {
        int bar = getColor(R.color.colorPrimary);
        CustomTabColorSchemeParams colors = new CustomTabColorSchemeParams.Builder()
                .setToolbarColor(bar)
                .setNavigationBarColor(getColor(R.color.navigationColor))
                .build();
        if (withSession != null) {
            new TrustedWebActivityIntentBuilder(url)
                    .setDefaultColorSchemeParams(colors)
                    .build(withSession)
                    .launchTrustedWebActivity(this);
        } else {
            // Back to the app as a plain launch, like the home-screen icon does
            Intent open = new Intent(this, LauncherActivity.class)
                    .setAction(Intent.ACTION_VIEW)
                    .setData(url)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(open);
        }
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    @Override
    protected void onRestart() {
        super.onRestart();
        // Back here from the review page: we're done
        if (pageOpened) finish();
    }

    @Override
    protected void onDestroy() {
        main.removeCallbacksAndMessages(null);
        worker.shutdownNow();
        if (connection != null) {
            try {
                unbindService(connection);
            } catch (IllegalArgumentException ignored) {
                // already unbound
            }
            connection = null;
        }
        session = null;
        payload = null;
        super.onDestroy();
    }
}
