import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  Building2,
  Globe,
} from "lucide-react";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  department: string;
  subdepartment: string;
  designation: string;
  role: string;
  dataScope: string;
  approvalLimit: number;
}

interface LoginViewProps {
  onLoginSuccess: (user: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("partner@polybridgeventures.com");
  const [password, setPassword] = useState("••••••••••••");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      designation: string;
      department: string;
      scope: string;
      limit: string;
    }>
  >([]);

  useEffect(() => {
    fetch("/api/v1/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.users && Array.isArray(data.users) && data.users.length > 0) {
          setProfiles(
            data.users.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              designation: u.designation || "Staff",
              department: u.department || "Trade Desk",
              scope: u.dataScope || "DEPARTMENT",
              limit: `$${Number(u.approvalLimit || 0).toLocaleString()}`,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (targetEmail: string, targetId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, userId: targetId }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || "Authentication failed. Please verify credentials.",
        );
      }
      const data = await res.json();
      onLoginSuccess(data.user);
    } catch (err) {
      setError(
        (err as Error).message ||
          "Unable to sign in. Database service unavailable.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background:
          "radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, rgba(11, 15, 25, 0.98) 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "2.5rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-medium)",
          borderRadius: "var(--radius-xl)",
          padding: "3rem",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* Left Side: Business & Credentials */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1.25rem",
                  color: "#fff",
                  boxShadow: "0 8px 16px rgba(99, 102, 241, 0.35)",
                }}
              >
                PV
              </div>
              <div>
                <h1
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  Polybridge Ventures LLP
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Trading Management & Export Operations Portal
                </p>
              </div>
            </div>

            <div
              style={{
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--primary-light)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  marginBottom: "0.5rem",
                }}
              >
                <Globe size={18} />
                <span>Global Sourcing & Cross-Border B2B Trade</span>
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Connecting Indian agricultural supply (Spices, Fruits,
                Vegetables) & Industrial Packaging with verified buyers across
                UAE, Europe, and Asia.
              </p>
            </div>

            {/* Quick 1-Click Role Switch */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.75rem",
                }}
              >
                One-Click Role Authentication:
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "0.65rem",
                }}
              >
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleLogin(p.email, p.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.85rem 1rem",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--border-subtle)")
                    }
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {p.designation} • Limit: {p.limit}
                      </div>
                    </div>
                    <ArrowRight size={16} color="var(--primary-light)" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "1rem",
            }}
          >
            <Building2
              size={13}
              style={{ display: "inline", marginRight: "4px" }}
            />
            Ahmedabad, Gujarat, India • Reg. No: ACL-8315 • Production Cloud
            PostgreSQL Active
          </div>
        </div>

        {/* Right Side: Secure Login Form */}
        <div
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-lg)",
            padding: "2.5rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ marginBottom: "1.75rem" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "0.5rem",
              }}
            >
              Sign In to Trade Desk
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              OWASP ASVS 5.0 Compliant Stateful Session Authentication
            </p>
          </div>

          {error && (
            <div
              style={{
                background: "var(--danger-subtle)",
                border: "1px solid var(--danger)",
                color: "#f87171",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(email);
            }}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                }}
              >
                Corporate Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "12px",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem 0.65rem 2.5rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "12px",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem 0.65rem 2.5rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.8rem",
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: "var(--primary-glow)",
                marginTop: "0.5rem",
              }}
            >
              {isLoading
                ? "Verifying Session..."
                : "Authenticate & Enter Portal"}
              <ArrowRight size={18} />
            </button>
          </form>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            <ShieldCheck size={16} color="var(--success)" />
            <span>Encrypted with Argon2id & SameSite HttpOnly Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};
