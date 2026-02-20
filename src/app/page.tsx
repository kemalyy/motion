"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Sparkles, Layers, Wand2, Download, Play, Zap, Palette, Bot } from "lucide-react";

export default function LandingPage() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Navbar */}
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <Link href="/" className="navbar-brand">
          <Layers size={28} />
          <span>LayerMotion</span>
        </Link>
        <div className="navbar-links">
          <a href="#features" className="btn btn-ghost">Özellikler</a>
          <a href="#pricing" className="btn btn-ghost">Fiyatlandırma</a>
          {session ? (
            <Link href="/dashboard" className="btn btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary">
                Giriş Yap
              </Link>
              <Link href="/register" className="btn btn-primary">
                Hemen Başla
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="hero-badge">
          <Sparkles size={14} />
          AI Destekli Animasyon
        </div>

        <h1>
          SVG Katmanlarınızı{" "}
          <span className="gradient-text">Canlı Animasyonlara</span>{" "}
          Dönüştürün
        </h1>

        <p>
          AI ve SVG dosyalarınızı yükleyin, AI ile doğal dilde animasyon
          talimatları verin, profesyonel MP4 videolar oluşturun. Hepsi tek bir
          platformda.
        </p>

        <div className="hero-buttons">
          <Link href="/register" className="btn btn-primary btn-large">
            <Sparkles size={20} />
            Ücretsiz Dene
          </Link>
          <a href="#how-it-works" className="btn btn-secondary btn-large">
            <Play size={20} />
            Nasıl Çalışır?
          </a>
        </div>

        <div className="hero-visual">
          <div className="hero-demo">
            <div className="hero-demo-layers">
              <div className="hero-demo-layer" />
              <div className="hero-demo-layer" />
              <div className="hero-demo-layer" />
              <div className="hero-demo-layer" />
              <div className="hero-demo-layer" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="section">
        <div className="section-header">
          <h2>
            Nasıl <span className="gradient-text">Çalışır?</span>
          </h2>
          <p>Üç basit adımda profesyonel animasyonlar oluşturun</p>
        </div>

        <div className="steps-grid">
          <div className="glass-card step-card">
            <div className="step-number">1</div>
            <h3>Dosyanızı Yükleyin</h3>
            <p>
              AI veya SVG dosyanızı sürükle-bırak ile yükleyin. Katmanlar
              otomatik olarak ayrıştırılır.
            </p>
          </div>
          <div className="glass-card step-card">
            <div className="step-number">2</div>
            <h3>AI ile Animasyonlayın</h3>
            <p>
              AI&apos;a doğal dilde talimat verin: &ldquo;Logo soldan gelsin,
              yazı fadeIn olsun&rdquo;. AI sizin için ayarları yapılandırır.
            </p>
          </div>
          <div className="glass-card step-card">
            <div className="step-number">3</div>
            <h3>MP4 Olarak İndirin</h3>
            <p>
              Önizleme ile sonucu kontrol edin, beğendiğinizde tek tıkla MP4
              olarak dışa aktarın.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section">
        <div className="section-header">
          <h2>
            Güçlü <span className="gradient-text">Özellikler</span>
          </h2>
          <p>Profesyonel motion graphics için ihtiyacınız olan her şey</p>
        </div>

        <div className="features-grid">
          <div className="glass-card feature-card">
            <div className="feature-icon">
              <Layers size={24} color="white" />
            </div>
            <h3>Akıllı Katman Ayrıştırma</h3>
            <p>
              SVG dosyanızdaki katmanları otomatik olarak tanır ve her birini
              bağımsız animasyon birimi olarak hazırlar.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">
              <Bot size={24} color="white" />
            </div>
            <h3>AI Asistanı</h3>
            <p>
              Doğal dilde animasyon talimatları verin. AI, katmanlarınız için
              en uygun animasyon ayarlarını önerir.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">
              <Wand2 size={24} color="white" />
            </div>
            <h3>10+ Animasyon Tipi</h3>
            <p>
              Fade, slide, draw, scale, wipe ve daha fazlası. Her katman için
              farklı animasyon ve easing seçenekleri.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">
              <Play size={24} color="white" />
            </div>
            <h3>Canlı Önizleme</h3>
            <p>
              Değişiklikleri anında görün. Render etmeden önce animasyonunuzu
              tarayıcıda canlı olarak izleyin.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">
              <Zap size={24} color="white" />
            </div>
            <h3>Hızlı Render</h3>
            <p>
              Remotion tabanlı render engine ile yüksek kaliteli MP4 videolar.
              1080p ve 4K desteği.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">
              <Palette size={24} color="white" />
            </div>
            <h3>Tam Kontrol</h3>
            <p>
              Süre, gecikme, easing, opacity, scale — her parametreyi ince
              ayar yapın veya AI&apos;a bırakın.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="section">
        <div className="section-header">
          <h2>
            Basit <span className="gradient-text">Fiyatlandırma</span>
          </h2>
          <p>İhtiyacınıza uygun planı seçin</p>
        </div>

        <div className="pricing-grid">
          <div className="glass-card pricing-card">
            <h3>Başlangıç</h3>
            <div className="pricing-price">
              Ücretsiz
            </div>
            <ul className="pricing-features">
              <li>Aylık 5 proje</li>
              <li>720p render kalitesi</li>
              <li>Temel animasyon tipleri</li>
              <li>AI önerileri (günlük 10)</li>
              <li>Topluluk desteği</li>
            </ul>
            <Link href="/register" className="btn btn-secondary" style={{ width: "100%" }}>
              Hemen Başla
            </Link>
          </div>

          <div className="glass-card pricing-card featured">
            <div className="pricing-badge">Popüler</div>
            <h3>Pro</h3>
            <div className="pricing-price">
              ₺299<span>/ay</span>
            </div>
            <ul className="pricing-features">
              <li>Sınırsız proje</li>
              <li>4K render kalitesi</li>
              <li>Tüm animasyon tipleri</li>
              <li>Sınırsız AI önerileri</li>
              <li>Öncelikli render kuyruğu</li>
              <li>Email desteği</li>
            </ul>
            <Link href="/register" className="btn btn-primary" style={{ width: "100%" }}>
              Pro&apos;ya Yükselt
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2026 LayerMotion. Tüm hakları saklıdır.</p>
      </footer>
    </>
  );
}
