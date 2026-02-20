"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
    Layers, Plus, LogOut, Calendar, FileText, Film,
    Search, Filter, Trash2, ChevronLeft, ChevronRight,
    X, Sparkles, Mic, MicOff, Upload, Loader2, Music,
    AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

interface Project {
    id: string;
    name: string;
    description?: string;
    status: string;
    width: number;
    height: number;
    createdAt: string;
    _count?: { sourceFiles: number; renderJobs: number };
}

interface PaginatedResponse {
    projects: Project[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const router = useRouter();

    /* ── Project list state ── */
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const LIMIT = 12;

    /* ── Modal state ── */
    const [showModal, setShowModal] = useState(false);
    const [modalTab, setModalTab] = useState<"upload" | "ai">("upload");

    /* ── Upload state ── */
    const [uploading, setUploading] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [dragOver, setDragOver] = useState(false);

    /* ── AI creation state ── */
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiProgress, setAiProgress] = useState("");

    /* ── Voice recording state ── */
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioFileName, setAudioFileName] = useState("");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    /* ── Delete state ── */
    const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
    const [deleting, setDeleting] = useState(false);

    /* ────────── Fetch projects ────────── */
    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(LIMIT),
            });
            if (searchQuery) params.set("search", searchQuery);
            if (statusFilter !== "all") params.set("status", statusFilter);

            const res = await fetch(`/api/projects?${params}`);
            if (res.ok) {
                const data: PaginatedResponse = await res.json();
                setProjects(data.projects);
                setTotalPages(data.totalPages);
                setTotalCount(data.total);
            }
        } catch {
            toast.error("Projeler yüklenemedi");
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, statusFilter]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Debounced search
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            // fetchProjects will be triggered by state change
        }, 300);
    };

    /* ────────── Upload ────────── */
    const handleUpload = async (file: File) => {
        if (!file) return;
        const ext = file.name.toLowerCase().split(".").pop();
        if (!["svg", "ai"].includes(ext || "")) {
            toast.error("Sadece SVG ve AI dosyaları desteklenir");
            return;
        }
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", projectName || file.name.replace(/\.[^/.]+$/, ""));

        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (res.ok) {
                const data = await res.json();
                toast.success("Proje oluşturuldu!");
                router.push(`/projects/${data.projectId}`);
            } else {
                const error = await res.json();
                toast.error(error.error || "Yükleme başarısız");
            }
        } catch {
            toast.error("Yükleme sırasında bir hata oluştu");
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    /* ────────── Delete ────────── */
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Proje silindi");
                setDeleteTarget(null);
                fetchProjects();
            } else {
                toast.error("Silme başarısız");
            }
        } catch {
            toast.error("Silme sırasında hata oluştu");
        } finally {
            setDeleting(false);
        }
    };

    /* ────────── Voice recording ────────── */
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                setAudioFileName("ses_kaydi.webm");
                stream.getTracks().forEach((t) => t.stop());
            };
            mediaRecorder.start(100);
            setIsRecording(true);
            setRecordingSeconds(0);

            // Auto-stop at 120 seconds (2 minutes)
            recordingTimerRef.current = setInterval(() => {
                setRecordingSeconds((prev) => {
                    if (prev >= 119) {
                        stopRecording();
                        return 120;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch {
            toast.error("Mikrofon erişimi reddedildi");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    const handleAudioFileUpload = (file: File) => {
        const validTypes = ["audio/mp3", "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/m4a", "audio/mp4"];
        const ext = file.name.toLowerCase().split(".").pop();
        const validExts = ["mp3", "wav", "ogg", "webm", "m4a", "mp4", "aac"];

        if (!validTypes.includes(file.type) && !validExts.includes(ext || "")) {
            toast.error("Desteklenen ses formatları: MP3, WAV, OGG, M4A, WebM");
            return;
        }
        setAudioBlob(file);
        setAudioFileName(file.name);
    };

    /* ────────── AI Project Creation ────────── */
    const handleAiGenerate = async () => {
        if (!aiPrompt.trim() && !audioBlob) {
            toast.error("Lütfen bir açıklama yazın veya ses kaydı ekleyin");
            return;
        }

        setAiGenerating(true);
        setAiProgress("AI projeyi planlıyor...");

        try {
            const formData = new FormData();
            formData.append("prompt", aiPrompt);
            if (audioBlob) {
                formData.append("audio", audioBlob, audioFileName || "recording.webm");
            }

            setAiProgress("Animasyon tasarımı oluşturuluyor...");

            const res = await fetch("/api/ai/generate-project", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setAiProgress("Proje oluşturuldu! Yönlendiriliyor...");
                toast.success("AI projesi oluşturuldu!");
                router.push(`/projects/${data.projectId}`);
            } else {
                const error = await res.json();
                toast.error(error.error || "AI proje oluşturma başarısız");
            }
        } catch {
            toast.error("AI proje oluşturma sırasında hata");
        } finally {
            setAiGenerating(false);
            setAiProgress("");
        }
    };

    const resetModal = () => {
        setShowModal(false);
        setModalTab("upload");
        setProjectName("");
        setAiPrompt("");
        setAudioBlob(null);
        setAudioFileName("");
        setAiGenerating(false);
        setAiProgress("");
    };

    /* ────────── Template chips ────────── */
    const aiTemplates = [
        "Şirket logosu animasyonlu intro",
        "Sosyal medya hikaye tasarımı",
        "Ürün tanıtım animasyonu",
        "Motivasyon sözü animasyonu",
        "Doğum günü kutlama kartı",
        "İndirim kampanya banner",
    ];

    /* ────────── Pagination helpers ────────── */
    const pageNumbers = () => {
        const pages: number[] = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    return (
        <div className="app-layout">
            {/* Topbar */}
            <div className="app-topbar">
                <Link href="/dashboard" className="navbar-brand">
                    <Layers size={24} />
                    <span>LayerMotion</span>
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                        {session?.user?.name || session?.user?.email}
                    </span>
                    <button className="btn btn-ghost" onClick={() => signOut({ callbackUrl: "/" })}>
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="app-content">
                <div className="page-header">
                    <h1>Projelerim</h1>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        Yeni Proje
                    </button>
                </div>

                {/* ── Search & Filter Bar ── */}
                <div className="filter-bar">
                    <div className="search-box">
                        <Search size={16} />
                        <input
                            placeholder="Proje ara..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="search-clear" onClick={() => { setSearchQuery(""); setCurrentPage(1); }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="filter-group">
                        <Filter size={16} />
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                            <option value="all">Tüm Durumlar</option>
                            <option value="ready">Hazır</option>
                            <option value="processing">İşleniyor</option>
                            <option value="draft">Taslak</option>
                            <option value="error">Hatalı</option>
                        </select>
                    </div>
                    {totalCount > 0 && (
                        <span className="project-count">{totalCount} proje</span>
                    )}
                </div>

                {/* ── New Project Modal ── */}
                {showModal && (
                    <div className="modal-backdrop" onClick={resetModal}>
                        <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: 560, width: "95%" }}>

                            {/* Tab headers */}
                            <div className="modal-tabs">
                                <button
                                    className={`modal-tab ${modalTab === "upload" ? "active" : ""}`}
                                    onClick={() => setModalTab("upload")}
                                >
                                    <Upload size={16} /> Dosya Yükle
                                </button>
                                <button
                                    className={`modal-tab ${modalTab === "ai" ? "active" : ""}`}
                                    onClick={() => setModalTab("ai")}
                                >
                                    <Sparkles size={16} /> AI ile Oluştur
                                </button>
                            </div>

                            {/* Tab: File Upload */}
                            {modalTab === "upload" && (
                                <div className="modal-body">
                                    <div className="input-group" style={{ marginBottom: 20 }}>
                                        <label>Proje Adı</label>
                                        <input
                                            className="input"
                                            placeholder="Projeme bir isim ver..."
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                        />
                                    </div>
                                    <div
                                        className={`drop-zone glass-card ${dragOver ? "active" : ""}`}
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleDrop}
                                        onClick={() => {
                                            const input = document.createElement("input");
                                            input.type = "file";
                                            input.accept = ".svg,.ai";
                                            input.onchange = (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0];
                                                if (file) handleUpload(file);
                                            };
                                            input.click();
                                        }}
                                    >
                                        {uploading ? (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                                                <Loader2 size={32} className="spin" />
                                                <p style={{ color: "var(--text-secondary)" }}>Yükleniyor ve işleniyor...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📁</div>
                                                <p style={{ fontWeight: 500, marginBottom: 4 }}>SVG veya AI dosyanızı sürükleyin</p>
                                                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                                    veya tıklayarak dosya seçin
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab: AI Create */}
                            {modalTab === "ai" && (
                                <div className="modal-body">
                                    {aiGenerating ? (
                                        <div className="ai-generating">
                                            <div className="ai-generating-spinner">
                                                <Sparkles size={40} className="spin-slow" />
                                            </div>
                                            <h3>{aiProgress || "Oluşturuluyor..."}</h3>
                                            <p>AI animasyon tasarımınızı hazırlıyor.<br />Bu işlem birkaç saniye sürebilir.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="input-group" style={{ marginBottom: 16 }}>
                                                <label>Animasyon açıklaması</label>
                                                <textarea
                                                    className="input ai-create-textarea"
                                                    placeholder="Ne tür bir animasyon istediğinizi açıklayın...&#10;&#10;Örn: 'Teknoloji şirketim için modern bir logo animasyonu. Mavi tonlarda, geometrik şekillerle, profesyonel ve akıcı bir giriş animasyonu olsun.'"
                                                    rows={4}
                                                    value={aiPrompt}
                                                    onChange={(e) => setAiPrompt(e.target.value)}
                                                />
                                            </div>

                                            {/* Template chips */}
                                            <div className="ai-template-chips" style={{ marginBottom: 16 }}>
                                                {aiTemplates.map((t) => (
                                                    <button
                                                        key={t}
                                                        className="template-chip"
                                                        onClick={() => setAiPrompt(t)}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Audio section */}
                                            <div className="audio-section">
                                                <label>🎤 Ses Ekle <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(opsiyonel)</span></label>
                                                <p className="audio-hint">
                                                    Ses kaydı yaparak veya ses dosyası yükleyerek AI&apos;ın sese uygun animasyon oluşturmasını sağlayın.
                                                </p>

                                                <div className="audio-controls">
                                                    {/* Mic record */}
                                                    <button
                                                        className={`btn ${isRecording ? "btn-danger" : "btn-ghost"} btn-mic`}
                                                        onClick={isRecording ? stopRecording : startRecording}
                                                    >
                                                        {isRecording ? <><MicOff size={16} /> Kaydı Durdur</> : <><Mic size={16} /> Ses Kaydet</>}
                                                    </button>

                                                    {/* File upload */}
                                                    <button
                                                        className="btn btn-ghost"
                                                        onClick={() => {
                                                            const inp = document.createElement("input");
                                                            inp.type = "file";
                                                            inp.accept = "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm";
                                                            inp.onchange = (e) => {
                                                                const f = (e.target as HTMLInputElement).files?.[0];
                                                                if (f) handleAudioFileUpload(f);
                                                            };
                                                            inp.click();
                                                        }}
                                                    >
                                                        <Music size={16} /> Ses Dosyası Yükle
                                                    </button>
                                                </div>

                                                {/* Show current audio */}
                                                {audioBlob && (
                                                    <div className="audio-preview">
                                                        <Music size={14} />
                                                        <span>{audioFileName}</span>
                                                        <button onClick={() => { setAudioBlob(null); setAudioFileName(""); }}>
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}

                                                {isRecording && (
                                                    <div className="recording-indicator">
                                                        <span className="recording-dot" /> Kayıt yapılıyor... {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')} / 2:00
                                                    </div>
                                                )}
                                            </div>

                                            {/* Generate button */}
                                            <button
                                                className="btn btn-primary btn-generate"
                                                onClick={handleAiGenerate}
                                                disabled={!aiPrompt.trim() && !audioBlob}
                                            >
                                                <Sparkles size={18} />
                                                AI ile Proje Oluştur
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Delete Confirm ── */}
                {deleteTarget && (
                    <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
                        <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: 420, width: "90%", padding: 32 }}>
                            <div style={{ textAlign: "center" }}>
                                <AlertTriangle size={48} color="var(--accent-red, #ef4444)" style={{ marginBottom: 16 }} />
                                <h3 style={{ marginBottom: 8 }}>Projeyi Sil</h3>
                                <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
                                    <strong>&quot;{deleteTarget.name}&quot;</strong> projesini silmek istediğinize emin misiniz?
                                    Bu işlem geri alınamaz.
                                </p>
                                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                                    <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>İptal</button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                    >
                                        {deleting ? <><Loader2 size={16} className="spin" /> Siliniyor...</> : <><Trash2 size={16} /> Evet, Sil</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Projects Grid ── */}
                {loading ? (
                    <div className="projects-grid">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="glass-card shimmer" style={{ height: 180, borderRadius: "var(--radius-lg)" }} />
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🎬</div>
                        <h3>{searchQuery || statusFilter !== "all" ? "Sonuç bulunamadı" : "Henüz projeniz yok"}</h3>
                        <p>{searchQuery || statusFilter !== "all"
                            ? "Arama kriterlerinizi değiştirmeyi deneyin."
                            : "SVG dosyası yükleyerek veya AI ile ilk projenizi oluşturun."}
                        </p>
                        {!searchQuery && statusFilter === "all" && (
                            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                <Plus size={18} />
                                İlk Projeni Oluştur
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="projects-grid">
                            {projects.map((project) => (
                                <div key={project.id} className="glass-card project-card">
                                    <Link href={`/projects/${project.id}`}
                                        style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
                                        <div className="project-card-header">
                                            <h3>{project.name}</h3>
                                            <span className={`status-badge status-${project.status}`}>{project.status}</span>
                                        </div>
                                        <p>{project.description || `${project.width}×${project.height}`}</p>
                                        <div className="project-card-meta">
                                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <FileText size={14} />
                                                {project._count?.sourceFiles || 0} dosya
                                            </span>
                                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <Film size={14} />
                                                {project._count?.renderJobs || 0} render
                                            </span>
                                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <Calendar size={14} />
                                                {new Date(project.createdAt).toLocaleDateString("tr-TR")}
                                            </span>
                                        </div>
                                    </Link>
                                    <button
                                        className="btn-delete-project"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(project); }}
                                        title="Projeyi sil"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost pagination-btn"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    <ChevronLeft size={16} /> Önceki
                                </button>
                                <div className="pagination-pages">
                                    {pageNumbers().map((p) => (
                                        <button
                                            key={p}
                                            className={`pagination-page ${p === currentPage ? "active" : ""}`}
                                            onClick={() => setCurrentPage(p)}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    className="btn btn-ghost pagination-btn"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    Sonraki <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
