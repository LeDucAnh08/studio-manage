# Concept booking and post-production

Approved 2026-11-10. Separate concept orders, fixed session pricing, verified email,
15-minute holds only at QR checkout, shared photographer/inventory transactions,
one studio, SePay receipts, automatic 48h/24h cancellation and one 48h reschedule.
Drive follows the existing public-link source; application access is payment gated.
Owner-only selection/feedback/acceptance; expiring read-only guest links.

Build order: catalog → checkout → operations → changes → album → retouch.
Keep all existing local changes and yearbook/rental behavior. No production seed,
bank transfer, push or deployment. Tests use an isolated loopback replica set.

Defaults: UTC+7, 09:00–19:00, 30-minute slot steps, 60-minute buffer, 90-day horizon.
Cancellation uses min(original,current) shoot date: >=48h retain zero deposit;
24–48h retain half; <24h retain full deposit. Other receipts are refundable.
Two aggregate free feedback rounds per order; later work requires accepted paid quote.

Verification: shared resource races, signed receipt retries and wrong/late amounts,
atomic rescheduling, cancellation thresholds, ownership, stale versions, Drive source
changes, quota fees, revision limits, ZIP permissions, legacy regressions and builds.
