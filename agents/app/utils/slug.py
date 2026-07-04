"""Shared slug helper for topic/subtopic display names."""


def make_slug(name: str) -> str:
    return (
        name.lower()
        .replace(" ", "-")
        .replace("(", "")
        .replace(")", "")
        .replace(",", "")
    )
