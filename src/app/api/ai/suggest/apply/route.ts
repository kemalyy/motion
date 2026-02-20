import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface AISuggestion {
    layerId: string | null;
    layerName: string;
    animationType: string;
    delayMs: number;
    durationMs: number;
    easing: string;
    fromOpacity: number;
    toOpacity: number;
    fromScale: number;
    toScale: number;
    direction?: string;
    sortOrder?: number;
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const { promptHistoryId } = await request.json();

        const history = await prisma.promptHistory.findUnique({
            where: { id: promptHistoryId },
            include: {
                project: {
                    include: {
                        animationPresets: {
                            where: { isActive: true },
                            take: 1,
                        },
                    },
                },
            },
        });

        if (!history) {
            return NextResponse.json({ error: "Öneri bulunamadı" }, { status: 404 });
        }

        const preset = history.project.animationPresets[0];
        if (!preset) {
            return NextResponse.json({ error: "Animasyon preset bulunamadı" }, { status: 400 });
        }

        const suggestions = history.aiResponse as unknown as AISuggestion[];

        // Update layer animations AND sort orders based on AI suggestions
        for (const suggestion of suggestions) {
            if (!suggestion.layerId) continue;

            // Update animation
            await prisma.layerAnimation.upsert({
                where: {
                    animationPresetId_layerId: {
                        animationPresetId: preset.id,
                        layerId: suggestion.layerId,
                    },
                },
                update: {
                    animationType: suggestion.animationType,
                    delayMs: suggestion.delayMs,
                    durationMs: suggestion.durationMs,
                    easing: suggestion.easing,
                    fromOpacity: suggestion.fromOpacity,
                    toOpacity: suggestion.toOpacity,
                    fromScale: suggestion.fromScale,
                    toScale: suggestion.toScale,
                    direction: suggestion.direction,
                },
                create: {
                    animationPresetId: preset.id,
                    layerId: suggestion.layerId,
                    sortOrder: suggestion.sortOrder ?? suggestions.indexOf(suggestion),
                    animationType: suggestion.animationType,
                    delayMs: suggestion.delayMs,
                    durationMs: suggestion.durationMs,
                    easing: suggestion.easing,
                    fromOpacity: suggestion.fromOpacity,
                    toOpacity: suggestion.toOpacity,
                    fromScale: suggestion.fromScale,
                    toScale: suggestion.toScale,
                    direction: suggestion.direction,
                },
            });

            // Update layer sort order if AI specified one
            if (suggestion.sortOrder !== undefined && suggestion.sortOrder !== null) {
                await prisma.layer.update({
                    where: { id: suggestion.layerId },
                    data: { sortOrder: suggestion.sortOrder },
                });
            }
        }

        // Mark as applied
        await prisma.promptHistory.update({
            where: { id: promptHistoryId },
            data: { applied: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Apply suggestion error:", error);
        return NextResponse.json({ error: "Öneri uygulanamadı" }, { status: 500 });
    }
}
