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

Use the system UI font for interface text (Segoe UI on Windows). Segoe Print is reserved for the short hero note, and Courier New for printed receipts. Gold is for ratings/Best Seller; green is the default action and identity color.

## Layout and components

- Maximum content width is 1248px. Use 24px desktop gaps, 14px mobile gaps, and a 4px spacing rhythm.
- Cards use 14px corners; controls use 8–10px corners. White cards sit on the gray light-mode canvas.
- Reuse `ProductCard` across home, marketplace, favorites, related products, and seller shops.
- Badge precedence is Best Seller, Trending, then New. Use one badge maximum, with label and icon and no urgency animation.
- Product detail keeps the image and purchase facts side by side; a full-width seller profile card follows underneath, directly after the image on mobile.
- Product reviews show the feed and five-item pagination before the write/edit form. Edit and delete are icon buttons; delete requires the shared confirmation dialog.
- Shopping headers are title-only. The cart is device-local; stock is reserved only after server-side COD checkout. Show three connected steps and always disclose unconfigured delivery charges beside the goods subtotal.
- Keep hover motion restrained, keyboard focus visible, menus inside the viewport, and reduced-motion support intact.
- Customer notifications use a compact feed grouped by date, with seller profile photos (initials when unavailable), seller names, clear order messages, small status badges, timestamps/references, and a green View order button. Retain All/Cancelled filters and expandable cancellation reasons and seller notes. Opening the feed retains the existing automatic read behavior.

## Workspace consistency

Customer, seller, and administrator action controls share the `--ui-*` tokens in `resources/css/app.css`: a 44px minimum height, 10px corners, 14px labels, and 600 weight. Primary actions use the same green and hover color; secondary actions use a neutral outline; destructive actions use red. Large forecast actions can remain taller, and navigation, icon controls, and report format tabs retain their purpose-specific layouts.

Workspace page headings use 25px on larger screens and 23px on mobile. Profile form labels use 13px and 600 weight, and action rows use a 12px gap.

Use `FormStatus` for feedback across customer, seller, and administrator pages. Dismissible success messages use a neutral surface, a small green icon, and concise text. Keep them at the bottom center, away from page headings and primary actions; on narrow customer screens, reserve space for the help button. They close after six seconds; hovering or focusing pauses the timer. Clear them when navigating away or leaving the browser tab. Each flash message appears once, including when dashboard sections remount. Authentication instructions remain inline, and errors stay visible until corrected or dismissed. Do not show a second success message or a success modal for the same action.

Use `ConfirmationDialog` before deletion, order cancellation, and other destructive actions. Forms that need a reason, such as account suspension and order cancellation, collect it in the dialog. Ordinary edits, saves, and uploads need success feedback after completion. Place validation errors beside the relevant fields, and request failures near the action. Dialog styling lives once in `resources/css/confirmation-dialog.css` and adapts to the current theme. Action labels use sentence case with a specific verb, such as “Save photo”, “Update password”, or “Delete task”. Localized controls must include their loading, error, and confirmation states.

Product add/edit forms use the shared confirmation dialog before discarding unsaved field or photo changes. Use “Discard your changes?”, “Your changes haven’t been saved.”, “Keep editing”, and “Discard changes”, with localized equivalents. Focus “Keep editing” first; Escape or a backdrop click on the confirmation keeps the draft. Preserve field values, selected photos, and validation errors when returning to the editor. Untouched forms, restored original values, and successful saves close without a discard prompt. Reloading or leaving the browser uses its native unsaved-changes warning while a draft exists.

## Tables and record lists

Record tables and management lists show five rows by default. Use the shared `Pagination` component with a labeled “Rows per page” selector offering 5, 10, and 20, followed by the visible record count. Keep this group together before the page navigation; it can wrap on narrow screens. Changing the size returns to page one, filters keep their existing behavior, and removing the last record on a page moves to a valid page. Paginate report previews only; downloads and totals include all matching records. The full harvest calendar and individual order receipts keep their complete contents. The dashboard's recent-order table uses the same selector and pagination, starting with the latest five records, and links to the full order list.

## Theme and responsive checks

Hero, featured banner, harvest CTA, forms, dialogs, seller cards, and review controls must be legible in both themes. Do not invert photographs. Verify at 390px, 768px, and 1440px with no horizontal overflow.

See [storefront behavior](storefront-preview.md) for the current data and interaction contract.
