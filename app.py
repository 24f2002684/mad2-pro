# app.py
# Application factory for the Examination Management Portal V2.
# Configures extensions, registers API blueprints, creates database tables, and seeds the default admin.

from flask import Flask, render_template, jsonify
from werkzeug.security import generate_password_hash
from config import Config
from extensions import db, jwt
from models import User
from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.examiner import examiner_bp

def create_admin(app):
    # Programmatically creates the default admin user if one does not exist
    admin_email = app.config.get("ADMIN_EMAIL", "admin@emp.com")
    existing_admin = User.query.filter_by(email=admin_email).first()
    if not existing_admin:
        admin_user = User(
            email=admin_email,
            password_hash=generate_password_hash(app.config.get("ADMIN_PASSWORD", "Admin@123")),
            full_name=app.config.get("ADMIN_NAME", "System Administrator"),
            role="admin",
            phone="9999999999",
            department="Administration",
            is_active=True
        )
        db.session.add(admin_user)
        db.session.commit()
        print(f"[INIT] Created default admin user: {admin_email}")
    else:
        print(f"[INIT] Admin user already exists: {admin_email}")

def create_app(config_class=Config):
    # Flask application factory
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)

    # Initialize database tables and seed default admin
    with app.app_context():
        db.create_all()
        create_admin(app)

    # Register API blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(examiner_bp)

    # Entry point route for Single Page Application
    @app.route("/")
    def index():
        return render_template("index.html")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
