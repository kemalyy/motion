import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

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
            select: { audioPath: true },
        });

        if (!project?.audioPath) {
            return NextResponse.json({ error: "Ses dosyası bulunamadı" }, { status: 404 });
        }

        if (!existsSync(project.audioPath)) {
            return NextResponse.json({ error: "Ses dosyası disk üzerinde bulunamadı" }, { status: 404 });
        }

        const audioBuffer = await readFile(project.audioPath);
        const ext = project.audioPath.split(".").pop() || "webm";

        const mimeTypes: Record<string, string> = {
            webm: "audio/webm",
            mp3: "audio/mpeg",
            wav: "audio/wav",
            ogg: "audio/ogg",
            m4a: "audio/mp4",
        };

        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": mimeTypes[ext] || "audio/webm",
                "Content-Length": audioBuffer.length.toString(),
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        console.error("Audio serve error:", error);
        return NextResponse.json({ error: "Ses dosyası yüklenemedi" }, { status: 500 });
    }
}
