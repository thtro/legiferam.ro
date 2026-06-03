"""Legea 24/2000 compliance validator — 12 checks, deterministic + semantic."""
from app.validator.catalog import CHECKS, CheckMeta  # noqa: F401
from app.validator.deterministic import run_deterministic  # noqa: F401
