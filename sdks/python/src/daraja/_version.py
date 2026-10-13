"""Single source of truth for the Python SDK version.

The version here is read by the build backend (see ``[tool.hatch.version]`` in
``pyproject.toml``) and imported at runtime by :mod:`daraja` and the CLI. Do not
duplicate this string anywhere else.
"""

__version__ = "1.0.1"
