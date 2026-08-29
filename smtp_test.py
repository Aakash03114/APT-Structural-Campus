import smtplib

SMTP_SERVER = "smtp.zoho.in"
SMTP_PORT = 465

USERNAME = "info@aptcampus.com"
PASSWORD = "PNFBWVjme9Gg"

try:
    server = smtplib.SMTP_SSL(
        SMTP_SERVER,
        SMTP_PORT
    )

    server.login(
        USERNAME,
        PASSWORD
    )

    print("✅ SMTP Login Successful")

    server.quit()

except Exception as e:

    print("❌ SMTP Login Failed")
    print(e)