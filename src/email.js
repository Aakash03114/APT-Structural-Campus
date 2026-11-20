'use strict';
/**
 * E-mail delivery (port of email_utils.py).
 *   1. If RESEND_API_KEY is set -> Resend HTTPS API.
 *   2. Otherwise -> SMTP (nodemailer; Flask-Mail equivalent).
 * Subjects, recipients, reply-to and bodies are identical to the Flask version.
 */
const nodemailer = require('nodemailer');
const config = require('./config');
const { pyTitle } = require('./lib/pyutil');

const orElse = (v, fallback) => (v ? v : fallback); // Python `x or fallback`

async function sendEmail({ subject, recipient, body, replyTo }) {
  if (config.RESEND_API_KEY) {
    const payload = {
      from: config.RESEND_FROM_EMAIL,
      to: Array.isArray(recipient) ? recipient : [recipient],
      subject,
      text: body,
    };
    if (replyTo) payload.reply_to = replyTo;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    if (response.status >= 400) {
      let errorMsg = text;
      try { errorMsg = JSON.parse(text); } catch (_) { /* keep raw text */ }
      throw new Error(`Resend API Error (${response.status}): ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`);
    }
    try { return JSON.parse(text); } catch (_) { return text; }
  }

  // SMTP fallback
  const [senderName, senderAddress] = config.MAIL_DEFAULT_SENDER;
  const transport = nodemailer.createTransport({
    host: config.MAIL_SERVER,
    port: config.MAIL_PORT,
    secure: config.MAIL_USE_SSL,
    requireTLS: !config.MAIL_USE_SSL && config.MAIL_USE_TLS,
    auth: config.MAIL_USERNAME && config.MAIL_PASSWORD
      ? { user: config.MAIL_USERNAME, pass: config.MAIL_PASSWORD }
      : undefined,
    connectionTimeout: config.MAIL_TIMEOUT * 1000,
    greetingTimeout: config.MAIL_TIMEOUT * 1000,
    socketTimeout: config.MAIL_TIMEOUT * 1000,
  });
  return transport.sendMail({
    from: { name: senderName, address: senderAddress },
    to: recipient,
    subject,
    text: body,
    replyTo: replyTo || undefined,
  });
}

function sendAdminRegistrationEmail(registration) {
  const body = `New registration received for APT Structural Campus.

Applicant Details
-----------------
Name: ${registration.full_name}
Email: ${registration.email}
Phone: ${registration.phone}
Course: ${registration.course}
Qualification: ${orElse(registration.qualification, 'Not specified')}
Message: ${orElse(registration.message, 'None')}

Registration Date: ${registration.created_at}

Please log in to the admin dashboard to view the registration.
`;
  return sendEmail({
    subject: 'New Registration - APT Structural Campus',
    recipient: config.CONTACT_EMAIL,
    body,
    replyTo: registration.email,
  });
}

function sendApplicantConfirmationEmail(registration) {
  const body = `Dear ${registration.full_name},

Thank you for registering with APT Structural Campus.

We have successfully received your registration.

Course: ${registration.course}

Our team will review your details and contact you regarding course availability, training details and enrollment.

If you have any questions, please contact us at info@aptcampus.com.

Regards,

APT Structural Campus
Professional Structural Engineering Training
https://www.aptcampus.com
`;
  return sendEmail({
    subject: 'Registration Received - APT Structural Campus',
    recipient: registration.email,
    body,
    replyTo: 'info@aptcampus.com',
  });
}

function sendAdminEmployerRequestEmail(r) {
  const body = `New Employer Hiring Request received for APT Structural Campus.

Company Information
-------------------
Company Name: ${r.company_name}
Contact Person: ${r.contact_person}
Business Email: ${r.email}
Phone Number: ${r.phone}
Location: ${r.location}

Hiring Requirements
-------------------
Position / Role: ${r.position}
Employees Required: ${r.employees_required}
Experience: ${orElse(r.experience, 'Not specified')}
Employment Type: ${orElse(r.employment_type, 'Not specified')}
Skills & Tools: ${orElse(r.skills, 'None specified')}

Job Description:
${orElse(r.job_description, 'None provided')}

Additional Message:
${orElse(r.additional_message, 'None')}

Submitted Date: ${r.created_at}
Request ID: #${String(r.id).padStart(4, '0')}

Please log in to the admin dashboard to review the complete request.
`;
  return sendEmail({
    subject: `New Employer Hiring Request - ${r.company_name}`,
    recipient: config.CONTACT_EMAIL,
    body,
    replyTo: r.email,
  });
}

function sendEmployerConfirmationEmail(r) {
  const body = `Dear ${r.contact_person},

Thank you for contacting APT Structural Campus.

We have received your hiring request for "${r.position}" (${r.company_name}) and our team will review your requirements.

Request ID: #${String(r.id).padStart(4, '0')}
Position: ${r.position}
Openings: ${r.employees_required}
Employment Type: ${orElse(r.employment_type, 'Standard')}

We will contact you shortly regarding candidate sourcing, technical screening, and next steps.

If you have any urgent questions or require customized hiring solutions, please contact us at info@aptcampus.com.

Regards,

APT Structural Campus
Professional Structural Engineering & Hiring Solutions
https://www.aptcampus.com
`;
  return sendEmail({
    subject: 'Hiring Request Received – APT Structural Campus',
    recipient: r.email,
    body,
    replyTo: 'info@aptcampus.com',
  });
}

function sendAdminContactEmail(name, email, phone, subject, message) {
  const subjectTitle = pyTitle(orElse(subject, 'General'));
  const body = `New Contact Enquiry received for APT Structural Campus.

Enquiry Details
---------------
Full Name: ${name}
Email Address: ${email}
Phone Number: ${orElse(phone, 'Not provided')}
Enquiry Type: ${subjectTitle}

Message:
${message}

Regards,
APT Structural Campus Contact Portal
https://www.aptcampus.com
`;
  return sendEmail({
    subject: `New Contact Enquiry (${subjectTitle}) - ${name}`,
    recipient: config.CONTACT_EMAIL,
    body,
    replyTo: email,
  });
}

function sendContactConfirmationEmail(name, email, subject, message) {
  const subjectTitle = pyTitle(orElse(subject, 'General'));
  const body = `Dear ${name},

Thank you for reaching out to APT Structural Campus.

We have received your enquiry regarding "${subjectTitle}". Our team will review your message and respond to you as soon as possible.

Your Message Summary:
---------------------
${message}

If you have any urgent queries, feel free to reply directly to info@aptcampus.com.

Best regards,

APT Structural Campus
Professional Structural Engineering & Hiring Solutions
https://www.aptcampus.com
`;
  return sendEmail({
    subject: 'We Received Your Message – APT Structural Campus',
    recipient: email,
    body,
    replyTo: 'info@aptcampus.com',
  });
}

module.exports = {
  sendEmail,
  sendAdminRegistrationEmail,
  sendApplicantConfirmationEmail,
  sendAdminEmployerRequestEmail,
  sendEmployerConfirmationEmail,
  sendAdminContactEmail,
  sendContactConfirmationEmail,
};
