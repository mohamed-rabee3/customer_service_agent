import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.database import SessionLocal
from app.models.agent import Agent

db = SessionLocal()
agents = db.query(Agent).all()
print("--- ALL AGENTS IN DB ---")
for a in agents:
    print(f"ID: {a.id} | Name: {a.name} | Type: {a.agent_type} | SupID: {a.supervisor_id} | Token: {a.telegram_bot_token}")
print("------------------------")
