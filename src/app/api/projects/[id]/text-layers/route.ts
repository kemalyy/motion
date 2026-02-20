import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function generateTextSvg(
    text: string,
    width: number,
    height: number,
    fontFamily: string,
    fontSize: number,
    fontColor: string,
    fontWeight: number,
    textAlign: string,
): string {
    // Map textAlign to SVG text-anchor
    const anchorMap: Record<string, string> = {
        left: "start",
        center: "middle",
        right: "end",
    };
    const textAnchor = anchorMap[textAlign] || "middle";
    const xPos = textAlign === "left" ? fontSize * 0.5 : textAlign === "right" ? width - fontSize * 0.5 : width / 2;

    // Split text into lines and calculate positions
    const lines = text.split("\n");
    const lineHeight = fontSize * 1.3;
    const totalTextHeight = lines.length * lineHeight;
    const startY = (height - totalTextHeight) / 2 + fontSize;

    const tspans = lines
        .map(
            (line, i) =>
                `<tspan x='${xPos}' dy='${i === 0 ? 0 : lineHeight}'>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</tspan>`,
        )
        .join("");

    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' width='${width}' height='${height}'>
  <text x='${xPos}' y='${startY}' font-family='${fontFamily}, sans-serif' font-size='${fontSize}' font-weight='${fontWeight}' fill='${fontColor}' text-anchor='${textAnchor}' dominant-baseline='auto'>${tspans}</text>
</svg>`;
}

export async function POST(
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
            include: {
                sourceFiles: { include: { layers: true } },
                animationPresets: { where: { isActive: true }, take: 1 },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
        }

        // Get or create a source file for text layers
        let sourceFile = project.sourceFiles.find(
            (sf: { originalName: string }) => sf.originalName === "text-layers",
        );
        if (!sourceFile) {
            sourceFile = await prisma.sourceFile.create({
                data: {
                    projectId: project.id,
                    originalName: "text-layers",
                    originalPath: "text-layers",
                    format: "text",
                    fileSize: BigInt(0),
                    conversionStatus: "done",
                },
                include: { layers: true },
            });
        }

        const textContent = body.textContent || "Metin";
        const fontFamily = body.fontFamily || "Inter";
        const fontSize = body.fontSize || 48;
        const fontColor = body.fontColor || "#FFFFFF";
        const textAlign = body.textAlign || "center";
        const fontWeight = body.fontWeight || 600;

        // Count existing layers to determine sort order
        const layerCount = project.sourceFiles.reduce(
            (sum: number, sf: { layers: unknown[] }) => sum + sf.layers.length,
            0,
        );

        const svgContent = generateTextSvg(
            textContent,
            project.width,
            project.height,
            fontFamily,
            fontSize,
            fontColor,
            fontWeight,
            textAlign,
        );

        const layer = await prisma.layer.create({
            data: {
                sourceFileId: sourceFile.id,
                name: `Metin: ${textContent.slice(0, 20)}${textContent.length > 20 ? "..." : ""}`,
                sortOrder: layerCount,
                svgContent,
                x: 0,
                y: 0,
                width: project.width,
                height: project.height,
                isTextLayer: true,
                textContent,
                fontFamily,
                fontSize,
                fontColor,
                textAlign,
                fontWeight,
            },
        });

        // Create default animation for the text layer
        const preset = project.animationPresets[0];
        if (preset) {
            await prisma.layerAnimation.create({
                data: {
                    animationPresetId: preset.id,
                    layerId: layer.id,
                    sortOrder: layerCount,
                    animationType: "fadeIn",
                    delayMs: layerCount * 300,
                    durationMs: 500,
                    easing: "easeInOut",
                    fromOpacity: 0,
                    toOpacity: 1,
                },
            });
        }

        return NextResponse.json(layer);
    } catch (error) {
        console.error("Text layer creation error:", error);
        return NextResponse.json(
            { error: "Metin katmanı oluşturulamadı" },
            { status: 500 },
        );
    }
}
