# Homepage and marketplace frontend preview

The reference-inspired homepage is available at `/`. Open `/?page=marketplace` for the marketplace, or use the navigation. Barangay links use `/?page=marketplace&barangay=Rosario` (with URL encoding for other names). Both views use the existing Welcome Inertia entry, so no backend routes, controllers, database tables, or checkout services were added.

`resources/js/Pages/Marketplace.jsx` handles search, categories, barangays, price ranges, sorting, empty results, and loading more listings. Shared components and illustrative listings are in `resources/js/Components/Storefront/`. The storefront layout is composed through the existing GuestLayout; authentication and legal pages keep their existing layouts. Styles are scoped in `resources/css/storefront.css`.

Favorites and cart quantities are browser-only and saved to `agrifarm-marketplace-preview-v1` in local storage. The cart supports quantity changes, removal, and sample subtotals. No orders are submitted. Listings, prices, ratings, and featured barangay claims are illustrative and identified as sample content in the interface.

Both pages now use the same product card, with matching image proportions, metadata, title space, price, separated rating row, and full-width add-to-cart action. Homepage product sections and the marketplace use the same four-column desktop and two-column tablet/mobile grids. Shared spacing and radius variables control the cards, sections, and controls. Hover effects use a small lift and border change, with keyboard focus styling and reduced-motion support. The footer is shared across both pages and includes exploration, community, contact, and legal links.

Light and dark appearance controls are under the circular account menu ? Settings for guests and signed-in visitors. Signed-in visitors get a circular avatar and an account dropdown with profile/workspace navigation, favorites, and the existing sign-out action. Absent or failed images fall back to the user's initials. Google sign-in now saves the verified profile's HTTPS `picture` URL to the nullable `users.avatar_url` field and shares it through Inertia. The photo is refreshed on each successful Google sign-in; missing or invalid URLs clear an older photo. Existing users must sign in with Google again to populate their photo. This is the only added backend integration; marketplace features remain browser-only. The new migration is `2026_09_10_000000_add_avatar_url_to_users_table.php` and must also be applied when deploying to another environment. See the [Google UserInfo reference](https://developers.google.com/identity/openid-connect/reference) for the profile picture field.

The harvest CTA and featured barangay banner use the earlier vivid green design again. The hero combines the original curved pale-green surface and bold heading with a small harvest label and photo caption. Product barangay names sit directly below their titles on both pages.

## Validation

The production Vite build passed. Both pages were rendered and inspected in Chrome at 390, 768, and 1440 pixels, with no horizontal overflow. Search, combined filters, sorting, category changes, empty results, clearing filters, loading more products, favorites, cart quantity changes and totals, removal, reload persistence, navigation, and barangay deep links were exercised. Mobile navigation, native dialogs, Escape dismissal, the theme toggle, and the existing login page were also checked. No browser JavaScript errors or failed local asset requests were recorded. Existing authentication browser-test expectations were updated for the new homepage copy and marketplace URL; the full authentication suite was not run as part of this frontend task.

The consistency pass also checked equal card dimensions across both pages at all three widths, light/dark layouts, hover and reduced-motion behavior, and footer contact access. The account dropdown was tested with frontend user fixtures at all three widths, including keyboard navigation, Escape, outside dismissal, favorites, photo rendering, and failed-photo fallback. These fixture checks do not change server authentication or verify a new photo-storage integration.

The Google authentication feature suite passes with eight tests and 65 assertions. Coverage includes saving a new user's photo, refreshing an existing user's photo without changing their password or name, sharing the URL in page props, clearing a missing photo, and rejecting an unsafe photo URL. Google responses are mocked in these tests; a live Google OAuth login was not performed.

## Generated photography

The following project assets were generated with the built-in image generation tool. They are illustrative images, not verified photographs of the named barangays. Existing images were preserved.

### `public/images/market-produce.png`

Final prompt:

> Use case: photorealistic-natural. Asset type: single photographic sprite sheet for a local Philippine produce marketplace website, 1536x1536 square. Create one precisely aligned seamless 3 columns by 3 rows photographic contact sheet, NINE equally sized square photos, each occupying exactly one ninth of the image. No gutters, borders, typography or labels. Each photo is realistic sunlit vibrant farm-to-table photography with a softly blurred lush garden background, produce filling a rustic wicker basket in foreground, green leaves and warm daylight. Top row left: fresh pechay bok choy with bright white stalks; top row middle: ripe red tomatoes; top row right: long shiny purple Asian eggplants. Middle row left: green cucumbers; middle row middle: fresh orange carrots with leafy tops; middle row right: curly green lettuce. Bottom row left: water spinach kangkong leafy bunches; bottom row middle: fresh green okra pods (clearly short ridged tapered okra); bottom row right: freshly harvested long green string beans. Exact equal 3x3 grid with straight cell boundaries is essential for CSS background positioning. Match attractive richly colored produce photography, natural texture, no plastic look, no watermarks. This is a single sprite asset.

### `public/images/market-basket.png`

Final prompt:

> Use case: photorealistic-natural. Asset type: wide homepage hero photograph for AgriFarm, a Pasig local produce marketplace. Make a 3:2 landscape photo of an abundant rustic wicker basket filled with beautiful fresh pechay bok choy, curly lettuce, red tomatoes, orange carrots and long purple Asian eggplant in a lush sunny community vegetable garden. Basket dominates right and center foreground, full leaves at top and all basket visible near bottom. Background soft-focus garden beds, bamboo trellises, hints of distant modern Philippine city skyline. Wooden small sign far right reads exactly 'LOCALLY GROWN'. Natural bright morning sunlight, vivid green and rich appetizing colors, premium editorial food photography, realistic textures. Left edge darker green garden for overlay fade. No user interface, no logos, no other text, no border.

### `public/images/market-gardens.png`

Final prompt:

> Use case: photorealistic-natural. Asset type: a single photographic website sprite strip with exactly three equal square photographs horizontally side by side, overall aspect 3:1, no gutters, no borders. Each of the three square cells shows a DIFFERENT beautiful sunlit community vegetable garden in Pasig Philippines with green pechay beds, bamboo stakes and trellises, pathways, tropical trees, soft distant city skyline. First square: low close view through leafy garden with a rustic small wooden sign on right reading exactly 'Brgy. Rosario'. Second square: abundant greens under bamboo trellis, wooden sign on right reading exactly 'Brgy. Maybunga'. Third square: straight garden path receding into sunlit green vegetable beds, wooden sign on right reading exactly 'Brgy. Sto. Tomas'. Vivid realistic natural green, warm morning light, editorial garden photography, inviting local community feeling, no people, no logos, no UI, no extra lettering. Exact equal thirds for CSS sprite positioning.

### `public/images/market-extras.png`

Final prompt:

> Use case: photorealistic-natural. Asset type: single produce photographic sprite strip, three equal square photographs side by side, exact 3:1 aspect ratio. No borders or gutters. Each square cell a sunlit wicker basket of a single type of produce with soft blurred vibrant green community garden background. Left square: fresh sweet basil green leafy bunches, clearly recognizable oval basil leaves. Middle square: abundant small green Philippine calamansi citrus fruits with a few sliced open showing orange yellow juicy centers. Right square: a squat green mottled winter squash pumpkin cut in half with rich orange flesh and seeds, plus a whole squash. Realistic appetizing editorial food photography, rich fresh greens and warm morning light, natural textures, no labels, no words, no UI, no watermarks. Essential equal thirds cell boundaries for website CSS positioning.

Visual rules: see [the storefront design guide](design-system.md). Listings now include sample availability and New, Trending, and Best Seller photo ribbons. Cart quantities are capped at sample stock; adding items does not reserve inventory. Appearance controls are under the account menu's Settings for guests and signed-in users.


Reference asset update: `market-hero-v2.png` was generated from the supplied hero reference, requesting its right-side wicker basket, pechay, lettuce, tomatoes, carrots, eggplants, cream Support Local Farmers cloth, wooden locally grown Pasig sign, and soft skyline; no UI text. `market-pechay-feature.png` was generated as a close-up fan of pechay directly on a wooden tabletop against soft garden bokeh, with a forest-green left edge and no text. Headings, buttons, ratings, price, and decoration remain frontend elements. Both promotional banners now have explicit dark appearances.

Dedicated frontend pages: /?page=favorites, /?page=notifications, and /?page=cart. Header and mobile links navigate to these pages; About and Contact remain dialogs. Favorites and cart share browser storage with the marketplace. Save for later moves a cart item into favorites without duplicates. Notifications has an honest empty state; checkout is visibly unavailable. Cart layout inspiration: https://baymard.com/checkout-usability/benchmark/step-type/cart and https://baymard.com/guidelines/622-implementing-a-cart-save-for-later-feature (clear item rows, editable quantities, separate subtotal summary, save for later).

Badge eligibility is centralized in `getProductBadge` in the catalog: Best Seller > Trending > New. Best Seller and Trending use explicit preview flags independent of ratings. These represent future sales leadership and growing-interest signals; no sales or analytics backend was added.

Contact is now a real frontend/backend feature at /contact, replacing the old informational dialog. It sends inquiries and reports to the configured AgriFarm email. See [contact.md](contact.md) for configuration and test coverage. Marketplace orders and checkout remain previews.
