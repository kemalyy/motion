import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveFile } from "@/lib/storage";
import { parseSvgLayers, extractSvgDimensions } from "@/lib/svg-parser";
import { convertAiToSvg } from "@/lib/ai-converter";
import { readFile } from "fs/promises";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const projectName = formData.get("name") as string || "Yeni Proje";

        if (!file) {
            return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
        }

        const ext = file.name.toLowerCase().split(".").pop();
        if (!["svg", "ai"].includes(ext || "")) {
            return NextResponse.json({ error: "Desteklenmeyen dosya formatı. SVG veya AI dosyası yükleyin." }, { status: 400 });
        }

        // Save original file to disk
        const saved = await saveFile(file, "originals");

        // Create project
        const project = await prisma.project.create({
            data: {
                userId,
                name: projectName,
                status: "processing",
            },
        });

        // Determine SVG content
        let svgContent: string;
        let svgPath: string;
        let layerManifest: import("@/lib/ai-converter").AiLayerManifest | null = null;

        if (ext === "ai") {
            // Convert AI to SVG using pdf2svg
            try {
                const converted = await convertAiToSvg(saved.path);
                svgContent = converted.svgContent;
                svgPath = converted.svgPath;
                layerManifest = converted.layerManifest;
            } catch (convError) {
                // Update project status to error
                await prisma.project.update({
                    where: { id: project.id },
                    data: { status: "error" },
                });

                // Create source file record with error
                await prisma.sourceFile.create({
                    data: {
                        projectId: project.id,
                        originalName: file.name,
                        originalPath: saved.path,
                        format: "ai",
                        fileSize: BigInt(saved.size),
                        conversionStatus: "failed",
                        conversionError: (convError as Error).message,
                    },
                });

                return NextResponse.json(
                    { error: `AI dosyası dönüştürülemedi: ${(convError as Error).message}` },
                    { status: 500 }
                );
            }
        } else {
            // SVG — read directly
            svgContent = await readFile(saved.path, "utf-8");
            svgPath = saved.path;
        }

        // Create source file record
        const sourceFile = await prisma.sourceFile.create({
            data: {
                projectId: project.id,
                originalName: file.name,
                originalPath: saved.path,
                format: ext || "svg",
                fileSize: BigInt(saved.size),
                conversionStatus: "done",
                svgPath: svgPath,
            },
        });

        // Parse SVG layers (with layer manifest for .ai files)
        const dimensions = extractSvgDimensions(svgContent);
        const parsedLayers = parseSvgLayers(svgContent, layerManifest);

        // Update project dimensions
        await prisma.project.update({
            where: { id: project.id },
            data: {
                width: Math.round(dimensions.width),
                height: Math.round(dimensions.height),
                status: "ready",
            },
        });

        // Create layers
        const layers = await Promise.all(
            parsedLayers.map((layer) =>
                prisma.layer.create({
                    data: {
                        sourceFileId: sourceFile.id,
                        name: layer.name,
                        sortOrder: layer.sortOrder,
                        svgContent: layer.svgContent,
                        x: layer.x,
                        y: layer.y,
                        width: layer.width,
                        height: layer.height,
                        metadata: JSON.parse(JSON.stringify(layer.metadata)),
                    },
                })
            )
        );

        // Create default animation preset
        const preset = await prisma.animationPreset.create({
            data: {
                projectId: project.id,
                name: "Varsayılan",
                isActive: true,
                totalDurationMs: layers.length * 800,
            },
        });

        // Create default animations for each layer
        await Promise.all(
            layers.map((layer, index) =>
                prisma.layerAnimation.create({
                    data: {
                        animationPresetId: preset.id,
                        layerId: layer.id,
                        sortOrder: index,
                        animationType: "fadeIn",
                        delayMs: index * 500,
                        durationMs: 500,
                        easing: "easeInOut",
                        fromOpacity: 0,
                        toOpacity: 1,
                    },
                })
            )
        );

        return NextResponse.json({
            projectId: project.id,
            sourceFileId: sourceFile.id,
            layerCount: layers.length,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Yükleme başarısız" }, { status: 500 });
    }
}
