# AgriFarm storefront design guide

Use the semantic tokens in `resources/css/storefront.css`; do not add near-duplicate colors or one-off component systems.

## Core tokens

| Role | Light | Dark |
| --- | --- | --- |
| Page canvas | `#f5f5f5` | `#151a17` |
| Card/navigation | `#ffffff` | `#202622` |
| Soft surface | `#f3f5f3` | `#2b3730` |
| Main text | `#132f24` | `#edf2ee` |
| Secondary text | `#53635a` | `#b0bbb4` |
| Border | `#ccd8cf` | `#3d4941` |
| Primary | `#0f783e` | `#168044` |
| Primary hover | `#09562d` | `#106335` |

Use Instrument Sans for interface text. Impact is reserved for the harvest CTA heading and Segoe Print for the short hero note. Gold is for ratings/Best Seller; green is the default action and identity color.

## Layout and components

- Maximum content width is 1248px. Use 24px desktop gaps, 14px mobile gaps, and a 4px spacing rhythm.
- Cards use 14px corners; controls use 8–10px corners. White cards sit on the gray light-mode canvas.
- Reuse `ProductCard` across home, marketplace, favorites, related products, and seller shops.
- Badge precedence is Best Seller, Trending, then New. Use one badge maximum, with label and icon and no urgency animation.
- Product detail keeps the image and purchase facts side by side; a full-width seller profile card follows underneath, directly after the image on mobile.
- Product reviews show the feed and five-item pagination before the write/edit form. Edit and delete are icon buttons; delete requires the shared confirmation dialog.
- Shopping headers are title-only. The cart is device-local; stock is reserved only after server-side COD checkout. Show three connected steps and always disclose unconfigured delivery charges beside the goods subtotal.
- Keep hover motion restrained, keyboard focus visible, menus inside the viewport, and reduced-motion support intact.

## Theme and responsive checks

Hero, featured banner, harvest CTA, forms, dialogs, seller cards, and review controls must be legible in both themes. Do not invert photographs. Verify at 390px, 768px, and 1440px with no horizontal overflow.

See [storefront behavior](storefront-preview.md) for the current data and interaction contract.
