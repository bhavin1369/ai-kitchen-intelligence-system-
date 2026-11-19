"""
Input validation and safe parsing utilities for Kitchen Intelligence REST APIs.
Provides robust parsing of query parameters and request payloads to avoid 500 crashes.
"""
from datetime import datetime, date
from typing import Any, Optional, List, Tuple

def safe_int(val: Any, default: Optional[int] = None, min_val: Optional[int] = None, max_val: Optional[int] = None) -> Optional[int]:
    """Safely converts a value to integer with optional clamping."""
    if val is None:
        return default
    try:
        res = int(str(val).strip())
        if min_val is not None:
            res = max(min_val, res)
        if max_val is not None:
            res = min(max_val, res)
        return res
    except (ValueError, TypeError):
        return default

def safe_float(val: Any, default: Optional[float] = None, min_val: Optional[float] = None, max_val: Optional[float] = None) -> Optional[float]:
    """Safely converts a value to float with optional clamping."""
    if val is None:
        return default
    try:
        res = float(str(val).strip())
        if min_val is not None:
            res = max(min_val, res)
        if max_val is not None:
            res = min(max_val, res)
        return res
    except (ValueError, TypeError):
        return default

def safe_date(val: Any, default: Optional[date] = None) -> Optional[date]:
    """Safely parses a date string in YYYY-MM-DD or ISO format."""
    if not val:
        return default
    if isinstance(val, date):
        return val
    try:
        val_str = str(val).strip()[:10]
        return datetime.strptime(val_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return default

def validate_positive(val: Any, field_name: str, allow_zero: bool = False) -> float:
    """Validates that a numeric field is strictly positive (or non-negative if allow_zero=True)."""
    parsed = safe_float(val)
    if parsed is None:
        raise ValueError(f"Field '{field_name}' must be a valid number.")
    if allow_zero:
        if parsed < 0:
            raise ValueError(f"Field '{field_name}' cannot be negative.")
    else:
        if parsed <= 0:
            raise ValueError(f"Field '{field_name}' must be strictly greater than zero.")
    return parsed
