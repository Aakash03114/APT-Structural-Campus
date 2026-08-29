from functools import wraps
from flask import session, redirect, url_for, flash


def admin_required(view_function):
    """
    Decorator to ensure that the view function is accessible only
    to authenticated administrators with an active session.
    """
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        if not session.get("admin_logged_in"):
            flash("Please log in to access the administrator area.", "warning")
            return redirect(url_for("main.admin_login"))
        return view_function(*args, **kwargs)

    return wrapped_view
