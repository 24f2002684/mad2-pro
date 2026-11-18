# helpers.py
# Helper utilities for EMP-V2.
# Includes role-based access decorator, email dispatcher, input validation, and Redis cache wrappers.

import os
import re
import json
import redis
import smtplib
from email.message import EmailMessage
from functools import wraps
from flask import jsonify, g, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from models import User
from config import Config

def role_required(*allowed_roles):
    # Decorator to restrict endpoints to specified user roles
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role")
            if user_role not in allowed_roles:
                return jsonify({"message": f"Forbidden: Access restricted to {', '.join(allowed_roles)}"}), 403
            
            user_id = int(get_jwt_identity())
            user = User.query.get(user_id)
            if not user or not user.is_active:
                return jsonify({"message": "Account is inactive or blocked"}), 403
            
            g.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def get_current_user():
    # Returns the authenticated User object from Flask g
    return getattr(g, "current_user", None)

def is_valid_email(email):
    # Validates standard email address format
    if not email or not isinstance(email, str):
        return False
    pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(pattern, email.strip()) is not None

def is_valid_phone(phone):
    # Validates a 10-digit numeric phone number
    if not phone or not isinstance(phone, str):
        return False
    cleaned = phone.strip()
    return cleaned.isdigit() and len(cleaned) == 10

def send_email(to, subject, html):
    # Sends an email via SMTP; logs to console and outbox.log if SMTP fails
    mail_host = current_app.config.get("MAIL_HOST", "localhost")
    mail_port = current_app.config.get("MAIL_PORT", 1025)
    mail_sender = current_app.config.get("MAIL_SENDER", "no-reply@emp.com")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = mail_sender
    msg["To"] = to
    msg.set_content(html, subtype="html")

    try:
        with smtplib.SMTP(mail_host, mail_port, timeout=1) as server:
            server.send_message(msg)
            print(f"[EMAIL SENT] To: {to} | Subject: {subject}")
            return True
    except Exception as e:
        # Fallback logging to file and console (failsafe)
        log_entry = f"--- EMAIL LOG ---\nTo: {to}\nSubject: {subject}\nBody:\n{html}\n------------------\n\n"
        print(f"[EMAIL FALLBACK] SMTP offline ({e}). Writing to outbox.log")
        try:
            with open("outbox.log", "a", encoding="utf-8") as f:
                f.write(log_entry)
        except Exception as log_err:
            print(f"[EMAIL ERROR] Could not write to outbox.log: {log_err}")
        return False

# Redis Caching Wrappers (Milestone 8)
_redis_client = None

def get_redis_client():
    # Lazily initializes redis-py connection with short timeouts for graceful degradation
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                Config.REDIS_URL,
                decode_responses=True,
                protocol=2,
                socket_connect_timeout=0.5,
                socket_timeout=0.5
            )
            # Ping to verify active connection
            _redis_client.ping()
        except Exception:
            _redis_client = False
    return _redis_client if _redis_client is not False else None

def cache_get(key):
    # Retrieves cached JSON data; fails gracefully if Redis is offline
    try:
        r = get_redis_client()
        if r:
            val = r.get(key)
            if val is not None:
                return json.loads(val)
    except Exception:
        pass
    return None

def cache_set(key, value, timeout=120):
    # Serializes and caches data in Redis with TTL; fails gracefully if offline
    try:
        r = get_redis_client()
        if r:
            r.setex(key, timeout, json.dumps(value))
            return True
    except Exception:
        pass
    return False

def cache_delete(*keys_or_patterns):
    # Invalidates exact keys or wildcard patterns from Redis cache
    try:
        r = get_redis_client()
        if r:
            for item in keys_or_patterns:
                if "*" in item:
                    matching = r.keys(item)
                    if matching:
                        r.delete(*matching)
                else:
                    r.delete(item)
            return True
    except Exception:
        pass
    return False
