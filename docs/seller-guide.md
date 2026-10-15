# Kuya Ani seller guide

The guide opens automatically on the first seller dashboard visit when `seller_guide_dismissed_at` is null, after any required temporary-password change. This includes existing sellers whose earlier boolean flag defaulted to false. The rollout therefore gives existing accounts one automatic introduction too. Completing or skipping records a timestamp on the authenticated seller only and clears the legacy `seller_guide_pending` flag. Subsequent logins do not reopen the guide. Replaying does not reset the timestamp. Settings offers Replay seller guide in English or Filipino; there is no header replay button.

The seven steps highlight the real dashboard, product controls, order overview, forecast upload panel, report date controls, Settings language preferences, and product controls again to finish. Settings is the step immediately before completion and explains language, theme, alerts, and replay. The tour makes no product, order, forecast, or report writes. Native modal behavior prevents accidental interaction with the underlying forms. Back, Next, Skip, Escape, focus restoration, mobile layouts, and both themes are supported. The forecasting explanation describes uploaded harvest records and estimated results; report guidance reflects the existing preview/export workflow.

On desktop and laptop, the guide sits near the highlighted feature. The welcome and order steps favor the left edge, product steps favor the right, and reports favor the center. Placement tries the space below, beside, or above the target and stays inside the viewport. At widths up to 800 pixels the guide remains at the bottom for predictable touch controls. Resize and scroll observers keep the spotlight aligned with the real interface.

## Artwork

Seven transparent PNG assets are saved in `public/images/seller-guide/`: `kuya-ani-welcome.png`, `kuya-ani-products.png`, `kuya-ani-orders.png`, `kuya-ani-forecasting.png`, `kuya-ani-reports.png`, `kuya-ani-settings.png`, and `kuya-ani-finished.png`. Built-in image generation used `public/images/farmer-mascot-final.jpg` as the identity/style reference for the original six poses, and the generated welcome pose for Settings. Originals remain in the generator's output directory; project copies are resized to a maximum edge of 512 pixels with alpha preserved.

Shared generation prompt:

> Use case: stylized-concept. Project asset for AgriFarm seller onboarding. Input image is the identity and style reference for Kuya Ani. Create ONE isolated waist-up Filipino farmer mascot in this pose: [pose]. Preserve the reference character's same young adult face, warm brown skin, black hair, woven straw hat, green shirt, blue denim overalls, friendly polished 3D illustration style. Remove the trowel unless relevant; preserve outfit. Centered complete hat, hands and prop, no cropping, modest transparent margin. Actual transparent background, no scene, no white backdrop, no text, no lettering, no watermark, no speech bubble. Consistent soft studio lighting. Square composition.

Pose prompts, respectively:

- Waving one open hand in a warm welcome, other hand relaxed.
- Holding a woven basket of fresh green vegetables in both hands.
- Holding a small plain clipboard and pencil, ready to check customer orders.
- Pointing at a small simple board with an unlabeled line chart and a sprout icon.
- Holding a paper report with a simple green bar chart, no letters or numbers.
- Giving one clear thumbs-up with a cheerful confident smile.

Additional Settings prompt (built-in generation, transparent background):

> Use case: stylized-concept. Create one transparent project asset for the Settings step of AgriFarm's Kuya Ani seller guide. The reference is the existing Kuya Ani mascot; preserve exactly his same young Filipino face, warm brown skin, black hair, woven straw hat, green t-shirt, blue denim overalls and polished friendly illustration style. New pose: waist-up, holding a small simple cream-colored settings board with a forest-green gear symbol, a sun symbol and crescent moon symbol, while his other hand gestures toward the board. No text or lettering. Same cheerful smile, soft studio lighting, centered complete hat and hands, modest transparent margins, square image. Actual transparent background, no scene, no watermark, no speech bubble.

## Verification

```powershell
php artisan test --compact tests/Feature/SellerGuideTest.php tests/Feature/AdminSellerManagementTest.php
npm run build
npx playwright test tests/e2e/seller-guide.spec.js --reporter=list
```

Browser scenarios use only the isolated SQLite database. Production verification must not create sellers or change their onboarding state just to exercise the tour.
