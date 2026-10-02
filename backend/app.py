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

from flask import Flask, jsonify, send_from_directory, request, make_response
from flask_cors import CORS

from backend.routes.api import api_bp
from backend.database.mongo import db_manager

DIST_DIR = os.path.join(PARENT_DIR, 'frontend', 'dist')
API_PREFIXES = (
    "api/",
    "network",
    "routing",
    "simulation",
    "congestion",
    "arq",
    "crc",
    "analytics",
    "health",
)


def create_app() -> Flask:
    """Application factory for Flask backend."""
    app = Flask(__name__)

    # Enable CORS universally across all routes, origins, and standard headers
    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    )

    # Register API blueprints on both '/api' and root '' to support all client URL configurations
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(api_bp, name="api_root", url_prefix="")

    @app.before_request
    def handle_preflight():
        """Handle CORS OPTIONS preflight requests explicitly."""
        if request.method == "OPTIONS":
            response = make_response()
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
            response.headers["Access-Control-Max-Age"] = "86400"
            return response, 204

    @app.after_request
    def add_cors_headers(response):
        """Ensure CORS headers are appended to all responses."""
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
        return response

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "status_code": 500}), 500

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path):
        """Serve built frontend SPA or API fallback."""
        if any(path.startswith(prefix) for prefix in API_PREFIXES):
            return jsonify({"error": "Resource not found", "status_code": 404}), 404

        if os.path.exists(DIST_DIR):
            target_file = os.path.join(DIST_DIR, path)
            if path and os.path.exists(target_file):
                return send_from_directory(DIST_DIR, path)
            index_file = os.path.join(DIST_DIR, "index.html")
            if os.path.exists(index_file):
                return send_from_directory(DIST_DIR, "index.html")

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
