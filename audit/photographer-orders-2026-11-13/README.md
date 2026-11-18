# Photographer orders — 13/11/2026

Implemented in the main application at http://localhost:4001/workflow-bookings.

- Personal photographer navigation now has photography orders, Dashboard and calendar; the separate concept list is hidden. Admin/sales/accounting navigation is retained for those workspaces.
- The server scopes yearbook lead/support/resource-team assignments and concept photographer/editor assignments before combining, status filtering, counting and global pagination. Service choices: all, concept, yearbook. No financial/contact DTOs added to the photographer feed.
- Existing profiles remain in place. Service/status/page context survives record navigation; old concept-list URLs redirect to the concept-filtered unified list. Concept records keep the photography nav entry active.
- Browser checked with the existing photographer account on studio_db: all 12 current yearbook assignments, empty concept filter for this photographer, yearbook filter, existing profile and contextual Back, legacy concept redirect and no new console errors. Both service types and their target routes also pass synthetic component tests. No records/payments were created for verification.
- 41 frontend tests across personal lists, manager list, sidebar, concept profile/payment and calendar regression passed. One backend HTTP route/auth/pipeline-invariant test passed; it uses model stubs, not a DB connection. Frontend and backend TypeScript checks passed. Screenshot: implemented-desktop.png.
