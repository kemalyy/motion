import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAnimationSuggestions, describeSvgContent } from "@/lib/gemini";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;
        const { projectId, prompt } = await request.json();

        if (!projectId || !prompt) {
            return NextResponse.json({ error: "Proje ID ve prompt gerekli" }, { status: 400 });
        }

        // Verify project ownership
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId },
            include: {
                sourceFiles: {
                    include: {
                        layers: { orderBy: { sortOrder: "asc" } },
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
        }

        // Collect all layers with SVG content for analysis
        const allLayers = project.sourceFiles.flatMap((sf: { layers: Array<{ id: string; name: string; sortOrder: number; width: number; height: number; svgContent: string }> }) =>
            sf.layers.map((l) => ({
                id: l.id,
                name: l.name,
                sortOrder: l.sortOrder,
                width: l.width,
                height: l.height,
                contentDescription: describeSvgContent(l.svgContent),
            }))
        );

        if (allLayers.length === 0) {
            return NextResponse.json({ error: "Projede katman bulunamadı" }, { status: 400 });
        }

        // Get AI suggestions
        const suggestions = await getAnimationSuggestions(allLayers, prompt);

        // Map suggestions to layers by name
        const mappedSuggestions = suggestions.map((s) => {
            const layer = allLayers.find(
                (l: { id: string; name: string }) => l.name.toLowerCase() === s.layerName.toLowerCase()
            );
            return {
                ...s,
                layerId: layer?.id || null,
            };
        });

        // Save to prompt history
        const history = await prisma.promptHistory.create({
            data: {
                projectId,
                prompt,
                aiResponse: JSON.parse(JSON.stringify(mappedSuggestions)),
                applied: false,
            },
        });

        return NextResponse.json({
            suggestions: mappedSuggestions,
            promptHistoryId: history.id,
        });
    } catch (error) {
        console.error("AI suggest error:", error);
        return NextResponse.json(
            { error: "AI öneri oluşturulamadı" },
            { status: 500 }
        );
    }
}
