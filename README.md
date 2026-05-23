# metavis1on

metavis1on; Discord topluluğu, dijital kültür, mini uygulamalar ve yönetim
panellerini bir araya getiren modern bir topluluk portalıdır.

## Current Structure

- Public portal: `index.html`
- Admin entry: `admin/`
- Admin dashboard: `admin/dashboard.html`
- Read-only admin modules:
  - `admin/announcements.html`
  - `admin/events.html`
  - `admin/apps.html`
  - `admin/logs.html`
- Sensitive admin module:
  - `admin/borc/`
- Documentation:
  - [`docs/firebase-transition-plan.md`](docs/firebase-transition-plan.md)
  - [`docs/README.md`](docs/README.md)
  - [`CHANGELOG.md`](CHANGELOG.md)

## Notes

- Firebase integration is **not active yet**.
- Firebase migration is documented under
  [`docs/firebase-transition-plan.md`](docs/firebase-transition-plan.md).
- The debt panel (`admin/borc/`) is treated as a sensitive module and should
  not be refactored without a separate migration/audit plan.
