# extensions.py
# Initializes Flask extensions (SQLAlchemy and JWTManager).
# Kept separate to prevent circular imports across models and blueprints.

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()
