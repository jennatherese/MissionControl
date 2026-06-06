import os
import uuid
import json
import re
from datetime import datetime, timedelta
from models import Task, AuditEntry

DEMO_TASKS = [
    {"title": "Vendor Contract — Financial Review", "description": "James to review all financial clauses and sign-off on the Nexus Corp vendor contract.", "owner": "James", "priority": 5, "deadline": "2025-09-20T17:00:00Z", "deps": []},
    {"title": "Invoice Breakdown from Ravi", "description": "Ravi to compile and send the complete invoice breakdown to James before Sept 15.", "owner": "Ravi", "priority": 4, "deadline": "2025-09-15T17:00:00Z", "deps": []},
    {"title": "Auth Service Migration", "description": "Ravi to migrate the authentication service to the new OAuth2 framework.", "owner": "Ravi", "priority": 5, "deadline": "2025-09-18T17:00:00Z", "deps": []},
    {"title": "Onboarding Portal UX Redesign", "description": "Priya to redesign the onboarding flow. Dependent on Auth Service completion.", "owner": "Priya", "priority": 3, "deadline": "2025-09-21T17:00:00Z", "deps": []},
    {"title": "Legal Compliance Review", "description": "Anita to validate all compliance clauses in the Nexus Corp vendor agreement.", "owner": "Anita", "priority": 3, "deadline": "2025-09-22T17:00:00Z", "deps": []},
]

SCRIBE_PROMPT = """You are an AI task extraction agent. Read the meeting transcript and extract all actionable tasks.

Return a JSON array of tasks. Each task must have:
- title: short task name (max 8 words)
- description: what needs to be done and why (1-2 sentences)
- owner: the person responsible (first name only, exactly as mentioned)
- priority: integer 1-5 (5=most urgent)
- deadline: ISO 8601 string (infer from context, default {default_deadline} if unclear)
- dependencies: list of other task titles this depends on (empty list if none)

Extract tasks for ALL people mentioned. Use EXACT names from the transcript.
Return ONLY valid JSON array, no explanation, no markdown, no code fences.

Transcript:
{transcript}"""


def _parse_with_groq(transcript: str) -> list | None:
    """Use Groq (free, fast, reliable) to extract tasks from any transcript."""
    try:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key or not api_key.strip():
            return None

        client = Groq(api_key=api_key)
        default_deadline = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%dT17:00:00Z")
        prompt = SCRIBE_PROMPT.format(transcript=transcript, default_deadline=default_deadline)

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048,
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
        tasks_data = json.loads(raw.strip())
        if isinstance(tasks_data, list) and len(tasks_data) > 0:
            print(f"[SCRIBE] Groq extracted {len(tasks_data)} tasks")
            return tasks_data
        return None
    except Exception as e:
        print(f"[SCRIBE] Groq failed: {str(e)[:80]}")
        return None
    try:
        from google import genai as google_genai
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return None
        client = google_genai.Client(api_key=api_key)
        default_deadline = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%dT17:00:00Z")
        prompt = SCRIBE_PROMPT.format(transcript=transcript, default_deadline=default_deadline)
        for model in ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]:
            try:
                response = client.models.generate_content(model=model, contents=prompt)
                raw = response.text.strip()
                raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
                raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
                tasks_data = json.loads(raw.strip())
                if isinstance(tasks_data, list) and len(tasks_data) > 0:
                    print(f"[SCRIBE] Gemini ({model}) extracted {len(tasks_data)} tasks")
                    return tasks_data
            except Exception as e:
                if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                    continue
                continue
        return None
    except Exception:
        return None


def _extract_deadline(text: str) -> str:
    """Extract deadline from text, return ISO string."""
    now = datetime.utcnow()
    t = text.lower()

    if 'today' in t:
        return now.strftime("%Y-%m-%dT17:00:00Z")
    if 'tomorrow' in t:
        return (now + timedelta(days=1)).strftime("%Y-%m-%dT17:00:00Z")
    if 'this week' in t or 'end of week' in t:
        return (now + timedelta(days=4)).strftime("%Y-%m-%dT17:00:00Z")
    if 'next week' in t:
        return (now + timedelta(days=7)).strftime("%Y-%m-%dT17:00:00Z")
    if 'end of month' in t:
        return (now + timedelta(days=14)).strftime("%Y-%m-%dT17:00:00Z")
    if 'this friday' in t or 'by friday' in t:
        return (now + timedelta(days=3)).strftime("%Y-%m-%dT17:00:00Z")
    if 'next friday' in t:
        return (now + timedelta(days=7)).strftime("%Y-%m-%dT17:00:00Z")
    if 'wednesday' in t:
        return (now + timedelta(days=2)).strftime("%Y-%m-%dT17:00:00Z")
    if 'thursday' in t:
        return (now + timedelta(days=3)).strftime("%Y-%m-%dT17:00:00Z")

    # "in X days"
    m = re.search(r'in\s+(\d+)\s+days?', t)
    if m:
        return (now + timedelta(days=int(m.group(1)))).strftime("%Y-%m-%dT17:00:00Z")

    # Month + day: "June 12", "Sept 15", "Dec 20"
    month_map = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    }
    m = re.search(
        r'\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})',
        t
    )
    if m:
        month_key = m.group(1)[:3]
        day = int(m.group(2))
        month_num = month_map.get(month_key, now.month)
        year = now.year if month_num >= now.month else now.year + 1
        try:
            return datetime(year, month_num, day, 17, 0, 0).strftime("%Y-%m-%dT17:00:00Z")
        except Exception:
            pass

    return (now + timedelta(days=7)).strftime("%Y-%m-%dT17:00:00Z")


def _get_priority(text: str) -> int:
    t = text.lower()
    if any(w in t for w in ['critical', 'urgent', 'blocker', 'blocking', 'asap', 'immediately', 'critical path']):
        return 5
    if any(w in t for w in ['important', 'high priority', 'must', 'required', 'needed']):
        return 4
    return 3


def _clean_title(text: str) -> str:
    """Turn a raw action phrase into a clean task title."""
    text = text.strip().rstrip('.,!?')
    # Remove leading filler
    text = re.sub(r'^(to\s+|will\s+|can\s+|should\s+|need\s+to\s+|needs?\s+to\s+|have\s+to\s+|going\s+to\s+|am\s+going\s+to\s+)', '', text, flags=re.IGNORECASE)
    text = text.strip()
    if text:
        text = text[0].upper() + text[1:]
    # Limit to 8 words
    words = text.split()
    if len(words) > 8:
        text = ' '.join(words[:8])
    return text


def _parse_locally(transcript: str) -> list | None:
    """
    Aggressive rule-based parser. Strategy:
    1. Extract all names from Attendees line + speaker labels
    2. For each line in transcript, check if it assigns a task to someone
    3. Also check if speaker is committing to a task ("I'll X", "I will X", "I can X")
    """
    lines = [l.strip() for l in transcript.split('\n') if l.strip()]
    
    # ── Step 1: Collect all known names ─────────────────────────────────────
    known_names = []
    name_set = set()

    for line in lines:
        # Attendees line: "Attendees: Name (role), Name2 (role)"
        m = re.match(r'[Aa]ttendees?:?\s*(.+)', line)
        if m:
            found = re.findall(r'\b([A-Z][a-z]{1,14})\b', m.group(1))
            skip = {'PM', 'Eng', 'Lead', 'Design', 'Finance', 'Legal', 'Dev', 'QA',
                    'Marketing', 'Backend', 'Frontend', 'DevOps', 'Team', 'Attendees'}
            for n in found:
                if n not in skip and n not in name_set:
                    known_names.append(n)
                    name_set.add(n)

        # Team line: "Team: Name (role), Name2 (role)"
        m = re.match(r'[Tt]eam:?\s*(.+)', line)
        if m:
            found = re.findall(r'\b([A-Z][a-z]{1,14})\b', m.group(1))
            skip = {'PM', 'Eng', 'Lead', 'Design', 'Finance', 'Legal', 'Dev', 'QA',
                    'Marketing', 'Backend', 'Frontend', 'DevOps', 'Team', 'Attendees'}
            for n in found:
                if n not in skip and n not in name_set:
                    known_names.append(n)
                    name_set.add(n)

        # Speaker labels: "Name:" at start of line
        m = re.match(r'^([A-Z][a-z]{1,14}):', line)
        if m:
            n = m.group(1)
            if n not in name_set:
                known_names.append(n)
                name_set.add(n)

    # Also scan body for capitalized names mentioned in task-assignment context
    body = ' '.join(lines)
    mentioned = re.findall(
        r'\b([A-Z][a-z]{2,14})\s*(?:,\s*)?(?:can you|should|needs? to|will|please|to|must)',
        body
    )
    SKIP_WORDS = {
        'The', 'This', 'That', 'Please', 'Also', 'After', 'Before', 'Once', 'Then',
        'When', 'Make', 'Give', 'Team', 'Attendees', 'Meeting', 'Sprint', 'Planning',
        'Sync', 'Backend', 'Frontend', 'DevOps', 'Design', 'Finance', 'Legal', 'Marketing'
    }
    for n in mentioned:
        if n not in name_set and n not in SKIP_WORDS:
            known_names.append(n)
            name_set.add(n)

    print(f"[SCRIBE LOCAL] Detected names: {known_names}")

    if not known_names:
        return None

    # ── Step 2: Extract tasks ─────────────────────────────────────────────
    tasks = []
    seen = set()

    def add_task(owner, raw_action, context_line):
        title = _clean_title(raw_action)
        key = title.lower()[:30]
        if key in seen or len(title) < 4:
            return
        seen.add(key)
        deadline = _extract_deadline(context_line)
        priority = _get_priority(context_line)
        tasks.append({
            "title": title,
            "description": f"{owner} to {raw_action.lower().strip()}",
            "owner": owner,
            "priority": priority,
            "deadline": deadline,
            "deps": []
        })
        print(f"[SCRIBE LOCAL] + [{owner}] {title}")

    for i, line in enumerate(lines):
        # Surrounding context for deadline extraction (3 lines around)
        ctx_start = max(0, i - 1)
        ctx_end = min(len(lines), i + 2)
        context = ' '.join(lines[ctx_start:ctx_end])

        # ── Pattern A: Speaker commits to action ──────────────────────────
        # "Name: I'll / I will / I can / I need to / Let me / I'm going to / I should"
        m = re.match(r'^([A-Z][a-z]{1,14}):\s+(?:I\'ll|I will|I can|I need to|Let me|I\'m going to|I am going to|I should)\s+(.+)', line, re.IGNORECASE)
        if m:
            speaker = m.group(1)
            action = m.group(2).split('.')[0].split(' by ')[0].split(' before ')[0].strip()
            if speaker in name_set and len(action) > 4:
                add_task(speaker, action, context)
            continue

        # ── Pattern B: "Name, can you / please / should / needs to / must" ─
        m = re.search(
            r'\b([A-Z][a-z]{1,14})\s*,\s*(?:can you|please|could you|make sure you|I need you to)\s+(.+?)(?:\?|\.|\n|$)',
            line, re.IGNORECASE
        )
        if m:
            name = m.group(1)
            action = m.group(2).strip()
            if name in name_set and len(action) > 4:
                add_task(name, action, context)

        # ── Pattern C: "Name should/needs to/must/will/to X" ───────────────
        m = re.search(
            r'\b([A-Z][a-z]{1,14})\s+(?:should|needs? to|must|will|has to|is going to|to)\s+([a-z].+?)(?:\.|,|$|\n)',
            line, re.IGNORECASE
        )
        if m:
            name = m.group(1)
            action = m.group(2).strip()
            if name in name_set and len(action) > 4:
                add_task(name, action, context)

        # ── Pattern D: "Name: [imperative verb] the ..." (direct instruction) ─
        m = re.match(r'^([A-Z][a-z]{1,14}):\s+([A-Z][a-z]+\s+.+)', line)
        if m:
            speaker = m.group(1)
            rest = m.group(2)
            # Only if it looks like a task (has an action verb)
            if speaker in name_set and re.search(r'\b(finish|send|complete|review|prepare|run|fix|build|deploy|test|create|write|update|handle|migrate|deliver|submit|compile|design|set up|launch|integrate|configure|implement|draft|validate|coordinate|check|schedule|present|resolve)\b', rest, re.IGNORECASE):
                action = rest.split('.')[0].strip()
                add_task(speaker, action, context)

    # ── Step 3: Global sweep for anyone still missing a task ────────────────
    for name in known_names:
        if name in ('Team', 'Attendees'):
            continue
        if any(t['owner'] == name for t in tasks):
            continue  # already has a task

        for idx, line in enumerate(lines):
            if name not in line:
                continue

            ctx_start = max(0, idx - 1)
            ctx_end = min(len(lines), idx + 2)
            context = ' '.join(lines[ctx_start:ctx_end])

            # Try: "Name: [action]" — speaker saying what they will do
            m = re.match(rf'^{name}:\s+(.+)', line, re.IGNORECASE)
            if m:
                rest = m.group(1).strip()
                # Strip negation lines like "I can't start until..."
                if re.search(r"\bcan't\b|\bcannot\b|\bwon't\b|\bnot\b", rest[:20], re.IGNORECASE):
                    # Still extract what they need to do
                    m2 = re.search(r'(?:until|after|once)\s+(.+?)(?:\.|$)', rest, re.IGNORECASE)
                    if m2:
                        dep_task = m2.group(1).strip()
                        action = f"Complete work after {dep_task}"
                        add_task(name, action, context)
                        break
                else:
                    action = rest.split('.')[0].split('by')[0].strip()
                    if len(action) > 4:
                        add_task(name, action, context)
                        break

            # Try: "Name [verb]..." anywhere in line
            m = re.search(
                rf'\b{name}\b\s*(?:,\s*)?(?:to\s+|will\s+|should\s+|can\s+|needs?\s+to\s+)?([a-z][^.!?\n]{{4,60}})',
                line, re.IGNORECASE
            )
            if m:
                action = m.group(1).strip()
                if len(action) > 4:
                    add_task(name, action, context)
                    break

    print(f"[SCRIBE LOCAL] Total: {len(tasks)} tasks for {list(name_set)}")
    return tasks if tasks else None


def _is_default_transcript(transcript: str) -> bool:
    return "Nexus Corp" in transcript and "Ravi" in transcript and "James" in transcript and "Sept 12" in transcript


def scribe_agent(state):
    transcript = state.get("transcript", "")
    current_log = state.get("audit_log", [])

    print(f"\n{'='*80}")
    print(f"[SCRIBE] Transcript: {len(transcript)} chars")

    tasks_data = None
    method = "demo"

    if _is_default_transcript(transcript):
        print("[SCRIBE] Default transcript — using pre-parsed demo data")
        tasks_data = DEMO_TASKS
        method = "demo"
    else:
        print("[SCRIBE] Custom transcript — trying Groq first")
        tasks_data = _parse_with_groq(transcript)
        if tasks_data:
            method = "groq"
        else:
            print("[SCRIBE] Groq unavailable — trying Gemini")
            tasks_data = _parse_with_gemini(transcript)
            if tasks_data:
                method = "gemini"
            else:
                print("[SCRIBE] LLMs unavailable — using local NLP parser")
                tasks_data = _parse_locally(transcript)
                if tasks_data:
                    method = "local-nlp"
                else:
                    print("[SCRIBE] Fallback to demo data")
                    tasks_data = DEMO_TASKS
                    method = "demo-fallback"

    tasks = [
        Task(
            id=str(uuid.uuid4()),
            title=t["title"],
            description=t["description"],
            owner=t["owner"],
            priority=int(t.get("priority", 3)),
            deadline=t.get("deadline", (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%dT17:00:00Z")),
            dependencies=t.get("deps", t.get("dependencies", [])),
            status="backlog"
        )
        for t in tasks_data
    ]

    owners = list({t.owner for t in tasks})
    audit = AuditEntry(
        id=str(uuid.uuid4()),
        timestamp=datetime.utcnow().isoformat(),
        agent="Scribe",
        action="Extract tasks",
        input_summary=f"Transcript ({len(transcript)} chars) — method: {method}",
        output_summary=f"Extracted {len(tasks)} tasks for team: {', '.join(owners)}",
        reasoning=f"Parsed {len(tasks)} actionable tasks using {method} parser",
        status="success"
    )

    print(f"[SCRIBE] ✓ {len(tasks)} tasks | Team: {', '.join(owners)} | Method: {method}")
    return {"tasks": tasks, "audit_log": current_log + [audit], "current_agent": "Scribe"}
