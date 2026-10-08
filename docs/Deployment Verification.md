# Deployment verification

Checked on October 8, 2026. These results describe the local Windows workspace. No public hosting URL or server access has been supplied, so the deployed setup has not been verified.

## Current results

| Check | Local result | Still required on the hosting server |
| --- | --- | --- |
| HTTPS | Local application URL uses HTTP. | Verify a valid TLS certificate, HTTP-to-HTTPS redirect, and HTTPS asset URLs. |
| Debug mode | Debug is enabled in the development configuration. | Confirm the running application uses `APP_ENV=production` and `APP_DEBUG=false`. |
| Session cookies | Secure-only session cookies are not enabled locally. | Set `SESSION_SECURE_COOKIE=true` and confirm the browser receives secure cookies over HTTPS. |
| Password-reset emails | SMTP configuration and credentials are present. Password-reset and notification tests pass with simulated notifications. | Complete Forgot password with a designated test account, receive the real code, reset its password, and sign in with the new password. |
| Private uploads | The local upload disk is outside `public`; the public storage junction does not point to private uploads. Access-control tests pass. | Confirm the web root is the application's `public` directory and private files cannot be downloaded directly. Check the same access rules through the hosted application. |
| Python forecasting | PHP can start subprocesses, the configured interpreter exists, and forecast storage is writable. Both one-year and four-year runtime checks pass; Python dependency compatibility also passes. | Run the runtime check as the PHP service account and upload both sample datasets through the hosted browser. |

The focused PHP suite passed: **49 tests, 600 assertions**. It covers password reset, mail templates, profile/product upload permissions, storefront photos, forecast ownership, and forecast failure handling. These tests use isolated data and simulated notifications; they do not prove that a real email reaches an inbox or that the hosting web server protects private files.

The four-year sample ran through Laravel's actual `ForecastService` with normal Windows permissions: **20 successfully fitted crops, 12 forecast months, 34.2 seconds**. Its temporary upload was cleaned up and no forecast run was saved. The restricted execution sandbox blocked Windows multiprocessing pipes on the initial attempt; rerunning with normal permissions passed. This verifies the local CLI process, not the eventual hosting server or PHP web process.

## Hosting checks

Apply these settings only to the deployed environment, with the actual domain:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.example
SESSION_SECURE_COOKIE=true
```

After changing server configuration, refresh Laravel's configuration cache:

```bash
php artisan config:cache
```

1. Open the HTTP address and confirm it redirects to HTTPS. Confirm the certificate is valid and the browser shows no mixed-content errors. If hosting terminates TLS at a proxy, configure trust for that provider's actual proxies and confirm Laravel generates HTTPS links.
2. Check the deployed application's effective environment and debug flag. Confirm error pages do not reveal stack traces, credentials, or server paths.
3. Use a designated test account for password reset. Confirm the email arrives, the code works, and the new password permits login. Configured SMTP credentials alone are insufficient evidence.
4. Confirm the web server serves only `public`. Keep `storage/app/private` outside public aliases and storage links. Check one seller cannot access another seller's private management photo route or forecast result. Public marketplace photos are intentionally accessible through their controllers.
5. Run `php artisan forecast:check` as the PHP service account. Then upload the one-year and four-year samples through the real hosted application, check that results persist after refresh, and check temporary files are removed. The one-year sample verifies seasonal guidance; the four-year sample exercises fitted forecasts. See [SARIMA Deployment](SARIMA%20Deployment.md) for Python installation and request timeouts.
6. Confirm the database and uploaded photos survive a service restart and redeploy. Local runtime checks cannot establish the hosting provider's storage durability.

Record the hosting URL, provider, server-side command results, browser results, and test date before marking these checks complete. Keep passwords, email codes, and environment secrets out of this document.
