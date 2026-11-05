
export type AssistantGender = "male" | "female";

export interface AssistantAvatarProps {
  gender: AssistantGender;
  isSpeaking?: boolean;
  isListening?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AssistantAvatar({
  gender,
  isSpeaking = false,
  isListening = false,
  size = "md",
  className = "",
}: AssistantAvatarProps) {
  const isMale = gender === "male";
  const name = isMale ? "Dr. Aarav" : "Dr. Priya";
  const role = isMale ? "AI Healthcare Navigator" : "AI Healthcare Navigator";

  // Size dimensions
  const dim = size === "sm" ? 48 : size === "lg" ? 140 : 88;

  return (
    <div
      className={`assistant-avatar-container ${size} ${isSpeaking ? "speaking" : ""} ${isListening ? "listening" : ""} ${className}`}
      style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* Animated Aura Glow when speaking or listening */}
      <div
        className="avatar-glow-ring"
        style={{
          position: "absolute",
          top: -6,
          left: -6,
          right: -6,
          bottom: -6,
          borderRadius: "50%",
          background: isListening
            ? "radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(16, 185, 129, 0) 70%)"
            : isSpeaking
            ? "radial-gradient(circle, rgba(20, 184, 166, 0.5) 0%, rgba(13, 148, 136, 0) 70%)"
            : "transparent",
          animation: isSpeaking || isListening ? "pulseAura 1.8s infinite ease-in-out" : "none",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* 3D SVG Character Canvas */}
      <div
        className="avatar-face-wrapper"
        style={{
          width: dim,
          height: dim,
          borderRadius: "50%",
          overflow: "hidden",
          background: isMale
            ? "linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)"
            : "linear-gradient(135deg, #14b8a6 0%, #059669 100%)",
          boxShadow: isSpeaking
            ? "0 0 25px rgba(20, 184, 166, 0.6), inset 0 -4px 12px rgba(0,0,0,0.2)"
            : "0 8px 24px rgba(13, 148, 136, 0.25), inset 0 -4px 8px rgba(0,0,0,0.15)",
          border: isSpeaking
            ? "3px solid #2dd4bf"
            : isListening
            ? "3px solid #34d399"
            : "3px solid #ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
          zIndex: 2,
        }}
      >
        {isMale ? (
          // Dr. Aarav (Male 3D Avatar SVG)
          <svg
            viewBox="0 0 100 100"
            width={dim}
            height={dim}
            style={{
              animation: isSpeaking ? "avatarHeadBob 1.2s infinite ease-in-out" : "idleSway 4s infinite ease-in-out",
            }}
          >
            {/* Background halo */}
            <circle cx="50" cy="50" r="48" fill="url(#maleBgGradient)" opacity="0.2" />
            <defs>
              <linearGradient id="maleBgGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="maleSkin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>

            {/* Shoulders & White Doctor's Coat */}
            <path d="M 15 95 C 20 72 35 68 50 68 C 65 68 80 72 85 95 Z" fill="#ffffff" />
            {/* Inner scrubs */}
            <polygon points="43,68 57,68 50,85" fill="#0d9488" />
            {/* Coat Lapels */}
            <path d="M 32 68 L 43 85 L 32 95 Z" fill="#f1f5f9" />
            <path d="M 68 68 L 57 85 L 68 95 Z" fill="#f1f5f9" />

            {/* Stethoscope */}
            <path
              d="M 38 72 C 38 85 45 90 50 90 C 55 90 62 85 62 72"
              fill="none"
              stroke="#334155"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="50" cy="92" r="3.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="1" />

            {/* Neck */}
            <rect x="44" y="55" width="12" height="14" rx="3" fill="#fbbf24" />

            {/* Head */}
            <ellipse cx="50" cy="42" rx="19" ry="21" fill="url(#maleSkin)" />

            {/* Hair */}
            <path
              d="M 29 38 C 29 25 36 21 50 21 C 64 21 71 25 71 38 C 71 34 67 27 50 27 C 35 27 29 34 29 38 Z"
              fill="#1e293b"
            />
            <path d="M 31 38 C 30 33 34 24 50 24 C 64 24 69 33 69 38 Q 63 32 50 32 Q 36 32 31 38 Z" fill="#0f172a" />

            {/* Eyes */}
            <circle cx="43" cy="42" r="2.3" fill="#0f172a" />
            <circle cx="57" cy="42" r="2.3" fill="#0f172a" />
            <circle cx="42.2" cy="41.2" r="0.7" fill="#ffffff" />
            <circle cx="56.2" cy="41.2" r="0.7" fill="#ffffff" />

            {/* Eyebrows */}
            <path d="M 39 37 Q 43 35 47 37" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M 53 37 Q 57 35 61 37" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" />

            {/* Friendly Glasses (thin frame) */}
            <rect x="36" y="38" width="13" height="9" rx="3" fill="none" stroke="#0284c7" strokeWidth="1.2" opacity="0.85" />
            <rect x="51" y="38" width="13" height="9" rx="3" fill="none" stroke="#0284c7" strokeWidth="1.2" opacity="0.85" />
            <line x1="49" y1="42" x2="51" y2="42" stroke="#0284c7" strokeWidth="1.2" />

            {/* Smile / Speaking Mouth */}
            {isSpeaking ? (
              <ellipse cx="50" cy="52" rx="4" ry="3" fill="#b91c1c" />
            ) : (
              <path d="M 45 51 Q 50 55 55 51" stroke="#b45309" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            )}
          </svg>
        ) : (
          // Dr. Priya (Female 3D Avatar SVG)
          <svg
            viewBox="0 0 100 100"
            width={dim}
            height={dim}
            style={{
              animation: isSpeaking ? "avatarHeadBob 1.2s infinite ease-in-out" : "idleSway 4s infinite ease-in-out",
            }}
          >
            <circle cx="50" cy="50" r="48" fill="url(#femBgGradient)" opacity="0.2" />
            <defs>
              <linearGradient id="femBgGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ccfbf1" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
              <linearGradient id="femSkin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fed7aa" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
            </defs>

            {/* Hair back layer */}
            <ellipse cx="50" cy="46" rx="23" ry="24" fill="#1e1b4b" />

            {/* Shoulders & White Doctor's Coat */}
            <path d="M 16 95 C 22 72 36 68 50 68 C 64 68 78 72 84 95 Z" fill="#ffffff" />
            {/* Inner Teal Scrubs / Kurti */}
            <polygon points="44,68 56,68 50,83" fill="#0f766e" />
            {/* Coat Trim */}
            <path d="M 33 68 L 44 83 L 34 95 Z" fill="#f8fafc" />
            <path d="M 67 68 L 56 83 L 66 95 Z" fill="#f8fafc" />

            {/* Stethoscope */}
            <path
              d="M 37 72 C 37 84 45 89 50 89 C 55 89 63 84 63 72"
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="50" cy="91" r="3.5" fill="#5eead4" stroke="#042f2e" strokeWidth="1" />

            {/* Neck */}
            <rect x="45" y="55" width="10" height="13" rx="3" fill="#fed7aa" />

            {/* Head */}
            <ellipse cx="50" cy="42" rx="18" ry="20" fill="url(#femSkin)" />

            {/* Hair Front Styling */}
            <path
              d="M 30 38 C 30 22 40 20 50 20 C 60 20 70 22 70 38 C 68 28 58 25 50 25 C 40 25 32 30 30 38 Z"
              fill="#1e1b4b"
            />
            <path d="M 30 38 Q 36 46 36 54" stroke="#1e1b4b" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <path d="M 70 38 Q 64 46 64 54" stroke="#1e1b4b" strokeWidth="4.5" fill="none" strokeLinecap="round" />

            {/* Tiny Bindi */}
            <circle cx="50" cy="35" r="1.1" fill="#be123c" />

            {/* Eyes */}
            <circle cx="43.5" cy="42" r="2.2" fill="#1e1b4b" />
            <circle cx="56.5" cy="42" r="2.2" fill="#1e1b4b" />
            <circle cx="42.8" cy="41.3" r="0.7" fill="#ffffff" />
            <circle cx="55.8" cy="41.3" r="0.7" fill="#ffffff" />

            {/* Eyelashes / Eyebrows */}
            <path d="M 40 37.5 Q 43.5 35.5 47 37.5" stroke="#312e81" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M 53 37.5 Q 56.5 35.5 60 37.5" stroke="#312e81" strokeWidth="1.4" fill="none" strokeLinecap="round" />

            {/* Smile / Speaking Mouth */}
            {isSpeaking ? (
              <ellipse cx="50" cy="51.5" rx="4" ry="2.8" fill="#e11d48" />
            ) : (
              <path d="M 45 51 Q 50 54.5 55 51" stroke="#c2410c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            )}
          </svg>
        )}
      </div>

      {size !== "sm" && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <strong style={{ fontSize: size === "lg" ? "1.05rem" : "0.9rem", color: "#0f172a", display: "block" }}>
            {name}
          </strong>
          <span style={{ fontSize: "0.75rem", color: "#0d9488", fontWeight: 600 }}>{role}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Animated Voice Waveform Bars
 */
export function VoiceWaveform({
  active = false,
  color = "#0d9488",
  bars = 16,
}: {
  active?: boolean;
  color?: string;
  bars?: number;
}) {
  const heights = [
    20, 45, 75, 30, 90, 60, 100, 40, 80, 55, 95, 35, 70, 50, 85, 25, 65, 40,
  ];

  return (
    <div
      className={`voice-waveform ${active ? "active" : "idle"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        height: 38,
        padding: "0 10px",
      }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const baseH = heights[i % heights.length];
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 3.5,
              height: active ? `${baseH}%` : "18%",
              backgroundColor: color,
              borderRadius: 3,
              transition: "height 0.15s ease",
              animation: active ? `waveAnim 1s ease-in-out infinite alternate ${i * 0.08}s` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
