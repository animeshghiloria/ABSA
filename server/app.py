"""
server/app.py — OpenEnv multi-mode deployment entry point.
Re-exports the FastAPI app from the ABSA backend.
"""
import sys
import os

# Add the ABSA backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ABSA backend"))

from server import app  # noqa: E402, F401
