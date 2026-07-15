import aiosqlite
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "suda.db")

db: aiosqlite.Connection = None


async def get_db():
    global db
    if db is None:
        db = await aiosqlite.connect(DB_PATH)
        db.row_factory = aiosqlite.Row
    return db


async def init_db():
    conn = await get_db()
    await conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, email TEXT, phone TEXT, clinic TEXT,
            username TEXT UNIQUE, password TEXT, specialty TEXT
        );
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT
        );
        CREATE TABLE IF NOT EXISTS clinics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT, place TEXT, patients TEXT
        );
        CREATE TABLE IF NOT EXISTS surgeries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT, patients TEXT
        );
    """)
    await conn.commit()
