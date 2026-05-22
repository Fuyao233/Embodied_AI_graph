from __future__ import annotations

import re
from pathlib import Path
from typing import List

from _vault_common import (
    extract_markdown_link_targets,
    extract_markdown_section,
    has_required_card_frontmatter,
    has_required_code_reading_frontmatter,
    has_required_code_type_frontmatter,
    is_local_markdown_file_target,
    list_markdown_files,
    repo_root_from,
)


CANONICAL_QUESTION_TARGET_PATTERN = re.compile(
    r"^\.\./papers/cards/[a-z0-9][a-z0-9.-]*\.md$"
)
CANONICAL_CODE_TYPE_TARGET_PATTERN = re.compile(
    r"^\.\./types/[a-z0-9][a-z0-9.-]*\.md$"
)


def question_has_non_canonical_paper_target(content: str) -> bool:
    for target in extract_markdown_link_targets(content):
        if is_local_markdown_file_target(
            target
        ) and not CANONICAL_QUESTION_TARGET_PATTERN.fullmatch(target):
            return True
    return False


def extract_related_code_type_targets(content: str) -> List[str]:
    related_code_types_content = extract_markdown_section(content, "Related Code Types")
    return [
        target
        for target in extract_markdown_link_targets(related_code_types_content)
        if is_local_markdown_file_target(target)
    ]


def code_reading_has_code_type_target(content: str) -> bool:
    return bool(extract_related_code_type_targets(content))


def code_reading_has_non_canonical_code_type_target(content: str) -> bool:
    targets = extract_related_code_type_targets(content)
    return any(
        CANONICAL_CODE_TYPE_TARGET_PATTERN.fullmatch(target) is None
        for target in targets
    )


def collect_issues(repo_root: Path) -> List[str]:
    cards_root = repo_root / "papers" / "cards"
    notes_root = repo_root / "papers" / "notes"
    questions_root = repo_root / "questions"
    code_types_root = repo_root / "codes" / "types"
    code_readings_root = repo_root / "codes" / "readings"

    card_files = list_markdown_files(cards_root, "*.md")
    note_files = list_markdown_files(notes_root, "*-note.md")
    question_files = list_markdown_files(questions_root, "*.md")
    code_type_files = list_markdown_files(code_types_root, "*.md")
    code_reading_files = list_markdown_files(code_readings_root, "*.md")

    cards_by_id = {card_file.stem: card_file for card_file in card_files}
    notes_by_id = {}
    for note_file in note_files:
        note_stem = note_file.stem
        note_id = note_stem[:-5] if note_stem.endswith("-note") else note_stem
        notes_by_id[note_id] = note_file

    issues: List[str] = []

    for card_id in sorted(cards_by_id):
        if card_id not in notes_by_id:
            issues.append(f"[ERROR] Missing note for card: {card_id}")

        card_file = cards_by_id[card_id]
        card_content = card_file.read_text(encoding="utf-8")
        card_targets = extract_markdown_link_targets(card_content)

        if f"../notes/{card_id}-note.md" not in card_targets:
            issues.append(f"[ERROR] Card missing note link: {card_id}")

        if not has_required_card_frontmatter(card_content):
            issues.append(f"[ERROR] Card missing required frontmatter: {card_file.name}")

    for note_id in sorted(notes_by_id):
        if note_id not in cards_by_id:
            issues.append(f"[ERROR] Missing card for note: {note_id}")

        note_file = notes_by_id[note_id]
        note_content = note_file.read_text(encoding="utf-8")
        note_targets = extract_markdown_link_targets(note_content)

        if f"../cards/{note_id}.md" not in note_targets:
            issues.append(f"[ERROR] Note missing card link: {note_id}")

    for question_file in question_files:
        question_content = question_file.read_text(encoding="utf-8")
        if question_has_non_canonical_paper_target(question_content):
            issues.append(
                f"[ERROR] Question contains non-canonical paper target: {question_file.name}"
            )

    for code_type_file in code_type_files:
        code_type_content = code_type_file.read_text(encoding="utf-8")
        if not has_required_code_type_frontmatter(code_type_content):
            issues.append(
                f"[ERROR] Code type missing required frontmatter: {code_type_file.name}"
            )

    for code_reading_file in code_reading_files:
        code_reading_content = code_reading_file.read_text(encoding="utf-8")
        if not has_required_code_reading_frontmatter(code_reading_content):
            issues.append(
                f"[ERROR] Code reading missing required frontmatter: {code_reading_file.name}"
            )

        if not code_reading_has_code_type_target(code_reading_content):
            issues.append(
                f"[ERROR] Code reading missing code-type link: {code_reading_file.name}"
            )

        if code_reading_has_non_canonical_code_type_target(code_reading_content):
            issues.append(
                "[ERROR] Code reading contains non-canonical code-type target: "
                f"{code_reading_file.name}"
            )

    return issues


def main() -> int:
    issues = collect_issues(repo_root_from(__file__))
    if issues:
        for issue in issues:
            print(issue)
        print(f"Vault check failed with {len(issues)} issue(s).")
        return 1

    print("Vault check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
