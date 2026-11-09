import { useState } from "react";
import { Search, Bell, PhoneCall, Globe } from "lucide-react";
import { AssistantAvatar, type AssistantGender } from "./AssistantAvatar";
import type { Language } from "./types";

export interface TopBarProps {
  userName?: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  assistantGender: AssistantGender;
  onSwitchAssistant: () => void;
  searchQuery?: string;
  onSearch?: (q: string) => void;
  speechMode?: string;
  unreadCount?: number;
}

export function TopBar({
  userName = "Patient",
  language,
  onLanguageChange,
  assistantGender,
  onSwitchAssistant,
  searchQuery = "",
  onSearch,
  speechMode,
  unreadCount = 1,
}: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const assistantName = assistantGender === "male" ? "Dr. Aarav" : "Dr. Priya";

  const notifications = [
    { id: 1, title: "Lab Report Analysis Ready", time: "10 mins ago", unread: true },
    { id: 2, title: "Hospital OPD Timings Verified", time: "Today", unread: true },
    { id: 3, title: "Blood Pressure log updated", time: "Yesterday", unread: false },
  ];

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onSearch && internalQuery.trim()) {
      onSearch(internalQuery.trim());
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)" }}>
              Welcome, {userName}
            </h1>
            <span style={{ fontSize: "1.2rem" }}>👋</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Here is your verified clinical health overview and AI navigation summary
          </p>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="topbar-search">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search symptoms, reports, doctors, medicines or labs..."
            value={internalQuery}
            onChange={(e) => setInternalQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="topbar-right">
        {/* Emergency 112 Direct Action */}
        <a
          href="tel:112"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fca5a5",
            borderRadius: "var(--radius-lg)",
            padding: "7px 14px",
            fontSize: "0.82rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
          title="National Emergency Service"
        >
          <PhoneCall size={14} color="#b91c1c" />
          <span>112 Emergency</span>
        </a>

        {/* Multilingual Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-app)", padding: "5px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <Globe size={15} color="var(--primary)" />
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--text-main)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="auto">✨ Auto-Detect</option>
            <option value="hinglish">Hinglish (हिंग्लिश)</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="en">English (India)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="mr">मराठी (Marathi)</option>
            <option value="gu">ગુજરાતી (Gujarati)</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
          </select>
        </div>

        {/* Speech Mode Badge */}
        <span className={`badge ${speechMode === "live" ? "live" : "demo"}`}>
          {speechMode === "live" ? "⚡ Gnani Voice" : speechMode === "demo" ? "DEMO" : "Checking"}
        </span>

        {/* Notifications Icon with Badge */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              padding: 0,
              background: "var(--bg-app)",
              borderColor: "var(--border-color)",
              position: "relative",
            }}
            title="Notifications"
          >
            <Bell size={17} color="var(--text-main)" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--danger)",
                  color: "#ffffff",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              style={{
                position: "absolute",
                top: 46,
                right: 0,
                width: 290,
                background: "#ffffff",
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                border: "1px solid var(--border-color)",
                padding: "12px",
                zIndex: 50,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid var(--border-light)" }}>
                <strong style={{ fontSize: "0.85rem" }}>Notifications</strong>
                <span style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 600 }}>Mark all read</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      background: n.unread ? "var(--primary-light)" : "transparent",
                      fontSize: "0.78rem",
                    }}
                  >
                    <div style={{ fontWeight: n.unread ? 700 : 500, color: "var(--text-main)" }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {n.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile / Active Assistant Pill */}
        <div
          onClick={onSwitchAssistant}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px 4px 6px",
            background: "var(--primary-light)",
            border: "1px solid var(--primary-border)",
            borderRadius: "20px",
            cursor: "pointer",
          }}
          title="Active Assistant Profile (Click to switch)"
        >
          <AssistantAvatar gender={assistantGender} size="sm" />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary-dark)" }}>
              {assistantName}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              AI Clinician ▾
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
