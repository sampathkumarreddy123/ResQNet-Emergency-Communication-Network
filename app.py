"""Root entry point for WSGI and Render deployments."""
import os
import sys

# Add project root to sys.path
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    app.run(host="0.0.0.0", port=port, debug=debug)
