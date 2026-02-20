"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
    ArrowLeft, Play, Pause, RotateCcw, Eye, EyeOff,
    GripVertical, Sparkles, Download, Save, ChevronDown,
    Loader2, Settings2, ArrowUp, ArrowDown, X, Monitor,
    FolderOpen, Type, Trash2, AlignLeft, AlignCenter, AlignRight,
    Repeat2
} from "lucide-react";
import toast from "react-hot-toast";
import { renderToVideo, downloadBlob, getVideoExtension, calcAnimationState, type RenderLayer, type RenderConfig } from "@/lib/render-engine";

/* ────────── Types ────────── */

interface LayerAnimation {
    id: string;
    animationType: string;
    delayMs: number;
    durationMs: number;
    easing: string;
    fromOpacity: number;
    toOpacity: number;
    fromScale: number;
    toScale: number;
    direction?: string;
}

interface Layer {
    id: string;
    name: string;
    sortOrder: number;
    svgContent: string;
    visible: boolean;
    width: number;
    height: number;
    layerAnimations: LayerAnimation[];
    metadata?: {
        groupName?: string;
        isGroupChild?: boolean;
        opacity?: number;
        transform?: string;
        [key: string]: unknown;
    };
}

interface SourceFile {
    id: string;
    originalName: string;
    layers: Layer[];
}

interface PromptHistoryItem {
    id: string;
    prompt: string;
    applied: boolean;
    createdAt: string;
}

interface Project {
    id: string;
    name: string;
    status: string;
    width: number;
    height: number;
    fps: number;
    durationMs: number;
    backgroundColor: string;
    audioPath?: string | null;
    sourceFiles: SourceFile[];
    promptHistory: PromptHistoryItem[];
}

interface AISuggestion {
    layerName: string;
    layerId?: string | null;
    animationType: string;
    delayMs: number;
    durationMs: number;
    easing: string;
    fromOpacity: number;
    toOpacity: number;
    fromScale: number;
    toScale: number;
}

/* ────────── Constants ────────── */

const ANIMATION_TYPES = [
    { value: "fadeIn", label: "Fade In" },
    { value: "slideLeft", label: "Soldan Kayma" },
    { value: "slideRight", label: "Sağdan Kayma" },
    { value: "slideUp", label: "Alttan Kayma" },
    { value: "slideDown", label: "Üstten Kayma" },
    { value: "scale", label: "Büyüme" },
    { value: "draw", label: "Çizim" },
    { value: "wipe", label: "Silme" },
];

const EASING_OPTIONS = [
    { value: "linear", label: "Linear" },
    { value: "easeIn", label: "Ease In" },
    { value: "easeOut", label: "Ease Out" },
    { value: "easeInOut", label: "Ease In/Out" },
    { value: "spring", label: "Spring" },
];

const AI_TEMPLATES = [
    "Dramatik giriş — yavaş ve etkileyici",
    "Enerjik pop — hızlı ve dinamik",
    "Yumuşak akış — katman katman belirme",
    "Minimalist — sade fadeIn animasyonu",
    "Soldan sağa kaydırak akış",
];

const LAYER_COLORS = [
    "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
    "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
    "#f97316", "#6366f1",
];

const RESOLUTION_PRESETS = [
    { label: "Instagram Post", w: 1080, h: 1080 },
    { label: "Instagram Story", w: 1080, h: 1920 },
    { label: "YouTube", w: 1920, h: 1080 },
    { label: "Twitter/X", w: 1200, h: 675 },
    { label: "HD 720p", w: 1280, h: 720 },
    { label: "Full HD", w: 1920, h: 1080 },
    { label: "4K", w: 3840, h: 2160 },
];

const FONT_OPTIONS = [
    "Inter", "Poppins", "Montserrat", "Roboto", "Oswald",
    "Playfair Display", "Raleway", "Outfit", "Bebas Neue",
    "Lato", "Open Sans", "Nunito", "Ubuntu", "Quicksand",
    "Cabin", "Merriweather", "Source Sans 3", "DM Sans",
    "Space Grotesk", "JetBrains Mono",
];

/* ────────── Component ────────── */

export default function EditorPage() {
    useSession({ required: true });
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[] | null>(null);
    const [promptHistoryId, setPromptHistoryId] = useState<string | null>(null);
    const [rendering, setRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderStatus, setRenderStatus] = useState("");
    const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
    const [layerImageUrls, setLayerImageUrls] = useState<Map<string, string>>(new Map());
    const [dragLayerId, setDragLayerId] = useState<string | null>(null);
    const [bottomTab, setBottomTab] = useState<'timeline' | 'ai' | 'settings'>('timeline');

    // Render settings (editable, synced to project)
    const [renderWidth, setRenderWidth] = useState(1080);
    const [renderHeight, setRenderHeight] = useState(1080);
    const [renderFps, setRenderFps] = useState(30);
    const [renderDuration, setRenderDuration] = useState(5000);
    const [renderBg, setRenderBg] = useState("#1a1a2e");
    const [bgType, setBgType] = useState<"solid" | "gradient" | "transparent">("solid");
    const [bgGradient, setBgGradient] = useState({ color1: "#1a1a2e", color2: "#4a00e0", angle: 135, type: "linear" });

    const timelineRef = useRef<HTMLDivElement>(null);
    const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    /* ── Fetch Project ── */
    const fetchProject = useCallback(async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}`);
            if (res.ok) {
                const data = await res.json();
                setProject(data);
                // Sync render settings from project
                setRenderWidth(data.width);
                setRenderHeight(data.height);
                setRenderFps(data.fps);
                setRenderDuration(data.durationMs);
                setRenderBg(data.backgroundColor);
                setBgType(data.backgroundType || "solid");
                if (data.backgroundGradient) setBgGradient(data.backgroundGradient);

                const allLayerIds = data.sourceFiles.flatMap((sf: SourceFile) =>
                    sf.layers.map((l: Layer) => l.id)
                );
                setVisibleLayers(new Set(allLayerIds));
                if (allLayerIds.length > 0 && !selectedLayerId) {
                    setSelectedLayerId(allLayerIds[0]);
                }
            } else {
                toast.error("Proje bulunamadı");
                router.push("/dashboard");
            }
        } catch {
            toast.error("Proje yüklenemedi");
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, router]);

    useEffect(() => { fetchProject(); }, [fetchProject]);

    const allLayers = useMemo(
        () => project?.sourceFiles.flatMap((sf) => sf.layers).sort((a, b) => a.sortOrder - b.sortOrder) || [],
        [project]
    );

    // Convert SVG strings to blob URLs
    useEffect(() => {
        const urls = new Map<string, string>();
        for (const layer of allLayers) {
            const blob = new Blob([layer.svgContent], { type: "image/svg+xml;charset=utf-8" });
            urls.set(layer.id, URL.createObjectURL(blob));
        }
        setLayerImageUrls(urls);
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [allLayers]);

    // Load project audio if available
    useEffect(() => {
        if (project?.audioPath) {
            const url = `/api/projects/${projectId}/audio`;
            setAudioUrl(url);
            audioRef.current = new Audio(url);
            audioRef.current.preload = 'auto';
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setAudioUrl(null);
        };
    }, [project?.audioPath, projectId]);

    // Playback with audio sync
    useEffect(() => {
        if (!isPlaying) {
            if (audioRef.current) audioRef.current.pause();
            return;
        }
        // Start audio if available
        if (audioRef.current) {
            audioRef.current.currentTime = currentTime / 1000;
            audioRef.current.play().catch(() => {/* user interaction required */ });
        }
        playIntervalRef.current = setInterval(() => {
            setCurrentTime((prev) => {
                if (prev >= renderDuration) {
                    if (isLooping) {
                        if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => { }); }
                        return 0;
                    }
                    setIsPlaying(false);
                    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
                    return 0;
                }
                return prev + 33;
            });
        }, 33);
        return () => {
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, renderDuration]);

    const selectedLayer = allLayers.find((l) => l.id === selectedLayerId);
    const selectedAnimation = selectedLayer?.layerAnimations[0];

    /* ── Layer operations ── */

    const toggleLayerVisibility = (layerId: string) => {
        setVisibleLayers((prev) => {
            const next = new Set(prev);
            if (next.has(layerId)) next.delete(layerId);
            else next.add(layerId);
            return next;
        });
    };

    const updateAnimation = async (layerId: string, updates: Partial<LayerAnimation>) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/layers/${layerId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (res.ok) fetchProject();
        } catch { toast.error("Güncelleme başarısız"); }
    };

    const moveLayer = async (layerId: string, direction: "up" | "down") => {
        const idx = allLayers.findIndex((l) => l.id === layerId);
        if (idx < 0) return;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= allLayers.length) return;

        const newOrder = allLayers.map((l, i) => {
            if (i === idx) return { id: l.id, sortOrder: swapIdx };
            if (i === swapIdx) return { id: l.id, sortOrder: idx };
            return { id: l.id, sortOrder: i };
        });

        try {
            const res = await fetch(`/api/projects/${projectId}/layers/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order: newOrder }),
            });
            if (res.ok) fetchProject();
        } catch { toast.error("Sıralama başarısız"); }
    };

    // Drag & Drop
    const handleDragStart = (layerId: string) => setDragLayerId(layerId);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = async (targetId: string) => {
        if (!dragLayerId || dragLayerId === targetId) return;
        const fromIdx = allLayers.findIndex((l) => l.id === dragLayerId);
        const toIdx = allLayers.findIndex((l) => l.id === targetId);
        if (fromIdx < 0 || toIdx < 0) return;

        const reordered = [...allLayers];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);

        const newOrder = reordered.map((l, i) => ({ id: l.id, sortOrder: i }));
        try {
            const res = await fetch(`/api/projects/${projectId}/layers/reorder`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order: newOrder }),
            });
            if (res.ok) fetchProject();
        } catch { toast.error("Sıralama başarısız"); }
        setDragLayerId(null);
    };

    /* ── Text Layer ── */

    const handleAddTextLayer = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/text-layers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ textContent: "Metin Yaz" }),
            });
            if (res.ok) {
                const layer = await res.json();
                toast.success("Metin katmanı eklendi");
                fetchProject();
                setSelectedLayerId(layer.id);
            } else {
                toast.error("Metin katmanı eklenemedi");
            }
        } catch { toast.error("Metin katmanı eklenemedi"); }
    };

    const handleUpdateTextLayer = async (layerId: string, updates: Record<string, unknown>) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/text-layers/${layerId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (res.ok) fetchProject();
        } catch { toast.error("Metin güncellenemedi"); }
    };

    const handleDeleteTextLayer = async (layerId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/text-layers/${layerId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("Metin katmanı silindi");
                setSelectedLayerId(null);
                fetchProject();
            }
        } catch { toast.error("Silinemedi"); }
    };

    /* ── Render Settings ── */

    const saveRenderSettings = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    width: renderWidth,
                    height: renderHeight,
                    fps: renderFps,
                    durationMs: renderDuration,
                    backgroundColor: renderBg,
                    backgroundType: bgType,
                    backgroundGradient: bgType === "gradient" ? bgGradient : null,
                }),
            });
            if (res.ok) {
                fetchProject();
                toast.success("Render ayarları kaydedildi");
            }
        } catch { toast.error("Ayarlar kaydedilemedi"); }
    };

    /* ── AI ── */

    const handleAIPrompt = async () => {
        if (!aiPrompt.trim()) return;
        setAiLoading(true);
        setAiSuggestions(null);
        try {
            const res = await fetch("/api/ai/suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, prompt: aiPrompt }),
            });
            if (res.ok) {
                const data = await res.json();
                setAiSuggestions(data.suggestions);
                setPromptHistoryId(data.promptHistoryId);
                toast.success("AI önerileri hazır!");
            } else {
                const err = await res.json();
                toast.error(err.error || "AI öneri başarısız");
            }
        } catch { toast.error("AI servisi ile iletişim kurulamadı"); }
        finally { setAiLoading(false); }
    };

    const applyAISuggestions = async () => {
        if (!promptHistoryId) return;
        try {
            const res = await fetch("/api/ai/suggest/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ promptHistoryId }),
            });
            if (res.ok) {
                toast.success("AI önerileri uygulandı!");
                setAiSuggestions(null);
                setAiPrompt("");
                fetchProject();
            } else { toast.error("Öneriler uygulanamadı"); }
        } catch { toast.error("Bir hata oluştu"); }
    };

    /* ── Render ── */

    const handleRender = async () => {
        if (!project || allLayers.length === 0) {
            toast.error("Render için katman gerekli");
            return;
        }
        setRendering(true);
        setRenderProgress(0);
        setRenderStatus("Başlatılıyor...");

        try {
            const renderLayers: RenderLayer[] = allLayers
                .filter((l) => visibleLayers.has(l.id))
                .map((l) => ({
                    id: l.id,
                    name: l.name,
                    svgContent: l.svgContent,
                    animation: l.layerAnimations[0] || null,
                }));

            const config: RenderConfig = {
                width: renderWidth,
                height: renderHeight,
                fps: renderFps,
                durationMs: renderDuration,
                backgroundColor: renderBg,
                backgroundType: bgType,
                backgroundGradient: bgType === "gradient" ? bgGradient : null,
                layers: renderLayers,
            };

            const blob = await renderToVideo(config, (progress, status) => {
                setRenderProgress(Math.round(progress * 100));
                setRenderStatus(status);
            });

            const ext = getVideoExtension();
            const filename = `${project.name.replace(/[^a-zA-Z0-9ğüşöçıÖÇŞİĞÜ ]/g, "_")}.${ext}`;
            downloadBlob(blob, filename);
            toast.success("Video indirildi!");
        } catch (err) {
            console.error("Render error:", err);
            toast.error("Render sırasında hata oluştu");
        } finally {
            setRendering(false);
            setRenderProgress(0);
            setRenderStatus("");
        }
    };

    /* ── Animation preview ── */

    const getLayerStyle = (layer: Layer): React.CSSProperties => {
        if (!visibleLayers.has(layer.id)) return { display: "none" };
        const anim = layer.layerAnimations[0];
        if (!anim) return { opacity: 1 };

        // When idle (not playing, at time 0), show the fully composed state
        if (!isPlaying && currentTime === 0) return { opacity: anim.toOpacity };

        // Use the SHARED animation calculator — identical to the render engine
        const state = calcAnimationState(
            anim,
            currentTime,
            renderWidth,   // Use render dimensions for consistent slide offsets
            renderHeight
        );

        // Scale slide offsets to preview size (canvas is scaled down from render dims)
        const previewScale = canvasW / renderWidth;
        const translateX = state.translateX * previewScale;
        const translateY = state.translateY * previewScale;

        let transform = "";
        if (translateX !== 0 || translateY !== 0) {
            transform = `translate(${translateX}px, ${translateY}px)`;
        }
        if (state.scale !== 1) {
            transform += ` scale(${state.scale})`;
        }

        return {
            opacity: state.opacity,
            transform: transform || undefined,
            transition: "none",
            clipPath: state.clipProgress < 1
                ? `inset(0 ${(1 - state.clipProgress) * 100}% 0 0)`
                : undefined,
        };
    };

    /* ── Timeline helpers ── */

    const timeToPercent = (ms: number) => (ms / renderDuration) * 100;

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        setCurrentTime(Math.round(percent * renderDuration));
        setIsPlaying(false);
    };

    const handleBarDrag = (layerId: string, type: "move" | "resize", e: React.MouseEvent) => {
        e.stopPropagation();
        const timeline = timelineRef.current;
        if (!timeline) return;

        const layer = allLayers.find((l) => l.id === layerId);
        const anim = layer?.layerAnimations[0];
        if (!anim) return;

        const rect = timeline.getBoundingClientRect();
        const startX = e.clientX;
        const origDelay = anim.delayMs;
        const origDuration = anim.durationMs;

        const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const dMs = Math.round((dx / rect.width) * renderDuration / 50) * 50;
            if (type === "move") {
                updateAnimation(layerId, { delayMs: Math.max(0, origDelay + dMs) });
            } else {
                updateAnimation(layerId, { durationMs: Math.max(100, origDuration + dMs) });
            }
        };

        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    };

    /* ── Render ── */

    if (loading) {
        return (
            <div className="app-layout" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (!project) return null;

    // Canvas preview size: fit into available space while keeping aspect ratio
    const canvasMaxW = 700;
    const canvasScale = Math.min(canvasMaxW / renderWidth, 500 / renderHeight);
    const canvasW = Math.round(renderWidth * canvasScale);
    const canvasH = Math.round(renderHeight * canvasScale);

    return (
        <div className="app-layout">
            <div className="editor-layout-v2">
                {/* ═══ Top Bar ═══ */}
                <div className="editor-topbar">
                    <div className="editor-topbar-title">
                        <Link href="/dashboard" style={{ color: "var(--text-secondary)", display: "flex" }}>
                            <ArrowLeft size={20} />
                        </Link>
                        <h2>{project.name}</h2>
                        <span className={`status-badge status-${project.status}`}>{project.status}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 8 }}>
                            {renderWidth}×{renderHeight} · {renderFps}fps · {(renderDuration / 1000).toFixed(1)}s
                        </span>
                    </div>
                    <div className="editor-topbar-actions">
                        <button className="btn btn-ghost" onClick={() => toast.success("Kaydedildi!")}>
                            <Save size={16} /> Kaydet
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleRender}
                            disabled={rendering || allLayers.length === 0}
                        >
                            {rendering ? (
                                <><Loader2 size={16} className="spin" /> {renderProgress}%</>
                            ) : (
                                <><Download size={16} /> Render Et</>
                            )}
                        </button>
                    </div>
                </div>

                {/* ═══ Main Content ═══ */}
                <div className="editor-main">
                    {/* Left — Layers */}
                    <div className="editor-layers">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <h3 style={{ margin: 0 }}>Katmanlar</h3>
                            <button
                                className="btn btn-ghost"
                                style={{ padding: "4px 10px", fontSize: "0.78rem", gap: 4 }}
                                onClick={handleAddTextLayer}
                            >
                                <Type size={14} /> Metin Ekle
                            </button>
                        </div>
                        {(() => {
                            // Build group headers from metadata
                            const renderedGroups = new Set<string>();
                            return allLayers.map((layer, index) => {
                                const groupName = (layer.metadata as { groupName?: string })?.groupName;
                                const isChild = (layer.metadata as { isGroupChild?: boolean })?.isGroupChild;
                                const elements: React.ReactNode[] = [];

                                // Insert group header before first child of a group
                                if (groupName && !renderedGroups.has(groupName)) {
                                    renderedGroups.add(groupName);
                                    elements.push(
                                        <div key={`group-${groupName}`} className="layer-group-header">
                                            <FolderOpen size={14} />
                                            <span>{groupName}</span>
                                        </div>
                                    );
                                }

                                elements.push(
                                    <div
                                        key={layer.id}
                                        className={`layer-item ${selectedLayerId === layer.id ? "active" : ""} ${dragLayerId === layer.id ? "dragging" : ""} ${isChild ? "layer-child" : ""}`}
                                        onClick={() => setSelectedLayerId(layer.id)}
                                        draggable
                                        onDragStart={() => handleDragStart(layer.id)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(layer.id)}
                                        onDragEnd={() => setDragLayerId(null)}
                                    >
                                        <div
                                            className="layer-color-dot"
                                            style={{ background: LAYER_COLORS[index % LAYER_COLORS.length] }}
                                        />
                                        <GripVertical size={14} className="layer-drag" />
                                        <span className="layer-name">{layer.name}</span>
                                        <div className="layer-actions">
                                            <button
                                                className="layer-btn"
                                                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "up"); }}
                                                disabled={index === 0}
                                                title="Yukarı"
                                            >
                                                <ArrowUp size={12} />
                                            </button>
                                            <button
                                                className="layer-btn"
                                                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, "down"); }}
                                                disabled={index === allLayers.length - 1}
                                                title="Aşağı"
                                            >
                                                <ArrowDown size={12} />
                                            </button>
                                            <button
                                                className="layer-visibility"
                                                onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                                            >
                                                {visibleLayers.has(layer.id) ? <Eye size={14} /> : <EyeOff size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                );
                                return elements;
                            });
                        })()}

                        {allLayers.length === 0 && (
                            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: 20 }}>
                                Katman bulunamadı
                            </p>
                        )}
                    </div>

                    {/* Center — Canvas */}
                    <div className="editor-canvas">
                        <div
                            className="canvas-svg-container"
                            style={{
                                background: bgType === "transparent"
                                    ? "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px"
                                    : bgType === "gradient"
                                        ? bgGradient.type === "radial"
                                            ? `radial-gradient(circle, ${bgGradient.color1}, ${bgGradient.color2})`
                                            : `linear-gradient(${bgGradient.angle}deg, ${bgGradient.color1}, ${bgGradient.color2})`
                                        : renderBg,
                                width: canvasW,
                                height: canvasH,
                            }}
                        >
                            <div style={{ position: "relative", width: "100%", height: "100%" }}>
                                {allLayers.map((layer) => {
                                    const imgUrl = layerImageUrls.get(layer.id);
                                    if (!imgUrl) return null;
                                    return (
                                        <img
                                            key={layer.id}
                                            src={imgUrl}
                                            alt={layer.name}
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "contain",
                                                ...getLayerStyle(layer),
                                                cursor: "pointer",
                                                outline: selectedLayerId === layer.id ? "2px solid var(--accent-purple)" : "none",
                                                outlineOffset: -2,
                                            }}
                                            onClick={() => setSelectedLayerId(layer.id)}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Playback */}
                        <div className="canvas-controls">
                            <button onClick={() => {
                                if (isPlaying) {
                                    setIsPlaying(false);
                                    if (audioRef.current) audioRef.current.pause();
                                } else {
                                    if (currentTime >= renderDuration) setCurrentTime(0);
                                    setIsPlaying(true);
                                }
                            }}>
                                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <button onClick={() => {
                                setIsPlaying(false); setCurrentTime(0);
                                if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
                            }}>
                                <RotateCcw size={18} />
                            </button>
                            <button
                                onClick={() => setIsLooping(!isLooping)}
                                title={isLooping ? "Loop Kapat" : "Loop Aç"}
                                style={{ color: isLooping ? "var(--accent-purple)" : "var(--text-muted)" }}
                            >
                                <Repeat2 size={18} />
                            </button>
                            {audioUrl && <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', marginLeft: 4 }}>🔊 Ses</span>}
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", minWidth: 80, textAlign: "center" }}>
                                {(currentTime / 1000).toFixed(1)}s / {(renderDuration / 1000).toFixed(1)}s
                            </span>
                        </div>
                    </div>

                    {/* Right — Settings */}
                    <div className="editor-settings">
                        {/* Text Layer Editing */}
                        {selectedLayer && (selectedLayer as unknown as { isTextLayer?: boolean }).isTextLayer ? (
                            <>
                                <h3>Metin Ayarları</h3>
                                <p style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 12, color: "var(--accent-purple)" }}>
                                    <Type size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                                    {selectedLayer.name}
                                </p>

                                <div className="settings-group">
                                    <label>Metin İçeriği</label>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        value={(selectedLayer as unknown as { textContent?: string }).textContent || ""}
                                        onChange={(e) => handleUpdateTextLayer(selectedLayer.id, { textContent: e.target.value })}
                                        style={{ resize: "vertical", fontSize: "0.85rem" }}
                                    />
                                </div>

                                <div className="settings-group">
                                    <label>Font</label>
                                    <select
                                        value={(selectedLayer as unknown as { fontFamily?: string }).fontFamily || "Inter"}
                                        onChange={(e) => handleUpdateTextLayer(selectedLayer.id, { fontFamily: e.target.value })}
                                    >
                                        {FONT_OPTIONS.map((f) => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="settings-group">
                                    <label>Boyut: {(selectedLayer as unknown as { fontSize?: number }).fontSize || 48}px</label>
                                    <input type="range" min={12} max={200} step={2}
                                        value={(selectedLayer as unknown as { fontSize?: number }).fontSize || 48}
                                        onChange={(e) => handleUpdateTextLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) })} />
                                </div>

                                <div className="settings-group">
                                    <label>Renk</label>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <input
                                            type="color"
                                            value={(selectedLayer as unknown as { fontColor?: string }).fontColor || "#FFFFFF"}
                                            onChange={(e) => handleUpdateTextLayer(selectedLayer.id, { fontColor: e.target.value })}
                                            style={{ width: 36, height: 28, padding: 0, border: "none", borderRadius: 4, cursor: "pointer" }}
                                        />
                                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                            {(selectedLayer as unknown as { fontColor?: string }).fontColor || "#FFFFFF"}
                                        </span>
                                    </div>
                                </div>

                                <div className="settings-group">
                                    <label>Hizalama</label>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {(["left", "center", "right"] as const).map((align) => (
                                            <button
                                                key={align}
                                                className={`btn btn-ghost ${(selectedLayer as unknown as { textAlign?: string }).textAlign === align ? "active" : ""}`}
                                                style={{ padding: "6px 12px", flex: 1 }}
                                                onClick={() => handleUpdateTextLayer(selectedLayer.id, { textAlign: align })}
                                            >
                                                {align === "left" ? <AlignLeft size={14} /> : align === "center" ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="settings-group">
                                    <label>Kalınlık</label>
                                    <select
                                        value={(selectedLayer as unknown as { fontWeight?: number }).fontWeight || 600}
                                        onChange={(e) => handleUpdateTextLayer(selectedLayer.id, { fontWeight: parseInt(e.target.value) })}
                                    >
                                        <option value={300}>Light (300)</option>
                                        <option value={400}>Regular (400)</option>
                                        <option value={500}>Medium (500)</option>
                                        <option value={600}>Semibold (600)</option>
                                        <option value={700}>Bold (700)</option>
                                        <option value={800}>Extra Bold (800)</option>
                                        <option value={900}>Black (900)</option>
                                    </select>
                                </div>

                                <hr style={{ border: "none", borderTop: "1px solid var(--border-glass)", margin: "16px 0" }} />

                                <h3>Animasyon Ayarları</h3>
                                {selectedAnimation ? (
                                    <>
                                        <div className="settings-group">
                                            <label>Animasyon Tipi</label>
                                            <select
                                                value={selectedAnimation.animationType}
                                                onChange={(e) => updateAnimation(selectedLayer.id, { animationType: e.target.value })}
                                            >
                                                {ANIMATION_TYPES.map((t) => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="settings-group">
                                            <label>Süre: {selectedAnimation.durationMs}ms</label>
                                            <input type="range" min={100} max={5000} step={100}
                                                value={selectedAnimation.durationMs}
                                                onChange={(e) => updateAnimation(selectedLayer.id, { durationMs: parseInt(e.target.value) })} />
                                        </div>
                                        <div className="settings-group">
                                            <label>Gecikme: {selectedAnimation.delayMs}ms</label>
                                            <input type="range" min={0} max={10000} step={100}
                                                value={selectedAnimation.delayMs}
                                                onChange={(e) => updateAnimation(selectedLayer.id, { delayMs: parseInt(e.target.value) })} />
                                        </div>
                                    </>
                                ) : (
                                    <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Animasyon ayarı yok.</p>
                                )}

                                <button
                                    className="btn btn-ghost"
                                    style={{ width: "100%", marginTop: 16, color: "var(--accent-red, #ef4444)", borderColor: "rgba(239,68,68,0.3)" }}
                                    onClick={() => handleDeleteTextLayer(selectedLayer.id)}
                                >
                                    <Trash2 size={14} /> Metin Katmanını Sil
                                </button>
                            </>
                        ) : (
                            <>
                                <h3>Animasyon Ayarları</h3>

                                {selectedLayer && selectedAnimation ? (
                                    <>
                                        <p style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 16, color: "var(--accent-purple)" }}>
                                            {selectedLayer.name}
                                        </p>

                                        <div className="settings-group">
                                            <label>Animasyon Tipi</label>
                                            <select
                                                value={selectedAnimation.animationType}
                                                onChange={(e) => updateAnimation(selectedLayer.id, { animationType: e.target.value })}
                                            >
                                                {ANIMATION_TYPES.map((t) => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="settings-group">
                                            <label>Süre: {selectedAnimation.durationMs}ms</label>
                                            <input type="range" min={100} max={5000} step={100}
                                                value={selectedAnimation.durationMs}
                                                onChange={(e) => updateAnimation(selectedLayer.id, { durationMs: parseInt(e.target.value) })} />
                                        </div>

                                        <div className="settings-group">
                                            <label>Gecikme: {selectedAnimation.delayMs}ms</label>
                                            <input type="range" min={0} max={10000} step={100}
                                                value={selectedAnimation.delayMs}
                                                onChange={(e) => updateAnimation(selectedLayer.id, { delayMs: parseInt(e.target.value) })} />
                                        </div>

                                        <div className="settings-group">
                                            <label>Easing</label>
                                            <select
                                                value={selectedAnimation.easing}
                                                onChange={(e) => updateAnimation(selectedLayer.id, { easing: e.target.value })}
                                            >
                                                {EASING_OPTIONS.map((e) => (
                                                    <option key={e.value} value={e.value}>{e.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="settings-group">
                                            <label>Opaklık: {selectedAnimation.fromOpacity} → {selectedAnimation.toOpacity}</label>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <input type="range" min={0} max={1} step={0.1}
                                                    value={selectedAnimation.fromOpacity}
                                                    onChange={(e) => updateAnimation(selectedLayer.id, { fromOpacity: parseFloat(e.target.value) })} />
                                                <input type="range" min={0} max={1} step={0.1}
                                                    value={selectedAnimation.toOpacity}
                                                    onChange={(e) => updateAnimation(selectedLayer.id, { toOpacity: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>

                                        <div className="settings-group">
                                            <label>Ölçek: {selectedAnimation.fromScale}× → {selectedAnimation.toScale}×</label>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <input type="range" min={0} max={2} step={0.1}
                                                    value={selectedAnimation.fromScale}
                                                    onChange={(e) => updateAnimation(selectedLayer.id, { fromScale: parseFloat(e.target.value) })} />
                                                <input type="range" min={0} max={2} step={0.1}
                                                    value={selectedAnimation.toScale}
                                                    onChange={(e) => updateAnimation(selectedLayer.id, { toScale: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </>
                                ) : selectedLayer ? (
                                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                        Bu katman için animasyon ayarı yok.
                                    </p>
                                ) : (
                                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                        Ayarları görmek için bir katman seçin.
                                    </p>
                                )}

                            </>
                        )}
                    </div>
                </div>

                {/* ═══ Bottom Tabs: Timeline / AI / Settings ═══ */}
                <div className="bottom-tabs-container">
                    <div className="bottom-tabs-header">
                        <button
                            className={`bottom-tab ${bottomTab === 'timeline' ? 'active' : ''}`}
                            onClick={() => setBottomTab('timeline')}
                        >
                            <Play size={14} /> Zaman Çizelgesi
                        </button>
                        <button
                            className={`bottom-tab ${bottomTab === 'ai' ? 'active' : ''}`}
                            onClick={() => setBottomTab('ai')}
                        >
                            <Sparkles size={14} /> AI Asistan
                        </button>
                        <button
                            className={`bottom-tab ${bottomTab === 'settings' ? 'active' : ''}`}
                            onClick={() => setBottomTab('settings')}
                        >
                            <Settings2 size={14} /> Render Ayarları
                        </button>
                    </div>

                    {/* Timeline Tab */}
                    {bottomTab === 'timeline' && (
                        <div className="editor-timeline">
                            <div className="timeline-header">
                                <div className="timeline-labels">
                                    {(() => {
                                        const renderedGroups = new Set<string>();
                                        return allLayers.map((layer, index) => {
                                            const groupName = (layer.metadata as { groupName?: string })?.groupName;
                                            const elements: React.ReactNode[] = [];
                                            if (groupName && !renderedGroups.has(groupName)) {
                                                renderedGroups.add(groupName);
                                                elements.push(
                                                    <div key={`tl-group-${groupName}`} className="timeline-label timeline-group-label">
                                                        <FolderOpen size={11} />
                                                        <span>{groupName}</span>
                                                    </div>
                                                );
                                            }
                                            elements.push(
                                                <div
                                                    key={layer.id}
                                                    className={`timeline-label ${selectedLayerId === layer.id ? "active" : ""} ${groupName ? "timeline-label-child" : ""}`}
                                                    onClick={() => setSelectedLayerId(layer.id)}
                                                >
                                                    <div className="layer-color-dot" style={{ background: LAYER_COLORS[index % LAYER_COLORS.length] }} />
                                                    <span>{layer.name}</span>
                                                </div>
                                            );
                                            return elements;
                                        });
                                    })()}
                                </div>
                                <div className="timeline-tracks" ref={timelineRef} onClick={handleTimelineClick}>
                                    {/* Markers */}
                                    <div className="timeline-markers">
                                        {Array.from({ length: Math.ceil(renderDuration / 1000) + 1 }, (_, i) => (
                                            <div key={i} className="timeline-marker" style={{ left: `${timeToPercent(i * 1000)}%` }}>
                                                <span>{i}s</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Playhead */}
                                    <div className="timeline-playhead" style={{ left: `${timeToPercent(currentTime)}%` }} />

                                    {/* Bars */}
                                    {(() => {
                                        const renderedGroups = new Set<string>();
                                        return allLayers.map((layer, index) => {
                                            const groupName = (layer.metadata as { groupName?: string })?.groupName;
                                            const anim = layer.layerAnimations[0];
                                            const elements: React.ReactNode[] = [];

                                            if (groupName && !renderedGroups.has(groupName)) {
                                                renderedGroups.add(groupName);
                                                elements.push(
                                                    <div key={`tl-bar-group-${groupName}`} className="timeline-row timeline-group-row" />
                                                );
                                            }

                                            if (!anim) {
                                                elements.push(<div key={layer.id} className="timeline-row" />);
                                            } else {
                                                const left = timeToPercent(anim.delayMs);
                                                const width = timeToPercent(anim.durationMs);
                                                const color = LAYER_COLORS[index % LAYER_COLORS.length];
                                                elements.push(
                                                    <div key={layer.id} className="timeline-row">
                                                        <div
                                                            className={`timeline-bar ${selectedLayerId === layer.id ? "selected" : ""}`}
                                                            style={{
                                                                left: `${left}%`,
                                                                width: `${Math.max(width, 1)}%`,
                                                                background: `${color}cc`,
                                                                borderColor: selectedLayerId === layer.id ? color : "transparent",
                                                            }}
                                                            onClick={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id); }}
                                                            onMouseDown={(e) => handleBarDrag(layer.id, "move", e)}
                                                        >
                                                            <span className="timeline-bar-label">
                                                                {ANIMATION_TYPES.find((t) => t.value === anim.animationType)?.label || anim.animationType}
                                                            </span>
                                                            <div
                                                                className="timeline-bar-handle"
                                                                onMouseDown={(e) => handleBarDrag(layer.id, "resize", e)}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return elements;
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Tab */}
                    {bottomTab === 'ai' && (
                        <div className="ai-panel">
                            <div className="ai-prompt-row">
                                <textarea
                                    className="ai-prompt-input"
                                    placeholder='Örn: "Logo katmanını soldan kaydırarak getir, alt yazıyı fade-in ile göster, dramatik olsun..."'
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAIPrompt();
                                        }
                                    }}
                                />
                                <button className="btn-ai" onClick={handleAIPrompt} disabled={aiLoading || !aiPrompt.trim()}>
                                    {aiLoading ? (
                                        <><span className="spinner" style={{ width: 16, height: 16 }} /> Düşünüyor...</>
                                    ) : (
                                        <><Sparkles size={16} /> AI ile Animasyonla</>
                                    )}
                                </button>
                            </div>

                            <div className="ai-templates">
                                {AI_TEMPLATES.map((template) => (
                                    <button key={template} className="ai-template-chip" onClick={() => setAiPrompt(template)}>
                                        {template}
                                    </button>
                                ))}
                            </div>

                            {aiSuggestions && (
                                <div style={{
                                    marginTop: 12, padding: 12, borderRadius: "var(--radius-md)",
                                    background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.2)"
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                                            AI Önerileri ({aiSuggestions.length} katman)
                                        </span>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                                                onClick={() => setAiSuggestions(null)}>İptal</button>
                                            <button className="btn btn-primary" style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                                                onClick={applyAISuggestions}>✓ Uygula</button>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        {aiSuggestions.map((s, i) => (
                                            <div key={i} style={{
                                                padding: "6px 10px", borderRadius: "var(--radius-sm)",
                                                background: "rgba(255,255,255,0.05)", fontSize: "0.75rem",
                                                border: "1px solid var(--border-glass)"
                                            }}>
                                                <strong>{s.layerName}</strong>: {s.animationType} ({s.durationMs}ms)
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {project.promptHistory && project.promptHistory.length > 0 && (
                                <details style={{ marginTop: 8 }}>
                                    <summary style={{ cursor: "pointer", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                        <ChevronDown size={14} /> Önceki Promptlar ({project.promptHistory.length})
                                    </summary>
                                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                                        {project.promptHistory.map((h) => (
                                            <button key={h.id} className="ai-template-chip"
                                                style={{ textAlign: "left", justifyContent: "flex-start" }}
                                                onClick={() => setAiPrompt(h.prompt)}>
                                                {h.applied ? "✓ " : ""}{h.prompt.slice(0, 80)}{h.prompt.length > 80 ? "..." : ""}
                                            </button>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                    )}

                    {/* Settings Tab */}
                    {bottomTab === 'settings' && (
                        <div className="bottom-tab-content">
                            <div className="render-settings-body">
                                <div className="render-settings-group">
                                    <label>Çözünürlük Presetleri</label>
                                    <div className="resolution-presets">
                                        {RESOLUTION_PRESETS.map((p) => (
                                            <button
                                                key={p.label}
                                                className={`preset-chip ${renderWidth === p.w && renderHeight === p.h ? "active" : ""}`}
                                                onClick={() => { setRenderWidth(p.w); setRenderHeight(p.h); }}
                                            >
                                                {p.label}
                                                <span>{p.w}×{p.h}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="render-settings-row">
                                    <div className="render-settings-group">
                                        <label>Genişlik (px)</label>
                                        <input
                                            type="number" min={100} max={4096}
                                            value={renderWidth}
                                            onChange={(e) => setRenderWidth(parseInt(e.target.value) || 100)}
                                        />
                                    </div>
                                    <div className="render-settings-group">
                                        <label>Yükseklik (px)</label>
                                        <input
                                            type="number" min={100} max={4096}
                                            value={renderHeight}
                                            onChange={(e) => setRenderHeight(parseInt(e.target.value) || 100)}
                                        />
                                    </div>
                                    <div className="render-settings-group">
                                        <label>FPS</label>
                                        <select value={renderFps} onChange={(e) => setRenderFps(parseInt(e.target.value))}>
                                            <option value={24}>24</option>
                                            <option value={25}>25</option>
                                            <option value={30}>30</option>
                                            <option value={60}>60</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="render-settings-row">
                                    <div className="render-settings-group">
                                        <label>Süre: {(renderDuration / 1000).toFixed(1)}s</label>
                                        <input
                                            type="range" min={1000} max={30000} step={500}
                                            value={renderDuration}
                                            onChange={(e) => setRenderDuration(parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="render-settings-group">
                                        <label>Arka Plan Türü</label>
                                        <div style={{ display: "flex", gap: 4 }}>
                                            {(["solid", "gradient", "transparent"] as const).map((t) => (
                                                <button
                                                    key={t}
                                                    className={`btn btn-ghost ${bgType === t ? "active" : ""}`}
                                                    style={{ padding: "5px 10px", flex: 1, fontSize: "0.75rem" }}
                                                    onClick={() => setBgType(t)}
                                                >
                                                    {t === "solid" ? "■ Düz" : t === "gradient" ? "◓ Gradient" : "□ Şeffaf"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {bgType === "solid" && (
                                        <div className="render-settings-group">
                                            <label>Renk</label>
                                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                <input
                                                    type="color" value={renderBg}
                                                    onChange={(e) => setRenderBg(e.target.value)}
                                                    style={{ width: 36, height: 28, padding: 0, border: "none", borderRadius: 4, cursor: "pointer" }}
                                                />
                                                <input type="text" value={renderBg}
                                                    onChange={(e) => setRenderBg(e.target.value)}
                                                    style={{ flex: 1, padding: "4px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-glass)", borderRadius: 4, color: "var(--text-primary)", fontSize: "0.8rem" }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {bgType === "gradient" && (
                                        <>
                                            <div className="render-settings-group">
                                                <label>Tür</label>
                                                <div style={{ display: "flex", gap: 4 }}>
                                                    <button className={`btn btn-ghost ${bgGradient.type === "linear" ? "active" : ""}`}
                                                        style={{ flex: 1, padding: "5px 10px", fontSize: "0.75rem" }}
                                                        onClick={() => setBgGradient({ ...bgGradient, type: "linear" })}>Linear</button>
                                                    <button className={`btn btn-ghost ${bgGradient.type === "radial" ? "active" : ""}`}
                                                        style={{ flex: 1, padding: "5px 10px", fontSize: "0.75rem" }}
                                                        onClick={() => setBgGradient({ ...bgGradient, type: "radial" })}>Radial</button>
                                                </div>
                                            </div>
                                            <div className="render-settings-row">
                                                <div className="render-settings-group">
                                                    <label>Renk 1</label>
                                                    <input type="color" value={bgGradient.color1}
                                                        onChange={(e) => setBgGradient({ ...bgGradient, color1: e.target.value })}
                                                        style={{ width: "100%", height: 28, padding: 0, border: "none", borderRadius: 4, cursor: "pointer" }} />
                                                </div>
                                                <div className="render-settings-group">
                                                    <label>Renk 2</label>
                                                    <input type="color" value={bgGradient.color2}
                                                        onChange={(e) => setBgGradient({ ...bgGradient, color2: e.target.value })}
                                                        style={{ width: "100%", height: 28, padding: 0, border: "none", borderRadius: 4, cursor: "pointer" }} />
                                                </div>
                                            </div>
                                            {bgGradient.type === "linear" && (
                                                <div className="render-settings-group">
                                                    <label>Açı: {bgGradient.angle}°</label>
                                                    <input type="range" min={0} max={360} step={5}
                                                        value={bgGradient.angle}
                                                        onChange={(e) => setBgGradient({ ...bgGradient, angle: parseInt(e.target.value) })} />
                                                </div>
                                            )}
                                            <div style={{
                                                height: 32, borderRadius: 6, marginTop: 4,
                                                background: bgGradient.type === "radial"
                                                    ? `radial-gradient(circle, ${bgGradient.color1}, ${bgGradient.color2})`
                                                    : `linear-gradient(${bgGradient.angle}deg, ${bgGradient.color1}, ${bgGradient.color2})`
                                            }} />
                                        </>
                                    )}

                                    {bgType === "transparent" && (
                                        <div style={{ padding: 8, fontSize: "0.78rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                                            Şeffaf arka plan, WebM formatında alfa kanalı ile desteği aktif olacaktır.
                                        </div>
                                    )}
                                </div>

                                <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={saveRenderSettings}>
                                    <Save size={16} /> Ayarları Kaydet & Uygula
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
