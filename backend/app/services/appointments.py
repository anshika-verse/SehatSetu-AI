DEMO_FACILITIES = {
    "demo": True,
    "label": "DEMO",
    "last_checked": None,
    "notice": "These are sample facilities for the interface. They are not live listings and availability is unknown.",
    "facilities": [
        {
            "name": "DEMO Community Health Centre",
            "area": "Sample district",
            "kind": "Community Health Centre",
            "phone": "Not listed — demo record",
        },
        {
            "name": "DEMO District Hospital",
            "area": "Sample district",
            "kind": "District hospital",
            "phone": "Not listed — demo record",
        },
    ],
}


def demo_appointment(facility_name: str, preferred_time: str, consent: bool) -> dict:
    if not consent:
        return {
            "status": "consent_required",
            "confirmed": False,
            "message": "A request is stored only after you explicitly consent. Nothing was saved.",
        }
    return {
        "status": "demo_request_only",
        "confirmed": False,
        "facility_name": facility_name,
        "preferred_time": preferred_time,
        "message": "No booking provider is connected. This is not a confirmed appointment and no hospital was contacted.",
    }
