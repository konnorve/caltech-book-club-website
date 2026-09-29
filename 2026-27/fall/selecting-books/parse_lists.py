"""Combine one CSV per person into the book-selection suggestions table.

Run: python parse_lists.py
Requires: pandas
"""

from pathlib import Path
import re
import unicodedata

import pandas as pd


HERE = Path(__file__).resolve().parent


def title_key(title):
    title = unicodedata.normalize("NFKD", title.casefold())
    title = "".join(char for char in title if not unicodedata.combining(char))
    title = re.sub(r"\([^)]*\)", "", title)
    return re.sub(r"[^a-z0-9]+", " ", title).strip()


def main():
    tables = []
    for path in sorted((HERE / "sources").glob("*.csv")):
        person = path.stem.replace("-", " ").title()
        source = pd.read_csv(path, dtype=str).fillna("")
        source["person"] = person
        source["source"] = path.name
        source["author"] = source.author.str.replace(r"\s*\*$", "", regex=True).str.strip()
        tables.append(source)

    suggestions = pd.concat(tables, ignore_index=True)
    suggestions["title_key"] = suggestions.title.map(title_key)
    # One person counts once per title, even if their export contains duplicates.
    suggestions = suggestions.drop_duplicates(["person", "title_key"]).drop(columns="title_key")
    suggestions = suggestions[["person", "title", "author", "isbn13", "source", "note"]]
    suggestions.to_csv(HERE / "suggestions.csv", index=False)
    print(f"Wrote {len(suggestions)} suggestions from {suggestions.person.nunique()} people")
    print(suggestions.groupby("person").size().to_string())


if __name__ == "__main__":
    main()
