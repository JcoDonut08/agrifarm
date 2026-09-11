# Contact page and admin email delivery

## Routes and behavior

- `GET /contact` renders the public Contact page for guests and signed-in users. Signed-in users start with their name and email filled in.
- `POST /contact` validates and sends a message to the server-configured AgriFarm inbox. Navbar, mobile navigation, and footer Contact links open this page.
- Categories: inquiry, report, account, other. Required: name, email, category, subject, and message (20–5,000 characters). An optional product/seller/order reference is allowed. No attachments.
- Uses the normal Laravel web middleware and CSRF protection. Up to five validated submissions per IP per ten minutes; further attempts get a form error. Invalid input never sends email.
- Email uses the application's configured From address and the submitted email as Reply-To. Recipients cannot be supplied by the visitor. The email identifies sender details as user-provided, not verified account identity.
- Each accepted submission has an `AF-` reference in the email and confirmation. No contact/report database table is created; the admin manages and replies to messages in the email inbox.
- Sending is synchronous through the configured Laravel mailer, so this feature does not require a queue worker. SMTP rejection/connection errors produce a form error and preserve entered details. Application failure logs include reference and exception type, not message text or credentials.

## Configuration

`CONTACT_EMAIL` optionally overrides the admin recipient. When unset, it uses `MAIL_FROM_ADDRESS`. The current local AgriFarm From address is `agrifarm629@gmail.com`, so that is the default recipient. Set the override in the deployment environment if a different admin inbox is desired.

Use a real configured SMTP transport for delivery. Laravel `log` and `array` mailers are for development/testing and do not deliver to an inbox. Keep SMTP passwords in the environment, never in source control. After deployment configuration changes, refresh the Laravel configuration cache using the project's deployment process.

The contact email is displayed on the page with a mailto link as an alternative when the form is unavailable. The mail provider accepting a message does not guarantee inbox placement; inspect the configured mailbox/spam folder during a controlled deployment smoke test.

## Verification

- `php artisan test --compact tests/Feature/ContactTest.php`: eight tests, 61 assertions, with fake mail (no external delivery).
- Production frontend build passed.
- Browser checks cover the page at 390, 768, and 1440px in light/dark; real invalid submission errors; keyboard focus; report selection; and a simulated success response with cleared message fields. Valid browser submissions are intercepted during QA to avoid emailing test reports.
- Live SMTP delivery was not exercised by automated tests. Send one intentional message through `/contact` to confirm end-to-end mailbox delivery after deploying.

## Visual refinement

Inspired by Shopify?s contact-page examples (https://www.shopify.com/blog/contact-us-page): compact direct-contact details, a focused form, and clear topic routing. AgriFarm uses a pale green support panel (muted forest in dark mode), descriptive topic selectors, flat form fields, and a separate submit row. On mobile, the form comes before the support panel. No response-time promises or new support channels were added. Email handling is unchanged.
