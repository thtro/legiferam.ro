"""Catalog of the 12 Legea 24/2000 checks, with their execution kind.

`kind` follows the brief's table (BUILD_BRIEF.md §4.3):
  - "determinist"          — runs instantly, server-side (and optimistically client-side)
  - "semantic"             — runs via OpenRouter (debounced, cached per version)
  - "determinist+semantic" — presence/format is deterministic; quality is semantic
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class CheckMeta:
    id: int
    label: str
    kind: str  # determinist | semantic | determinist+semantic


# Ordered 1..12 as presented to users.
CHECKS: list[CheckMeta] = [
    CheckMeta(1, "Titlu precis și complet", "semantic"),
    CheckMeta(2, "Tip de act selectat", "determinist"),
    CheckMeta(3, "Obiectul legii este definit", "determinist+semantic"),
    CheckMeta(4, "Termenii cheie sunt definiți", "semantic"),
    CheckMeta(5, "O singură idee per articol", "semantic"),
    CheckMeta(6, "Orice obligație are o sancțiune", "semantic"),
    CheckMeta(7, "Sancțiuni proporționale", "semantic"),
    CheckMeta(8, "Intrare în vigoare validă", "determinist"),
    CheckMeta(9, "Fără contradicții interne", "semantic"),
    CheckMeta(10, "Limbaj clar, fără ambiguități", "semantic"),
    CheckMeta(11, "Expunere de motive completă", "determinist+semantic"),
    CheckMeta(12, "Referințe la legi existente verificate", "determinist+semantic"),
]

CHECK_BY_ID: dict[int, CheckMeta] = {c.id: c for c in CHECKS}

# The deterministic engine can produce a verdict for these check ids.
DETERMINISTIC_IDS = {2, 3, 8, 11, 12}

# Core sections required for a complete expunere de motive, per Art. 31 din Legea
# 24/2000 (a–d: motivare + cele trei evaluări de impact). Sections e–g (consultări,
# informare publică, măsuri de implementare) sunt încurajate, dar nu blochează check 11.
MOTIVE_SECTIONS = ["motiv-emitere", "impact-socioeconomic", "impact-financiar", "impact-juridic"]
