/**
 * SVG Infographic Templates & Icon Library
 * 
 * Provides ready-to-use SVG components for the AI prompt:
 * - 60+ icon paths (Lucide-compatible)
 * - Infographic templates (charts, progress bars, stat cards)
 * - Google Font declarations for SVG text
 */

/* ── Icon SVG Paths (24x24 viewBox) ── */

export const SVG_ICONS: Record<string, string> = {
    // Arrows & Navigation
    arrowUp: "M12 19V5m0 0l-7 7m7-7l7 7",
    arrowDown: "M12 5v14m0 0l7-7m-7 7l-7-7",
    arrowRight: "M5 12h14m0 0l-7-7m7 7l-7 7",
    arrowLeft: "M19 12H5m0 0l7 7m-7-7l7-7",
    chevronUp: "M18 15l-6-6-6 6",
    chevronDown: "M6 9l6 6 6-6",
    chevronRight: "M9 18l6-6-6-6",
    trendingUp: "M22 7l-8.5 8.5-5-5L2 17",
    trendingDown: "M22 17l-8.5-8.5-5 5L2 7",

    // Status & Feedback
    check: "M20 6L9 17l-5-5",
    checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
    x: "M18 6L6 18M6 6l12 12",
    xCircle: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4 14l-4-4-4 4m0-8l4 4 4-4",
    alertTriangle: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01",
    info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v2m0 4h.01",

    // People
    user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z",
    thumbsUp: "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3",

    // Business & Finance
    dollarSign: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    barChart: "M12 20V10M18 20V4M6 20v-4",
    pieChart: "M21.21 15.89A10 10 0 1 1 8 2.83 M22 12A10 10 0 0 0 12 2v10z",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    target: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
    award: "M12 15l-3.5 6.25L10 17l-3 1 3.5-6.25M12 15l3.5 6.25L14 17l3 1-3.5-6.25 M12 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14z",

    // Communication
    messageCircle: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
    phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",

    // Technology
    globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    wifi: "M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01",
    cpu: "M4 4h16v16H4z M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3",
    cloud: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z",
    zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3 M22 2l-7.5 7.5",

    // Nature & Weather
    sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42",
    moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",

    // Media
    play: "M5 3l14 9-14 9V3z",
    pause: "M6 4h4v16H6zM14 4h4v16h-4z",
    music: "M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
    camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",

    // Misc
    clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2",
    calendar: "M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
    gift: "M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
    lightbulb: "M9 18h6M10 22h4 M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z",
};

/* ── Infographic SVG Templates ── */

export const INFOGRAPHIC_TEMPLATES = {
    // Donut / Percentage Circle
    donutChart: (percentage: number, color: string, label: string, cx = 540, cy = 960, r = 120) => {
        const circumference = 2 * Math.PI * r;
        const offset = circumference - (percentage / 100) * circumference;
        return `<g>
<circle cx='${cx}' cy='${cy}' r='${r}' fill='none' stroke='#333' stroke-width='16' opacity='0.3'/>
<circle cx='${cx}' cy='${cy}' r='${r}' fill='none' stroke='${color}' stroke-width='16' stroke-dasharray='${circumference}' stroke-dashoffset='${offset}' stroke-linecap='round' transform='rotate(-90 ${cx} ${cy})'/>
<text x='${cx}' y='${cy}' text-anchor='middle' dominant-baseline='central' font-family='Inter, Arial, sans-serif' font-size='48' font-weight='bold' fill='white'>%${percentage}</text>
<text x='${cx}' y='${cy + 50}' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='20' fill='#aaa'>${label}</text>
</g>`;
    },

    // Horizontal Progress Bar
    progressBar: (percentage: number, color: string, label: string, x = 200, y = 900, w = 680, h = 24) => {
        const fillW = (percentage / 100) * w;
        return `<g>
<text x='${x}' y='${y - 16}' font-family='Inter, Arial, sans-serif' font-size='22' fill='white'>${label}</text>
<text x='${x + w}' y='${y - 16}' text-anchor='end' font-family='Inter, Arial, sans-serif' font-size='22' font-weight='bold' fill='${color}'>%${percentage}</text>
<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='${h / 2}' fill='#333' opacity='0.4'/>
<rect x='${x}' y='${y}' width='${fillW}' height='${h}' rx='${h / 2}' fill='${color}'/>
</g>`;
    },

    // Big Stat Number
    statNumber: (value: string, label: string, color: string, x = 540, y = 960) => {
        return `<g>
<text x='${x}' y='${y}' text-anchor='middle' dominant-baseline='central' font-family='Inter, Arial, sans-serif' font-size='96' font-weight='900' fill='${color}'>${value}</text>
<text x='${x}' y='${y + 60}' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='24' fill='#bbb'>${label}</text>
</g>`;
    },

    // Vertical Bar Chart (3-5 bars)
    barChart: (data: { label: string; value: number; color: string }[], x = 200, y = 700, w = 680, h = 400) => {
        const barCount = data.length;
        const gap = 20;
        const barW = (w - gap * (barCount - 1)) / barCount;
        const maxVal = Math.max(...data.map((d) => d.value));

        const bars = data
            .map((d, i) => {
                const barH = (d.value / maxVal) * (h - 60);
                const bx = x + i * (barW + gap);
                const by = y + h - barH;
                return `<rect x='${bx}' y='${by}' width='${barW}' height='${barH}' rx='8' fill='${d.color}'/>
<text x='${bx + barW / 2}' y='${by - 12}' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='20' font-weight='bold' fill='white'>${d.value}</text>
<text x='${bx + barW / 2}' y='${y + h + 28}' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='16' fill='#999'>${d.label}</text>`;
            })
            .join("\n");

        return `<g>${bars}</g>`;
    },

    // Icon with label
    iconWithLabel: (iconPath: string, label: string, color: string, x = 540, y = 960, iconSize = 48) => {
        const scale = iconSize / 24;
        return `<g>
<g transform='translate(${x - iconSize / 2} ${y - iconSize / 2}) scale(${scale})'>
<path d='${iconPath}' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
</g>
<text x='${x}' y='${y + iconSize / 2 + 28}' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='20' fill='white'>${label}</text>
</g>`;
    },
};

/* ── Google Fonts for SVG ── */

export const SVG_FONT_FACES = `
<defs>
<style type='text/css'>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&amp;family=Outfit:wght@400;600;700;800&amp;family=Poppins:wght@400;600;700;800;900&amp;family=Montserrat:wght@400;600;700;800;900&amp;display=swap');
</style>
</defs>`;

/* ── Available Font Names for Prompt ── */

export const AVAILABLE_FONTS = [
    "Inter",
    "Outfit",
    "Poppins",
    "Montserrat",
    "Arial",
] as const;

/* ── Build prompt section describing available icons ── */

export function buildIconCatalogPrompt(): string {
    const categories: Record<string, string[]> = {
        "Oklar & Yönlendirme": ["arrowUp", "arrowDown", "arrowRight", "arrowLeft", "trendingUp", "trendingDown", "chevronRight"],
        "Durum & Geri Bildirim": ["check", "checkCircle", "x", "xCircle", "alertTriangle", "info"],
        "İnsanlar": ["user", "users", "heart", "thumbsUp"],
        "İş & Finans": ["dollarSign", "barChart", "pieChart", "activity", "target", "award"],
        "İletişim": ["messageCircle", "mail", "phone"],
        "Teknoloji": ["globe", "wifi", "cpu", "cloud", "zap", "rocket"],
        "Doğa & Hava": ["sun", "moon", "star", "flame"],
        "Medya": ["play", "pause", "music", "camera", "eye"],
        "Genel": ["clock", "calendar", "shield", "lock", "gift", "lightbulb"],
    };

    let prompt = `\n## 📦 KULLANILABILIR İKON KÜTÜPHANESİ
İkonları SVG'de şu formatta kullan:
<path d='ICON_PATH' fill='none' stroke='RENK' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
Her ikon 24x24 viewBox içindir, scale transform ile büyüt.

### Mevcut İkonlar (isme göre path):\n`;

    for (const [category, iconNames] of Object.entries(categories)) {
        prompt += `\n**${category}:**\n`;
        for (const name of iconNames) {
            prompt += `- ${name}: \`${SVG_ICONS[name]}\`\n`;
        }
    }

    return prompt;
}

/* ── Build infographic template instructions ── */

export function buildInfographicPrompt(): string {
    return `
## 📊 İNFOGRAFİK ŞABLONLARI (Profesyonel SVG Bileşenler)

### 1. DONUT / YÜZDE DAİRESİ
Yüzde göstermek için daire kullan:
\`\`\`
<circle cx='540' cy='960' r='120' fill='none' stroke='#333' stroke-width='16' opacity='0.3'/>
<circle cx='540' cy='960' r='120' fill='none' stroke='RENK' stroke-width='16'
  stroke-dasharray='753.98' stroke-dashoffset='HESAPLA' stroke-linecap='round' transform='rotate(-90 540 960)'/>
<text x='540' y='960' text-anchor='middle' dominant-baseline='central' font-family='Inter' font-size='48' font-weight='bold' fill='white'>%75</text>
\`\`\`
stroke-dashoffset = 753.98 × (1 - yüzde/100)

### 2. İLERLEME ÇUBUĞU (PROGRESS BAR)
\`\`\`
<rect x='200' y='900' width='680' height='24' rx='12' fill='#333' opacity='0.4'/>
<rect x='200' y='900' width='DOLULUK_WIDTH' height='24' rx='12' fill='RENK'/>
<text x='200' y='884' font-family='Inter' font-size='22' fill='white'>Etiket</text>
<text x='880' y='884' text-anchor='end' font-family='Inter' font-size='22' font-weight='bold' fill='RENK'>%85</text>
\`\`\`

### 3. BÜYÜK RAKAM (STAT NUMBER)
\`\`\`
<text x='540' y='960' text-anchor='middle' font-family='Montserrat' font-size='120' font-weight='900' fill='RENK'>2.5M</text>
<text x='540' y='1020' text-anchor='middle' font-family='Inter' font-size='24' fill='#bbb'>Toplam Kullanıcı</text>
\`\`\`

### 4. DİKEY BAR CHART
Her bar için:
\`\`\`
<rect x='X' y='Y' width='BAR_W' height='BAR_H' rx='8' fill='RENK'/>
<text x='X + BAR_W/2' y='Y - 12' text-anchor='middle' font-family='Inter' font-size='20' font-weight='bold' fill='white'>DEĞER</text>
<text x='X + BAR_W/2' y='BOTTOM + 28' text-anchor='middle' font-family='Inter' font-size='16' fill='#999'>ETİKET</text>
\`\`\`

### 5. İKON + ETİKET
\`\`\`
<g transform='translate(X Y) scale(2)'>
  <path d='ICON_PATH' fill='none' stroke='RENK' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
</g>
<text x='X+24' y='Y+76' text-anchor='middle' font-family='Inter' font-size='20' fill='white'>Etiket</text>
\`\`\`

### 6. KARŞILAŞTIRMA SATIRI (vs.)
\`\`\`
<text x='300' y='Y' text-anchor='end' font-family='Montserrat' font-size='56' font-weight='800' fill='#4ade80'>85%</text>
<text x='540' y='Y' text-anchor='middle' font-family='Inter' font-size='28' fill='#666'>vs</text>
<text x='780' y='Y' text-anchor='start' font-family='Montserrat' font-size='56' font-weight='800' fill='#f87171'>42%</text>
\`\`\``;
}

/* ── Build font instructions ── */

export function buildFontPrompt(): string {
    return `
## 🔤 GOOGLE FONTS (Profesyonel Tipografi)
SVG metin elementlerinde şu fontları kullan:

| Font | Kullanım | Ağırlıklar |
|------|----------|-------------|
| **Montserrat** | Büyük rakamlar, stat sayıları, etkileyici başlıklar | 700, 800, 900 |
| **Poppins** | Alt başlıklar, açıklamalar, modern metin | 400, 600, 700 |
| **Inter** | Gövde metin, etiketler, küçük açıklamalar | 400, 600, 700 |
| **Outfit** | Yaratıcı başlıklar, dekoratif metin | 600, 700, 800 |

### KURALLAR:
- Her SVG'nin <defs> bölümüne Google Fonts @import ekle:
  <defs><style type='text/css'>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&amp;family=Montserrat:wght@700;900&amp;family=Poppins:wght@400;700&amp;display=swap');</style></defs>
- Farklı katmanlarda FARKLI fontlar kullanarak tipografik zenginlik oluştur
- Büyük sayılar: Montserrat 900, font-size: 80-140px
- Başlıklar: Poppins veya Outfit 700-800, font-size: 48-72px
- Alt metin: Inter 400, font-size: 20-28px
- font-family attribute'unda HER ZAMAN fallback ekle: font-family='Montserrat, Arial, sans-serif'`;
}
