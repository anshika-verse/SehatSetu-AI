"""Placeholder for a future language-model provider.

The MVP answers from the curated knowledge files and fixed intake prompts.
No model is called, and no medical fact is generated beyond those files.
"""


def provider_status() -> dict:
    return {
        "configured": False,
        "used_for_medical_answers": False,
        "note": "No LLM provider is configured. Explanations are quoted from the local knowledge files.",
    }
