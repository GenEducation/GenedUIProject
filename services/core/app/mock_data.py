# Mock Data for GenEd MVP Prototype

MOCK_AGENTS = [
    {
        "id": "1",
        "name": "Math Alchemist",
        "role": "Socratic Guide",
        "icon": "✨",
        "description": "Master of numbers and logic.",
        "color": "emerald",
        "class_id": "math_501",
        "topics": ["Fractions", "Visual Models", "Number Lines"],
        "goals": ["Conceptualize parts-of-a-whole", "Master denominator visualization"]
    },
    {
        "id": "2",
        "name": "History Chronicler",
        "role": "Scholarly Narrator",
        "icon": "📜",
        "description": "Keeper of ancient stories.",
        "color": "navy",
        "class_id": "hist_202",
        "topics": ["Ancient Silk Road", "Trade Routes", "Cultural Exchange"],
        "goals": ["Understand economic interdependence", "Map historical trade flows"]
    }
]

MOCK_STUDENTS = {
    "student_123": {
        "id": "student_123",
        "name": "Arjun",
        "scholarly_rank": "Adept",
        "current_title": "Seeker of Symmetry",
        "global_mastery_pct": 35,
        "class_ids": ["math_501", "hist_202"],
        "breakthroughs": [
            {"id": "b1", "concept": "Visual Fractions", "timestamp": "2026-03-24T10:00:00Z", "agent": "Math Alchemist"},
            {"id": "b2", "concept": "Nomadic Trade", "timestamp": "2026-03-23T14:30:00Z", "agent": "History Chronicler"}
        ]
    }
}

MOCK_SKILL_MATRIX = {
    "math_501": {
        "nodes": [
            {"id": "frac_1", "label": "Parts of a Whole", "status": "mastered", "score": 95},
            {"id": "frac_2", "label": "Denominators", "status": "in_progress", "score": 42},
            {"id": "frac_3", "label": "Improper Fractions", "status": "locked", "score": 0}
        ]
    }
}
