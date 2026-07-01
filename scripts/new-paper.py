from __future__ import annotations

import argparse
import sys
from datetime import date

from _vault_common import (
    render_template,
    repo_root_from,
    require_non_empty,
    write_utf8,
    yaml_quote,
)


def normalize_paper_id(raw_value: str) -> str:
    paper_id = raw_value.strip()
    if not paper_id:
        raise ValueError("PaperId must not be empty or whitespace")

    error_message = (
        "PaperId must start with a letter or digit and contain only letters, digits, '.' or '-'"
    )
    if not paper_id[0].isalnum():
        raise ValueError(error_message)
    if any(not (character.isalnum() or character in ".-") for character in paper_id):
        raise ValueError(error_message)
    return paper_id


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a paper card and note from the vault templates."
    )
    parser.add_argument("--paper-id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--alphaxiv", required=True)
    parser.add_argument("--year", default="")
    parser.add_argument("--pdf", default="")
    parser.add_argument("--code", default="")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        paper_id = normalize_paper_id(args.paper_id)
        title = require_non_empty(args.title, "Title")
        alphaxiv = require_non_empty(args.alphaxiv, "AlphaXiv")
        year = args.year.strip()
        pdf = args.pdf.strip()
        code = args.code.strip()

        repo_root = repo_root_from(__file__)
        card_path = repo_root / "papers" / "cards" / f"{paper_id}.md"
        note_path = repo_root / "papers" / "notes" / f"{paper_id}-note.md"
        card_template_path = repo_root / "templates" / "paper-card.md"
        note_template_path = repo_root / "templates" / "paper-note.md"

        if card_path.exists() or note_path.exists():
            raise ValueError(f"Paper already exists: {paper_id}")

        created = date.today().isoformat()
        template_values = {
            "{{paper_id}}": paper_id,
            "{{title}}": title,
            "{{title_yaml}}": yaml_quote(title),
            "{{year}}": year,
            "{{alphaxiv}}": alphaxiv,
            "{{pdf}}": pdf,
            "{{code}}": code,
            "{{created}}": created,
            "{{date:YYYY-MM-DD}}": created,
        }

        write_utf8(card_path, render_template(card_template_path, template_values))
        write_utf8(note_path, render_template(note_template_path, template_values))

        print("Created:")
        print(f"  {card_path}")
        print(f"  {note_path}")
        print("Paper view will pick up the new card automatically.")
        return 0
    except Exception as error:  # pragma: no cover - exercised through CLI tests
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
