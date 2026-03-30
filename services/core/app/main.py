from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import json
import uuid
from datetime import datetime, timedelta

MOCK_AGENTS = [
    {
        "id": "1",
        "name": "Math Alchemist",
        "role": "Socratic Guide",
        "icon": "✨",
        "description": "Master of numbers and logic.",
        "color": "emerald",
        "class_id": "math_501",
        "grade": "5th Standard",
        "subject": "Mathematics",
        "topics": ["Fractions", "Visual Models", "Number Lines", "Ratio Logic"],
        "goals": ["Conceptualize parts-of-a-whole", "Master denominator visualization"],
        "skill_vectors": { "Reading": 45, "Listening": 60, "Calculus": 20, "Logic": 95 }
    },
    {
        "id": "2",
        "name": "History Chronicler",
        "role": "Scholarly Narrator",
        "icon": "📜",
        "description": "Keeper of ancient stories.",
        "color": "navy",
        "class_id": "hist_202",
        "grade": "6th Standard",
        "subject": "History",
        "topics": ["Silk Road", "Ancient Trade", "Cultural Sync"],
        "goals": ["Understand economic interdependence", "Map historical trade flows"],
        "skill_vectors": { "Reading": 90, "Listening": 85, "Retention": 88, "Analysis": 70 }
    },
    {
        "id": "3",
        "name": "Science Explorer",
        "role": "Empiricism Expert",
        "icon": "🔬",
        "description": "Discoverer of natural laws.",
        "color": "amber",
        "class_id": "sci_303",
        "grade": "5th Standard",
        "subject": "Science",
        "topics": ["Cell Biology", "Newtonian Physics", "Light Waves"],
        "goals": ["Understand the scientific method", "Apply conceptual physics"],
        "skill_vectors": { "Reading": 70, "Listening": 75, "Observation": 92, "Hypothesis": 85 }
    }
]

MOCK_STUDENTS = {
    "student_123": {
        "id": "student_123",
        "name": "Arjun",
        "scholarly_rank": "Adept",
        "current_title": "Seeker of Symmetry",
        "global_mastery_pct": 35,
        "last_concept": "Fractions",
        "class_ids": ["math_501", "hist_202"],
        "breakthroughs": [
            {"id": "b1", "concept": "Visual Fractions", "timestamp": "2026-03-24T10:00:00Z", "agent": "Math Alchemist"},
            {"id": "b2", "concept": "Nomadic Trade", "timestamp": "2026-03-23T14:30:00Z", "agent": "History Chronicler"}
        ]
    }
}

MOCK_DISTRICT_STUDENTS = [
    { 
        "id": "1", 
        "name": "Arjun A.", 
        "grade": "5th", 
        "mastery": "85%", 
        "activity": "Active", 
        "enrolled_agents": ["Math Alchemist", "Science Explorer"],
        "learning_status": "Mastering Fraction Denominators",
        "mastered_topics": ["Unit Fractions", "Visual Models", "Number Lines"]
    },
    { 
        "id": "2", 
        "name": "Sarah J.", 
        "grade": "6th", 
        "mastery": "92%", 
        "activity": "Idle", 
        "enrolled_agents": ["History Chronicler"],
        "learning_status": "Complete: Silk Road Interdependence",
        "mastered_topics": ["Silk Road History", "Marco Polo Trails"]
    },
    { 
        "id": "3", 
        "name": "Leo K.", 
        "grade": "5th", 
        "mastery": "45%", 
        "activity": "Struggling", 
        "enrolled_agents": ["Science Explorer"],
        "learning_status": "Starting: Cell Structure",
        "mastered_topics": ["Scientific Method"]
    },
    { 
        "id": "4", 
        "name": "Maya R.", 
        "grade": "4th", "mastery": "78%", "activity": "Active", 
        "enrolled_agents": ["Math Alchemist"],
        "learning_status": "Parts of a Whole",
        "mastered_topics": ["Counting Foundations"]
    },
]

MOCK_SCHEDULE = {
    "student_123": [
        {"id": "s1", "title": "Conceptualizing Fractions", "time": (datetime.now() + timedelta(hours=2)).isoformat(), "agent": "Math Alchemist", "status": "upcoming"},
        {"id": "s2", "title": "Silk Road Interdependence", "time": (datetime.now() - timedelta(days=1)).isoformat(), "agent": "History Chronicler", "status": "completed"}
    ]
}

MOCK_ROADMAP = {
    "student_123": [
        { "id": "1", "title": "Conceptual Fractions", "status": "completed", "time": "Monday, 10:00 AM" },
        { "id": "2", "title": "Visual Synthesis", "status": "completed", "time": "Tuesday, 02:00 PM" },
        { "id": "3", "title": "Decimal Foundations", "status": "unlocked", "time": "Today, 04:00 PM" },
        { "id": "4", "title": "Algebraic Thinking", "status": "locked", "time": "Thursday, 10:00 AM", "requirement": "85% Mastery in Fractions" },
        { "id": "5", "title": "Ratio Logic", "status": "locked", "time": "Friday, 11:30 AM", "requirement": "Prerequisite: Percents" },
    ]
}

MOCK_MASTERY_MAP = {
    "math_501": [
        {"id": "n1", "label": "Unit Fractions", "score": 85, "status": "mastered", "coordinates": {"x": 100, "y": 100}},
        {"id": "n2", "label": "Denominators", "score": 92, "status": "mastered", "coordinates": {"x": 250, "y": 120}},
        {"id": "n3", "label": "Equivalence", "score": 40, "status": "in_progress", "coordinates": {"x": 400, "y": 150}}
    ]
}

MOCK_CHAT_HISTORY = [
    {
        "id": "session_1_h1",
        "timestamp": (datetime.now() - timedelta(days=2)).isoformat(),
        "attributes": { "topic": "Unit Fractions", "effort_score": 95, "breakthroughs": ["Denominator Visualization", "Parts-of-Whole"] }
    }
]

MOCK_PDF_HISTORY = [
    {
        "id": "pdf_1",
        "filename": "english_prose_foundations.pdf",
        "uploaded_at": "2026-03-24T15:00:00Z",
        "status": "processed",
        "agent_name": "Grammar Guardian",
        "topic_name": "Narrative Archetypes",
        "nodes_extracted": 5,
        "skills": {
            "Reading": 85,
            "Listening": 40,
            "Grammar": 92
        },
        "matrix": [ { "label": "Active Voice", "score": 90 }, { "label": "Metaphor", "score": 45 } ]
    }
]

MOCK_ENROLLMENT_REQUESTS = [
    { "id": "req_1", "student_id": "student_123", "student_name": "Arjun", "agent_id": "3", "agent_name": "Science Explorer", "status": "pending", "requested_at": "2026-03-25T11:00:00Z" }
]

MOCK_ASSESSMENTS = {
    "Fractions": [
        {"id": "q1", "question": "What does the denominator in a fraction represent?", "options": ["Number of parts we have", "Total number of equal parts in the whole", "The size of the whole", "The sum of parts"], "answer": "Total number of equal parts in the whole"}
    ]
}

MOCK_TRENDS = [ {"date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"), "mastery": 50 + (i * 2)} for i in range(14) ][::-1]

MOCK_EFFICACY = {
    "summary": {"total_learners": "1,240", "active_breakthroughs": "8,422", "avg_mastery_gain": "+12%"},
    "impact_by_subject": [ 
        {"subject": "Mathematics", "baseline": 65, "gened_score": 88}, 
        {"subject": "Sciences", "baseline": 58, "gened_score": 82},
        {"subject": "History", "baseline": 70, "gened_score": 91},
        {"subject": "English", "baseline": 62, "gened_score": 79}
    ],
    "longitudinal": [
        {"month": "Jan", "mastery": 45, "engagement": 65},
        {"month": "Feb", "mastery": 52, "engagement": 72},
        {"month": "Mar", "mastery": 68, "engagement": 85},
        {"month": "Apr", "mastery": 74, "engagement": 88}
    ]
}

MOCK_SETTINGS = {
    "district_name": "Antigravity Academic District",
    "lead_admin": "Admin User",
    "academic_year": "2025-2026",
    "portal_status": "Active",
    "api_key_masked": "sk-••••••••••••42",
    "automated_ingestion": True,
    "socratic_depth": "High"
}

app = FastAPI(title="GenEd Core Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/agents")
async def get_agents(class_id: Optional[str] = None):
    if class_id: return [a for a in MOCK_AGENTS if a["class_id"] == class_id]
    return MOCK_AGENTS

@app.post("/district/agents")
async def create_agent(agent_data: dict):
    new_agent = {
        "id": str(len(MOCK_AGENTS) + 1),
        "name": agent_data.get("name", "New Agent"),
        "role": "Conceptual Guide",
        "icon": "🎓",
        "description": f"Specialist in {agent_data.get('subject')}",
        "color": "navy",
        "class_id": f"{agent_data.get('subject', 'sub')[:3].lower()}_{uuid.uuid4().hex[:4]}",
        "grade": agent_data.get("grade"),
        "subject": agent_data.get("subject"),
        "topics": [],
        "goals": []
    }
    MOCK_AGENTS.append(new_agent)
    return new_agent

@app.post("/district/ingestion/upload")
async def upload_curriculum(
    agent_id: str = Form(...),
    file: UploadFile = File(...)
):
    # Simulate extraction intelligence
    agent = next((a for a in MOCK_AGENTS if a["id"] == agent_id), MOCK_AGENTS[0])
    
    extraction = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "uploaded_at": datetime.now().isoformat(),
        "status": "processed",
        "agent_name": agent["name"],
        "topic_name": "Conceptual Breakthrough: " + file.filename.split('.')[0].replace('_', ' ').capitalize(),
        "nodes_extracted": 6,
        "skills": {
            "Reading": 75,
            "Listening": 60,
            "Grammar": 88
        },
        "matrix": [
            { "label": "Core Principles", "score": 85 },
            { "label": "Advanced Logic", "score": 40 }
        ]
    }
    MOCK_PDF_HISTORY.insert(0, extraction)
    return extraction

@app.get("/district/students")
async def get_district_students(): return MOCK_DISTRICT_STUDENTS

@app.get("/district/ingestion/history")
async def get_ingestion_history(): return MOCK_PDF_HISTORY

@app.get("/district/trends")
async def get_district_trends(): return MOCK_TRENDS

@app.get("/district/reports/efficacy")
async def get_efficacy_report(): return MOCK_EFFICACY

@app.get("/district/settings")
async def get_district_settings(): return MOCK_SETTINGS

@app.post("/district/settings")
async def update_district_settings(settings: dict):
    MOCK_SETTINGS.update(settings)
    return MOCK_SETTINGS

@app.get("/enrollment/requests")
async def get_enrollment_requests(): return MOCK_ENROLLMENT_REQUESTS

@app.get("/students/{student_id}/profile")
async def get_student_profile(student_id: str):
    return MOCK_STUDENTS.get(student_id, MOCK_STUDENTS["student_123"])

@app.get("/students/{student_id}/schedule")
async def get_student_schedule(student_id: str):
    return MOCK_SCHEDULE.get(student_id, MOCK_SCHEDULE["student_123"])

@app.get("/students/{student_id}/roadmap")
async def get_student_roadmap(student_id: str):
    return MOCK_ROADMAP.get(student_id, MOCK_ROADMAP["student_123"])

@app.get("/students/{student_id}/mastery-map")
async def get_student_mastery_map(student_id: str, class_id: Optional[str] = None):
    return MOCK_MASTERY_MAP.get(class_id, MOCK_MASTERY_MAP["math_501"])

@app.get("/chat/{session_id}/history")
async def get_chat_history(session_id: str):
    return MOCK_CHAT_HISTORY

@app.get("/assessments/{topic}")
async def get_assessment(topic: str):
    return MOCK_ASSESSMENTS.get(topic, MOCK_ASSESSMENTS["Fractions"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
