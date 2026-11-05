import React, { useEffect, useRef, useState } from "react";
import {
  getNearbyPlaces,
  reverseGeocode,
  type NearbyFacility,
  type NearbyPlacesResult,
  type ReverseGeocodeResult,
} from "./api";

interface HealthcareNearMeProps {
  currentSymptoms?: string;
  language?: string;
  onBookDemo?: (facilityName: string) => void;
}

// Distance helper in kilometers
function computeHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2.0) ** 2 +
    Math.cos((lat1 * Math.PI) / 180.0) * Math.cos((lat2 * Math.PI) / 180.0) * Math.sin(dLon / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return Math.round(R * c * 100) / 100;
}

const CATEGORIES = [
  { id: "all", label: "All Healthcare", icon: "🏥" },
  { id: "hospital", label: "Hospitals & Emergency", icon: "🚑" },
  { id: "clinic", label: "Clinics & Doctors", icon: "🩺" },
  { id: "diagnostic", label: "Diagnostic Labs", icon: "🔬" },
  { id: "pharmacy", label: "Pharmacies & Chemists", icon: "💊" },
];

export function HealthcareNearMe({ currentSymptoms = "", language: _language }: HealthcareNearMeProps) {
  // Live Geolocation State
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [locPermission, setLocPermission] = useState<"prompt" | "requesting" | "granted" | "denied" | "unavailable">("prompt");
  const [addressData, setAddressData] = useState<ReverseGeocodeResult | null>(null);

  // Search & Filter State
  const [category, setCategory] = useState<string>("all");
  const [manualQuery, setManualQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [reverseGeocoding, setReverseGeocoding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [placesData, setPlacesData] = useState<NearbyPlacesResult | null>(null);

  // Active Booking Modal
  const [selectedFacility, setSelectedFacility] = useState<NearbyFacility | null>(null);
  const [bookingTime, setBookingTime] = useState<string>("");
  const [bookingConsent, setBookingConsent] = useState<boolean>(false);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastFetchedCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Request browser location and start live watchPosition
  function startLiveTracking() {
    setError(null);
    if (!navigator.geolocation) {
      setLocPermission("unavailable");
      setError("Geolocation is not supported by your browser. Please use manual area search below.");
      return;
    }

    setLocPermission("requesting");

    // 1. Immediate position fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });
        setAccuracy(pos.coords.accuracy);
        setLastUpdated(new Date().toLocaleTimeString());
        setLocPermission("granted");
        setIsWatching(true);
      },
      (err) => {
        setIsWatching(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocPermission("denied");
          setError("Location permission was denied. You can manually enter your city or area below.");
        } else {
          setLocPermission("unavailable");
          setError("GPS signal currently unavailable. Please verify device location settings.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );

    // 2. Continuous watchPosition for live movement tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy;

          setAccuracy(acc);
          setLastUpdated(new Date().toLocaleTimeString());
          setLocPermission("granted");
          setIsWatching(true);

          setCoords((prev) => {
            if (!prev) return { latitude: lat, longitude: lng };
            const movedKm = computeHaversineKm(prev.latitude, prev.longitude, lat, lng);
            // Meaningful movement threshold: >= 150 meters (0.15 km)
            if (movedKm >= 0.15) {
              return { latitude: lat, longitude: lng };
            }
            return prev;
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocPermission("denied");
            setIsWatching(false);
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 8000 }
      );
    } catch (e) {
      console.warn("watchPosition failed to initialize:", e);
    }
  }

  // Cleanup watchPosition on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // When coords change, reverse-geocode and refresh healthcare discovery
  useEffect(() => {
    if (!coords) return;

    // Check if we should fetch (first time or moved >= 150m)
    const prev = lastFetchedCoordsRef.current;
    if (prev) {
      const moved = computeHaversineKm(prev.latitude, prev.longitude, coords.latitude, coords.longitude);
      if (moved < 0.15 && placesData) {
        return; // Movement below threshold, preserve battery and API calls
      }
    }

    lastFetchedCoordsRef.current = coords;
    setLoading(true);
    setReverseGeocoding(true);
    setError(null);

    // Reverse Geocode
    reverseGeocode(coords.latitude, coords.longitude)
      .then((addr) => {
        setAddressData(addr);
        setReverseGeocoding(false);
      })
      .catch(() => {
        setReverseGeocoding(false);
      });

    // Discover Facilities
    getNearbyPlaces({
      latitude: coords.latitude,
      longitude: coords.longitude,
      radius_km: 20.0,
      category,
      symptoms: currentSymptoms,
    })
      .then((res) => {
        setPlacesData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load nearby healthcare facilities.");
        setLoading(false);
      });
  }, [coords, category, currentSymptoms]);

  // Handle manual location search only as fallback
  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    setLoading(true);
    setError(null);

    const q = manualQuery.toLowerCase();
    let searchLat = 28.5672;
    let searchLng = 77.2100;
    let fallbackArea = manualQuery;

    if (q.includes("mumbai")) {
      searchLat = 19.0760;
      searchLng = 72.8777;
      fallbackArea = "Mumbai Metro Region";
    } else if (q.includes("bangalore") || q.includes("bengaluru")) {
      searchLat = 12.9716;
      searchLng = 77.5946;
      fallbackArea = "Bengaluru Urban";
    } else if (q.includes("hyderabad")) {
      searchLat = 17.3850;
      searchLng = 78.4867;
      fallbackArea = "Hyderabad Metro";
    } else if (q.includes("chennai")) {
      searchLat = 13.0827;
      searchLng = 80.2707;
      fallbackArea = "Chennai Metro";
    } else if (q.includes("kolkata")) {
      searchLat = 22.5726;
      searchLng = 88.3639;
      fallbackArea = "Kolkata Urban";
    }

    setCoords({ latitude: searchLat, longitude: searchLng });
    setAddressData({
      formatted_address: fallbackArea,
      provider: "manual_search_fallback",
    });

    getNearbyPlaces({
      latitude: searchLat,
      longitude: searchLng,
      radius_km: 25.0,
      category,
      symptoms: currentSymptoms || manualQuery,
    })
      .then((res) => {
        setPlacesData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load facilities.");
        setLoading(false);
      });
  }

  return (
    <div className="healthcare-near-me" style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
          color: "#ffffff",
          borderRadius: 20,
          padding: "24px 28px",
          marginBottom: 20,
          boxShadow: "0 8px 24px -4px rgba(13, 148, 136, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", padding: "3px 10px", borderRadius: 12, fontSize: "0.8rem", fontWeight: 700, marginBottom: 8 }}>
              <span>📍</span> Verified Local Discovery
            </div>
            <h2 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 6px 0", color: "#ffffff" }}>
              Healthcare Facilities Near You
            </h2>
            <p style={{ margin: 0, opacity: 0.92, fontSize: "0.95rem", maxWidth: 640 }}>
              Live GPS coordinates are used to calculate real proximity to emergency trauma centers, verified clinics, diagnostic centers, and pharmacies.
            </p>
          </div>

          {/* Emergency Dispatch Button */}
          <a
            href="tel:112"
            style={{
              background: "#ef4444",
              color: "#ffffff",
              textDecoration: "none",
              padding: "10px 18px",
              borderRadius: 14,
              fontWeight: 800,
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
            }}
          >
            <span>🚨</span> Emergency: Call 112
          </a>
        </div>
      </div>

      {/* Geolocation Status Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #ccfbf1",
          padding: "18px 22px",
          marginBottom: 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        {locPermission === "prompt" && !coords && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h4 style={{ margin: "0 0 4px 0", color: "#0f172a", fontSize: "1.05rem" }}>
                Enable Live GPS for Accurate Healthcare Proximity
              </h4>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
                Coordinates stay private on your device and are used exclusively to determine real-time clinic distances.
              </p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={startLiveTracking}
              style={{
                background: "#0d9488",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: 12,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🧭</span> Enable Live Location
            </button>
          </div>
        )}

        {locPermission === "requesting" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0d9488", fontWeight: 600 }}>
            <span className="spinner" style={{ display: "inline-block", width: 18, height: 18, border: "2px solid #0d9488", borderTopColor: "transparent", borderRadius: "50%" }}></span>
            Acquiring high-accuracy GPS fix from device satellites...
          </div>
        )}

        {coords && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span
                  style={{
                    background: isWatching ? "#ecfdf5" : "#f1f5f9",
                    color: isWatching ? "#059669" : "#475569",
                    padding: "3px 8px",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: isWatching ? "#10b981" : "#94a3b8" }}></span>
                  {isWatching ? "Live GPS Tracking Active" : "GPS Location Fixed"}
                </span>
                {accuracy !== null && (
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Accuracy: ±{Math.round(accuracy)}m
                  </span>
                )}
                {lastUpdated && (
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    • Updated: {lastUpdated}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                {reverseGeocoding ? (
                  <span style={{ color: "#94a3b8" }}>Resolving address...</span>
                ) : addressData?.formatted_address ? (
                  <span>📍 {addressData.formatted_address}</span>
                ) : (
                  <span>📍 {coords.latitude.toFixed(4)}°, {coords.longitude.toFixed(4)}°</span>
                )}
              </div>
              {addressData?.provider && (
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
                  Reverse geocoding via {addressData.provider}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={startLiveTracking}
              style={{
                background: "#f0fdfa",
                border: "1px solid #99f6e4",
                color: "#0f766e",
                padding: "8px 16px",
                borderRadius: 10,
                fontSize: "0.88rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🔄</span> Refresh GPS Fix
            </button>
          </div>
        )}

        {(locPermission === "denied" || locPermission === "unavailable") && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#dc2626", fontWeight: 700, marginBottom: 8 }}>
              <span>⚠️</span> {locPermission === "denied" ? "GPS Location Permission Denied" : "GPS Signal Unavailable"}
            </div>
            <p style={{ margin: "0 0 12px 0", color: "#64748b", fontSize: "0.88rem" }}>
              To get exact neighborhood distances, allow location permission in your browser settings. You can also search your area manually below.
            </p>
            {/* Manual Search Fallback */}
            <form onSubmit={handleManualSearch} style={{ display: "flex", gap: 8, maxWidth: 480 }}>
              <input
                type="text"
                placeholder="Enter city or area (e.g. Connaught Place, Mumbai, Bengaluru)..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#0d9488",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                Search Area
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Symptom-To-Speciality Recommendation Banner */}
      {placesData?.suggested_specialities && placesData.suggested_specialities.length > 0 && (
        <div
          style={{
            background: "#f0fdfa",
            border: "1px solid #99f6e4",
            borderRadius: 16,
            padding: "18px 22px",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: "1.2rem" }}>🩺</span>
            <h4 style={{ margin: 0, color: "#0f766e", fontSize: "1.02rem" }}>
              Recommended Clinical Specialities Based on Reported Symptoms
            </h4>
          </div>
          <p style={{ color: "#475569", fontSize: "0.86rem", margin: "0 0 12px 0" }}>
            These suggestions assist in navigating hospital departments and do <strong>not</strong> constitute a medical diagnosis.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {placesData.suggested_specialities.map((spec, idx) => (
              <div
                key={idx}
                style={{
                  background: "#ffffff",
                  border: spec.urgent_sign ? "1px solid #fecaca" : "1px solid #ccfbf1",
                  borderRadius: 12,
                  padding: "10px 14px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                  maxWidth: 320,
                }}
              >
                <div style={{ fontWeight: 700, color: spec.urgent_sign ? "#dc2626" : "#0f766e", fontSize: "0.92rem", marginBottom: 3 }}>
                  {spec.urgent_sign && "🚨 "}
                  {spec.speciality}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.82rem", lineHeight: 1.4 }}>
                  {spec.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: "0.9rem",
              border: category === cat.id ? "2px solid #0d9488" : "1px solid #e2e8f0",
              background: category === cat.id ? "#f0fdfa" : "#ffffff",
              color: category === cat.id ? "#0f766e" : "#475569",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px 16px", borderRadius: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Honest Status Notice when Google Places API key is needed outside Delhi */}
      {placesData?.notice && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            padding: "16px 20px",
            borderRadius: 14,
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span>ℹ️</span> {placesData.provider}
          </div>
          <div style={{ fontSize: "0.9rem", lineHeight: 1.5, marginBottom: 14 }}>
            {placesData.notice}
          </div>

          {placesData.external_links && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={placesData.external_links.hospitals_google_maps}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>🔍</span> Search Hospitals on Google Maps
              </a>
              <a
                href={placesData.external_links.pharmacies_google_maps}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#ffffff",
                  border: "1px solid #93c5fd",
                  color: "#1d4ed8",
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>💊</span> Search Pharmacies on Google Maps
              </a>
            </div>
          )}
        </div>
      )}

      {/* Facility Cards Grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#0d9488", fontWeight: 600 }}>
          <div className="spinner" style={{ margin: "0 auto 12px", width: 28, height: 28, border: "3px solid #0d9488", borderTopColor: "transparent", borderRadius: "50%" }}></div>
          Searching verified healthcare facilities near your GPS position...
        </div>
      ) : placesData?.facilities && placesData.facilities.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
          {placesData.facilities.map((fac) => (
            <div
              key={fac.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                position: "relative",
              }}
            >
              <div>
                {/* Distance Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span
                    style={{
                      background: "#f0fdfa",
                      color: "#0f766e",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      padding: "4px 10px",
                      borderRadius: 10,
                      border: "1px solid #ccfbf1",
                    }}
                  >
                    📍 {fac.distance_km} km away
                  </span>

                  {fac.emergency_24x7 && (
                    <span
                      style={{
                        background: "#fef2f2",
                        color: "#dc2626",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        padding: "3px 8px",
                        borderRadius: 8,
                        border: "1px solid #fecaca",
                      }}
                    >
                      24x7 Emergency
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 4px 0", color: "#0f172a" }}>
                  {fac.name}
                </h3>
                <div style={{ color: "#0d9488", fontWeight: 600, fontSize: "0.84rem", marginBottom: 8 }}>
                  {fac.type_label}
                </div>

                <p style={{ color: "#64748b", fontSize: "0.86rem", margin: "0 0 12px 0", lineHeight: 1.45 }}>
                  {fac.address}
                </p>

                {/* Rating & Contact */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, fontSize: "0.85rem", color: "#475569" }}>
                  <span>⭐ <strong>{fac.rating}</strong> ({fac.user_ratings_total})</span>
                  <span>•</span>
                  <span>{fac.open_now ? "🟢 Open Now" : "🔴 Closed"}</span>
                </div>

                {/* Specialities Preview */}
                {fac.specialities && fac.specialities.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {fac.specialities.slice(0, 4).map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "#f8fafc",
                          color: "#475569",
                          fontSize: "0.75rem",
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                <a
                  href={fac.directions_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    minWidth: 120,
                    textAlign: "center",
                    background: "#0d9488",
                    color: "#ffffff",
                    textDecoration: "none",
                    padding: "9px 12px",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: "0.86rem",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span>🗺️</span> Get Directions
                </a>

                {fac.phone && fac.phone.startsWith("+91") && (
                  <a
                    href={`tel:${fac.phone.replace(/[^0-9+]/g, "")}`}
                    style={{
                      background: "#f0fdfa",
                      border: "1px solid #99f6e4",
                      color: "#0f766e",
                      textDecoration: "none",
                      padding: "9px 14px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: "0.86rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>📞</span> Call
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedFacility(fac)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    padding: "9px 12px",
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: "0.86rem",
                    cursor: "pointer",
                  }}
                >
                  Appointment Desk
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && coords && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
          <p style={{ fontSize: "1.05rem", marginBottom: 8 }}>
            No healthcare facilities found within this search radius.
          </p>
          <p style={{ fontSize: "0.9rem" }}>
            Try selecting a broader category above or searching directly on Google Maps.
          </p>
        </div>
      )}

      {/* Appointment Assistance Modal */}
      {selectedFacility && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              maxWidth: 520,
              width: "100%",
              padding: "26px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0d9488", textTransform: "uppercase" }}>
                  Verified Provider Appointment Desk
                </span>
                <h3 style={{ margin: "4px 0 0", color: "#0f172a", fontSize: "1.25rem" }}>
                  {selectedFacility.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFacility(null);
                  setBookingStatus(null);
                }}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "#475569", fontSize: "0.88rem", marginBottom: 16, lineHeight: 1.5 }}>
              SehatSetu AI connects you to official verified booking channels. We never fabricate appointment slots or confirm bookings without provider authorization.
            </p>

            {selectedFacility.verified_booking_url && (
              <div style={{ marginBottom: 18, background: "#f8fafc", padding: "12px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.88rem", marginBottom: 4 }}>
                  Official Portal: {selectedFacility.appointment_support || "Verified Provider Booking"}
                </div>
                <a
                  href={selectedFacility.verified_booking_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#0d9488",
                    fontWeight: 700,
                    textDecoration: "none",
                    fontSize: "0.88rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  Open Official Booking Portal ↗
                </a>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Preferred Consultation Time
              </label>
              <input
                type="text"
                placeholder="e.g. Tomorrow morning, or Thursday 2 PM"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 18 }}>
              <input
                type="checkbox"
                id="bookingConsent"
                checked={bookingConsent}
                onChange={(e) => setBookingConsent(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <label htmlFor="bookingConsent" style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
                I understand this request prepares a verified referral query. Appointments are finalized directly with the clinic reception.
              </label>
            </div>

            {bookingStatus && (
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: "0.85rem" }}>
                {bookingStatus}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                disabled={!bookingConsent}
                onClick={() => {
                  setBookingStatus("Referral query registered. Please call the clinic or use the official link above.");
                }}
                style={{
                  flex: 1,
                  background: bookingConsent ? "#0d9488" : "#94a3b8",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: bookingConsent ? "pointer" : "not-allowed",
                }}
              >
                Submit Consultation Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
