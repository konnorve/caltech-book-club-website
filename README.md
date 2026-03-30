# Caltech Book Club Website

Small static website with no build step.

## Files that run the site

- `index.html`: home page with the bookshelf.
- `book.html`: detail page for one book.
- `styles.css`: all site styles.
- `books-data.js`: all editable content for books and meetings.
- `bookshelf.js`: rendering logic for the bookshelf and book detail page.

## Quick edit guide (non-technical)

### Add or edit a book

1. Open `books-data.js`.
2. Copy one existing book object and edit:
   - `id`: short unique slug (used in the URL)
   - `title`
   - `author`
   - `cover` (image URL)
   - `row`: `1` or `2` (shelf row)
   - `tags`: e.g. `["Weekly"]`, `["Monthly"]`, `["Term"]`
   - `meetings`: list of date-time strings like `"2026-04-21T19:00:00"`
   - `description`
3. Save and refresh the browser.

### Add a meeting note

In `meetings`, use an object form:

`{ dateTime: "2026-03-31T19:00:00", note: "End of Chapter 15" }`

## Simple local preview

Open `index.html` in a browser, or run:

`python3 -m http.server`

Then visit `http://localhost:8000`.

## Optional analysis tools

- `meeting_history_extract.py` and `analysis_output/` are helper analysis files.
- They are not required for the website to run.
