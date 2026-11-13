# Photographer portfolio — 2026-11-13

**final result: passed**

**Findings**
- Fixed: publication action now has a solid violet surface and a contrasting label, distinct from draft/preview actions.
- Fixed: full-page preview uses a native modal dialog; focus stays inside the customer surface and the staff sidebar is inert. Back and Escape return to the editor without losing unsaved edits.
- Fixed: desktop compact preview shows the introduction and the first three permitted works; full preview/public pages retain the complete personal narrative and all permitted works.
- No remaining P0/P1/P2 issue in the reviewed introduction, working-approach, gallery, full preview and public profile states.

**Source and comparison**
- Target: the first displayed ImageGen result selected by the user, copied to `audit/photographer-portfolio-2026-11-13/approved-reference.png` (1487×1058). Normalized to a 1440×1024 desktop canvas with aspect preserved.
- Actual: in-app browser on the main application, authenticated as its existing photographer. Desktop capture 1440×1024 and mobile capture 390×844, no device/browser framing.
- Reviewed `comparison-desktop.jpg` with source on the left/implementation on the right and `comparison-header.jpg` with source above/implementation below. Also inspected the full desktop, mobile, keyboard-focus and customer-page captures. Header close-up checks labels, hierarchy, tab separation and the primary action.
- Intentional product differences: preserve the real 240px application sidebar, existing season picker, breadcrumbs and current account content instead of generated sample people/photos/text. Existing longer narrative and additional fields continue below the fold. The saved profile is already published, so its status is green; unsaved and unpublished changes use the warning status. These are state/data differences, not missing controls.

**Required fidelity surfaces**
- Typography: use the existing staff system sans typography, 14px/21px editor text, 26px title and 28px preview identity. Vietnamese text and input wrapping are legible; mockup's visual hierarchy is retained without replacing the app font system.
- Spacing/layout: measured editor/preview columns 621.109px/496.875px with 28px gap and dividing rule at desktop. Mobile form/gallery become one 352px column, preview follows the form; document scrollWidth 384px ≤ viewport 390px. All three primary controls remain visible on mobile. Existing breadcrumbs intentionally add vertical space compared with the generated mock.
- Colors/tokens: graphite surfaces, existing staff border/muted/status tokens and violet selected navigation/tabs. Dark primary background rgb(163,150,255) with rgb(23,20,31) label; readable keyboard outlines retained. No extra mockup-review banner.
- Images: use persisted portrait, cover and works belonging to this actual profile, not generated stand-ins. Seven visible images in the desktop editor were loaded successfully. Cover uses a deliberate wide crop; complete works are preserved on the public gallery. Draft uploads use owner-authenticated blobs rather than public static paths.
- Copy/content: exact action labels Lưu nháp/Xem trước/Công khai; concept-only scope; account name and studio-assigned concepts read-only. No invented achievements/reviews. Shared renderer and public snapshot connect the editor to the customer website; sample text from the mockup is not seeded into real profiles.

**Interaction verification**
- Changed the tagline in the actual editor, saw it update in the compact and full private preview, returned and restored the original value. No portfolio content was published or seeded in `studio_db` during UI verification.
- Opened gallery and working-approach tabs, moved the second image first and restored its original position. Home key returned to the first tab with a visible focus outline.
- Opened the independent public profile with the normal customer navbar, confirmed the persisted original tagline/narrative and concept works. Mobile public page has no horizontal overflow; Back textDecorationLine is none. No browser console errors on the public profile.
- Screenshots: `implemented-desktop.jpg`, `implemented-focus.jpg`, `implemented-gallery.jpg`, `implemented-mobile.jpg`, `implemented-mobile-gallery.jpg`, `preview-draft.jpg`, `public-profile.jpg`, `public-profile-mobile.jpg` in the audit directory.
- Backend HTTP integration (isolated local DB) covers draft/public isolation, owner/role restrictions, retained images, invalid/oversized files, unassigned concepts, atomic publication failure, public/booking snapshot consistency, stale writes and shared admin revision checks. Existing concept booking regression passed. Frontend tests cover editing, private preview, save/publish errors, reordering/removal/consent, sidebar roles and multipart file serialization; production build and scoped checks complete the validation.

**Open questions**
None.

**Implementation checklist**
- [x] Preserve existing published profiles and main database configuration.
- [x] Share renderer and public data between customer entrypoints and editor previews.
- [x] Enforce owner scope, media access and revision conflicts on the server.
- [x] Check desktop/mobile and functional controls, restore temporary viewport and leave the editor available.

**Follow-up polish**
None required for acceptance. Preview deliberately abbreviates longer content; use the full-page action to inspect all sections.

---

# Photographer statistics dashboard — 2026-11-13

final result: passed

Selected visual truth: C:/Users/Admin/.codex/visualizations/2026/11/12/01a1cdd5-2ae6-7cf2-8de0-a8621be62dce/photographer-dashboard.html, approved after removing the nearest-shoots section. Implemented inside the existing staff shell; no changes to customer or manager dashboards.

## Evidence and comparison

- Folder: audit/photographer-dashboard-2026-11-13. Source capture: source-desktop.png. Production capture: implemented-desktop.png. Opened their combined comparison-desktop.png and the native-pixel comparison-focus.png (source above implementation) before this report. The focused crop covers headings, filters and all six KPI cards at native density.
- Desktop: both browser viewports 1280×720, dark mode, same October 2026 / Concept / all-seasons empty state. Full-page heights remain natural; source uses the browser's default scrollbar, implementation the app's thin scrollbar. No screenshot stretch. Both views show zero in every metric and empty work queue, allowing comparison without synthetic data in studio_db.
- Mobile: comparison-mobile.png contains both pages in 390×1100 browser iframes. Source left, production right. Both use the same period/service and empty state. Production clientWidth and scrollWidth are both 384 (six pixels for its vertical scrollbar): no horizontal overflow. The screenshot retains normal vertical scrolling; supplemental comparison-mobile-top.png shows the lower chart/queue during inspection. This is CSS viewport testing, not touch-device emulation.
- Live default-state proof: implemented-live-desktop.png. Actual photographer data shows three November shoots, one upcoming shoot and two editing records. These match the three November assignments on the existing personal calendar. No synthetic records or transactions were added.

## Findings and required fidelity surfaces

- No remaining actionable P0/P1/P2 mismatch in the final stable-font comparisons. Initial font loading was allowed to settle before comparing labels; no layout change remains from that inspection.
- Fonts/typography: existing Inter Vietnamese variable font, 24px desktop / 22px mobile title, 28px / 26px values, compact 11–12px labels and tabular numbers retained. Full labels remain readable and wrap naturally; zero counts are real empty values, not placeholders.
- Spacing/layout: six cards in 3×2 desktop / 2×3 mobile arrangement, 12px card gaps, 20px section spacing, 8px surfaces and the chart/priority grid match the source. Mobile stacks chart and queue. The existing sidebar and mobile menu remain functional; source's simulated chrome differs slightly in breadcrumb weight, user-label location, scrollbar and icon-button geometry, intentionally preserving the real application.
- Colors/tokens: neutral staff backgrounds/borders, indigo concept bars, blue yearbook bars and a red overdue value follow the approved roles. Actual light/dark staff tokens replace the mock's near-identical palette; slight dark-surface differences are intentional. Quantitative bars have no decorative border and start at zero.
- Assets: supplied studio logo and existing Lucide icons retained. Source placeholders were rendered with that same icon package for screenshots. No custom drawing replaced an image or icon; no new raster asset/library was introduced.
- Copy/content: approved metric names, hints and priority headings retained. Chart caption uses a concise period description. Production drilldowns open real order profiles and display saved deadlines, instead of the mock's illustrative profile panel. Removed nearest-shoots and personal-busy sections stay absent. Missing deadline reads “Chưa có hạn bàn giao”, without fabricating a date.

## Functional and data verification

- Browser: real photographer login; live KPI totals; shoots drilldown with three matching records; actual yearbook profile and Back returning to /?metric=shoots; return to overview; period/service/season controls; October concept empty state; responsive width. Fresh final dashboard tab has no console errors.
- 23 frontend tests passed: personal dashboard rendering, controls, drilldown, stale response/error/retry and order return context, plus manager/finance/report and concept-payment regression checks. Three backend tests passed: metric/date/deadline/album semantics, caller/role/query protection, and existing unified-order pipeline regression. Fixtures include more than one list page and Vietnam month boundaries.
- Frontend production build, frontend/backend TypeScript and scoped lint passed. Existing large/circular bundle warnings remain outside this change.
- MongoDB had stopped during verification. Restarted the existing authenticated local instance with the project's management command and verified the final application against studio_db; no database switch or payment configuration change.
- Practical data limits: concept currently has descriptive delivery terms rather than an absolute deadline, so it is not assigned a fabricated overdue date. Older completed records without a completion event are not assigned to a completion month using updatedAt. Both rules are documented in ADR-025.

Implementation checklist: complete. Follow-up polish: none required. Exhaustive light-theme/touch-hardware testing was not repeated; existing staff tokens and native controls are reused.

---

# Personal photographer calendar — 2026-11-13

final result: passed

Selected target: approved personal monthly calendar at C:/Users/Admin/.codex/visualizations/2026/11/12/01a1cdd5-2ae6-7cf2-8de0-a8621be62dce/personal-shoot-calendar.html. The user approved implementation. This extends the existing application, retaining its real staff navigation.

## Evidence and normalization

- Evidence folder: audit/personal-calendar-2026-11-13. source-desktop.png is the approved source rendered at 1280 CSS px in an iframe; implemented-desktop.png is the authenticated production /schedules route on studio_db at a 1280×720 browser viewport, captured full-page (1274×966 after the existing thin scrollbar). Source capture 1280×1000 retains its native frame and scrollbar. There is no image stretch.
- Both desktop views select 21 November 2026, an empty day, in dark mode. Live data has three assigned November shoots; the approved mock has eleven synthetic shoots. The different counts/titles/dates are expected data differences, not missing production data. Source uses a mock 176px sidebar; implementation preserves the existing 240px sidebar, season selector and real logo. This accounts for the narrower calendar and slightly different breadcrumb position.
- Mobile comparison uses two real 390px-wide browser iframes in responsive.html, one containing the approved source and one the authenticated production route. This verifies CSS responsiveness, not touch-device emulation. Production HTML clientWidth and scrollWidth both equal 390. Selected day and theme match desktop. Existing mobile topbar and 16px app gutter intentionally replace the mock's simulated user bar and 12px gutter. Native screenshots are cropped at frame boundaries without scaling.
- Opened combined comparison-desktop.png, comparison-mobile.png and native-pixel comparison-focus.png. The focus image puts the source above the production heading, toolbar and day-detail region so the small text is legible. Supplemental support-role screenshot documents a real assigned shoot.

## Findings and fidelity surfaces

- Resolved during browser verification: programmatic focus on a shoot detail could scroll the desktop heading out of view. Focus now preserves scroll on desktop and scrolls the detail into view only in the stacked layout. The empty-state icon also inherited the app's block-SVG rule; centered it explicitly. The stored comparisons were captured after these fixes.
- No remaining actionable P0/P1/P2 issue in the final combined comparisons.
- Typography: existing Inter Vietnamese variable font retained; same 24px desktop/22px mobile page title, 17px month/detail headings, compact 11–12px labels and tabular time. Event titles truncate and complete titles remain visible in the selected-day panel and accessible labels.
- Spacing/layout: seven columns, six complete week rows, 108px desktop/67px mobile cells, 16px workspace gap, 224px details and 9px card radii retained. Detail stacks earlier (1100px viewport) to accommodate the real 240px sidebar. Small screens replace event chips with dots/count and keep every day selectable; no horizontal overflow on the production screen.
- Colors/tokens: concept indigo, yearbook blue, cancelled gray and selected-day outline match the design roles. Neutral backgrounds, borders, accent and success colors use existing staff light/dark tokens; darker production panels/selection are an intentional design-system integration difference.
- Images/assets: actual supplied studio logo remains in the existing sidebar/topbar; all icons use the existing Lucide library. Source capture substitutes the host-provided icon placeholders with the same library's generated markup. No hand-drawn image substitute or new raster asset was needed. Empty-state calendar glyph uses CalendarDays, a small accepted same-library variant of the mock's CalendarCheck2.
- Copy/content: title, subtitle, month navigation, service legend, role and preparation disclosure preserved. Empty/loading/error wording is adapted to the actual data-loading states. No mock/review labels, fictitious schedules or management actions appear in the production personal calendar.

## Verification

- Backend HTTP test passed: authentication/role protection, immutable caller scope including multi-role users, lead/support assignments, 27 returned fixtures (no 20-record cap), inclusive Vietnam first/last-day instants, invalid dates/query shapes and 42-day bound. No DB connection or writes in that test.
- Four personal-calendar UI tests and eight staff/role regression tests passed; two existing management calendar tests also passed. Covers full month/navigation/today, event/day selection, >2/day details, support/cancelled/notes, timezone grouping, stale/aborted responses, account switch, error/retry, role 3/5 and preserved admin tools.
- Frontend/backend production builds passed. Scoped lint has zero errors and the existing unrelated buildFilterParams hook warning in the old management page. Existing production chunk-size/circular-chunk warnings remain outside this change.
- Browser: real photographer login, November counts, real support-role details, next month empty view, today, selected empty day, 390px date selection/details. Existing main studio_db and payment settings untouched; no orders, reservations or bank transactions created.

Implementation checklist: complete. Follow-up polish: none required. Actual touch-device and exhaustive light-theme interaction testing were not repeated; the screen inherits the existing theme tokens and native controls.

---

# Unified deposit checkout — 2026-11-12

final result: passed

Selected target: approved unified deposit mockup with the existing navbar. User approved implementation and explicitly removed the review toolbar. Implemented in the existing authenticated order pages through shared `DepositCheckout`.

## Evidence and normalization

- Source visual truth: `audit/unified-deposit-mockup-2026-11-12/desktop.png` (1434×1188) and `mobile.png` (384×2182).
- Implementation: `implemented-desktop.png` (1434×1136), `implemented-mobile.png` (384×2095), in the same audit folder. Actual production component rendered in the development preview with static order data; authenticated order-route integration uses component tests.
- Desktop viewport 1440×1000 CSS px; mobile 390×844. Six pixels occupied by the browser scrollbar; captured CSS width 1434/384, density 1, no screenshot scaling in comparison files.
- Same waiting rental state: 690,000 VND rental, 207,000 VND deposit, 483,000 VND remaining, same mock QR and recipient fields. Timer differs by capture time. Strip the explicitly removed toolbar: 54 px desktop / 90 px mobile. No stretch applied; natural page heights retained.
- Full comparisons opened together: `comparison-desktop.png` and `comparison-mobile.png`. Source left, implementation right. Focus comparison opened: `comparison-details.png`, corresponding 430×400 bank/amount regions at native density.

## Findings and required fidelity surfaces

- No actionable P0/P1/P2 mismatch in the initial comparison; no visual correction loop required.
- Typography: existing Inter and 30px desktop / 27px mobile heading retained. Amount, bank fields, labels and button hierarchy match the source in native-density focus comparison; Vietnamese labels remain readable.
- Spacing/layout: desktop retains two columns (payment and 348px order summary), QR and bank details side by side; mobile puts amount before QR, then bank details and summary. Navbar unchanged. Mobile uses the existing shell's 16px gutter rather than the standalone mock's 20px; this is an intentional integration difference. No horizontal overflow (390px viewport, 384px document content width).
- Colors/tokens: white cards, neutral canvas, coral primary/amounts and rose countdown preserved; success/expired states retain green/neutral treatment. Same card borders, 14px radii, gray separators and focus outlines.
- Images/assets: actual production QR uses the backend URL; development fixture reuses the supplied non-payment preview QR. No screenshot or image is substituted for live UI. Existing logo and icon library retained.
- Copy/content: review toolbar and footer disclaimer omitted as requested. Back target now follows the real order context rather than a mock dialog. Snapshot deposit terms are explicit; copied bank/reference values and partial-payment amount use backend data. Missing-bank, expired, cancelled and review states never advertise a usable QR.

## Functional and verification evidence

- Browser: desktop/mobile waiting rental, concept partial payment, yearbook paid, rental expired; copy and help expansion. QR absent on paid/expired views. Back text-decoration is none; original navbar/mobile menu retained.
- Fresh navigation after the preview HMR cleanup produced no new console errors. An earlier development-only duplicate-createRoot warning was resolved by disposing the preview root; production app root was unchanged.
- 50 checkout/order tests passed; final targeted rerun: 23 passed / 27 skipped by name filter. Earlier unchanged regression groups: 85 passed. Production build passed. TypeScript, scoped lint and whitespace validation passed.
- No booking or bank transaction created. Live authenticated browser payment E2E was not repeated: the seeded sample credentials were unavailable on studio_db. This does not block visual QA; owner route data loading, polling and confirmation were verified with service-mocked integration tests.

Follow-up polish: none required. Existing bundle-size warning remains outside this layout change.

---

# Merged shoot preparation — 2026-11-12

final result: passed

The selected target is the first displayed mockup, saved at `audit/concept-preparation-2026-11-12/reference.png` (original ImageGen result `exec-b5f25f34-c264-4739-97e8-bef308eca511.png`). Implemented in the existing booking app, using existing logo, concept photography, Inter and Lucide assets.

## Comparison evidence

- Source: 1487×1058 raster, treated as 1487×1058 CSS px at density 1.
- Chrome viewport: 1487×1058 CSS px, deviceScaleFactor 1. Full-page implementation: 1487×1094 px in `preparation-desktop.png`; the extra height is normal page/footer spacing below the reference frame.
- Same state: one participant, Chân dung Tự nhiên, Saturday 14/11/2026 14:00–15:00 in studio time, Lê Minh Đức, 900.000 đ, contact Mai Anh and warm/natural-light brief. Decimal measurements 165.5/55.2 intentionally exercise existing validation instead of the reference's integer example.
- Full comparison opened: `comparison.png`, source left / implementation right, native-scale images top-aligned on equal 1487×1094 white canvases; no stretching or density rescaling.
- Focused comparison opened: `comparison-form.png`, identical 850×760 regions starting at (130,235), contact/wardrobe/brief/links side by side.
- Mobile screenshot opened after the last run: `preparation-mobile.png`, 390×1730 px from 390×844 viewport. Additional captures at 834×1194 and 320×844. No horizontal overflow at any checked size.

## Findings and iteration history

- Initial P2: the form was taller than the selected reference; implementation capture `preparation-desktop-initial.png` was 1487×1179 and the footer sat too low. Reduced heading/top gaps, section gaps, textarea minimum heights and bottom padding. Final full/focused comparisons show the intended hierarchy and density; primary action remains clear.
- Fonts: existing Inter retained, title 30px/26px mobile, body 15–16px, labels 14px, sections 20–21px. No oversized headings.
- Layout: contact then wardrobe then ideas in left column; photo/package/date/time/photographer/price in right column with one vertical separator. On mobile the fields stack and booking summary follows the form. No nested cards, duplicate Back, or extra wizard step.
- Colors: existing white/gray/coral tokens retained. Inputs have neutral borders, a rose keyboard focus outline, and 44px minimum target height. Source's AI-rendered button sheen is not recreated as a new visual token.
- Imagery: original project portrait thumbnail reused with appropriate aspect ratio and focal point; supplied logo stays unchanged. All icons use the existing icon library.
- Copy: selected Vietnamese headings reproduced. Free-text size remains available for custom studio sizes. The generated mock's fictitious 500-character counter is omitted; the existing 4,000-character brief and server limit of 10 HTTPS references remain authoritative. No changes to checkout pricing, policies or email requirements.
- No actionable P0/P1/P2 findings remain. P3: minor native font/control rendering and whitespace differences from the generated image.

## Functional verification

- 26 frontend tests passed (23 booking tests + 3 safe-return tests), including two participants, measurement validation, contact validation, direct review guard, old brief URL, draft restoration, auth and checkout retry identity.
- TypeScript and changed-file ESLint passed; Prettier and both repository diff checks passed.
- Final Vite build passed. Existing circular vendor chunk and large bundle warnings remain.
- Actual Chrome check `ops/tests/concept-wardrobe-browser.cjs` passed with native local API/database: contact + measurements + brief on one screen, one Continue directly to review, review Back to merged form, form Back to photographer and photographer Back to date, arrow/no underline, legacy brief redirect, reload with all fields preserved, and desktop/mobile yearbook menu unchanged.
- Zero browser page errors, no costume catalog requests, and no native orders created. Results: `audit/concept-preparation-2026-11-12/browser.json`.
- Backend API/schema unchanged; no new backend test run required for this frontend-only merge.

---

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
