import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv()


class Config:

    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "apt-structural-campus-dev-key"
    )

    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
    ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH")

    # If ADMIN_PASSWORD is set in .env, automatically compute its secure hash
    if not ADMIN_PASSWORD_HASH and ADMIN_PASSWORD:
        ADMIN_PASSWORD_HASH = generate_password_hash(ADMIN_PASSWORD)
    elif not ADMIN_PASSWORD_HASH:
        # Fallback default dev hash (password: "admin123")
        ADMIN_PASSWORD_HASH = generate_password_hash("admin123")

    SITE_NAME = "APT Structural Campus"

    COMPANY_NAME = "APT Structural Campus"

    DOMAIN = "https://www.aptcampus.com"

    CONTACT_EMAIL = "info@aptcampus.com"

    WTF_CSRF_ENABLED = True

    # ==============================
    # SESSION SECURITY
    # ==============================
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get(
        "SESSION_COOKIE_SECURE", "False"
    ).lower() in ("true", "1", "yes")
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour session duration

    SQLALCHEMY_DATABASE_URI = "sqlite:///aptcampus.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ==============================
    # SEO
    # ==============================

    DEFAULT_DESCRIPTION = (
        "APT Structural Campus provides professional training and hiring solutions "
        "in Detailing, Estimation, Rebar Detailing, Rebar Estimation, and Civil Engineering. "
        "Connecting civil professionals with job vacancies, rebar training, and employer hiring solutions."
    )

    DEFAULT_KEYWORDS = (
        "Detailing, Estimation, Rebar detailing, Rebar estimation, "
        "detailing training, rebar training, estimation training, "
        "Detailing hiring, Estimation hiring, Civil, Civil job vacancy, "
        "APT Structural Campus, structural detailing training, "
        "2D rebar detailing, 3D rebar detailing, concrete estimation"
    )

    # ==============================
    # EMAIL CONFIGURATION - ZOHO
    # ==============================

    MAIL_SERVER = "smtp.zoho.in"
    MAIL_PORT = 465
    MAIL_USE_SSL = True
    MAIL_USE_TLS = False

    MAIL_USERNAME = os.environ.get(
        "MAIL_USERNAME",
        "info@aptcampus.com"
    )

    MAIL_PASSWORD = os.environ.get(
        "MAIL_PASSWORD"
    )

    MAIL_DEFAULT_SENDER = (
        "APT Structural Campus",
        "info@aptcampus.com"
    )

    MAIL_TIMEOUT = 10