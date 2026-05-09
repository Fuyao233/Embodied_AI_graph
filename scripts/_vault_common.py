from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Union


IDENTIFIER_PATTERN = re.compile(r"^[a-z0-9][a-z0-9.-]*$")
MARKDOWN_LINK_TARGET_PATTERN = re.compile(r"\[[^\]]+\]\(([^)\s]+)(?:\s+[^)]*)?\)")
FRONTMATTER_PATTERN = re.compile(r"\A---\r?\n(.*?)\r?\n---", re.DOTALL)
WINDOWS_ABSOLUTE_PATH_PATTERN = re.compile(r"^[a-zA-Z]:[\\/]")
URI_SCHEME_PATTERN = re.compile(r"^[a-z][a-z0-9+.-]*:")
LOCAL_MARKDOWN_TARGET_PATTERN = re.compile(r"(?i)\.md(?:#.*)?$")


def repo_root_from(script_file: Union[str, Path]) -> Path:
    return Path(script_file).resolve().parent.parent


def normalize_identifier(raw_value: str, label: str) -> str:
    normalized_value = raw_value.strip().lower()
    if not IDENTIFIER_PATTERN.fullmatch(normalized_value):
        raise ValueError(f"{label} must match ^[a-z0-9][a-z0-9.-]*$")
    return normalized_value


def require_non_empty(raw_value: str, label: str) -> str:
    normalized_value = raw_value.strip()
    if not normalized_value:
        raise ValueError(f"{label} must not be empty or whitespace")
    return normalized_value


def render_template(template_path: Path, values: Dict[str, str]) -> str:
    content = template_path.read_text(encoding="utf-8")
    for placeholder, replacement in values.items():
        content = content.replace(placeholder, replacement)
    return content


def write_utf8(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        handle.write(content)


def list_markdown_files(path: Path, pattern: str) -> List[Path]:
    if not path.exists():
        return []
    return sorted(
        (candidate for candidate in path.glob(pattern) if candidate.is_file()),
        key=lambda item: item.name,
    )


def extract_markdown_link_targets(content: str) -> List[str]:
    return [match.group(1) for match in MARKDOWN_LINK_TARGET_PATTERN.finditer(content)]


def is_local_markdown_file_target(target: str) -> bool:
    if target.startswith("#"):
        return False
    if WINDOWS_ABSOLUTE_PATH_PATTERN.match(target):
        return bool(LOCAL_MARKDOWN_TARGET_PATTERN.search(target))
    if URI_SCHEME_PATTERN.match(target):
        return False
    return bool(LOCAL_MARKDOWN_TARGET_PATTERN.search(target))


def has_required_card_frontmatter(content: str) -> bool:
    match = FRONTMATTER_PATTERN.match(content)
    if match is None:
        return False

    frontmatter = match.group(1)
    has_required_type = re.search(r"(?mi)^type:\s*paper-card\s*$", frontmatter) is not None
    has_paper_id = re.search(r"(?mi)^paper_id:\s*\S.*$", frontmatter) is not None
    has_title = re.search(r"(?mi)^title:\s*\S.*$", frontmatter) is not None
    return has_required_type and has_paper_id and has_title
