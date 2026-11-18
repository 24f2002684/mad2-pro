# routes/auth.py
# Authentication routes for the Examination Management Portal V2.
# Handles student self-registration, user login with JWT tokens, and user profile retrieval.

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db
from models import User, ExaminerProfile
from helpers import is_valid_email, is_valid_phone

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    # Registers a new student account
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    department = data.get("department", "").strip()

    if not email or not password or not full_name:
        return jsonify({"message": "Email, password, and full name are required"}), 400
    if not is_valid_email(email):
        return jsonify({"message": "Invalid email format"}), 400
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400
    if phone and not is_valid_phone(phone):
        return jsonify({"message": "Phone number must be exactly 10 digits"}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "An account with this email already exists"}), 409

    new_student = User(
        email=email,
        password_hash=generate_password_hash(password),
        full_name=full_name,
        role="student",
        phone=phone,
        department=department,
        is_active=True
    )
    db.session.add(new_student)
    db.session.commit()

    return jsonify({"message": "Student registered successfully", "user_id": new_student.id}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    # Authenticates users and returns JWT token with role claims
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"message": "Account has been deactivated. Contact administrator."}), 403

    if user.role == "examiner":
        profile = ExaminerProfile.query.filter_by(user_id=user.id).first()
        if profile and profile.status == "Deactivated":
            return jsonify({"message": "Examiner account has been deactivated."}), 403

    # Identity must be str(user.id), role stored as a claim
    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email, "name": user.full_name}
    )

    return jsonify({
        "token": token,
        "role": user.role,
        "name": user.full_name,
        "email": user.email,
        "user_id": user.id
    }), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    # Returns the authenticated user profile
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    profile_data = user.to_dict()
    if user.role == "examiner" and user.examiner_profile:
        profile_data["examiner_profile"] = user.examiner_profile.to_dict()

    return jsonify(profile_data), 200
