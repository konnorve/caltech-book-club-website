"""Resolve titles with Open Library and report shared book suggestions.

Run: python report.py       # reuses cached responses
     python report.py --refresh
Requires: pandas
"""

from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import re
import sys
import time
import unicodedata
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pandas as pd


HERE = Path(__file__).resolve().parent
CACHE = HERE / "openlibrary-cache.json"


def normalize(value):
    value = unicodedata.normalize("NFKD", str(value or "")).casefold()
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = re.sub(r"\([^)]*(?:#\d+|volume \d+)[^)]*\)", "", value)
    value = re.sub(r"[^a-z0-9]+", " ", value).strip()
    value = re.sub(r"^(the|a|an) ", "", value)
    return value.replace("portrait of dorian gray", "picture of dorian gray")


def author_key(author):
    """A small matching key that handles both 'Last, First' and 'First Last'."""
    author = author.split(",", 1)[0] if "," in author else author
    words = normalize(author).split()
    return words[-1] if words else ""


def compact(docs, lookup):
    """Keep only the catalog fields needed to repeat this particular match."""
    return [{"key": doc.get("key", ""), "title": doc.get("title", ""),
             "author_name": doc.get("author_name", []),
             "isbn": [lookup] if lookup in doc.get("isbn", []) else []}
            for doc in docs]


def search(title, author, isbn):
    params = {"fields": "key,title,author_name,isbn", "limit": 5}
    if isbn:
        params["q"] = isbn
    else:
        params["title"] = title
    url = "https://openlibrary.org/search.json?" + urlencode(params)
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={"User-Agent": "caltech-book-club/1.0 (book-selection)"}), timeout=15) as response:
                return compact(json.load(response).get("docs", []), isbn)
        except Exception as exc:
            if attempt == 2:
                print(f"Lookup failed for {title!r}: {exc}", file=sys.stderr)
            else:
                time.sleep(1 + attempt)
    return []


def match(row, docs):
    title = normalize(row.title)
    author = normalize(row.author)
    surname = author.split()[0] if "," in row.author else author.split()[-1] if author else ""
    for doc in docs:
        catalog_title = normalize(doc.get("title", ""))
        similarity = SequenceMatcher(None, title, catalog_title).ratio()
        authors = normalize(" ".join(doc.get("author_name", [])))
        valid_author = not surname or surname in authors.split()
        isbn_match = bool(row.isbn13) and row.isbn13 in doc.get("isbn", [])
        if isbn_match or (similarity >= 0.83 and valid_author):
            return pd.Series({"catalog_title": doc.get("title", ""),
                              "work_id": doc.get("key", ""),
                              "match": "isbn" if isbn_match else "title_author" if author else "title_only"})
    return pd.Series({"catalog_title": "", "work_id": "", "match": "unresolved"})


def main():
    rows = pd.read_csv(HERE / "suggestions.csv", dtype=str).fillna("")
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    needed = {row.isbn13 or normalize(row.title) + "|" + normalize(row.author)
              for row in rows.itertuples(index=False)}
    cache = {key: compact(docs, key) for key, docs in cache.items() if key in needed}
    refresh = "--refresh" in sys.argv
    pending = {}
    for row in rows.itertuples(index=False):
        lookup = row.isbn13 or normalize(row.title) + "|" + normalize(row.author)
        if refresh or lookup not in cache:
            pending[lookup] = (row.title, row.author, row.isbn13)
    with ThreadPoolExecutor(max_workers=12) as pool:
        jobs = {pool.submit(search, *args): key for key, args in pending.items()}
        for i, job in enumerate(as_completed(jobs), 1):
            cache[jobs[job]] = job.result()
            if i % 20 == 0 or i == len(jobs):
                CACHE.write_text(json.dumps(cache, ensure_ascii=False) + "\n")
                print(f"Looked up {i}/{len(jobs)} titles", flush=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False) + "\n")
    results = []
    for row in rows.itertuples(index=False):
        lookup = row.isbn13 or normalize(row.title) + "|" + normalize(row.author)
        results.append(match(row, cache[lookup]))
    resolved = pd.concat([rows, pd.DataFrame(results)], axis=1)
    resolved["title_key"] = resolved.title.map(normalize)
    resolved["author_key"] = resolved.author.map(author_key)
    known_pairs = (resolved.loc[resolved.work_id.ne("") & resolved.author_key.ne("")]
                   .groupby(["title_key", "author_key"]).work_id
                   .agg(lambda ids: ids.value_counts().index[0]))
    pair_id = pd.Series([known_pairs.get((title, author), "")
                         for title, author in zip(resolved.title_key, resolved.author_key)], index=resolved.index)
    known_titles = (resolved.loc[resolved.work_id.ne("")].groupby("title_key").work_id
                    .agg(lambda ids: ids.iloc[0] if ids.nunique() == 1 else ""))
    title_id = resolved.title_key.map(known_titles).fillna("")
    # A title and author can join edition records that Open Library assigns
    # different work IDs; an authorless row joins only an unambiguous title.
    resolved["group_id"] = pair_id.where(pair_id.ne(""), resolved.work_id)
    authorless = resolved.author_key.eq("") & resolved.group_id.eq("")
    resolved.loc[authorless, "group_id"] = title_id[authorless]
    inferred = resolved.work_id.eq("") & resolved.group_id.ne("")
    resolved.loc[inferred, "match"] = "same_title_as_catalog_match"
    # Catalog IDs are works (all editions). Where metadata is unavailable,
    # title is a conservative, inspectable fallback rather than an invented ISBN.
    fallback = "title:" + resolved.title_key + "|author:" + resolved.author_key
    resolved["group_id"] = resolved.group_id.where(resolved.group_id.ne(""), fallback)
    resolved = resolved.drop_duplicates(["person", "group_id"])
    resolved = resolved.drop(columns=["title_key", "author_key"])
    resolved.to_csv(HERE / "resolved.csv", index=False)
    grouped = (resolved.groupby("group_id", as_index=False)
               .agg(title=("title", "first"),
                    people=("person", lambda s: "; ".join(sorted(set(s)))),
                    people_count=("person", "nunique"),
                    match=("match", lambda s: "; ".join(sorted(set(s))))))
    grouped["sort_title"] = grouped.title.str.replace(r"^The\s+", "", case=False, regex=True).str.casefold()
    grouped = grouped.sort_values(["people_count", "sort_title"], ascending=[False, True]).drop(columns="sort_title")
    grouped.to_csv(HERE / "shared-books.csv", index=False)
    shared = grouped[grouped.people_count.ge(2)]
    lines = ["# Shared book suggestions", "", f"{len(resolved)} suggestions from {resolved.person.nunique()} people; {len(grouped)} distinct book groups.",
             "", "Counts are distinct people, not repeated entries. An ‘or’ pair is an alternative choice from one person.",
             "", "| Book | People | Suggested by |", "| --- | ---: | --- |"]
    for row in shared.itertuples(index=False):
        lines.append(f"| {row.title.replace('|', '/') } | {row.people_count} | {row.people} |")
    (HERE / "summary.md").write_text("\n".join(lines) + "\n")
    print(f"{len(resolved)} suggestions, {len(grouped)} works, {len(cache)} cached lookups")
    print("\nShared by at least two people:")
    print(grouped.loc[grouped.people_count.ge(2), ["title", "people_count", "people", "match"]].to_string(index=False))
    print("\nCatalog matching:")
    print(resolved.match.value_counts().to_string())


if __name__ == "__main__":
    main()
