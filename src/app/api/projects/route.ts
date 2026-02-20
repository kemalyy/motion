import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;

        // Parse query params
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12")));
        const search = searchParams.get("search")?.trim() || "";
        const status = searchParams.get("status") || "";
        const sort = searchParams.get("sort") || "newest";

        // Build where clause
        const where: Record<string, unknown> = { userId };
        if (search) {
            where.name = { contains: search, mode: "insensitive" };
        }
        if (status && status !== "all") {
            where.status = status;
        }

        // Build orderBy
        let orderBy: Record<string, string> = { createdAt: "desc" };
        if (sort === "oldest") orderBy = { createdAt: "asc" };
        else if (sort === "name") orderBy = { name: "asc" };
        else if (sort === "updated") orderBy = { updatedAt: "desc" };

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    _count: {
                        select: {
                            sourceFiles: true,
                            renderJobs: true,
                        },
                    },
                },
            }),
            prisma.project.count({ where }),
        ]);

        return NextResponse.json({
            projects,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Projects list error:", error);
        return NextResponse.json({ error: "Projeler yüklenemedi" }, { status: 500 });
    }
}
