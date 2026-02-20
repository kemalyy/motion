import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// BigInt can't be JSON-serialized — convert to Number
function serializeBigInt(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "bigint") return Number(obj);
    if (Array.isArray(obj)) return obj.map(serializeBigInt);
    if (typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            result[key] = serializeBigInt(value);
        }
        return result;
    }
    return obj;
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;

        const project = await prisma.project.findFirst({
            where: { id, userId },
            include: {
                sourceFiles: {
                    include: {
                        layers: {
                            orderBy: { sortOrder: "asc" },
                            include: {
                                layerAnimations: true,
                            },
                        },
                    },
                },
                animationPresets: {
                    where: { isActive: true },
                    include: {
                        layerAnimations: {
                            orderBy: { sortOrder: "asc" },
                            include: { layer: true },
                        },
                    },
                },
                renderJobs: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
                promptHistory: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
        }

        return NextResponse.json(serializeBigInt(project));
    } catch (error) {
        console.error("Project detail error:", error);
        return NextResponse.json({ error: "Proje yüklenemedi" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;
        const body = await request.json();

        const project = await prisma.project.findFirst({
            where: { id, userId },
        });

        if (!project) {
            return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
        }

        const updated = await prisma.project.update({
            where: { id },
            data: {
                name: body.name,
                description: body.description,
                width: body.width,
                height: body.height,
                fps: body.fps,
                durationMs: body.durationMs,
                backgroundColor: body.backgroundColor,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Project update error:", error);
        return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;

        const project = await prisma.project.findFirst({
            where: { id, userId },
        });

        if (!project) {
            return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
        }

        await prisma.project.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Project delete error:", error);
        return NextResponse.json({ error: "Silme başarısız" }, { status: 500 });
    }
}
