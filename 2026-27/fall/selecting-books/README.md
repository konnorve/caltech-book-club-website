# Fall 2026 book selection

The input files in `sources/` are the original lists. `suggestions.csv` has one row per person and suggested book, with the source filename and any supplied ISBN-13. The seven unnamed lists in the RTF are `Anon 1` through `Anon 7`, in order of appearance. Serena's section headings are omitted. An “or” suggestion has two rows marked as alternatives, so its two choices should not be treated as two votes by that person.

`resolved.csv` adds Open Library work IDs and match status. `shared-books.csv` ranks works by the number of distinct people who listed them. The JSON cache records API responses for repeatable runs. An ISBN denotes an edition; the Open Library work ID groups editions of the same book. Unresolved entries use a normalized title as a reviewable fallback. Catalogue matches should be spot checked, especially short or ambiguous titles.

From this directory, run:

```bash
python -m pip install pandas pdfplumber
python parse_lists.py
python report.py
```

`python report.py --refresh` repeats the Open Library requests. The scripts print the shared titles and match counts, and write the CSVs. The source CSV is intentionally long format: it can be filtered or pivoted by person without adding a column whenever another member supplies a list. Blank ISBNs mean the list did not provide one; the script does not invent an edition for a title-only suggestion.
