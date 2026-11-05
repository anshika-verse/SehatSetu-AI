"""Agents wrapper for direct top-level imports."""

from app.agents.safety_agent import (
    SafetyAgent,
    safety_agent,
    check_emergency,
    guard_response,
)

__all__ = ["SafetyAgent", "safety_agent", "check_emergency", "guard_response"]

