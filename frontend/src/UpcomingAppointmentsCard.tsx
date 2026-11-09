import { useState } from "react";
import {
  Calendar,
  Clock,
  PhoneCall,
  Plus,
} from "lucide-react";

export type AppointmentItem = {
  id: string;
  providerName: string;
  speciality: string;
  facilityName: string;
  date: string;
  time: string;
  phone?: string;
  bookingUrl?: string;
  confirmed: boolean;
};

export interface UpcomingAppointmentsProps {
  onFindHealthcare?: () => void;
  onFindDoctors?: () => void;
  onNavigateToNearMe?: () => void;
}

export function UpcomingAppointmentsCard({
  onFindHealthcare,
  onFindDoctors,
  onNavigateToNearMe,
}: UpcomingAppointmentsProps) {
  const [appointments, setAppointments] = useState<AppointmentItem[]>(() => {
    try {
      const raw = localStorage.getItem("sehatsetu_appointments");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [speciality, setSpeciality] = useState("General Medicine");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");

  function saveAppointments(updated: AppointmentItem[]) {
    setAppointments(updated);
    try {
      localStorage.setItem("sehatsetu_appointments", JSON.stringify(updated));
    } catch {}
  }

  function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!providerName.trim() || !facilityName.trim() || !date) return;

    const newApp: AppointmentItem = {
      id: "app-" + Date.now(),
      providerName: providerName.trim(),
      facilityName: facilityName.trim(),
      speciality: speciality.trim(),
      date,
      time: time.trim() || "09:30 AM",
      phone: phone.trim() || undefined,
      confirmed: true,
    };

    saveAppointments([...appointments, newApp]);
    setProviderName("");
    setFacilityName("");
    setDate("");
    setTime("");
    setPhone("");
    setModalOpen(false);
  }

  function handleCancelAppointment(id: string) {
    saveAppointments(appointments.filter((a) => a.id !== id));
  }

  const handleNavigate = onFindDoctors || onFindHealthcare || onNavigateToNearMe;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <Calendar size={18} color="var(--primary)" />
            Upcoming Appointments
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Showing genuine scheduled visits only. No fabricated bookings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{ padding: "4px 10px", fontSize: "0.76rem" }}
          title="Schedule Appointment"
        >
          <Plus size={13} /> Schedule
        </button>
      </div>

      {appointments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 12px", background: "var(--bg-app)", borderRadius: "var(--radius-lg)" }}>
          <Calendar size={28} color="var(--primary)" style={{ opacity: 0.5, marginBottom: 6 }} />
          <strong style={{ display: "block", fontSize: "0.88rem", color: "var(--text-main)" }}>
            No upcoming appointments scheduled
          </strong>
          <p style={{ margin: "4px 0 12px", fontSize: "0.76rem", color: "var(--text-muted)" }}>
            Need to see a doctor or specialist? Find verified facilities near you.
          </p>
          {handleNavigate && (
            <button
              type="button"
              className="primary"
              onClick={handleNavigate}
              style={{ fontSize: "0.78rem", padding: "6px 14px" }}
            >
              Find Healthcare Near Me →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {appointments.map((app) => (
            <div
              key={app.id}
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                    {app.providerName}
                  </strong>
                  <div style={{ fontSize: "0.74rem", color: "var(--primary)", fontWeight: 600 }}>
                    {app.speciality} • {app.facilityName}
                  </div>
                </div>

                <span className="status-badge normal" style={{ fontSize: "0.68rem" }}>
                  Scheduled
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.74rem", color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={12} /> {app.date}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} /> {app.time}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4, paddingTop: 6, borderTop: "1px solid var(--border-light)" }}>
                {app.phone && (
                  <a
                    href={`tel:${app.phone}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.74rem",
                      color: "var(--primary)",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    <PhoneCall size={12} /> Call Desk
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleCancelAppointment(app.id)}
                  style={{
                    marginLeft: "auto",
                    padding: "2px 6px",
                    fontSize: "0.7rem",
                    color: "var(--danger)",
                    border: "none",
                    background: "transparent",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: 420,
              padding: 24,
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Record Scheduled Appointment</h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ padding: "4px 8px", fontSize: "0.85rem", border: "none" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                placeholder="Doctor / Clinician Name (e.g. Dr. Arvind Sharma)"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
              />

              <input
                type="text"
                placeholder="Hospital / Clinic (e.g. District Civil Hospital OPD)"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
              />

              <select
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
              >
                <option value="General Medicine">General Medicine</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Pulmonology">Pulmonology</option>
                <option value="Paediatrics">Paediatrics</option>
                <option value="Orthopaedics">Orthopaedics</option>
                <option value="Gynaecology">Gynaecology</option>
              </select>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
                <input
                  type="text"
                  placeholder="Time (e.g. 10:30 AM)"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
                />
              </div>

              <input
                type="tel"
                placeholder="Hospital Contact Phone (Optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color)" }}
              />

              <button type="submit" className="primary" style={{ padding: "10px" }}>
                Save Appointment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
