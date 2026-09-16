# Membership

[2025 roster](2025_bookclub_roster.csv) preserves the supplied roster unchanged, with `Name`, `Email`, and `label` columns. It is a historical roster, not a record of current membership or meeting attendance.

This directory is outside `public/` and is not served by the website. Files committed here are still visible in the public GitHub repository.

## Information to track

Keep member details separate from attendance so one person can attend many meetings without duplicating their contact information.

| Record | Suggested fields |
| --- | --- |
| Member | Member ID, name, email, affiliation, date joined, active/inactive status, weekly/monthly reading preference, preferred contact method, mailing-list opt-in |
| Attendance | Member ID, event ID, meeting date, book, attendance status |

Use a stable member ID to connect the records. Event IDs can refer to the existing events in `public/books-data.js`. Leave unknown fields blank; the supplied roster does not establish attendance, current status, or communication consent.

Keep the 2025 source unchanged when starting a current tracker. Store additional personal contact details and individual attendance history in an officers-only tracker rather than this public repository.
