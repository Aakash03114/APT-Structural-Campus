import requests
from flask import current_app
from flask_mail import Message

from . import mail


def _get_sender():
    return current_app.config.get("MAIL_DEFAULT_SENDER") or current_app.config.get("MAIL_USERNAME")


def _send_email(subject, recipient, body, reply_to=None):
    """
    Unified email dispatcher:
    1. If RESEND_API_KEY is configured, sends via Resend HTTPS API (Port 443 - guaranteed to work on Render & cloud).
    2. Otherwise, falls back to standard Flask-Mail (SMTP).
    """
    resend_api_key = current_app.config.get("RESEND_API_KEY")

    if resend_api_key:
        from_email = current_app.config.get(
            "RESEND_FROM_EMAIL",
            "APT Structural Campus <onboarding@resend.dev>"
        )

        payload = {
            "from": from_email,
            "to": [recipient] if isinstance(recipient, str) else recipient,
            "subject": subject,
            "text": body
        }
        if reply_to:
            payload["reply_to"] = reply_to

        headers = {
            "Authorization": f"Bearer {resend_api_key.strip()}",
            "Content-Type": "application/json"
        }

        response = requests.post(
            "https://api.resend.com/emails",
            json=payload,
            headers=headers,
            timeout=10
        )

        if response.status_code >= 400:
            error_msg = response.text
            try:
                error_msg = response.json()
            except Exception:
                pass
            raise RuntimeError(f"Resend API Error ({response.status_code}): {error_msg}")

        return response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text

    # Fallback to SMTP / Flask-Mail
    msg = Message(
        subject=subject,
        recipients=[recipient] if isinstance(recipient, str) else recipient,
        body=body,
        sender=_get_sender()
    )
    if reply_to:
        msg.reply_to = reply_to

    return mail.send(msg)


def send_admin_registration_email(registration):

    body = f"""New registration received for APT Structural Campus.

Applicant Details
-----------------
Name: {registration.full_name}
Email: {registration.email}
Phone: {registration.phone}
Course: {registration.course}
Qualification: {registration.qualification or 'Not specified'}
Message: {registration.message or 'None'}

Registration Date: {registration.created_at}

Please log in to the admin dashboard to view the registration.
"""

    return _send_email(
        subject="New Registration - APT Structural Campus",
        recipient=current_app.config["CONTACT_EMAIL"],
        body=body,
        reply_to=registration.email
    )


def send_applicant_confirmation_email(registration):

    body = f"""Dear {registration.full_name},

Thank you for registering with APT Structural Campus.

We have successfully received your registration.

Course: {registration.course}

Our team will review your details and contact you regarding course availability, training details and enrollment.

If you have any questions, please contact us at info@aptcampus.com.

Regards,

APT Structural Campus
Professional Structural Engineering Training
https://www.aptcampus.com
"""

    return _send_email(
        subject="Registration Received - APT Structural Campus",
        recipient=registration.email,
        body=body,
        reply_to="info@aptcampus.com"
    )


def send_admin_employer_request_email(employer_request):

    body = f"""New Employer Hiring Request received for APT Structural Campus.

Company Information
-------------------
Company Name: {employer_request.company_name}
Contact Person: {employer_request.contact_person}
Business Email: {employer_request.email}
Phone Number: {employer_request.phone}
Location: {employer_request.location}

Hiring Requirements
-------------------
Position / Role: {employer_request.position}
Employees Required: {employer_request.employees_required}
Experience: {employer_request.experience or 'Not specified'}
Employment Type: {employer_request.employment_type or 'Not specified'}
Skills & Tools: {employer_request.skills or 'None specified'}

Job Description:
{employer_request.job_description or 'None provided'}

Additional Message:
{employer_request.additional_message or 'None'}

Submitted Date: {employer_request.created_at}
Request ID: #{employer_request.id:04d}

Please log in to the admin dashboard to review the complete request.
"""

    return _send_email(
        subject=f"New Employer Hiring Request - {employer_request.company_name}",
        recipient=current_app.config["CONTACT_EMAIL"],
        body=body,
        reply_to=employer_request.email
    )


def send_employer_confirmation_email(employer_request):

    body = f"""Dear {employer_request.contact_person},

Thank you for contacting APT Structural Campus.

We have received your hiring request for "{employer_request.position}" ({employer_request.company_name}) and our team will review your requirements.

Request ID: #{employer_request.id:04d}
Position: {employer_request.position}
Openings: {employer_request.employees_required}
Employment Type: {employer_request.employment_type or 'Standard'}

We will contact you shortly regarding candidate sourcing, technical screening, and next steps.

If you have any urgent questions or require customized hiring solutions, please contact us at info@aptcampus.com.

Regards,

APT Structural Campus
Professional Structural Engineering & Hiring Solutions
https://www.aptcampus.com
"""

    return _send_email(
        subject="Hiring Request Received – APT Structural Campus",
        recipient=employer_request.email,
        body=body,
        reply_to="info@aptcampus.com"
    )


def send_admin_contact_email(name, email, phone, subject, message):

    subject_title = (subject or "General").title()
    body = f"""New Contact Enquiry received for APT Structural Campus.

Enquiry Details
---------------
Full Name: {name}
Email Address: {email}
Phone Number: {phone or 'Not provided'}
Enquiry Type: {subject_title}

Message:
{message}

Regards,
APT Structural Campus Contact Portal
https://www.aptcampus.com
"""

    return _send_email(
        subject=f"New Contact Enquiry ({subject_title}) - {name}",
        recipient=current_app.config["CONTACT_EMAIL"],
        body=body,
        reply_to=email
    )


def send_contact_confirmation_email(name, email, subject, message):

    subject_title = (subject or "General").title()
    body = f"""Dear {name},

Thank you for reaching out to APT Structural Campus.

We have received your enquiry regarding "{subject_title}". Our team will review your message and respond to you as soon as possible.

Your Message Summary:
---------------------
{message}

If you have any urgent queries, feel free to reply directly to info@aptcampus.com.

Best regards,

APT Structural Campus
Professional Structural Engineering & Hiring Solutions
https://www.aptcampus.com
"""

    return _send_email(
        subject="We Received Your Message – APT Structural Campus",
        recipient=email,
        body=body,
        reply_to="info@aptcampus.com"
    )