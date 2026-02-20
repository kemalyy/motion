/**
 * Client-side render engine using Canvas + MediaRecorder
 * Renders SVG layers with animations to video
 * 
 * KEY: Frames are rendered in REAL-TIME so MediaRecorder captures correctly.
 * The same calcAnimationState() is used by both preview and render.
 */

export interface RenderLayer {
    id: string;
    name: string;
    svgContent: string;
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
    } | null;
}

export interface RenderConfig {
    width: number;
    height: number;
    fps: number;
    durationMs: number;
    backgroundColor: string;
    layers: RenderLayer[];
}

/* ── Shared Easing Functions ── */

export const easings: Record<string, (t: number) => number> = {
    linear: (t) => t,
    easeIn: (t) => t * t * t,
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    spring: (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
};

export function getEasing(name: string): (t: number) => number {
    return easings[name] || easings.linear;
}

/* ── Shared Animation State Calculator ── */

export function calcAnimationState(
    anim: RenderLayer["animation"],
    currentTimeMs: number,
    canvasWidth: number,
    canvasHeight: number
): { opacity: number; translateX: number; translateY: number; scale: number; clipProgress: number } {
    if (!anim) return { opacity: 1, translateX: 0, translateY: 0, scale: 1, clipProgress: 1 };

    const layerStart = anim.delayMs;
    const layerEnd = layerStart + anim.durationMs;

    // Auto-hide: after animation ends, hold for holdDurationMs then fade out
    // holdDurationMs defaults to durationMs * 2 (i.e., total visible = entrance + 2x hold)
    const holdMs = (anim as { holdDurationMs?: number }).holdDurationMs ?? anim.durationMs * 2;
    const fadeOutMs = 300;
    const hideStart = layerEnd + holdMs;
    const hideEnd = hideStart + fadeOutMs;

    // Before animation starts — invisible
    if (currentTimeMs < layerStart) {
        return { opacity: 0, translateX: 0, translateY: 0, scale: anim.fromScale || 1, clipProgress: 0 };
    }

    // Entrance animation phase
    let rawProgress = 0;
    if (currentTimeMs >= layerEnd) rawProgress = 1;
    else rawProgress = (currentTimeMs - layerStart) / anim.durationMs;

    const easingFn = getEasing(anim.easing);
    const progress = easingFn(rawProgress);

    let opacity = anim.fromOpacity + (anim.toOpacity - anim.fromOpacity) * progress;

    // Auto-hide phase (only for layers that animate opacity, i.e., not static backgrounds)
    const isAnimatedLayer = anim.fromOpacity !== anim.toOpacity || anim.fromScale !== anim.toScale;
    if (isAnimatedLayer && currentTimeMs >= hideStart && holdMs < 999999) {
        if (currentTimeMs >= hideEnd) {
            opacity = 0;
        } else {
            const fadeProgress = (currentTimeMs - hideStart) / fadeOutMs;
            opacity = anim.toOpacity * (1 - fadeProgress);
        }
    }

    const slideXAmount = canvasWidth * 0.1;
    const slideYAmount = canvasHeight * 0.1;

    let translateX = 0;
    let translateY = 0;
    let scale = 1;
    let clipProgress = 1;

    switch (anim.animationType) {
        case "slideLeft":
            translateX = -(1 - progress) * slideXAmount;
            break;
        case "slideRight":
            translateX = (1 - progress) * slideXAmount;
            break;
        case "slideUp":
            translateY = (1 - progress) * slideYAmount;
            break;
        case "slideDown":
            translateY = -(1 - progress) * slideYAmount;
            break;
        case "scale":
            scale = anim.fromScale + (anim.toScale - anim.fromScale) * progress;
            break;
        case "draw":
        case "wipe":
            clipProgress = progress;
            break;
    }

    return { opacity, translateX, translateY, scale, clipProgress };
}

/* ── SVG to Image ── */

function svgToImage(svgContent: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error(`SVG yüklenemedi: ${e}`));
        };
        img.src = url;
    });
}

/* ── Draw a single frame ── */

function drawFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    backgroundColor: string,
    layers: RenderLayer[],
    layerImages: Map<string, HTMLImageElement>,
    currentTimeMs: number
) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    for (const layer of layers) {
        const img = layerImages.get(layer.id);
        if (!img) continue;

        const state = calcAnimationState(layer.animation, currentTimeMs, width, height);

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, state.opacity));

        if (state.translateX !== 0 || state.translateY !== 0) {
            ctx.translate(state.translateX, state.translateY);
        }

        if (state.scale !== 1) {
            ctx.translate(width / 2, height / 2);
            ctx.scale(state.scale, state.scale);
            ctx.translate(-width / 2, -height / 2);
        }

        if (state.clipProgress < 1) {
            ctx.beginPath();
            ctx.rect(0, 0, state.clipProgress * width, height);
            ctx.clip();
        }

        // Replicate CSS objectFit: "contain" — preserve aspect ratio, center in canvas
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        const scaleX = width / imgW;
        const scaleY = height / imgH;
        const fitScale = Math.min(scaleX, scaleY);
        const drawW = imgW * fitScale;
        const drawH = imgH * fitScale;
        const drawX = (width - drawW) / 2;
        const drawY = (height - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
    }
}

export type ProgressCallback = (progress: number, status: string) => void;

/**
 * Render animation to video blob.
 * 
 * CRITICAL: Frames are rendered in REAL-TIME using requestAnimationFrame.
 * This ensures MediaRecorder captures each frame at the correct timestamp,
 * producing output identical to the preview.
 */
export async function renderToVideo(
    config: RenderConfig,
    onProgress?: ProgressCallback
): Promise<Blob> {
    const { width, height, fps, durationMs, backgroundColor, layers } = config;

    onProgress?.(0, "Katmanlar hazırlanıyor...");

    // Pre-load all SVG images
    const layerImages: Map<string, HTMLImageElement> = new Map();
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        try {
            const img = await svgToImage(layer.svgContent);
            layerImages.set(layer.id, img);
        } catch (err) {
            console.warn(`Layer "${layer.name}" yüklenemedi:`, err);
        }
        onProgress?.(
            (i + 1) / layers.length * 0.15,
            `Katman yükleniyor: ${layer.name}`
        );
    }

    // Create offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Draw the first frame immediately
    drawFrame(ctx, width, height, backgroundColor, layers, layerImages, 0);

    // Determine best supported format
    let mimeType = "video/webm;codecs=vp9";
    if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("video/mp4")) {
            mimeType = "video/mp4";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
            mimeType = "video/webm;codecs=vp9";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
            mimeType = "video/webm";
        }
    }

    const isMP4 = mimeType.startsWith("video/mp4");

    // Setup MediaRecorder
    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 10_000_000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    const recordingDone = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
            const blobType = isMP4 ? "video/mp4" : "video/webm";
            const blob = new Blob(chunks, { type: blobType });
            resolve(blob);
        };
    });

    onProgress?.(0.15, "Video kaydediliyor...");
    mediaRecorder.start(100);

    // ── REAL-TIME rendering ──
    // Render frames using requestAnimationFrame for accurate timing.
    // This takes ~durationMs in real time but produces correct output.
    return new Promise<Blob>((resolve) => {
        const startTime = performance.now();

        function renderLoop() {
            const elapsed = performance.now() - startTime;
            const currentTimeMs = Math.min(elapsed, durationMs);

            // Draw the current frame
            drawFrame(ctx, width, height, backgroundColor, layers, layerImages, currentTimeMs);

            // Progress
            const progress = 0.15 + (currentTimeMs / durationMs) * 0.8;
            const seconds = (currentTimeMs / 1000).toFixed(1);
            const totalSeconds = (durationMs / 1000).toFixed(1);
            onProgress?.(progress, `Kaydediliyor... ${seconds}s / ${totalSeconds}s`);

            if (currentTimeMs < durationMs) {
                requestAnimationFrame(renderLoop);
            } else {
                // Draw one more final frame to ensure we have the end state
                drawFrame(ctx, width, height, backgroundColor, layers, layerImages, durationMs);

                // Small delay to let the recorder capture the last frame
                setTimeout(() => {
                    onProgress?.(0.95, "Video tamamlanıyor...");
                    mediaRecorder.stop();
                    stream.getTracks().forEach((t) => t.stop());

                    recordingDone.then((blob) => {
                        onProgress?.(1, "Tamamlandı!");
                        resolve(blob);
                    });
                }, 200);
            }
        }

        requestAnimationFrame(renderLoop);
    });
}

/**
 * Get the file extension for the rendered video
 */
export function getVideoExtension(): string {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/mp4")) {
        return "mp4";
    }
    return "webm";
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
