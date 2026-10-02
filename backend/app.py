"""Flask Application Entry Point for Emergency Communication Network Simulator."""

import os
import sys

# Ensure root directory is on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

from dotenv import load_dotenv

# Load environment configuration first
load_dotenv()
load_dotenv(os.path.join(CURRENT_DIR, '.env'))

from flask import Flask, jsonify
from flask_cors import CORS

from backend.routes.api import api_bp
from backend.database.mongo import db_manager


def create_app() -> Flask:
    """Application factory for Flask backend."""
    app = Flask(__name__)

    # Enable CORS for React frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(api_bp)

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found", "status_code": 404}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "status_code": 500}), 500

    @app.route("/")
    def index():
        return jsonify({
            "name": "ResQNet — Emergency Communication Network Simulation API",
            "version": "1.0.0",
            "docs": "/api/health",
            "database_connected": db_manager.is_connected
        }), 200

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    print(f"Starting ResQNet Simulation Server on port {port}...")
    # debug=False when run in daemon mode to prevent auto-reloader spawning secondary process
    app.run(host="0.0.0.0", port=port, debug=False)
