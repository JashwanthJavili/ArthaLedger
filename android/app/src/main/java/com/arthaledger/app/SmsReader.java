package com.arthaledger.app;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * Reads recent SMS from the phone's inbox and keeps only the ones that look
 * like bank or UPI payment messages. Everything stays on the phone; the page
 * that receives them turns each one into a suggested entry.
 */
final class SmsReader {

    /** Most messages handed to the page in one go. */
    static final int MAX_MESSAGES = 400;
    /** Rough cap on the text handed over, well under Android's IPC limit. */
    static final int MAX_CHARS = 300_000;

    // Business sender headers such as "AX-HDFCBK" or "VM-SBIUPI-S", or a business
    // chat name such as "Kotak Mahindra Bank" (letters and spaces only). A
    // person's message always shows a phone number here, never a contact name.
    private static final Pattern SENDER = Pattern.compile(
            "^(?:[A-Za-z]{2}-)?[A-Za-z0-9]{3,12}(?:-[A-Za-z]{1,2})?$|^(?=.{3,40}$)[A-Za-z][A-Za-z&.']*(?: [A-Za-z&.']+){1,6}$");
    private static final Pattern DIGITS = Pattern.compile("^\\+?\\d+$");
    /** Longest message looked at (a long multi-part SMS is ~1,000 characters). */
    static final int MAX_BODY = 2000;

    // Mentions money moving ("Rs.500", "Rs:500", "INR 500", "₹500", "debited")
    private static final Pattern MONEY = Pattern.compile(
            "(?i)(?<![a-z])(rs|inr|₹)[.:]*\\s*[0-9]|\\b(debited|credited)\\b");
    // Safety footers ("Never share your OTP/PIN with anyone") end many real
    // debit alerts, so they are ignored when looking for an OTP.
    private static final Pattern SAFETY_TIP = Pattern.compile(
            "(?i)\\b(?:pls |please )?(?:do not|don't|dont|never|not to)\\s+(?:ever\\s+)?(?:share|disclose|tell)\\b[^.!\\n]*"
                    + "|\\b(?:never|nor|won't|will not|does not|doesn't) (?:ever )?asks? (?:you )?for\\b[^.!\\n]*");
    // One-time passwords and login codes are never handed over
    private static final Pattern OTP = Pattern.compile(
            "(?i)\\bOTP\\b|one[\\s-]?time[\\s-]?(?:pin|pass(?:word|code))|verification code|security code"
                    + "|\\b(?:3d ?secure|secure|txn|transaction) (?:pin|password|code)\\b|\\bpin\\b\\s*(?:is\\s*)?:?\\s*\\d{4,8}\\b"
                    + "|\\buse \\d{4,8}\\b|\\bvalid (?:for|till) (?:\\d+ ?min|the next)"
                    + "|\\bauth(?:entication|orisation|orization)? code\\b|\\b(?:use|enter)\\s+(?:the\\s+)?code\\b"
                    + "|\\bcode\\s*(?:is\\s*)?:?\\s*\\d{4,8}\\b|\\b\\d{4,8}\\s+is\\s+(?:your|the)\\b");

    static boolean isOtp(String body) {
        // NFKC turns decorative letters ("𝗢𝗧𝗣") into plain ones first
        String plain = Normalizer.normalize(body, Normalizer.Form.NFKC);
        return OTP.matcher(SAFETY_TIP.matcher(plain).replaceAll(" ")).find();
    }

    private SmsReader() {}

    static final class Result {
        final JSONArray items;
        final boolean truncated;

        Result(JSONArray items, boolean truncated) {
            this.items = items;
            this.truncated = truncated;
        }
    }

    static boolean looksLikePayment(String sender, String body) {
        if (sender == null || body == null || body.length() > MAX_BODY) return false;
        String s = sender.trim();
        if (!SENDER.matcher(s).matches() || DIGITS.matcher(s).matches()) return false;
        return MONEY.matcher(body).find() && !isOtp(body);
    }

    /** Payment-like messages from the last {@code days} days, newest first. */
    static Result read(Context context, int days) throws JSONException {
        long since = System.currentTimeMillis() - days * 24L * 60 * 60 * 1000;
        JSONArray items = new JSONArray();
        boolean truncated = false;
        int chars = 0;
        String[] projection = {"address", "body", "date"};
        try (Cursor c = context.getContentResolver().query(
                Uri.parse("content://sms/inbox"), projection,
                "date >= ?", new String[]{String.valueOf(since)}, "date DESC")) {
            if (c == null) return new Result(items, false);
            int iAddress = c.getColumnIndex("address");
            int iBody = c.getColumnIndex("body");
            int iDate = c.getColumnIndex("date");
            while (c.moveToNext()) {
                String sender = iAddress >= 0 ? c.getString(iAddress) : null;
                String body = iBody >= 0 ? c.getString(iBody) : null;
                long date = iDate >= 0 ? c.getLong(iDate) : 0;
                if (date <= 0 || !looksLikePayment(sender, body)) continue;
                if (items.length() >= MAX_MESSAGES || chars + body.length() > MAX_CHARS) {
                    truncated = true;
                    break;
                }
                chars += body.length();
                items.put(new JSONObject()
                        .put("sender", sender.trim())
                        .put("body", body)
                        .put("date", date));
            }
        }
        return new Result(items, truncated);
    }
}
