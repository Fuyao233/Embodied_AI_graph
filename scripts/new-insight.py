from __future__ import annotations

import argparse
import sys
from datetime import date

from _vault_common import (
    normalize_identifier,
    render_template,
    repo_root_from,
    require_non_empty,
    write_utf8,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create an insight note from the vault template."
    )
    parser.add_argument("--insight-id", required=True)
    parser.add_argument("--claim", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        insight_id = normalize_identifier(args.insight_id, "InsightId")
        claim = require_non_empty(args.claim, "Claim")

        repo_root = repo_root_from(__file__)
        insight_path = repo_root / "insights" / f"{insight_id}.md"
        template_path = repo_root / "templates" / "insight.md"

        if insight_path.exists():
            raise ValueError(f"Insight already exists: {insight_id}")

        created = date.today().isoformat()
        template_values = {
            "{{insight_id}}": insight_id,
            "{{claim}}": claim,
            "{{created}}": created,
            "{{date:YYYY-MM-DD}}": created,
        }

        write_utf8(insight_path, render_template(template_path, template_values))

        print("Created:")
        print(f"  {insight_path}")
        print("Fill in the Evidence section with links, experiments, or work experience.")
        return 0
    except Exception as error:  # pragma: no cover - exercised through CLI tests
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
