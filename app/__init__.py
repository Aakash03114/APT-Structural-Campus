from flask import Flask
from flask_mail import Mail
from flask_wtf.csrf import CSRFProtect
from config import Config

from .models import db


# Initialize extensions
mail = Mail()
csrf = CSRFProtect()


def create_app():

    app = Flask(__name__)

    app.config.from_object(Config)

    # Initialize database
    db.init_app(app)

    # Initialize mail
    mail.init_app(app)

    # Initialize CSRF protection
    csrf.init_app(app)

    # Register routes
    from .routes import main
    app.register_blueprint(main)

    # Register error handlers
    from .errors import register_error_handlers
    register_error_handlers(app)

    # Create database tables
    with app.app_context():
        db.create_all()

    return app