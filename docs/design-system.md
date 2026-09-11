# AgriFarm storefront design guide

Use this guide when changing the homepage, marketplace, product cards, or shared storefront navigation. The implementation lives in `resources/css/storefront.css`.

## Typography

Use three font roles only. Instrument Sans is the main family for headings, body text, buttons, and numbers. Impact is reserved for the harvest CTA heading. Segoe Print is reserved for the short handwritten hero note. System fallbacks are declared in the CSS tokens; do not add more font imports.

## Color

Use semantic storefront tokens instead of new arbitrary colors:

| Role | Light | Dark |
| --- | --- | --- |
| Page | #f8faf7 | #151a17 |
| Card / navigation | #ffffff | #202622 |
| Subtle surface | #edf4ed | #2b3730 |
| Main text | #17382b | #edf2ee |
| Secondary text | #69766f | #b0bbb4 |
| Borders | #e1e8e1 | #3d4941 |
| Primary button | #168044 | #168044 |
| Primary hover | #106335 | #106335 |

Keep white text on green buttons. Dark mode uses pale green for text links and charcoal surfaces; do not simply invert photographs. Warm gold is reserved for ratings / Best Seller badges; lime is reserved for the harvest CTA action. Hero and featured banner greens follow the supplied reference.

## Layout and components

- Shared 1248px content width, 24px desktop grid gaps, 14px mobile gaps. Use a 4px spacing scale and 48–52px between major sections.
- Cards use the same ProductCard on home, marketplace, and favorites. Keep aligned image proportions, title, barangay immediately below title, price and availability, rating, and full-width cart action.
- Use 18px card corners (16px mobile), 10px control corners. Photo badge is a small left-edge ribbon; favorite stays top-right.
- Display one badge per product photo. Precedence: Best Seller, then Trending, then New. Products without an eligible flag have no badge. Ratings remain in the rating row and never decide a badge.
- Best Seller: gold + trophy; only for sales leaders, based on completed sales when backend data exists. Preview fixture: Fresh Pechay only (`isBestSeller`).
- Trending: muted orange + rising-arrow icon; growing recent shopper interest, not highest sales or highest rating. Preview fixtures: Native Tomatoes and Fresh Kangkong (`isTrending`). Use Trending consistently; do not add a redundant Hot badge.
- New: green + sprout; newly listed products (`isNew`). Keep the existing new-product fixtures.
- Current flags are illustrative frontend data, not measured sales or analytics. A backend integration must establish sales periods and interest-growth eligibility before assigning production flags; do not infer them from reviews, cart clicks, or favorites stored on one device.
- All three badges share dimensions and typography, have readable labels as well as distinct icons/colors, stay top-left clear of the favorite control, and use muted dark-theme counterparts. No pulsing, flashing, or urgency animation. Do not invent sales or discounts.
- Stock is sample availability in the listing unit: kg, bunches, or heads. Adding to the preview basket does not reserve inventory. Clamp basket quantities to sample stock, including persisted quantities.
- Keep the hero's pale curved left panel, editable two-line heading, subtitle, green action, three community values, handwritten note, and vegetable basket right. Stack copy above the photo on mobile. Do not bake UI text into an image.
- Preserve the green Rosario feature and harvest CTA composition from the original reference.
- Keep hover effects restrained: subtle border/shadow and 4px card lift. Preserve visible keyboard focus and reduced-motion support.

## Account and appearance

Theme controls belong under the circular account menu → Settings → Appearance. Guests can access the same settings. Persist the choice on this device. Google `avatar_url` is preferred; use initials when unavailable and a user outline for guests.

## Verification

Render both pages in light and dark at 390, 768, and 1440px. Check equal card dimensions, no overflow, legible controls, footer, settings, cart limits, favorites, and filtering. Sample listings remain frontend fixtures until a separately authorized inventory integration exists.

## Promotional sections in dark mode

The hero, Rosario feature, and harvest CTA must all respond to the theme. Use muted forest surfaces (#20372a for the feature, #233e2c to #192e23 for the CTA), subtle borders, pale text, and subdued gold ratings. White promotional buttons and the price pill become dark green surfaces; the lime action becomes muted sage. Dim decorative photos and foliage without inverting their colors. Never leave the light-mode green banners or white price pills unchanged in dark mode.

The hero uses `market-hero-v2.png`; the featured banner uses its own `market-pechay-feature.png` photograph rather than enlarging the product sprite. Keep text and controls in React so they remain accessible and themeable.

Dedicated shopping pages use CollectionPage for breadcrumb, heading, secondary navigation, and empty states. Cart uses product rows and a desktop summary sidebar, stacked on mobile. All surfaces use existing semantic theme tokens. Do not invent delivery costs, orders, notifications, or working checkout before backend integration.

Shopping page headers are title-only: no breadcrumbs, introductory subtitles, Continue shopping link, or shopping tabs. Use the main navbar for page navigation. Do not add the View saved favorites shortcut to the cart summary. Cart items use a photo/details surface with a trash action and a separated bottom row for heart/save, quantity, and item total.

Action feedback uses short 200-300ms opacity/scale transitions, no flying items or full-page animation. Cart buttons briefly show a checkmark and Added to cart; favorite hearts pulse only on interaction. Confirmations use a polite live region, destination link, and dismiss action; pause their eight-second lifetime while hovered or focused. Repeated actions restart feedback. Respect prefers-reduced-motion. Marketplace Reset filters remains visible, disables at defaults, and resets search, category, barangay, price, sorting, and the visible-product limit.


Latest navigation and marketplace rules: the storefront navbar stays sticky at the top in both themes. Account and mobile menus must fit the viewport. Display all matching catalog products immediately; no Load more control. Reset filters is an understated text action beside the result count, visible only when search, filters, or sorting differ from defaults. This replaces the earlier always-visible reset button rule.

Marketplace sorting: Recommended (catalog order), Trending (interest growth), Latest (listing date descending), Best Selling (sales ranking), Highest rated, and Name: A to Z. Price sorting is removed; the separate price-range filter remains. Current listing dates and ranking scores are illustrative fixtures, independent of price and reviews. Reset restores Recommended.

Contact uses the same storefront navigation and theme tokens, with a topic selector, contact details, and a focused form. Validation errors are tied to fields; success and submission failures receive keyboard focus. Never show success before the backend accepts the email. See [contact delivery documentation](contact.md).
