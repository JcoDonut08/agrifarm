# Growing requirements in saved planting plans

Each seller planting-plan row has a native, keyboard-accessible **Growing requirements** disclosure beneath the crop and saved dates. It displays reference guidance in English or Filipino, a source link opening in a new tab, the publication's printed page numbers where applicable, and the reference review date. It remains available without an uploaded forecast. Saving, removing, ownership, forecast ranking, and the dates captured when a plan was saved retain their existing behavior.

`storage/app/forecasting/crop_growing_requirements.json` holds the reviewed reference catalog. `CropGrowingRequirementsService` attaches an entry to each saved plan by its crop name or an explicit, case-insensitive alias. The page performs no external lookup. Missing fields are labeled as unspecified; unknown crops receive an unavailable-guidance message. True spinach is not mapped to alugbati, and generic beans are not mapped to sitaw. Kangkong and gabi explicitly distinguish upland guidance from aquatic/lowland cultivation. Crop-growing requirements are informational guidance, not an assessment of an individual farmer's site or a demand forecast.

## References checked on October 16, 2026

| Reference | Covered crops and printed pages |
| --- | --- |
| [DA–ATI MIMAROPA: Mga Gulay sa Kapatagan](https://ati2.da.gov.ph/ati-4b/content/sites/default/files/2022-12/lowland_vegetables.pdf) | Ampalaya 1–3; kalabasa 4–6; kamatis 7–9; mustasa 10–11; okra 12–13; patola 14–16; sili 17–18; sitaw 19–21; talong 22–24 |
| [DA–ATI Cordillera: A Guide to Urban / Home Gardening](https://ati2.da.gov.ph/ati-car/content/sites/default/files/2022-12/urban_agriculture_for_upland.pdf) | Upland kangkong 18–20; lettuce 23–24 |
| [DA–ATI Cordillera: Pechay Production](https://ati2.da.gov.ph/ati-car/content/sites/default/files/2022-12/pechay_production_for_urban_gardening_leaflet.pdf) | Pechay 1–2 |
| [DA HVCDP: Mga Katutubong Gulay](https://hvcdp.da.gov.ph/wp-content/uploads/2022/05/Indigenous-Vegetables-Guide.pdf) | Alugbati 3–5; malunggay 6–8; saluyot 22–24 |
| [DA–ATI Bicol: Labanos Production Guide](https://ati2.da.gov.ph/ati-5/content/sites/default/files/users/user17/labanos%20short.jpg) | Labanos, two-page leaflet image |
| [BPI Library: Plant Industry Production Guide (15) – Gabi, Gloria C. Papas](https://library.buplant.da.gov.ph/books/42) | Gabi, printed pages 4–7. The public library record links the scanned guide. The former BPI PDF returned 404 and iVeg returned 403, so this accessible primary reference is used. Its archived scope, distinct upland/lowland spacing, pH 5.5–6.5 and average temperature 21–27°C are preserved. |
| [DA–ATI CALABARZON: Weedibles and Weedicinals Plus Edible Flowers and More](https://ati2.da.gov.ph/ati-4a/content/sites/default/files/2022-09/WEEDIBLES%20AND%20WEEDICINALS%20Plus%20Edible%20Flowers%20and%20More.pdf) | Luya, printed page 83; only the soil/light/propagation guidance is used |
| [DA–ATI MIMAROPA: Gabay sa Produksyon ng Pipino](https://ati2.da.gov.ph/ati-4b/content/sites/default/files/2024-12/GABAY%20SA%20PRODUKSYON%20NG%20PIPINO.pdf) | Pipino, page 2 |

The catalog contains 19 crops. Fields are brief authored summaries of cultivation facts, with Filipino translations. Empty fields mean the selected reference did not establish that requirement. Seedling light guidance is identified as such and is not a claim about an adult crop's daily sunlight requirement. Calendar timings are still the existing planning estimates; reference guidance does not rewrite saved plans. The review date records source inspection, not CENRO approval or validation of a Pasig garden. Variety and cultivation method must be considered when using the guidance.

To extend coverage, inspect an authoritative crop-specific reference, add its publisher, title, working URL and review date, record its scope and supported fields in both languages, and add only unambiguous aliases. Recheck existing entries when the selected source changes. The Railway Dockerfile and startup script already copy and restore all forecasting JSON references onto the application volume; no database migration or live data import is needed.

## Verification

Run the planting-plan, forecast and selling-activity PHP tests, scoped Pint, and the frontend build. Browser coverage is in `tests/e2e/planting-requirements.spec.js` and `tests/e2e/planting-plans.spec.js`: native Enter/Space disclosure controls, source attribution, explicit alias lookup, missing fields, unknown crops, saved-plan persistence without a forecast, translations, themes, and 390/768/1440-pixel layouts, plus the existing save/remove flow.
