import sqlite3
from pathlib import Path

from app.config import settings


def sqlite_path() -> Path:
    raw = settings.database_url.removeprefix("sqlite:///")
    path = Path(raw)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    return path


def init_db() -> None:
    path = sqlite_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
            ("schema", "app_meta_only_no_health_data"),
        )


def database_status() -> dict:
    path = sqlite_path()
    try:
        init_db()
        with sqlite3.connect(path) as connection:
            row = connection.execute("SELECT value FROM app_meta WHERE key = 'schema'").fetchone()
        return {"ok": True, "stores_health_data": False, "schema": row[0] if row else None}
    except sqlite3.Error as exc:
        return {"ok": False, "stores_health_data": False, "error": type(exc).__name__}
