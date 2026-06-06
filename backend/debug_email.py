import os
import sys
from dotenv import load_dotenv

load_dotenv()

print("=== STEP 1: Check .env ===")
sender = os.getenv("GMAIL_SENDER_EMAIL")
print(f"GMAIL_SENDER_EMAIL: {sender}")

print("\n=== STEP 2: Check token.json ===")
token_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'token.json')
print(f"Looking at: {token_path}")
print(f"Exists: {os.path.exists(token_path)}")

print("\n=== STEP 3: Load credentials ===")
try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    SCOPES = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar.events'
    ]
    creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    print(f"Creds loaded: OK")
    print(f"Valid: {creds.valid}")
    print(f"Expired: {creds.expired}")
    print(f"Has refresh token: {bool(creds.refresh_token)}")

    if not creds.valid and creds.expired and creds.refresh_token:
        print("Refreshing token...")
        creds.refresh(Request())
        print(f"After refresh - Valid: {creds.valid}")
except Exception as e:
    print(f"ERROR loading creds: {e}")
    sys.exit(1)

print("\n=== STEP 4: Build Gmail service ===")
try:
    from googleapiclient.discovery import build
    service = build('gmail', 'v1', credentials=creds, static_discovery=False)
    print("Gmail service: OK")
except Exception as e:
    print(f"ERROR building Gmail service: {e}")
    sys.exit(1)

print("\n=== STEP 5: Send test email ===")
try:
    import base64
    from email.mime.text import MIMEText

    msg = MIMEText("This is a test from MissionControl debug script.", 'plain')
    msg['to'] = sender
    msg['from'] = sender
    msg['subject'] = "MissionControl - Test Email"

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    result = service.users().messages().send(userId='me', body={'raw': raw}).execute()
    print(f"Email sent! Message ID: {result.get('id')}")
except Exception as e:
    print(f"ERROR sending email: {e}")

print("\n=== STEP 6: Build Calendar service ===")
try:
    cal_service = build('calendar', 'v3', credentials=creds, static_discovery=False)
    print("Calendar service: OK")
    
    # Try creating a test event
    from datetime import datetime, timedelta
    start = (datetime.utcnow() + timedelta(days=1)).replace(hour=9, minute=0, second=0).isoformat() + 'Z'
    end   = (datetime.utcnow() + timedelta(days=1)).replace(hour=10, minute=0, second=0).isoformat() + 'Z'
    event = {
        'summary': '[MissionControl] Debug Test Event',
        'start': {'dateTime': start, 'timeZone': 'UTC'},
        'end':   {'dateTime': end,   'timeZone': 'UTC'},
    }
    result = cal_service.events().insert(calendarId='primary', body=event).execute()
    print(f"Calendar event created: {result.get('htmlLink')}")
except Exception as e:
    print(f"ERROR with Calendar: {e}")

print("\n=== DONE ===")
