import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildIconCatalogPrompt, buildInfographicPrompt, buildFontPrompt } from "./svg-toolkit";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface LayerInfo {
    id: string;
    name: string;
    sortOrder: number;
    width: number;
    height: number;
    contentDescription?: string;
}

export interface AnimationSuggestion {
    layerName: string;
    layerId?: string;
    animationType: string;
    delayMs: number;
    durationMs: number;
    easing: string;
    fromOpacity: number;
    toOpacity: number;
    fromScale: number;
    toScale: number;
    direction?: string;
    sortOrder?: number;
}

/**
 * Deep SVG content analyzer.
 * Extracts: text content, shapes, colors, gradients, positioning hints, complexity.
 */
export function describeSvgContent(svgContent: string): string {
    const parts: string[] = [];

    // Extract ALL text content (text, tspan, textPath)
    const textElements = svgContent.match(/<(?:text|tspan)[^>]*>([^<]*)<\/(?:text|tspan)>/gi);
    if (textElements) {
        const texts = textElements
            .map((m) => m.replace(/<[^>]+>/g, "").trim())
            .filter((t) => t.length > 0);
        if (texts.length > 0) {
            parts.push(`metin içeriği: "${texts.join('", "')}"`);
            // Determine text type
            if (texts.some((t) => t.length > 30)) parts.push("tip: uzun metin/paragraf");
            else if (texts.length === 1 && texts[0].length < 15) parts.push("tip: başlık/label");
        }
    }

    // Detect shapes with counts
    const shapeMap: Record<string, number> = {};
    const shapeNames: Record<string, string> = {
        circle: "daire", rect: "dikdörtgen", ellipse: "elips",
        polygon: "poligon", line: "çizgi", polyline: "polyline",
        path: "path", image: "resim/görsel",
    };
    for (const [tag, name] of Object.entries(shapeNames)) {
        const regex = new RegExp(`<${tag}[\\s/>]`, "gi");
        const count = (svgContent.match(regex) || []).length;
        if (count > 0) shapeMap[name] = count;
    }
    if (Object.keys(shapeMap).length > 0) {
        const desc = Object.entries(shapeMap)
            .map(([name, count]) => count > 1 ? `${count}x ${name}` : name)
            .join(", ");
        parts.push(`şekiller: ${desc}`);
    }

    // Detect dominant fill colors
    const fillMatches = svgContent.match(/fill\s*[:=]\s*["']?([^"';\s>)]+)/gi);
    if (fillMatches) {
        const colors = [...new Set(
            fillMatches
                .map((m) => m.replace(/fill\s*[:=]\s*["']?/i, "").trim())
                .filter((c) => c !== "none" && c !== "transparent" && c.length > 0 && !c.startsWith("url"))
        )].slice(0, 5);
        if (colors.length > 0) parts.push(`renkler: ${colors.join(", ")}`);
    }

    // Detect gradients
    if (/<linearGradient/i.test(svgContent)) parts.push("lineer gradyan");
    if (/<radialGradient/i.test(svgContent)) parts.push("radyal gradyan");

    // Detect filters/effects
    if (/<filter/i.test(svgContent)) parts.push("filtre efekti");
    if (/filter\s*[:=]/i.test(svgContent)) parts.push("CSS filtre");
    if (/opacity\s*[:=]\s*["']?0*\.?\d/i.test(svgContent)) parts.push("opaklık ayarı");

    // Background detection: large rect covering full area, no text/complex shapes
    const hasText = /<text/i.test(svgContent);
    const hasCircle = /<circle/i.test(svgContent);
    const rectCount = (svgContent.match(/<rect/gi) || []).length;
    if (rectCount > 0 && rectCount <= 2 && !hasText && !hasCircle) {
        parts.push("muhtemel tip: arka plan/zemin");
    }

    // Icon/logo detection: small, complex paths
    const pathCount = (svgContent.match(/<path/gi) || []).length;
    if (pathCount > 3 && !hasText) {
        parts.push("muhtemel tip: ikon/logo");
    }

    // Detect viewBox dimensions
    const viewBoxMatch = svgContent.match(/viewBox\s*=\s*["']([^"']+)["']/);
    if (viewBoxMatch) {
        parts.push(`viewBox: ${viewBoxMatch[1]}`);
    }

    // Detect transforms (rotation, translation, etc.)
    if (/transform\s*[:=]/i.test(svgContent)) {
        parts.push("transform var");
    }

    return parts.join("; ") || "basit grafik eleman";
}

const SYSTEM_PROMPT = `Sen dünya standartlarında bir motion graphics animasyon yönetmenisin.
Sana bir SVG kompozisyonunun ayrıştırılmış katmanları verilecek. Her katmanın adı, boyutu ve içeriğine dair detaylı bir analiz mevcut.

## SENİN GÖREVİN
1. Her katmanın NE OLDUĞUNU anla (arka plan, başlık, alt başlık, ikon, logo, dekoratif şekil vb.)
2. Katmanlar arası İLİŞKİLERİ analiz et (hangileri birbirine bağlı, hangileri bağımsız)
3. Katmanların DOĞRU SIRASINI belirle (sortOrder ile — düşük = altta, yüksek = üstte)
4. Her katman için EN UYGUN animasyon parametrelerini seç
5. Zamanlama ve sıralama DRAMATURJI açısından mantıklı olmalı

## ANİMASYON KURALLARI 
- Arka planlar HER ZAMAN ilk belirmeli (delay: 0, fadeIn, uzun süre)
- Ana grafikler (logo, ikon, daire) ikinci sırada gelmeli (scale veya slideUp)
- Başlık metinleri üçüncü sırada (slideUp veya slideDown)
- Alt başlıklar ana başlıktan SONRA (daha yüksek delay)
- Dekoratif elementler en son veya aralarda
- Katmanlar arası minimum 100-300ms delay farkı olmalı
- scale kullanırken fromScale: 0 veya 0.3 ile başla, toScale: 1 yap (büyüme efekti)
- spring easing hareketli/canlı tasarımlar için, easeOut zarif çıkışlar için

## SORT ORDER (Katman Sırası)
- sortOrder: 0 = en alttaki katman (arka plan)
- Yüksek sortOrder = üstteki katman (önde görünür)
- Arka planlar: sortOrder 0
- Ana grafikler: sortOrder 1-2
- Metin katmanları: sortOrder 3-4
- Dekoratif elemanlar: context'e göre

## Desteklenen Değerler
animationType: fadeIn, slideLeft, slideRight, slideUp, slideDown, scale, draw, wipe
easing: linear, easeIn, easeOut, easeInOut, spring
fromOpacity/toOpacity: 0.0 - 1.0
fromScale/toScale: 0.0 - 2.0

## JSON FORMATI (kesin bu formatta döndür)
[
  {
    "layerName": "katman adı",
    "animationType": "fadeIn",
    "delayMs": 0,
    "durationMs": 500,
    "easing": "easeInOut",
    "fromOpacity": 0,
    "toOpacity": 1,
    "fromScale": 1,
    "toScale": 1,
    "sortOrder": 0,
    "direction": "left"
  }
]

SADECE JSON döndür. Açıklama, markdown, yorum yazma.`;

export async function getAnimationSuggestions(
    layers: LayerInfo[],
    prompt: string
): Promise<AnimationSuggestion[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const layerList = layers
        .map(
            (l) => {
                const desc = l.contentDescription ? `\n    İçerik analizi: ${l.contentDescription}` : "";
                return `  - Katman "${l.name}" (mevcut sıra: ${l.sortOrder}, boyut: ${l.width}x${l.height})${desc}`;
            }
        )
        .join("\n");

    const userPrompt = `## KATMANLAR (toplam ${layers.length} adet)\n${layerList}\n\n## KULLANICI İSTEĞİ\n${prompt}\n\nHer katman için animasyon parametrelerini VE sortOrder değerini JSON olarak döndür.`;

    const result = await model.generateContent({
        contents: [
            {
                role: "user",
                parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }],
            },
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
        },
    });

    const response = result.response;
    let text = response.text();

    // Strip markdown code fences if present
    text = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

    // Extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        console.error("AI raw response:", text);
        throw new Error("AI yanıtından JSON çıkarılamadı");
    }

    const suggestions: AnimationSuggestion[] = JSON.parse(jsonMatch[0]);
    return suggestions;
}

/* ─────────────────────────────────────────────────────────
 * AI Project Generation — Create full project from prompt
 * ───────────────────────────────────────────────────────── */

export interface GeneratedLayer {
    name: string;
    groupName?: string;
    sortOrder: number;
    svgContent: string;
    width: number;
    height: number;
    animation: {
        animationType: string;
        delayMs: number;
        durationMs: number;
        easing: string;
        fromOpacity: number;
        toOpacity: number;
        fromScale: number;
        toScale: number;
        direction?: string;
    };
}

export interface GeneratedProject {
    name: string;
    description: string;
    width: number;
    height: number;
    fps: number;
    durationMs: number;
    backgroundColor: string;
    layers: GeneratedLayer[];
}

const PROJECT_GENERATION_PROMPT = `Sen dünya standartlarında bir motion graphics tasarımcı, SVG uzmanı ve ses analiz uzmanısın.
Kullanıcının açıklamasına göre sıfırdan bir animasyon projesi tasarla.

## ANA GÖREV
1. Projeye uygun isim ve açıklama oluştur
2. Boyutları belirle (genelde 1080x1920 dikey veya 1920x1080 yatay)
3. Uygun arka plan rengi/gradyan seç
4. Her katman için GERÇEK, RENDERLENEBİLİR SVG kodu oluştur
5. Her katmana uygun animasyon parametreleri belirle
6. Katmanları doğru sırada düzenle (sortOrder)

## SVG OLUŞTURMA KURALLARI
- Her SVG bağımsız ve render edilebilir olmalı
- viewBox proje boyutlarına uygun olmalı
- Metin: <text> ile, font-family='Arial, Helvetica, sans-serif'
- Metin boyutları: başlıklar 60-90px, alt başlıklar 36-48px, gövde 28-36px
- Şekiller: <rect>, <circle>, <ellipse>, <path>, <polygon>
- SVG kodları geçerli XML, TÜM ATTRIBUTE'LARDA tek tırnak ' kullan (çift tırnak " YASAK)
- Her SVG'de xmlns='http://www.w3.org/2000/svg' olmalı

## İNFOGRAFİK KATMANLARI (Aşağıdaki kütüphaneyi KULLAN)
Konuya uygun infografik elementler oluştur:
- Büyük rakamlar (Montserrat 900) — bold, eye-catching
- İKON KÜTÜPHANESİNDEN ikonları SVG path olarak ekle
- ŞABLON KÜTÜPHANESİNDEN donut chart, progress bar, bar chart kullan
- Her SVG'ye Google Fonts @import ekle (<defs> içinde)

## KATMAN YAPISI (minimum 4, maksimum 15 katman)
⚠️ Her katmana MUTLAKA bir groupName ver! Katmanlar gruplara ayrılmalı:
1. groupName: "Arka Plan" — arka plan gradyan/düz renk (sortOrder: 0)
2. groupName: "Dekoratif" — geometrik şekiller, çizgiler (sortOrder: 1-3)
3. groupName: "İnfografik" — rakamlar, chartlar, ikonlar (sortOrder: 4-7)
4. groupName: "Metin" — başlıklar, alt yazılar (sortOrder: 8+)

GroupName editörde KATMAN GRUPLARI başlığı olarak görünür.

## ANİMASYON KURALLARI
- Arka planlar: fadeIn, 0ms delay — arka planlar HER ZAMAN görünür kalır
- Dekoratif şekiller: slideLeft/slideRight veya scale
- İnfogramlar: scale (fromScale 0→1) veya wipe
- Başlıklar: slideUp veya slideDown
- Stagger: her katman arası minimum 200ms fark
- spring easing: canlı tasarımlar, easeOut: zarif tasarımlar

## ⚠️ OTOMATİK GİZLENME KURALI
Her katman şu kadar süre GÖRÜNÜR kalır: durationMs × 3 (giriş animasyonu + tutma süresi)
Sonra otomatik olarak kaybolur (fade out). Bu yüzden:
- durationMs'i SADECE giriş animasyonu süresi olarak değil, GÖRÜNÜRLÜK PENCERESİNİ belirleyen değer olarak ayarla
- Uzun süre görünmesi gereken katmanlar: durationMs yüksek tut (örn: 3000-5000ms)
- Kısa süre görünecek metin: durationMs kısa tut (örn: 800-1500ms)
- Arka plan katmanları (fromOpacity=toOpacity) otomatik gizlenmez
- Toplam proje süresi: maksimum 120000ms (2 dakika)

## DESTEKLENEN DEĞERLER
animationType: fadeIn, slideLeft, slideRight, slideUp, slideDown, scale, draw, wipe
easing: linear, easeIn, easeOut, easeInOut, spring`;

const AUDIO_ADDENDUM = `

## 🎵 SES DOSYASI KURALLARI (ÇOK ÖNEMLİ - MUTLAKA UYGULA)

### 1. KONUŞMA TRANSKRİPSİYON VE KİNETİK TİPOGRAFİ
- Sesteki konuşmayı DİKKATLE DİNLE ve transkript et
- Her cümle/ifade için AYRI bir metin katmanı oluştur
- Her metin katmanının delayMs'i o cümlenin seste BAŞLADIĞI zamana eşit olsun
- Önemli anahtar kelimeleri BÜYÜK ve BOLD yap (font-size: 80-100px, font-weight: bold)
- Normal cümleler: 40-56px
- Her metin katmanı ekranın merkezi civarında olmalı
- Farklı cümlelere farklı renkler ata (kontrast oluştur)
- Kelime bulutu gibi çoklu metin düzeni de olabilir

### 2. SESE UYGUN ZAMANLAMA
- durationMs sesin GERÇEK SÜRESİNE yakın olmalı (tahmin et, maksimum 120000ms / 2 dakika)
- Sessiz anlarda: dekoratif şekil ve infografik animasyonları ekle
- Hızlı konuşma = kısa durationMs (800-1500ms) → katman hızlı kaybolur
- Yavaş konuşma = uzun durationMs (2000-4000ms) → katman uzun süre görünür
- Vurgu yapılan kelimelerde: scale fromScale:0.3 toScale:1.2 + spring easing

### 3. DUYGU DURUMU ve RENK PALETİ
- Enerjik/mutlu ses → parlak renkler (turuncu, sarı, yeşil, turkuaz)
- Ciddi/profesyonel → koyu tonlar (lacivert, koyu mor, gri-mavi)
- Duygusal/samimi → sıcak tonlar (pembe, bordo, amber, coral)
- Agresif/heyecanlı → neon renkler (kırmızı, electric blue, lime)

### 4. İÇERİĞE UYGUN İNFOGRAFİKLER
- Seste geçen sayıları büyük infografik olarak göster
- Konu ile ilgili sembolik SVG ikonları ekle
- Konuşmanın ana mesajını destekleyen görsel elementler
- Her infografik, ilgili cümle ile aynı delayMs'de belirmeli`;

const JSON_FORMAT_SECTION = `

## JSON FORMATI
{
  "name": "Proje Adı",
  "description": "Projenin kısa açıklaması",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "durationMs": 5000,
  "backgroundColor": "#1a1a2e",
  "layers": [
    {
      "name": "background",
      "groupName": "Arka Plan",
      "sortOrder": 0,
      "svgContent": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1080 1920'><rect width='1080' height='1920' fill='#1a1a2e'/></svg>",
      "width": 1080,
      "height": 1920,
      "animation": {
        "animationType": "fadeIn",
        "delayMs": 0,
        "durationMs": 800,
        "easing": "easeOut",
        "fromOpacity": 0,
        "toOpacity": 1,
        "fromScale": 1,
        "toScale": 1
      }
    },
    {
      "name": "mainTitle",
      "groupName": "Metin",
      "sortOrder": 6,
      "svgContent": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1080 1920'><text x='540' y='900' text-anchor='middle' font-family='Montserrat, Arial, sans-serif' font-size='72' font-weight='800' fill='white'>Başlık</text></svg>",
      "width": 1080,
      "height": 1920,
      "animation": {
        "animationType": "slideUp",
        "delayMs": 1200,
        "durationMs": 1500,
        "easing": "spring",
        "fromOpacity": 0,
        "toOpacity": 1,
        "fromScale": 1,
        "toScale": 1
      }
    }
  ]
}

ÖNEMLİ:
- SADECE JSON döndür, açıklama yazma
- Her katmanda groupName ZORUNLU
- SVG içinde çift tırnak " KULLANMA, hep tek tırnak ' kullan
- Her SVG'de xmlns='http://www.w3.org/2000/svg' şart`;

export async function generateProjectFromPrompt(
    prompt: string,
    audioBase64?: string,
    audioMimeType?: string,
): Promise<GeneratedProject> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

    // Build prompt based on whether audio is included
    let fullPrompt = PROJECT_GENERATION_PROMPT;

    // Always add icon catalog, infographic templates, and font instructions
    fullPrompt += buildIconCatalogPrompt();
    fullPrompt += buildInfographicPrompt();
    fullPrompt += buildFontPrompt();

    if (audioBase64) {
        fullPrompt += AUDIO_ADDENDUM;
    }

    fullPrompt += JSON_FORMAT_SECTION;

    let userSection = "\n\n## KULLANICI İSTEĞİ\n" + (prompt || "Sese uygun profesyonel bir animasyon oluştur");

    if (audioBase64) {
        userSection += "\n\n⚠️ SES DOSYASI EKLENDİ — Yukarıdaki ses kurallarını MUTLAKA uygula. Sesi dinle, konuşmayı transkript et, ve her cümle/anahtar kelime için ayrı tipografi katmanı oluştur. İnfografikler ve ikonlar ekle. Sesin süresine göre durationMs'i ayarla.";
        parts.push({
            inlineData: {
                data: audioBase64,
                mimeType: audioMimeType || "audio/webm",
            },
        });
    }

    parts.unshift({ text: fullPrompt + userSection });

    const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 32768,
            responseMimeType: "application/json",
        },
    });

    const response = result.response;
    let text = response.text();

    // Clean up
    text = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error("AI project raw response:", text.substring(0, 500));
        throw new Error("AI yanıtından proje verisi çıkarılamadı");
    }

    let jsonStr = jsonMatch[0];

    // Repair common JSON issues from AI output
    // 1. Fix trailing commas before ] or }
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
    // 2. Fix unescaped newlines inside string values
    jsonStr = jsonStr.replace(/(?<=":[ ]*"[^"]*)\n/g, "\\n");
    // 3. Fix truncated JSON — close any open arrays/objects
    let openBraces = 0, openBrackets = 0;
    for (const ch of jsonStr) {
        if (ch === "{") openBraces++;
        else if (ch === "}") openBraces--;
        else if (ch === "[") openBrackets++;
        else if (ch === "]") openBrackets--;
    }
    // If still unbalanced, try to close them
    if (openBrackets > 0 || openBraces > 0) {
        // Remove any trailing partial string/value
        jsonStr = jsonStr.replace(/,\s*"[^"]*$/, "");
        jsonStr = jsonStr.replace(/,\s*$/, "");
        for (let i = 0; i < openBrackets; i++) jsonStr += "]";
        for (let i = 0; i < openBraces; i++) jsonStr += "}";
    }

    let project: GeneratedProject;
    try {
        project = JSON.parse(jsonStr);
    } catch (parseErr) {
        console.error("JSON parse error, attempting deeper repair:", (parseErr as Error).message);
        // Second attempt: try to extract just the essential fields
        try {
            // Remove SVG content that might contain problematic characters
            const simplifiedJson = jsonStr
                .replace(/\\"/g, "'")  // escaped quotes to single quotes
                .replace(/[\x00-\x1F\x7F]/g, " "); // control characters
            project = JSON.parse(simplifiedJson);
        } catch {
            console.error("AI project raw response (first 2000 chars):", jsonStr.substring(0, 2000));
            throw new Error("AI yanıtı geçerli JSON formatında değil — tekrar deneyin");
        }
    }

    if (!project.layers || project.layers.length === 0) {
        throw new Error("AI geçerli katmanlar oluşturamadı");
    }

    // Fix SVG double quotes → single quotes if AI slipped
    project.layers = project.layers.map((layer) => ({
        ...layer,
        svgContent: layer.svgContent
            .replace(/xmlns="([^"]+)"/g, "xmlns='$1'")
            .replace(/viewBox="([^"]+)"/g, "viewBox='$1'"),
    }));

    return project;
}
