"""Turn the supplied lists into one row per person and suggested title.

Run: python parse_lists.py
Requires: pandas, pdfplumber
"""

from pathlib import Path
import re
import unicodedata

import pandas as pd
import pdfplumber


HERE = Path(__file__).resolve().parent
SOURCES = HERE / "sources"


def clean(text):
    return re.sub(r"\s+", " ", text.replace("*", "")).strip(" }\u2060")


def serena():
    rows = []
    source = "book_list_rearranged(1).txt"
    for line in (SOURCES / source).read_text().splitlines():
        if not line.startswith("- "):
            continue  # The section headings are not suggestions.
        title, author = line[2:].rsplit(" — ", 1)
        rows.append(("Serena", clean(title), clean(author), "", source, ""))
    return rows


def rtf_text(path):
    """Decode the simple, line-oriented Apple TextEdit RTF supplied here."""
    value = path.read_text()
    value = value[value.index(r"\f0\fs26") :]
    value = re.sub(r"\\'([0-9a-fA-F]{2})", lambda m: bytes.fromhex(m[1]).decode("cp1252"), value)
    value = re.sub(r"\\u(-?\d+)\??", lambda m: chr(int(m[1]) % 65536), value)
    value = re.sub(r"\\[a-zA-Z]+\d* ?", "", value)
    return value.replace("\\\n", "\n")


def anonymous():
    source = "lists(1).rtf"
    groups = re.split(r"\n\s*\n", rtf_text(SOURCES / source))
    rows = []
    for person_number, group in enumerate(groups, 1):
        for line in group.splitlines():
            line = re.sub(r"^\d+[.)]\s*", "", clean(line))
            if not line:
                continue
            note = ""
            if " by " in line:
                title, author = line.rsplit(" by ", 1)
            elif " - " in line:
                title, author = line.rsplit(" - ", 1)
            elif re.search(r"\([^()]+\)$", line):
                title, author = re.match(r"(.*?)\s*\(([^()]*)\)$", line).groups()
            elif ", " in line:
                title, author = line.rsplit(", ", 1)
            else:
                title, author = line, ""
            if author == "^":
                author = "Clarice Lispector"
            if " or " in title:
                titles = re.split(r"\s+or\s+", title)
                note = "alternative choices; count at most one for this person"
            else:
                titles = [title]
            for choice in titles:
                rows.append((f"Anon {person_number}", clean(choice), clean(author), "", source, note))
    return rows


def goodreads(path, person):
    """Read the Goodreads print table by its column positions and row spacing."""
    rows = []
    record = None
    for page in pdfplumber.open(path).pages:
        words = page.extract_words(x_tolerance=1)
        lines = {}
        for word in sorted(words, key=lambda w: w["top"]):
            y = word["top"]
            if 55 <= y < 770:
                nearby = next((top for top in lines if abs(top - y) < 1.5), y)
                lines.setdefault(nearby, []).append(word)
        for y, words in sorted(lines.items()):
            cols = [[], [], [], []]
            for word in sorted(words, key=lambda w: w["x0"]):
                x = word["x0"]
                bounds = (170, 250 if person == "Meryl" else 265,
                          340 if person == "Meryl" else 365)
                col = sum(x >= bound for bound in bounds)
                if col < 4:
                    cols[col].append(word["text"])
            title, author, isbn10, isbn13 = map(lambda c: clean(" ".join(c)), cols)
            # A dated line begins each new table row; a continuation has no date.
            dated = any(w["x0"] > 480 and re.match(r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$", w["text"])
                        for w in words)
            if dated and title:
                if record:
                    rows.append(record)
                match = re.search(r"\b97[89]\d{10}\b", isbn13)
                record = [person, title, author, match.group() if match else "", path.name, ""]
            elif record and not title.startswith(("!tle", "1 of", "2 of", "3 of", "4 of", "5 of", "6 of")):
                if title:
                    record[1] += " " + title
                if author and not re.match(r"\d{4}$", author):
                    record[2] += " " + author
        # Keep record across page breaks, where a long title can continue.
    if record:
        rows.append(record)
    return rows


def main():
    rows = serena() + anonymous()
    for path in sorted(SOURCES.glob("*.pdf")):
        person = "Meryl" if path.name.startswith("Meryl") else "Konnor"
        rows.extend(goodreads(path, person))
    table = pd.DataFrame(rows, columns=["person", "title", "author", "isbn13", "source", "note"])
    table["title"] = table.title.str.replace(r"(?<=\w)!(?=\w)", "ti", regex=True).str.replace('"', "tt", regex=False)
    table["author"] = table.author.str.replace("!", "ti", regex=False).str.replace('"', "tt", regex=False)
    table["title"] = table.title.str.replace("Cu#ng for Stone", "Cutting for Stone", regex=False)
    table["author"] = table.author.str.replace("Ka$a", "Kafka", regex=False)
    # Duplicate Goodreads pages and duplicate suggestions by the same person count once.
    key = lambda value: re.sub(r"[^\w]+", "", unicodedata.normalize("NFKD", value).casefold())
    table["_key"] = table.title.map(key)
    table = table.drop_duplicates(["person", "_key"], keep="first").drop(columns="_key")
    table.to_csv(HERE / "suggestions.csv", index=False)
    print(f"Wrote {len(table)} suggestions from {table.person.nunique()} people")
    print(table.groupby("person").size().to_string())


if __name__ == "__main__":
    main()
