import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

        // Verify ownership
        const project = await prisma.project.findFirst({
            where: { id, userId },
        });

        if (!project) {
            return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
        }

        // body.order = [{ id: "layer-id", sortOrder: 0 }, ...]
        const updates = (body.order as { id: string; sortOrder: number }[]).map(
            (item) =>
                prisma.layer.update({
                    where: { id: item.id },
                    data: { sortOrder: item.sortOrder },
                })
        );

        await prisma.$transaction(updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Layer reorder error:", error);
        return NextResponse.json({ error: "Sıralama başarısız" }, { status: 500 });
    }
}
