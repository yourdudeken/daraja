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


def test_pyproject_derives_version_from_single_source() -> None:
    project = _project_table()
    # The version must not be duplicated statically in [project].
    assert "version" not in project
    assert project["dynamic"] == ["version"]

    with PYPROJECT.open("rb") as fh:
        hatch = tomllib.load(fh)["tool"]["hatch"]["version"]
    assert hatch["path"] == "src/daraja/_version.py"


def test_pyproject_uses_canonical_repository_url() -> None:
    text = PYPROJECT.read_text(encoding="utf-8")
    assert f'Homepage = "{CANONICAL_URL}"' in text
    assert f'Repository = "{CANONICAL_URL}"' in text
    assert "yourdudeken/mpesa-sdk" not in text
