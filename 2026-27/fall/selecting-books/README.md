# Fall 2026 book selection

`sources/` contains one editable CSV per person, with `title`, `author`, `isbn`, `isbn13`, and `note` columns. The Goodreads CSV exports supplied on September 29 replace the earlier Konnor and Meryl PDF printouts. The original Serena text list and remaining unnamed RTF lists were converted to CSVs; Serena's section headings were removed. `Anon 1`, `Anon 2`, `Anon 3`, and `Anon 6` retain their original RTF order.

The identity matches from the original RTF were based on title overlap: Becky's export includes all 10 titles from Anon 7, Ellen's includes 14 of Anon 4's 15 titles, and Meryl's includes 4 of Anon 5's 5 titles. The additional handwritten titles, *The Library at Mt Char* (Ellen) and *If Beale Street Could Talk* (Meryl), remain in their CSVs with a note. Anon 1 was not reassigned based on its two generic overlaps with Damla. An “or” choice from Anon 2 has two candidate rows marked as alternatives.

`suggestions.csv` has one row per person and title. `resolved.csv` adds Open Library work IDs and match status. `shared-books.csv` ranks works by distinct people; `summary.md` shows books shared by at least two. ISBNs identify editions, while Open Library work IDs group editions. Matching title and author also joins catalog entries assigned different work IDs. Unresolved entries use normalized title and author as reviewable fallbacks. Check uncertain matches before making final selections.

From this directory, run:

```bash
python -m pip install pandas
python parse_lists.py
python report.py
```

`python report.py --refresh` repeats the Open Library requests. Ordinary runs reuse `openlibrary-cache.json` and look up only new titles. To add a list, place a CSV named for the person in `sources/` and rerun both commands.
