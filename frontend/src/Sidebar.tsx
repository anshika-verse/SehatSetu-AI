import {
  LayoutDashboard,
  Calendar,
  UserCheck,
  MapPin,
  FileText,
  Bot,
  Clock,
  Settings,
  HelpCircle,
  Activity,
  HeartPulse,
} from "lucide-react";
import { AssistantAvatar, type AssistantGender } from "./AssistantAvatar";

export type NavScreen =
  | "home"
  | "appointments"
  | "doctors"
  | "nearby"
  | "reports"
  | "speak"
  | "history"
  | "summary"
  | "resources"
  | "info"
  | "settings"
  | "help";

export interface SidebarProps {
  currentScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  assistantGender: AssistantGender;
  onSwitchAssistant: () => void;
}

export function Sidebar({
  currentScreen,
  onNavigate,
  assistantGender,
  onSwitchAssistant,
}: SidebarProps) {
  const assistantName = assistantGender === "male" ? "Dr. Aarav" : "Dr. Priya";

  const mainNavItems = [
    { id: "home", label: "Dashboard", icon: LayoutDashboard },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "doctors", label: "Find Doctors", icon: UserCheck },
    { id: "nearby", label: "Healthcare Near Me", icon: MapPin },
    { id: "reports", label: "Medical Reports", icon: FileText },
    { id: "speak", label: "AI Assistant", icon: Bot },
    { id: "history", label: "Health History", icon: Clock },
    { id: "summary", label: "Clinical Summary", icon: Activity },
  ] as const;

  const secondaryNavItems = [
    { id: "settings", label: "Settings", icon: Settings },
    { id: "help", label: "Help & Helplines", icon: HelpCircle },
  ] as const;

  return (
    <aside className="sidebar">
      {/* Brand & Logo */}
      <div>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <HeartPulse size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--primary-dark)", letterSpacing: "-0.02em" }}>
              SehatSetu AI
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
              AI Healthcare Navigation
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", padding: "0 14px 8px 14px", letterSpacing: "0.05em" }}>
          Menu
        </div>
        <nav className="sidebar-nav">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-item ${isActive ? "active" : ""}`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={18} color={isActive ? "var(--primary)" : "#64748b"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Secondary & Footer Persona Switcher */}
      <div>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", padding: "12px 14px 6px 14px", letterSpacing: "0.05em" }}>
          Preferences & Support
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-item ${isActive ? "active" : ""}`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={18} color={isActive ? "var(--primary)" : "#64748b"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Assistant Switcher Card */}
        <div
          onClick={onSwitchAssistant}
          style={{
            background: "linear-gradient(135deg, #ebf5f3 0%, #f7f9f7 100%)",
            border: "1px solid var(--primary-border)",
            borderRadius: "var(--radius-lg)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          title="Switch between Dr. Aarav (Male) and Dr. Priya (Female)"
        >
          <AssistantAvatar gender={assistantGender} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)" }}>
              {assistantName}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Tap to switch persona ▾
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
