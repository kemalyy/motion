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
    const anchorMap: Record<string, string> = {
        left: "start",
        center: "middle",
        right: "end",
    };
    const textAnchor = anchorMap[textAlign] || "middle";
    const xPos = textAlign === "left" ? fontSize * 0.5 : textAlign === "right" ? width - fontSize * 0.5 : width / 2;

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

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; textLayerId: string }> },
) {
    try {
        const { id, textLayerId } = await params;
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

        // Get existing layer
        const existingLayer = await prisma.layer.findUnique({
            where: { id: textLayerId },
        });
        if (!existingLayer || !existingLayer.isTextLayer) {
            return NextResponse.json({ error: "Metin katmanı bulunamadı" }, { status: 404 });
        }

        const textContent = body.textContent ?? existingLayer.textContent ?? "Metin";
        const fontFamily = body.fontFamily ?? existingLayer.fontFamily ?? "Inter";
        const fontSize = body.fontSize ?? existingLayer.fontSize ?? 48;
        const fontColor = body.fontColor ?? existingLayer.fontColor ?? "#FFFFFF";
        const textAlign = body.textAlign ?? existingLayer.textAlign ?? "center";
        const fontWeight = body.fontWeight ?? existingLayer.fontWeight ?? 600;

        // Re-generate SVG
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

        const layer = await prisma.layer.update({
            where: { id: textLayerId },
            data: {
                textContent,
                fontFamily,
                fontSize,
                fontColor,
                textAlign,
                fontWeight,
                svgContent,
                name: `Metin: ${textContent.slice(0, 20)}${textContent.length > 20 ? "..." : ""}`,
            },
        });

        return NextResponse.json(layer);
    } catch (error) {
        console.error("Text layer update error:", error);
        return NextResponse.json(
            { error: "Metin katmanı güncellenemedi" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; textLayerId: string }> },
) {
    try {
        const { id, textLayerId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;

        const project = await prisma.project.findFirst({
            where: { id, userId },
        });
        if (!project) {
            return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
        }

        await prisma.layer.delete({
            where: { id: textLayerId },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Text layer delete error:", error);
        return NextResponse.json(
            { error: "Metin katmanı silinemedi" },
            { status: 500 },
        );
    }
}
