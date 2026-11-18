# config.py
# Configuration settings for Examination Management Portal V2.
# Manages database URI, JWT secret, Redis URLs, and admin defaults.

import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "emp-v2-super-secret-key-iitm-mad2-2026")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "emp-v2-jwt-secret-key-iitm-mad2-2026")
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "emp_v2.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Default Admin Credentials
    ADMIN_EMAIL = "admin@emp.com"
    ADMIN_PASSWORD = "Admin@123"
    ADMIN_NAME = "System Administrator"

    # Redis URLs (Broker: DB 0, Celery Results: DB 1, Cache: DB 2)
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/2")
    CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
    CELERY_TIMEZONE = "Asia/Kolkata"

    # Mail configuration (works with local SMTP / MailHog)
    MAIL_HOST = os.environ.get("MAIL_HOST", "localhost")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 1025))
    MAIL_SENDER = "no-reply@emp.com"
