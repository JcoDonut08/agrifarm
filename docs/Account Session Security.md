# Account session security

Changing a password from customer settings or the seller profile keeps the browser making the change signed in. Other tracked sessions lose access on their next request, including checkout and chatbot order lookup. Resetting a forgotten password requires signing in again and invalidates tracked sessions using the previous password.

The web middleware checks each authenticated session against the account's current password fingerprint. A successful login records that fingerprint immediately, including Google and remembered logins. Password edits already rotate the remember token and regenerate the current session; the middleware updates that session's fingerprint after the successful change. This uses Laravel's [session authentication middleware](https://laravel.com/framework/docs/12.x/authentication#invalidating-sessions-on-other-devices).

A verified password-reset code grants permission for 15 minutes. That permission now includes a keyed fingerprint of the password at verification time. A subsequent password change invalidates it. The reset service checks again after locking the account row, so a concurrent password change cannot be overwritten using an earlier grant. Reset grants created before this release must request and verify a new code.

## Rollout

No new database migration or environment variable is needed for this security change. Existing authenticated sessions created before the middleware was enabled have no fingerprint; Laravel initializes it on their next authenticated request. Such legacy sessions cannot be compared with the password they originally used until that happens. For a clean deployment, start with fresh sessions and do not copy local session files or session-cache contents to the host, as specified in the Upsun plan. This change does not delete existing local session files.

Invalidation happens when another browser next contacts the server. It does not remotely close an already displayed page. Protected actions on that page are denied after the password changes; the user must sign in again.

## Verification

Use a test account in two separate browser profiles or one regular and one private window:

1. Sign in in both browsers and open a protected page.
2. Change the password through settings in the first browser. Reload it and confirm it remains signed in.
3. Refresh the second browser's protected page. It should return to login.
4. Confirm the previous password fails and the new password works.
5. Repeat using password recovery. Previously signed-in browsers should lose access on their next request.

Run the automated checks locally:

```sh
php artisan test --compact tests/Feature/Auth/SessionPasswordSecurityTest.php
npx playwright test tests/e2e/session-password-security.spec.js
```

The PHP checks cover customer, seller, and admin sessions; checkout and chatbot protection; password changes and resets; expired reset permissions after password changes; concurrent changes; and legacy reset grants. The browser checks use an isolated SQLite database and two independent browser contexts for customer and seller accounts at mobile, tablet, and desktop widths. Hosted behavior still needs verification after deployment.
