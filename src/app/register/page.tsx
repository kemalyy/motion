"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Layers } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const getPasswordStrength = () => {
        if (!password) return { label: "", color: "", width: "0%" };
        if (password.length < 6) return { label: "Zayıf", color: "#ef4444", width: "25%" };
        if (password.length < 10) return { label: "Orta", color: "#f59e0b", width: "50%" };
        if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: "Güçlü", color: "#10b981", width: "100%" };
        return { label: "İyi", color: "#3b82f6", width: "75%" };
    };

    const strength = getPasswordStrength();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor");
            return;
        }

        if (password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Kayıt başarısız");
                return;
            }

            // Auto-login after registration
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                router.push("/login");
            } else {
                router.push("/dashboard");
            }
        } catch {
            setError("Bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="hero-orb hero-orb-1" />
            <div className="hero-orb hero-orb-2" />

            <div className="glass-card auth-card">
                <Link href="/" style={{ display: "flex", justifyContent: "center", marginBottom: 24, textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Layers size={28} />
                        <span className="gradient-text" style={{ fontFamily: "Outfit", fontSize: "1.4rem", fontWeight: 700 }}>
                            LayerMotion
                        </span>
                    </div>
                </Link>

                <h1>Hesap Oluşturun</h1>
                <p className="subtitle">Ücretsiz başlayın, saniyeler içinde animasyon oluşturun</p>

                {error && <div className="error-message">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="name">Ad Soyad</label>
                        <input
                            id="name"
                            type="text"
                            className="input"
                            placeholder="Adınız Soyadınız"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="ornek@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Şifre</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="En az 6 karakter"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {password && (
                            <div style={{ marginTop: 6 }}>
                                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: strength.width, background: strength.color, transition: "all 0.3s ease", borderRadius: 2 }} />
                                </div>
                                <span style={{ fontSize: "0.75rem", color: strength.color, marginTop: 4, display: "block" }}>
                                    {strength.label}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirm-password">Şifre Tekrar</label>
                        <input
                            id="confirm-password"
                            type="password"
                            className="input"
                            placeholder="Şifrenizi tekrar girin"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
                        {loading ? <span className="spinner" /> : "Kayıt Ol"}
                    </button>
                </form>

                <div className="auth-divider">veya</div>

                <button
                    className="btn btn-google"
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                        <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9s.348 1.498.957 2.042l3.007-2.332z" fill="#FBBC05" />
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                    </svg>
                    Google ile Kayıt Ol
                </button>

                <div className="auth-footer">
                    Hesabınız var mı? <Link href="/login">Giriş Yap</Link>
                </div>
            </div>
        </div>
    );
}
