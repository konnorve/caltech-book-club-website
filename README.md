# Caltech Book Club Website

Small static website. A dependency-free build copies only public files into `dist/`.

## Files that run the site

- `index.html`: home page with the bookshelf and short participation summaries.
- `guidelines.html`: full expectations and discussion guidelines.
- `governance/Draft-Constitution.pdf`: original draft, repository-only; never included in the site build.
- `scripts/build.mjs`: explicit public-file allowlist for deployment.
- `book.html`: detail page for one book.
- `styles.css`: all site styles.
- `books-data.js`: all editable content for books and meetings.
- `bookshelf.js`: rendering logic for the bookshelf and book detail page.
- `images/`: directory containing the bookshelf wood texture.

## Quick edit guide (non-technical)

### Add or edit a book

1. Open `books-data.js`.
2. Copy one existing book object and edit:
   - `id`: short unique slug (used in the URL)
   - `title`
   - `author`
   - `cover` (image URL)
   - `tags`: e.g. `["Weekly"]`, `["Monthly"]`, `["Term"]`
   - `meetings`: list of date-time strings like `"2026-04-21T19:00:00"`
   - `description`
3. Save and refresh the browser.

*Note: The website automatically sorts books chronologically by their first meeting date, and automatically categorizes them into Past, Current, and Future based on the current date.*

### Weekly book rollover

Weekly books roll forward automatically from the dates in `books-data.js`:

- A weekly book with both past and upcoming meetings is Current.
- After that book's final meeting, the next scheduled weekly book becomes Current once its first meeting is within 14 days.
- If no next weekly book is scheduled soon, the finished weekly book stays Current for up to 14 days as a fallback.

### Add a meeting note

In `meetings`, use an object form:

`{ dateTime: "2026-03-31T19:00:00", note: "End of Chapter 15" }`

## Simple local preview

Run `node scripts/build.mjs`, then:

`python3 -m http.server --directory dist`

Then visit `http://localhost:8000`.

## Verification

Run the status checks with:

`node tests/book-status.test.js`

## Deployment: required before merging this change

In the existing Cloudflare Pages project, set the build command to `node scripts/build.mjs` and the build output directory to `dist`. Do not deploy the repository root: it now contains repository-only governance documents. `wrangler.toml` pins the output to `dist` on supported Pages builds (v2 or later). The dashboard build command is not changed by this pull request; until configured, a preview may fail because `dist` does not exist. Verify them before merging or enabling a branch preview.

The constitution is intentionally absent from navigation, the sitemap, and the built output. It remains accessible in this public GitHub repository.

## Updating member guidance

Edit the full wording in `guidelines.html` and keep the two short homepage summaries in sync. The shared footer is static HTML on each of the five pages so navigation also works without JavaScript; update all five copies together.
