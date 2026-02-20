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

        // body.updates = [{ layerId, x, y }]
        const updates = body.updates as Array<{ layerId: string; x: number; y: number }>;
        if (!updates || updates.length === 0) {
            return NextResponse.json({ error: "Güncelleme verisi gerekli" }, { status: 400 });
        }

        // Batch update positions
        await Promise.all(
            updates.map((u) =>
                prisma.layer.update({
                    where: { id: u.layerId },
                    data: { x: u.x, y: u.y },
                }),
            ),
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
