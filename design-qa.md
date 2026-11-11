# Included wardrobe and booking navigation QA — 2026-11-11

final result: passed

The user requested a functional update to the existing concept booking flow: wardrobe included in the package needs only size, height and weight; Back goes one logical step with an arrow; the existing yearbook booking entry is labeled “Chụp kỉ yếu”. No new visual mock was requested for this scoped update.

- Actual Chrome screenshots opened: `audit/concept-wardrobe-2026-11-11/wardrobe-desktop.png` (1488×1058), `wardrobe-mobile.png` (390×844 full page), `yearbook-mobile-menu.png`; review capture in `wardrobe-review.png`. Existing Inter/coral tokens retained, page title30px/26px mobile, labels14px, 44px inputs. Fields stack on mobile with20px page margins and no overflow.
- Package with included wardrobe: exactly three fields per person, optional participant-count selector for multi-person packages. No costume catalog or quantity UI; no costume-catalog request. Personal-clothing packages keep their existing entitlement and do not collect unnecessary measurements.
- Size/decimal height/weight persist through Back and reload, appear in review, and are stored in the authorized order DTO for staff preparation. Incomplete restored details redirect to the measurement step. Original order/inventory behavior remains covered for legacy costume payloads.
- Checked review→brief→wardrobe→photographer→date; each Back is one logical step, has one left-arrow SVG and no underline. Duplicate footer Back removed. Existing selected date/time and measurements survive the navigation.
- Desktop and mobile menus expose “Chụp kỉ yếu” at the existing `/account/bookings/new` path; old visible label is absent. Search found no remaining old label in frontend/backend TS/TSX/JSON source.
- Browser checks passed with zero page errors, no horizontal overflow, no native orders created. Report: `audit/concept-wardrobe-2026-11-11/browser.json`.
- Validation passed:152 focused frontend tests,15 backend integration tests on a separate database, TypeScript, changed-file ESLint, frontend/backend builds, formatting and diff checks. Existing vendor circular/large-bundle warnings remain.

No actionable P0/P1/P2 issue remains for the scoped changes. Details and compatibility policy: `tasks/concept-booking/wardrobe-measurements.md`.

---

## Previous photographer and time-picker QA

# Personal photographer profiles QA — 2026-11-11

final result: passed

## Visual target, state and evidence

- Source: selected revised option 1, `C:/Users/Admin/.codex/generated_images/01a1c338-9c9a-7021-92cf-d2536ad65100/exec-002f9572-2ee7-40d3-875b-2925e407214a.png`; copied to `audit/concept-photographer-2026-11-11/reference-profile.png`.
- Page: `/concept-booking/packages/:packageId/photographers/:photographerId`, opened from the actual available-photographer list. State: mango, Chân dung Tự nhiên, Lê Minh Đức, 14/11/2026 14:00–15:00 UTC+7; no order or payment created.
- Source pixels: 1105×1424. Chrome capture at matching CSS width1105, viewport1105×1424, deviceScaleFactor1: `profile-duc-source-size.png`, full-page1105×2089. Also desktop CSS1488×1058/full-page1488×2163, tablet834×1194, mobile390×844 and compact320×844. Real profile has a longer personal story and six works rather than three preview illustrations, so full-page height differs intentionally.
- Initial full-view comparison: `profile-comparison.png`. Latest actual source/rendered pair: `profile-comparison-final.png`, each uniformly reduced to744px width, source left and implementation right; no equal-height forcing. Focused identity/type/layout comparison: `profile-hero-focus.png`. Final work composition: `profile-work-focus.png`.
- Opened source and implementation together as actual comparison images, then opened focused crops. Opened actual mobile image and all four portrait assets in `portraits-review.png`. Desktop captures also cover Gia Bảo, Minh Quân and Anh Khoa; management capture `profile-management.png`.

## Findings and iterations

- [P2, fixed] Fixed landscape work previews cut faces or áo dài details in mixed-aspect photographs. A top-aligned crop improved some pictures but cut a low-positioned face in another. Final work images use contain within neutral frames, preserving every original composition. The final full-view pair and `profile-work-focus.png` visibly show complete faces and the full-length áo dài frame.
- [P2, fixed] Initial profile recap omitted the session end time. It now derives end time from the actual package duration; final captures show14:00–15:00 consistently with the selected slot.
- [P3, accepted] Mock name/headings are larger than the product's user-requested moderated scale. Implementation uses Inter30px name,18px statement,24px section headings and14–16px copy; mobile26px/22px. This preserves the prior explicit request to reduce oversized typography.
- [P3, accepted] The existing responsive product header collapses to its mobile navigation at1105px whereas the generative reference retains desktop links. Original header behavior is preserved; the1488px capture shows the full navigation. This is an existing shell constraint, not an unimplemented profile control.
- [P3, accepted] Longer original seeded copy and six captioned works increase page height; works retain complete compositions on neutral backgrounds rather than the mock's cropped previews. No unsupported awards, years, star ratings or celebrity clients are introduced.

## Required fidelity surfaces

- Fonts/typography: existing Vietnamese Inter reused, natural diacritics and personal first-person copy. Name/title/tagline, definition-list labels, section headings and body retain distinct hierarchy; no clipping. Long form stays readable and portrait/facts stack on narrow screens.
- Spacing/layout rhythm:1216px desktop content,340×440 portrait and40px gutter; plain Back link above identity; facts and one coral selection action alongside story; two columns for philosophy/approach; three audience columns; secondary work gallery below information. Mobile has one column for profile text and two for works. No profile popup, enclosing app card or booking stepper.
- Colors/tokens: existing white, ink, muted gray, coral and hairline rules; pale role tag and neutral work-image frames. Back link has no underline under normal/hover/focus; keyboard focus outline remains. No decorative gradient assets or fake visual marks.
- Image quality: four distinct original ImageGen portraits, WebP900×1125; camera/face framing visually reviewed. Work images come from the project's existing concept library, with profile-specific selections and captions. Real studio material can replace them in management. No celebrity artwork or biographies are passed off as studio work. Provenance in `docs/assets/photographer-profiles.md`.
- Copy/content: each profile has its own role, statement, story, specialty, style, guidance, philosophy, approach, audience and six works. Empty optional milestones are hidden. Existing legacy profiles fall back to bio without empty sections. Session context and selection status come from the real draft/availability API.

## Functional and access checks

- Chrome: four distinct public profiles and portrait URLs, six permitted works each; no account/contact fields in DTO; separate routes/no dialog; reload and Back preserve session; keyboard selection rechecks availability and advances to costumes; Back returns to list with selected badge. Anonymous guests can read but cannot select without a session. Management form loads the seeded personal fields and all six image records. No page errors or horizontal overflow at1488/834/390/320px. Orders unchanged.
- Frontend:19 concept-flow/profile tests plus3 return-path tests pass. Backend:14 integration tests pass on a separate database, including whitelist/privacy, inactive/unpublished profiles, hidden or unpermitted works, validation, legacy edits, booking/payment/album regression.
- Both TypeScript checks, changed frontend ESLint, frontend/backend production builds, formatting and diff checks pass. Existing vendor circular-chunk/large-bundle build warnings remain. Seed dry-run after apply reports no changed fields for all four profiles.
- All actionable P0/P1/P2 findings resolved. No remaining blocker for the selected profile page.

---

## Previous time-picker and catalog QA

# Concept time picker QA — 2026-11-11

final result: passed

## Source, state and evidence

- Selected visual truth: option 1, `C:/Users/Admin/.codex/generated_images/01a1c338-9c9a-7021-92cf-d2536ad65100/exec-3b668a75-199b-4e4e-a70c-9e9ce6db826b.png`; retained in `audit/concept-time-2026-11-11/reference-time.png`.
- Rendered route: `/concept-booking/packages/:packageId/book/date`, reached from Chân dung Tự nhiên. State: mango, Saturday 14/11/2026, 14:00–15:00, duration 60 minutes, 10 retouched photos, 900.000 đ. No order or payment created.
- Source pixels: 1488×1057. Chrome desktop CSS viewport: 1488×1058, deviceScaleFactor 1; full-page implementation: 1488×1170. Both are compared at the same pixel density and scale. Real availability supplies 19 intervals versus eight drawn in the mock, so the page is naturally taller; no intervals are hidden to force a matching height.
- Actual reference and rendered captures were opened together in `time-comparison.png` (initial) and `time-comparison-final.png` (final). Each panel uses a proportional 744px width, with no stretching or equal-height forcing.
- Focused actual comparison inputs: `time-calendar-focus.png` at native scale and `time-footer-focus.png` with aligned content crops. Source is on the left, implementation on the right.
- Additional browser captures: `time-desktop.png`, `time-tablet.png` (834×1194), `time-mobile.png` (390×844), `time-compact.png` (320×844). Opened final desktop, tablet, mobile and compact images. Browser report: `time-browser.json`.

## Findings and iteration

User preference follow-up: all Back links/buttons now use no underline in default, hover, focus and active states, superseding the underlined Back link in the selected mock. Global CSS covers the shared and existing customer/concept Back classes, with explicit classes added to the remaining Back links. Keyboard focus outlines are retained. The preference is recorded in root `AGENTS.md` for future screens and mockups.

- [P2, fixed] Initial footer spelled out the month and CSS capitalized every word in the date. Removed the capitalization transform, kept natural Vietnamese month casing in the day heading, and used the mock's compact weekday/date format in confirmation. Final calendar and footer comparisons show the correction.
- [P2, fixed] Initial calendar date/legend typography was smaller than the reference. Desktop numbers are now 20px and legend 13px; mobile numbers remain 18px to fit touch controls. Final native-scale calendar comparison verifies readable labels and aligned rows.
- [P2, fixed] Repeated real month navigation could repeat enough per-day requests to reach the existing API rate limit. Month results now remain cached for 30 seconds in the mounted flow, requests are bounded to four concurrent reads and cancelled on month/route changes; retry bypasses the cache. Checkout still rechecks availability. Browser flow passed after this fix; unit coverage confirms cached month reuse.
- [P3, accepted] Reference shows a slightly larger page/day heading. Implementation keeps the product's moderated scale requested in previous screens: 30px page title, 24px section titles and 14–16px body/control text; mobile 26px/22px. Layout hierarchy is retained.
- [P3, accepted] Source previous-month arrow looked enabled in the current month. Actual control is disabled because past dates cannot be booked. Source availability examples are replaced by the server's full set of intervals, which increases page height. The supplied portrait asset and existing header/logo remain consistent with the product.

## Required fidelity surfaces

- Fonts/typography: existing Vietnamese Inter font, correct diacritics, 20px package name/price, 30px title, 24px month/day headings, 18px period headings, 14px slot controls and 16px body. No clipping; compact viewport wraps the page heading naturally.
- Spacing/layout rhythm: 1216px desktop content width, 206×110 thumbnail, 540px calendar column, 36px gutter/divider and aligned time pane. Confirmation row and single CTA sit below a neutral rule. Calendar/time stack at 800px; mobile uses two slot columns and a full-width CTA. No nested surface cards or duplicate Back action.
- Colors/tokens: existing white, ink #222, coral #ff385c, neutral borders and pale coral selection. Disabled days and navigation are visibly muted; keyboard focus uses the product outline. Flat product tokens replace incidental image-generation gradients.
- Image quality: actual project portrait WebP used with normal image loading and face-aware crop; existing brand asset and Lucide outline icons reused. No placeholder photography, screenshot-as-interface or handcrafted icon substitutes.
- Copy/content: heading, helper, morning/afternoon labels, compact confirmation, continuation to photographer and availability recheck note follow the selected design. Duration, price, photo quota, available days and intervals come from real catalog/API data. Empty/error/loading/stale-selection states are implemented.

## Functional checks

- Real Chrome: date/slot selection; November Monday-first placement; disabled past dates/current-month back arrow; month navigation and return; clearing a previous time on date change; continue to available photographers; Back and reload preserve selected time; keyboard Enter selects a slot; one Back link; no horizontal overflow at 1488, 834, 390 and 320px; no page errors; database order count unchanged.
- Browser timezone deliberately America/Los_Angeles; displayed and stored session remain Vietnam time, 14/11/2026 14:00–15:00 UTC+7.
- Focused frontend tests cover checkout regression plus month/year boundaries, horizon, unavailable dates, retry, selection reset, cache reuse, missing restored slots and time expiry. 15 focused frontend tests, TypeScript, changed-file ESLint and production build pass. Existing circular vendor chunk/large-bundle build warnings remain. Catalog/detail browser regression also passes.
- All actionable P0/P1/P2 findings resolved. Residual P3 differences are documented above.

---

## Previous catalog and detail QA

# Concept catalog and package details QA — 2026-11-11

final result: passed

## Visual targets and implementation

- Catalog source: `C:/Users/Admin/.codex/generated_images/01a1c338-9c9a-7021-92cf-d2536ad65100/exec-d92bffa6-7cc3-4bbb-be09-49ae34dd3c9b.png` (1487×1058).
- Detail source: `C:/Users/Admin/.codex/generated_images/01a1c338-9c9a-7021-92cf-d2536ad65100/exec-0d05c7df-4bf0-4e47-8edc-2722b3e43a44.png` (819×1920 full-page raster export).
- Implementation: `http://localhost:4001/concept-booking`, with detail opened from Chân dung Tự nhiên.
- Chrome desktop: CSS viewport 1488×1058, deviceScaleFactor 1; catalog capture 1488×1058, detail 1488×3069. Mobile CSS viewport 390×844, density 1, full-page captures.
- State: mango, all six packages visible, natural portrait detail and eight-photo gallery, no order or payment created.
- Evidence folder: `audit/concept-pages-2026-11-11/`. Full-view pairs `catalog-comparison.png`, `detail-comparison.png`; focused pairs `card-focus.png`, `detail-hero-focus.png`; captures `catalog-desktop.png`, `detail-desktop.png`, `catalog-mobile.png`, `detail-mobile.png`; interactions in `browser.json`.
- Both source and implementation were opened together as actual composite images. Catalog is effectively a 1:1 viewport comparison (one source pixel difference). The low-resolution long-page detail export was scaled uniformly to a shared 744px width for full-view comparison, without warping or forcing equal page height. Native typography and viewport were checked in focused crops and browser; raster export size is not treated as CSS pixel size.

## Follow-up — typography reduced at user request

The user requested a smaller type scale after viewing the implementation. This instruction supersedes the earlier mockup's larger text. Current desktop values: card title/price 18px, category13px, card action14px; detail body16px, hero title up to32px, price26px and section headings24px. Mobile: title26px, price24px, section headings22px and body16px. Touch target sizes and image layout are retained.

Reopened the refreshed catalog/detail screenshots and reran Chrome desktop/mobile verification. Filtering, gallery, Back/reload and date handoff still pass, with no horizontal overflow or page errors. Current captures are in the same evidence folder; original comparison composites remain the initial mockup comparison, before this intentional text-size revision. CSS formatting check passes.

Navigation follow-up: package details now has only one back-to-catalog link, at the top. Removed the duplicate footer link; the final package-selection action stays right-aligned on desktop and full-width on mobile. Browser flow rechecked after the change.

Decor follow-up: package details now shows editable package-specific backdrop, props, layout and included decor between the concept story and gallery. Four plain text fields use the existing 16px body scale and 24px desktop/22px mobile section heading. Desktop has two columns; mobile stacks the entries. Opened the actual section capture `decor-desktop.png`; refreshed desktop/mobile captures and Chrome flow passed without overflow or page errors. All six local packages have their own decor content. Optional fields are hidden when empty; checkout preserves decor in the order snapshot. Validation: 13 backend integration tests, 9 frontend tests and both TypeScript checks passed.

## Findings and iteration

Content follow-up — four prioritized sections: each package now has a short introduction, up to four studio-support cards, delivery details alongside the existing retouch quota/album/two feedback rounds, and a focused showcase with its own lightbox group. Existing concept illustrations populate the showcase under “Phong cách bộ ảnh”; no customer testimonial or before/after provenance is invented. Admin can replace the images and captions with actual work. Legacy packages retain the description fallback and hide empty optional sections. Verified Chrome 1488×1058 and 390×844: four cards stack on mobile, two showcase images open and navigate independently of the eight-photo reference gallery, images load, no overflow/page errors, and date handoff/reload still pass. Opened actual desktop and mobile support captures; full-page captures are refreshed. Additional evidence: `support-desktop.png`, `support-mobile.png`, `presentation-backend.log`. Focused validation: 13 backend integration and 10 frontend tests, both TypeScript checks and changed frontend ESLint pass.

Frontend production build also passes after this content extension. Existing circular vendor-chunk and large-bundle warnings remain.

- [P2, fixed] Initial card crops clipped faces. Card images now anchor at the top; final full-view/card crops and mobile screenshots show the subjects properly.
- [P2, fixed] Detail initially had overly compact type/section rhythm. The initial pass used 44px desktop title, 36px section headings and 20px body; the user-directed smaller scale is recorded in the follow-up above; widened photo/text region and increased section gaps preserve the selected visual hierarchy.
- [P2, fixed] Concept navigation lost active state on the new nested detail URL. Header now stays active throughout concept pages; browser asserts aria-current.
- [P2, fixed] A mobile evidence capture initially caught loading rather than content. Capture helper now waits for the heading, gallery/card count, decoded images and fonts. Final mobile artifacts show the completed page and no overflow.
- [P2, fixed] Style summary was briefly grouped with payment rows. It now sits below hero facts, as in the visual target; final comparison verifies placement.

## Required fidelity surfaces

- Fonts/typography: existing Vietnamese Inter font reused. Card titles, prices, short metadata and actions retain hierarchy. Detail has a strong title and readable long-form content. No truncation or lost diacritics on desktop/mobile.
- Spacing/layout rhythm: desktop 3-column cards; detail 2-column hero/story, 4-column gallery; mobile 1-column cards/hero/story and 2-column gallery. All controls remain visible, no horizontal page overflow. The CTA occurs after policies in document flow, and no numbered stepper appears.
- Colors/tokens: white, ink, muted gray and coral from existing customer tokens; fine neutral rules. Existing global header preserved rather than rescaled to a low-resolution full-page export.
- Image quality: 19 individual ImageGen photographs converted to WebP, supplied logo reused, native outline icons from installed Lucide matching source. No screenshot crops, CSS art or placeholder assets used in the finished cards/gallery. Gallery supports full image viewing with keyboard and returns focus on close.
- Copy/content: actual local package prices, durations, quotas, costume allowances and derived 30% deposit used. New rich fields are editable persisted data. Natural portrait gallery has 8 images; other concepts have their own matching illustrations/gallery. No technical/demo notices in the booking UI.

## Functional checks and residual polish

- Verified filtering and filter restoration on Back; separate detail URL; unavailable-package state; detail-only selection; date-screen handoff/reload; gallery next/previous/Escape; desktop/mobile image loading and zero page errors. Database order count unchanged.
- [P3, accepted] Generated photographs closely follow the approved direction but are not identical pixels to the mock. Existing data labels use the actual concept name, and all gallery images have captions for accessibility.
- [P3, accepted] Card buttons retain 44px touch targets, slightly taller than the illustrated outlines. Detail body follows responsive product type sizes; exact height of the generative long-page export is not forced.
- All actionable P0/P1/P2 findings resolved. No further visual fixes required for these two screens.

---

## Previous delivery design QA

# Delivery album design QA — 2026-11-06

final result: passed

## Evidence and state

- Source visual truth: `C:/Users/Admin/.codex/generated_images/01a1a96c-5b9f-7df2-88f9-639fff3e0c86/exec-12e9413e-8f85-4621-b15c-2d74d30b56d8.png` (approved revised option 1).
- Implementation: `http://127.0.0.1:4001/account/bookings/a1cb560ddff53e2331375b45/delivery`.
- Desktop capture: `audit/delivery-redesign-2026-11-06/desktop.png`.
- Mobile capture: `audit/delivery-redesign-2026-11-06/mobile.png`.
- Focused source/implementation comparison: `audit/delivery-redesign-2026-11-06/feedback-comparison.png` (source on left).
- Source pixels: 1488 × 1058. Desktop CSS viewport: 1488 × 1058, deviceScaleFactor 1; full-page capture: 1488 × 1151. Mobile: 390 × 844 CSS viewport at deviceScaleFactor 1, full-page capture 390 × 1807. No density scaling or browser chrome.
- State: mango, delivered version 1, first image of six selected. Actual sample class name, filenames, dimensions and delivery date are retained. Source contains illustrative metadata and a different photo crop; implementation preserves the actual complete photo with object-fit contain.
- Full source and implementation opened together for visual comparison. Feedback labels, hierarchy, textarea, submit/accept separation and button wording also inspected in the focused comparison.

## Findings and fidelity surfaces

No remaining actionable P0/P1/P2 findings.

- Typography: existing website sans serif retained; 32px desktop title, 28px mobile title, 22px panel headings and readable 14–16px copy. Vietnamese labels and wrap points checked. Rail heading is slightly smaller than illustrative mock to remain consistent with app typography (P3).
- Layout rhythm: large viewer left, compact single horizontal thumbnail strip below, filename/download footer, right feedback rail with fine divider. Ratio 2.4:1, existing site content width preserved. No nested cards. Mobile stacks image/feedback; image strip scrolls without page overflow. All primary desktop controls fit within the viewport.
- Colors/tokens: existing white, muted neutral, black text and coral primary tokens reused. Empty feedback correctly disables the pink submit button; typing enables the coral action. Mock showed an enabled action despite empty input: implementation retains validation intentionally.
- Images/assets: real private seeded photos, native image aspect ratios, full-resolution authenticated viewer, lazy thumbnails. Existing brand asset and installed Lucide icons retained. No placeholder images or approximate icon drawings.
- Copy/content: approved customer heading and “Xác nhận ảnh đã đạt yêu cầu” action match the revised target. Customer progress/details/album no longer use the formal acceptance terminology. Real sample metadata replaces illustrative mock data. Existing reload control and short feedback-outcome hint intentionally retained.

## Comparison history

1. Initial desktop/mobile comparison: desktop hierarchy matched. Mobile reload button wrapped below back link, adding an avoidable row above the image (P2).
2. Fix: retain its accessible name and use a 44px icon button on small screens. Add strip-only scrolling for selected thumbnails, honoring reduced motion. Re-capture desktop and mobile; no page overflow, primary controls visible. Focused rail comparison confirms readable text and separate feedback/confirmation actions.

## Functional verification

- Chrome browser run: `node ops/tests/booking-delivery-redesign-ui.cjs`.
- Verified next/previous limits, keyboard navigation, image selection, native fullscreen open/close, selected-photo download, mobile overflow, version-bound feedback, accepted state and removal of customer jargon.
- Browser feedback/confirmation POSTs were intercepted. Seeded order/version/photos unchanged after QA.
- Browser page errors and error-level console messages: 0.
- Frontend targeted tests: 28 customer-order tests + 8 delivery-page tests + 2 private-gallery tests passed; TypeScript and ESLint passed.
- Privacy regression: late image responses from a previous account discarded; Blob URLs released. Existing stale-version feedback, acceptance conflict and idempotent retry tests remain passing.

## Implementation checklist

- [x] Match selected desktop composition with real existing assets.
- [x] Responsive gallery and feedback layout.
- [x] Navigate, fullscreen, download and private image lifecycle.
- [x] Preserve backend workflow and version checks.
- [x] Consistent customer confirmation wording.
- [x] Review full-view and focused comparisons, fix P2 mobile issue, re-capture.

## Follow-up polish

P3 only: illustrative mock uses a wider content gutter and larger rail headings. Current implementation intentionally inherits the existing website container/type scale. No unresolved core interaction gaps.
