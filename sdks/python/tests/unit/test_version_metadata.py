"""Version single-sourcing and canonical repository URL."""

from __future__ import annotations

import tomllib
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

import pytest

import daraja
from daraja import _version, cli

REPO_ROOT = Path(__file__).resolve().parents[4]
PYPROJECT = REPO_ROOT / "sdks" / "python" / "pyproject.toml"
CANONICAL_URL = "https://github.com/yourdudeken/daraja"


def _project_table() -> dict[str, object]:
    with PYPROJECT.open("rb") as fh:
        return tomllib.load(fh)["project"]


def test_runtime_version_matches_version_module() -> None:
    assert daraja.__version__ == _version.__version__


def test_cli_version_matches_runtime() -> None:
    assert cli.VERSION == daraja.__version__


def test_runtime_version_matches_installed_distribution() -> None:
    try:
        installed = version("daraja-sdk-py")
    except PackageNotFoundError:
        pytest.skip("daraja-sdk-py is not installed in this environment")
    assert daraja.__version__ == installed


def test_runtime_version_matches_pyproject() -> None:
    # pyproject.toml [project].version is the single source of truth.
    assert daraja.__version__ == _project_table()["version"]


def test_pyproject_holds_the_version_statically() -> None:
    project = _project_table()
    # No dynamic indirection: the version is declared right in [project].
    assert "dynamic" not in project
    assert isinstance(project["version"], str)

    with PYPROJECT.open("rb") as fh:
        parsed = tomllib.load(fh)
    # ...and there is no second version table pointing at another file.
    assert "version" not in parsed.get("tool", {}).get("hatch", {})


def test_version_literal_is_not_duplicated_in_code() -> None:
    # The module resolves the version; it must not hardcode the same string.
    literal = _project_table()["version"]
    source = Path(_version.__file__).read_text(encoding="utf-8")
    assert literal not in source


def test_version_degrades_gracefully_without_a_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(_version, "_SOURCE_PYPROJECT", Path("/nonexistent/pyproject.toml"))
    monkeypatch.setattr(_version, "_DISTRIBUTION", "daraja-not-really-installed")
    assert _version._from_pyproject() is None
    assert _version._from_installed_distribution() is None
    assert _version._resolve_version() == "0.0.0+unknown"


def test_pyproject_uses_canonical_repository_url() -> None:
    text = PYPROJECT.read_text(encoding="utf-8")
    assert f'Homepage = "{CANONICAL_URL}"' in text
    assert f'Repository = "{CANONICAL_URL}"' in text
    assert "yourdudeken/mpesa-sdk" not in text
