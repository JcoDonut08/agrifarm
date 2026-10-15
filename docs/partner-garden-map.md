# Partner-barangay garden map

The About page replaces the harvest banner with a Google My Maps embed and an accessible garden directory. The selected scope is the 12 CENRO-listed gardens in current partner barangays: Rosario (6), Maybunga (4), and Sto. Tomas (2). Listing a garden here does not mean it is an individual AgriFarm seller account.

The supplied source is `CENRO List of Urban Gardens.pdf` (five pages). Ten locations come from the Clean and Green open-space list, plus Maybunga Rainforest Park from the government-facility list and Maybunga Elementary School from the school list. The original PDF remains in the user's Downloads folder. Individual source entry/page references are retained in the application data; the import CSV contains only the public garden name, address, barangay, and category. Street spelling, punctuation, and barangay formatting were normalized; Pasig City, Philippines was appended to address queries. Plot labels are derived from addresses/facilities because the community plots have no official names in the document. Nearby or similar addresses remain separate source entries.

The PDF supplies no coordinates or map links. The imported positions must be reviewed in Google My Maps, especially landmark-only addresses. The document's school/government summary areas do not agree with the detailed table totals, so areas and citywide totals are not used in this feature.

## Google My Maps setup

1. Open Google My Maps while signed in to the account that will own the map, then create a map.
2. Import `docs/sample-data/cenro-partner-gardens.xlsx` (or the CSV alongside it). Select **Address** for location and **Name** for marker titles. Both files contain the same four unique headers and twelve garden rows. If Google rejects CSV column names, use the XLSX version; the CSV is also saved without a byte-order mark and with a plain header row to reduce parser ambiguity.
3. Review unresolved locations and pin placement. Styling by **Barangay** can distinguish the three groups.
4. Make the map public so website visitors can view it, then copy its Share link.
5. Set `GOOGLE_MY_MAPS_ID` to the link's `mid` value and refresh the application's configuration/deployment. The server accepts only map-ID characters and builds Google-hosted embed/viewer URLs.

Official instructions: [CSV import](https://support.google.com/mymaps/answer/3024836?hl=en) and [public website embedding](https://support.google.com/mymaps/answer/3109452?hl=en).

Garden pins are maintained in Google My Maps. The adjacent AgriFarm directory is maintained in `resources/data/cenro-partner-gardens.json`; update its export CSV when changing the source list. The directory's Google Maps links search the CENRO-listed address, not verified GPS coordinates. The map's pin selection is handled inside Google's iframe; opening a directory location opens a separate Google Maps search.

If no valid map ID is configured, the directory remains usable with location links and an explanatory panel. API keys and billing configuration are not used by this embed integration. The source PDF is not published by the application.

## Verification

```powershell
php artisan test --compact tests/Feature/UrbanGardenMapTest.php
npm run build
$env:GOOGLE_MY_MAPS_ID = 'e2e-garden-map-12345'
npx playwright test tests/e2e/urban-garden-map.spec.js tests/e2e/cart-favorites-navigation.spec.js --reporter=list
```

The browser map test substitutes neutral HTML for Google's external iframe to check layout, frame URLs, the twelve directory entries, links, languages, contrast, and both themes at 390/768/1440 pixels. This does not validate Google's geocoding or the real public map. A real public My Maps link is required before production integration and map verification.

Local verification completed: frontend build, formatting, two PHP tests (81 assertions), three map-section browser tests, and six guest/customer cart-and-favorites navigation tests passed. The import CSV and XLSX were checked against all twelve application directory entries. Contrast issues found in the section's small accent text were corrected for light and dark themes.

The owner supplied public map ID `1mIiIMx97CxdbLHWrQYJ91C1mOdXPr0o` on October 15, 2026. A fresh, signed-out Chrome session loaded the real Google map. Its imported layer contains all twelve matching names and addresses; the original three-pin layer is unchecked. Google's public KML export preserves addresses for the imported entries rather than fixed coordinates, so matching entries does not establish physical pin accuracy. The owner should review Google's address-based placement in My Maps.

The map ID is configured locally and on the Railway web service. Web deployment `0c1763d5-66b4-4a5e-b3dd-e6d4d06b974e` succeeded. All eight deployed source/data file hashes match the workspace release. Live signed-out Chrome checks passed at 390/768/1440 pixels for the real visible Google map, twelve directory entries, barangay accordions, external map links, both themes, English/Filipino labels, no page overflow, and no page errors. Rendered mobile, tablet, and desktop screenshots were inspected. The About page, health endpoint, and four loaded build assets returned HTTP 200. Existing production accounts, orders, and other business records were not changed.
