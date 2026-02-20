import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; layerId: string }> }
) {
    try {
        const { id, layerId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;
        const body = await request.json();

        // Verify ownership
        const project = await prisma.project.findFirst({
            where: { id, userId },
            include: {
                animationPresets: {
                    where: { isActive: true },
                    take: 1,
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
        }

        const preset = project.animationPresets[0];
        if (!preset) {
            return NextResponse.json({ error: "Preset bulunamadı" }, { status: 400 });
        }

        const animation = await prisma.layerAnimation.upsert({
            where: {
                animationPresetId_layerId: {
                    animationPresetId: preset.id,
                    layerId,
                },
            },
            update: {
                animationType: body.animationType,
                delayMs: body.delayMs,
                durationMs: body.durationMs,
                easing: body.easing,
                direction: body.direction,
                fromOpacity: body.fromOpacity,
                toOpacity: body.toOpacity,
                fromScale: body.fromScale,
                toScale: body.toScale,
                keyframes: body.keyframes ?? undefined,
                sortOrder: body.sortOrder,
            },
            create: {
                animationPresetId: preset.id,
                layerId,
                sortOrder: body.sortOrder || 0,
                animationType: body.animationType || "fadeIn",
                delayMs: body.delayMs || 0,
                durationMs: body.durationMs || 500,
                easing: body.easing || "easeInOut",
                fromOpacity: body.fromOpacity ?? 0,
                toOpacity: body.toOpacity ?? 1,
                keyframes: body.keyframes ?? undefined,
            },
        });

        return NextResponse.json(animation);
    } catch (error) {
        console.error("Layer animation update error:", error);
        return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
    }
}
