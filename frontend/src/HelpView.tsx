import { PhoneCall, ShieldAlert, HeartPulse, HelpCircle, FileText, Compass, Stethoscope, ChevronRight } from "lucide-react";

interface HelpViewProps {
  onNavigate?: (navId: string) => void;
}

export function HelpView({ onNavigate }: HelpViewProps) {
  const emergencyContacts = [
    {
      number: "112",
      title: "All-in-One National Emergency",
      subtitle: "Police, Fire, Ambulance & Disaster Response across India (Toll-Free 24x7)",
      badge: "National Priority",
      color: "#DC2626",
      bgColor: "#FEF2F2",
      borderColor: "#FCA5A5",
    },
    {
      number: "108",
      title: "Emergency Medical & Trauma Ambulance",
      subtitle: "Free emergency ambulance dispatch with trained paramedical staff",
      badge: "Ambulance",
      color: "#EA580C",
      bgColor: "#FFF7ED",
      borderColor: "#FDBA74",
    },
    {
      number: "102",
      title: "Maternal & Child Health Ambulance",
      subtitle: "Free transport for pregnant women, newborns, and post-natal care (Janani Shishu Suraksha)",
      badge: "Maternal Care",
      color: "#087E75",
      bgColor: "#EBF5F3",
      borderColor: "#A7F3D0",
    },
    {
      number: "14416",
      title: "Tele-MANAS Mental Health Helpline",
      subtitle: "24x7 comprehensive, toll-free mental health support across all Indian official languages",
      badge: "Tele-MANAS",
      color: "#2563EB",
      bgColor: "#EFF6FF",
      borderColor: "#BFDBFE",
    },
    {
      number: "1075",
      title: "National Health Portal Helpline",
      subtitle: "Ministry of Health & Family Welfare guidelines, vaccination, and infectious disease queries",
      badge: "MoHFW",
      color: "#4F46E5",
      bgColor: "#EEF2FF",
      borderColor: "#C7D2FE",
    },
    {
      number: "14555",
      title: "Ayushman Bharat PM-JAY Helpdesk",
      subtitle: "Verify family eligibility, empaneled hospital benefits, and Golden Card claims up to ₹5 Lakhs",
      badge: "PM-JAY Scheme",
      color: "#059669",
      bgColor: "#ECFDF5",
      borderColor: "#A7F3D0",
    },
  ];

  const guideTopics = [
    {
      title: "Voice-First Multilingual Intake",
      desc: "Speak naturally in Hindi, Hinglish, English, or regional languages. Gnani Prisma STT transcribes speech with dialect understanding, while Timbre generates natural spoken responses.",
      actionLabel: "Open AI Assistant",
      navId: "speak",
      icon: Stethoscope,
    },
    {
      title: "Medical Report Extraction",
      desc: "Upload lab tests (PDF, JPG, PNG). The system extracts parameter values, compares against stated laboratory reference ranges, and explains them in simple language without diagnostic labels.",
      actionLabel: "Upload Report",
      navId: "reports",
      icon: FileText,
    },
    {
      title: "GPS-Based Healthcare Discovery",
      desc: "Discover verified 24x7 emergency centers, government OPD hospitals, pathology labs, and open pharmacies near your live GPS coordinates with direct contact numbers.",
      actionLabel: "Find Near Me",
      navId: "nearby",
      icon: Compass,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #087E75 0%, #065B54 100%)",
          borderRadius: "18px",
          padding: "24px 28px",
          color: "#ffffff",
          boxShadow: "0 4px 16px rgba(8, 126, 117, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <HeartPulse size={24} color="#A7F3D0" />
          <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#A7F3D0" }}>
            24x7 Support & National Helplines
          </span>
        </div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 8px 0" }}>
          Help Center & Emergency Directory
        </h2>
        <p style={{ margin: 0, fontSize: "0.95rem", opacity: 0.9, maxWidth: "700px", lineHeight: 1.5 }}>
          If you or someone around you is facing a medical emergency, acute chest pain, severe shortness of breath, or serious trauma, call 112 immediately.
        </p>
      </div>

      {/* Emergency Hotlines Grid */}
      <section>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#111827", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldAlert size={20} color="#DC2626" />
          Official Indian National Health & Emergency Helplines
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "14px" }}>
          {emergencyContacts.map((contact) => (
            <div
              key={contact.number}
              style={{
                background: contact.bgColor,
                border: `1.5px solid ${contact.borderColor}`,
                borderRadius: "14px",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span
                  style={{
                    background: contact.color,
                    color: "#ffffff",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "8px",
                    textTransform: "uppercase",
                  }}
                >
                  {contact.badge}
                </span>
                <a
                  href={`tel:${contact.number}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: contact.color,
                    color: "#ffffff",
                    textDecoration: "none",
                    padding: "6px 14px",
                    borderRadius: "10px",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  <PhoneCall size={14} />
                  Call {contact.number}
                </a>
              </div>
              <div>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
                  {contact.title}
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#4B5563", lineHeight: 1.4 }}>
                  {contact.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How SehatSetu AI Works */}
      <section style={{ background: "#ffffff", borderRadius: "16px", padding: "22px", border: "1px solid #E5E7EB" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#111827", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <HelpCircle size={20} color="#087E75" />
          How to Use SehatSetu AI
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {guideTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <div
                key={topic.title}
                style={{
                  background: "#F9FAFB",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid #E5E7EB",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "#EBF5F3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#087E75",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <strong style={{ fontSize: "0.95rem", color: "#111827" }}>{topic.title}</strong>
                </div>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#6B7280", lineHeight: 1.45 }}>
                  {topic.desc}
                </p>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate(topic.navId)}
                    style={{
                      marginTop: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "transparent",
                      border: "none",
                      color: "#087E75",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      padding: "4px 0",
                      alignSelf: "flex-start",
                    }}
                  >
                    {topic.actionLabel} <ChevronRight size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Safety & Clinical Guardrail Pledge */}
      <section
        style={{
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
          borderRadius: "14px",
          padding: "18px 22px",
          fontSize: "0.85rem",
          color: "#166534",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ display: "block", fontSize: "0.95rem", marginBottom: "6px" }}>
          🛡️ SehatSetu AI Clinical Safety Guarantee
        </strong>
        <p style={{ margin: 0 }}>
          SehatSetu AI is designed as a patient preparation, multilingual navigation, and medical record literacy platform. It adheres strictly to clinician-reviewed safety guardrails: it never diagnoses diseases, never prescribes medicines or dosages, never invents hospital or doctor availability, and never stores private audio or sensitive health data on public servers. Always seek direct clinical assessment from a licensed medical practitioner.
        </p>
      </section>
    </div>
  );
}
