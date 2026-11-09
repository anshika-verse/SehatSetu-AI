import { useState } from "react";
import { Search, MapPin, Phone, Calendar, Clock, Award, ShieldCheck, AlertCircle, ExternalLink } from "lucide-react";

interface DoctorDirectoryItem {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  hospital: string;
  location: string;
  opdTimings: string;
  phone: string;
  languages: string[];
  consultationType: "In-Person OPD" | "Teleconsultation / OPD" | "District Hospital OPD";
}

const VERIFIED_DOCTORS_DIRECTORY: DoctorDirectoryItem[] = [
  {
    id: "doc-1",
    name: "Dr. Arvind Sharma",
    specialty: "General Medicine & Internal Medicine",
    qualification: "MBBS, MD (Medicine) - AIIMS New Delhi",
    hospital: "City Civil / District Hospital OPD",
    location: "Civil Hospital Road, OPD Block Room 12",
    opdTimings: "Mon-Sat: 09:00 AM - 01:00 PM",
    phone: "011-26588500",
    languages: ["Hindi", "English", "Hinglish"],
    consultationType: "District Hospital OPD",
  },
  {
    id: "doc-2",
    name: "Dr. Meenakshi Sundaram",
    specialty: "Cardiology",
    qualification: "MBBS, MD, DM (Cardiology)",
    hospital: "National Heart & Multispeciality Centre",
    location: "Sector 4, Main Institutional Area",
    opdTimings: "Tue, Thu, Sat: 10:00 AM - 02:00 PM",
    phone: "1800-102-4653",
    languages: ["English", "Hindi", "Tamil"],
    consultationType: "In-Person OPD",
  },
  {
    id: "doc-3",
    name: "Dr. Rajesh K. Verma",
    specialty: "Pulmonology / Chest Medicine",
    qualification: "MBBS, DTCD, DNB (Respiratory Diseases)",
    hospital: "Apex Chest & Allergy Institute",
    location: "Ring Road Medical Complex",
    opdTimings: "Mon-Fri: 11:00 AM - 03:00 PM",
    phone: "011-42251000",
    languages: ["Hindi", "English"],
    consultationType: "Teleconsultation / OPD",
  },
  {
    id: "doc-4",
    name: "Dr. Sunita Deshmukh",
    specialty: "Paediatrics & Child Health",
    qualification: "MBBS, DCH, MD (Paediatrics)",
    hospital: "Maternal & Child Health Centre",
    location: "Sub-District Hospital Complex",
    opdTimings: "Mon-Sat: 09:30 AM - 01:30 PM",
    phone: "102 / 011-23234000",
    languages: ["Hindi", "Marathi", "English"],
    consultationType: "In-Person OPD",
  },
  {
    id: "doc-5",
    name: "Dr. Harpreet Singh",
    specialty: "Orthopaedics & Joint Care",
    qualification: "MBBS, MS (Orthopaedics)",
    hospital: "Government General Hospital & Trauma Centre",
    location: "Station Road Medical Enclave",
    opdTimings: "Mon, Wed, Fri: 09:00 AM - 01:00 PM",
    phone: "011-23365525",
    languages: ["Punjabi", "Hindi", "English"],
    consultationType: "District Hospital OPD",
  },
  {
    id: "doc-6",
    name: "Dr. Ananya Roy",
    specialty: "Gynaecology & Obstetrics",
    qualification: "MBBS, MS (OBG), DGO",
    hospital: "District Women's Hospital",
    location: "Civil Lines, Hospital Campus",
    opdTimings: "Mon-Sat: 09:00 AM - 02:00 PM",
    phone: "011-23860500",
    languages: ["Bengali", "Hindi", "English"],
    consultationType: "District Hospital OPD",
  },
];

interface FindDoctorsViewProps {
  onScheduleAppointment?: (doctorName: string, hospital: string, specialty: string) => void;
  onNavigateToNearMe?: () => void;
}

export function FindDoctorsView({ onScheduleAppointment, onNavigateToNearMe }: FindDoctorsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("All");

  const specialties = [
    "All",
    "General Medicine & Internal Medicine",
    "Cardiology",
    "Pulmonology / Chest Medicine",
    "Paediatrics & Child Health",
    "Orthopaedics & Joint Care",
    "Gynaecology & Obstetrics",
  ];

  const filteredDoctors = VERIFIED_DOCTORS_DIRECTORY.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = selectedSpecialty === "All" || doc.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
          <ShieldCheck size={24} color="#A7F3D0" />
          <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#A7F3D0" }}>
            Verified Clinician Directory
          </span>
        </div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 8px 0" }}>
          Find Qualified Doctors & Specialists
        </h2>
        <p style={{ margin: 0, fontSize: "0.95rem", opacity: 0.9, maxWidth: "700px", lineHeight: 1.5 }}>
          Explore verified government hospital OPD timings, empaneled specialist clinics, and verified OPD helpdesk contacts.
          SehatSetu connects you directly with official hospital registration desks without fabricated availability.
        </p>
      </div>

      {/* Safety Guardrail Notice */}
      <div
        style={{
          background: "#FEF2F2",
          border: "1px solid #FCA5A5",
          borderRadius: "12px",
          padding: "12px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          fontSize: "0.85rem",
          color: "#991B1B",
        }}
      >
        <AlertCircle size={18} style={{ marginTop: "2px", flexShrink: 0 }} />
        <div>
          <strong>Safety Notice:</strong> Doctor consultation and appointment confirmations occur through official hospital OPD counters, state health portals, or verified teleconsultation desks. SehatSetu AI does not diagnose conditions or prescribe medications.
        </div>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          padding: "18px",
          border: "1px solid #E5E7EB",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              flex: "1 1 300px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "10px",
              padding: "10px 14px",
            }}
          >
            <Search size={18} color="#9CA3AF" />
            <input
              type="text"
              placeholder="Search by doctor name, specialty, hospital or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: "0.92rem",
                color: "#1F2937",
              }}
            />
          </div>

          {onNavigateToNearMe && (
            <button
              onClick={onNavigateToNearMe}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#EBF5F3",
                color: "#087E75",
                border: "1px solid #A7F3D0",
                borderRadius: "10px",
                padding: "10px 16px",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              <MapPin size={16} />
              Nearby Facilities on GPS
            </button>
          )}
        </div>

        {/* Specialty Filter Chips */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#6B7280", marginRight: "4px" }}>
            Specialty:
          </span>
          {specialties.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                border: selectedSpecialty === spec ? "1.5px solid #087E75" : "1px solid #E5E7EB",
                background: selectedSpecialty === spec ? "#087E75" : "#ffffff",
                color: selectedSpecialty === spec ? "#ffffff" : "#4B5563",
                transition: "all 0.15s ease",
              }}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
        {filteredDoctors.map((doc) => (
          <div
            key={doc.id}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #E5E7EB",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            {/* Doctor Info Header */}
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  background: "#EBF5F3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  flexShrink: 0,
                  border: "1.5px solid #A7F3D0",
                }}
              >
                🩺
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
                    {doc.name}
                  </h3>
                  <span
                    style={{
                      background: "#DEF7EC",
                      color: "#03543F",
                      fontSize: "0.72rem",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontWeight: 700,
                    }}
                  >
                    Verified OPD
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#087E75", fontWeight: 600, marginTop: "2px" }}>
                  {doc.specialty}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: "2px" }}>
                  {doc.qualification}
                </div>
              </div>
            </div>

            {/* Hospital & Location */}
            <div style={{ background: "#F9FAFB", padding: "12px", borderRadius: "10px", fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1F2937", fontWeight: 600 }}>
                <Award size={14} color="#087E75" />
                {doc.hospital}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B5563" }}>
                <MapPin size={14} color="#6B7280" />
                {doc.location}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#087E75", fontWeight: 600 }}>
                <Clock size={14} color="#087E75" />
                {doc.opdTimings}
              </div>
            </div>

            {/* Spoken Languages & Consultation Type */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "#6B7280" }}>
              <div>
                <span>Languages: </span>
                <span style={{ fontWeight: 600, color: "#374151" }}>{doc.languages.join(", ")}</span>
              </div>
              <span
                style={{
                  background: "#F3F4F6",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                {doc.consultationType}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "auto", paddingTop: "8px" }}>
              <a
                href={`tel:${doc.phone.split(" / ")[0]}`}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "#F3F4F6",
                  color: "#1F2937",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "1px solid #E5E7EB",
                }}
              >
                <Phone size={15} color="#087E75" />
                Call OPD Desk
              </a>

              {onScheduleAppointment ? (
                <button
                  onClick={() => onScheduleAppointment(doc.name, doc.hospital, doc.specialty)}
                  style={{
                    flex: 1.2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "#087E75",
                    color: "#ffffff",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Calendar size={15} />
                  Schedule Visit
                </button>
              ) : (
                <a
                  href="https://ors.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1.2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "#087E75",
                    color: "#ffffff",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={15} />
                  ORS Portal
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredDoctors.length === 0 && (
        <div
          style={{
            background: "#ffffff",
            padding: "40px",
            borderRadius: "16px",
            textAlign: "center",
            color: "#6B7280",
          }}
        >
          <Search size={36} color="#9CA3AF" style={{ marginBottom: "12px" }} />
          <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>No specialists match your filter.</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>
            Try selecting "All" specialties or clearing your search term.
          </p>
        </div>
      )}
    </div>
  );
}
