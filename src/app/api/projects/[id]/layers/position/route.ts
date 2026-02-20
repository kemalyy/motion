import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;
        const body = await request.json();

        // Verify project ownership
        const project = await prisma.project.findFirst({
            where: { id, userId },
        });
        if (!project) {
            return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
        }

        // body.updates = [{ layerId, x?, y?, width?, height? }]
        const updates = body.updates as Array<{ layerId: string; x?: number; y?: number; width?: number; height?: number }>;
        if (!updates || updates.length === 0) {
            return NextResponse.json({ error: "Güncelleme verisi gerekli" }, { status: 400 });
        }

        // Batch update positions and dimensions
        await Promise.all(
            updates.map((u) => {
                const data: Record<string, number> = {};
                if (u.x !== undefined) data.x = u.x;
                if (u.y !== undefined) data.y = u.y;
                if (u.width !== undefined) data.width = u.width;
                if (u.height !== undefined) data.height = u.height;
                return prisma.layer.update({
                    where: { id: u.layerId },
                    data,
                });
            }),
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Layer position update error:", error);
        return NextResponse.json(
            { error: "Pozisyon güncellenemedi" },
            { status: 500 },
        );
    }
}
