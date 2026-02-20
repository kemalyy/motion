import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateProjectFromPrompt } from "@/lib/gemini";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;

        // Parse form data (supports audio file)
        const formData = await request.formData();
        const prompt = (formData.get("prompt") as string) || "";
        const audioFile = formData.get("audio") as File | null;

        if (!prompt.trim() && !audioFile) {
            return NextResponse.json(
                { error: "Prompt veya ses kaydı gerekli" },
                { status: 400 }
            );
        }

        // Convert audio to base64 if provided
        let audioBase64: string | undefined;
        let audioMimeType: string | undefined;
        let savedAudioPath: string | undefined;

        if (audioFile) {
            const audioBuffer = await audioFile.arrayBuffer();
            audioBase64 = Buffer.from(audioBuffer).toString("base64");
            audioMimeType = audioFile.type || "audio/webm";

            // Save audio file to disk
            const audioDir = join(process.cwd(), "uploads", "audio");
            await mkdir(audioDir, { recursive: true });
            const ext = audioFile.name?.split(".").pop() || "webm";
            const audioFileName = `audio_${Date.now()}.${ext}`;
            savedAudioPath = join(audioDir, audioFileName);
            await writeFile(savedAudioPath, Buffer.from(audioBuffer));
        }

        // Call Gemini to generate project plan
        const aiProject = await generateProjectFromPrompt(
            prompt || "Sese uygun profesyonel bir animasyon oluştur",
            audioBase64,
            audioMimeType,
        );

        // Create project
        const project = await prisma.project.create({
            data: {
                userId,
                name: aiProject.name || "AI Projesi",
                description: aiProject.description || prompt,
                status: "ready",
                width: aiProject.width || 1080,
                height: aiProject.height || 1920,
                fps: aiProject.fps || 30,
                durationMs: aiProject.durationMs || 5000,
                backgroundColor: aiProject.backgroundColor || "#1a1a2e",
                audioPath: savedAudioPath || null,
            },
        });

        // Create a virtual source file for AI-generated content
        const sourceFile = await prisma.sourceFile.create({
            data: {
                projectId: project.id,
                originalName: "ai-generated.svg",
                originalPath: "ai-generated",
                format: "svg",
                fileSize: BigInt(0),
                conversionStatus: "done",
            },
        });

        // Create layers from AI output
        const layers = await Promise.all(
            aiProject.layers.map((layerData) =>
                prisma.layer.create({
                    data: {
                        sourceFileId: sourceFile.id,
                        name: layerData.name,
                        sortOrder: layerData.sortOrder,
                        svgContent: layerData.svgContent,
                        x: 0,
                        y: 0,
                        width: layerData.width || aiProject.width,
                        height: layerData.height || aiProject.height,
                        metadata: layerData.groupName ? {
                            groupName: layerData.groupName,
                            isGroupChild: true,
                        } : undefined,
                    },
                })
            )
        );

        // Create animation preset
        const preset = await prisma.animationPreset.create({
            data: {
                projectId: project.id,
                name: "AI Animasyonu",
                isActive: true,
                totalDurationMs: aiProject.durationMs || 5000,
            },
        });

        // Create animations for each layer
        await Promise.all(
            layers.map((layer, index) => {
                const layerData = aiProject.layers[index];
                const anim = layerData.animation;

                return prisma.layerAnimation.create({
                    data: {
                        animationPresetId: preset.id,
                        layerId: layer.id,
                        sortOrder: layerData.sortOrder,
                        animationType: anim?.animationType || "fadeIn",
                        delayMs: anim?.delayMs || index * 300,
                        durationMs: anim?.durationMs || 500,
                        easing: anim?.easing || "easeInOut",
                        fromOpacity: anim?.fromOpacity ?? 0,
                        toOpacity: anim?.toOpacity ?? 1,
                        fromScale: anim?.fromScale ?? 1,
                        toScale: anim?.toScale ?? 1,
                        direction: anim?.direction || null,
                    },
                });
            })
        );

        return NextResponse.json({
            projectId: project.id,
            layerCount: layers.length,
            name: project.name,
        });
    } catch (error) {
        console.error("AI project generation error:", error);
        const message = error instanceof Error ? error.message : "Bilinmeyen hata";
        return NextResponse.json(
            { error: `AI proje oluşturma başarısız: ${message}` },
            { status: 500 }
        );
    }
}
