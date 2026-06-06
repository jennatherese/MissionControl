from dotenv import load_dotenv
load_dotenv()
import sys
sys.path.insert(0, '.')
from agents.scribe_agent import _parse_with_groq

transcript = """Sprint Planning — June 6, 2026
Team: Chen (Backend), Fatima (Frontend), Omar (QA), Lisa (DevOps)

Lisa: The production deployment is blocked — we need the Docker config fixed first.
Chen: I'll fix the Docker config today. Also I need to finish the payment API by Friday.
Fatima: I can't start the checkout UI until the payment API is ready.
Omar: Once checkout UI is done, give me 2 days for testing.
Lisa: I will set up the CI/CD pipeline by Wednesday so we can automate deployments.
Chen: I'll also run the load testing by June 18th."""

result = _parse_with_groq(transcript)
if result:
    print(f"\n✅ Groq extracted {len(result)} tasks:")
    for t in result:
        print(f"  [{t['owner']}] {t['title']} | P{t['priority']} | {t.get('deadline','')[:10]}")
else:
    print("❌ Groq failed")
