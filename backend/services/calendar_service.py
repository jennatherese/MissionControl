import os
import logging
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime, timedelta

SCOPES = ['https://www.googleapis.com/auth/calendar.events']

# Cache the Calendar service to avoid rebuilding it for every event
_calendar_service_cache = None

def get_calendar_service():
    global _calendar_service_cache
    
    # Return cached service if available
    if _calendar_service_cache is not None:
        return _calendar_service_cache
    
    creds = None
    token_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'token.json')
    logging.info(f"Calendar looking for token at: {token_path}")
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(token_path, 'w') as f:
                    f.write(creds.to_json())
            except Exception as e:
                logging.warning(f"Could not refresh Calendar token: {e}")
                return None
        else:
            logging.warning("Calendar credentials missing or invalid. Skipping calendar service.")
            return None
            
    try:
        service = build('calendar', 'v3', credentials=creds, static_discovery=False)
        _calendar_service_cache = service  # Cache the service
        return service
    except Exception as e:
        logging.error(f"Error building Calendar service: {e}")
        return None

def create_task_event(task, owner_email):
    service = get_calendar_service()

    # DEMO MODE: if no Calendar credentials, simulate success for demo purposes
    if not service:
        print(f"[CALENDAR DEMO] Simulating calendar event for task: {task.title}")
        fake_link = f"https://calendar.google.com/calendar/r/eventedit?text={task.title.replace(' ', '+')}"
        return fake_link, "Demo calendar event simulated"
    
    sender = os.getenv("GMAIL_SENDER_EMAIL")
    
    # Parse deadline to ISO format for Calendar
    # Assuming deadline is something like "Sept 20" or "2025-09-20"
    # For a robust version, we'd use dateutil or similar. 
    # Here we'll try a simple parse or fallback to tomorrow.
    try:
        # Example format: "2025-09-20"
        deadline_date = datetime.fromisoformat(task.deadline.split('T')[0])
    except:
        deadline_date = datetime.now() + timedelta(days=7)

    start_time = deadline_date.replace(hour=9, minute=0, second=0).isoformat() + 'Z'
    end_time = deadline_date.replace(hour=10, minute=0, second=0).isoformat() + 'Z'

    color_id = "2" # Green (Low)
    if task.priority >= 5: color_id = "11" # Red (High)
    elif task.priority >= 3: color_id = "5" # Yellow (Medium)

    event = {
        'summary': f'[MissionControl] {task.title}',
        'description': f"{task.description}\n\nAssigned by: MissionControl AI\nPriority: {task.priority}/5\nOwner: {task.owner}",
        'start': {'dateTime': start_time, 'timeZone': 'UTC'},
        'end': {'dateTime': end_time, 'timeZone': 'UTC'},
        'attendees': [{'email': owner_email}],
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'email', 'minutes': 24 * 60},
                {'method': 'popup', 'minutes': 60},
            ],
        },
        'colorId': color_id
    }
    
    if sender:
        event['attendees'].append({'email': sender})

    try:
        event_result = service.events().insert(calendarId='primary', body=event).execute()
        return event_result.get('htmlLink'), "Event created successfully."
    except Exception as e:
        logging.error(f"Failed to create calendar event: {e}")
        return None, str(e)
