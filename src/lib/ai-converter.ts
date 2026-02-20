import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { readFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

export interface AiLayerInfo {
    name: string;
    mcName: string;
    elementCount: number;
    fillCount: number;
    strokeCount: number;
}

export interface AiLayerManifest {
    totalLayers: number;
    totalElements: number;
    layers: AiLayerInfo[];
    error?: string;
}

/**
 * Check if Inkscape CLI is available.
 */
async function hasInkscape(): Promise<boolean> {
    try {
        await execAsync("inkscape --version");
        return true;
    } catch {
        return false;
    }
}

/**
 * Extract real layer names & element counts from an .ai (PDF) file.
 * Uses the Python script `scripts/extract-ai-layers.py` which parses
 * PDF OCG (Optional Content Group) structures.
 */
export async function extractAiLayers(aiFilePath: string): Promise<AiLayerManifest | null> {
    const scriptPath = path.resolve("scripts/extract-ai-layers.py");
    if (!existsSync(scriptPath)) {
        console.warn("[ai-converter] extract-ai-layers.py not found at", scriptPath);
        return null;
    }

    try {
        const { stdout } = await execAsync(
            `python3 "${scriptPath}" "${aiFilePath}"`,
            { timeout: 15000 }
        );
        const manifest = JSON.parse(stdout.trim()) as AiLayerManifest;
        if (manifest.error) {
            console.warn("[ai-converter] Layer extraction warning:", manifest.error);
            return null;
        }
        console.log(`[ai-converter] Extracted ${manifest.totalLayers} layers, ${manifest.totalElements} elements from AI file`);
        return manifest;
    } catch (err) {
        console.warn("[ai-converter] Layer extraction failed:", (err as Error).message);
        return null;
    }
}

/**
 * Convert an Adobe Illustrator (.ai) file to SVG.
 *
 * Tries Inkscape first (preserves layer structure as <g> groups),
 * falls back to pdf2svg if Inkscape is not available.
 *
 * Also extracts the real layer manifest from the PDF OCG structure
 * so the SVG parser can group flat elements into their original layers.
 */
export async function convertAiToSvg(aiFilePath: string): Promise<{
    svgPath: string;
    svgContent: string;
    layerManifest: AiLayerManifest | null;
}> {
    const outputDir = path.join(UPLOAD_DIR, "converted");
    if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
    }

    const svgFilename = `${randomUUID()}.svg`;
    const svgPath = path.join(outputDir, svgFilename);

    // Extract layer info from the AI/PDF file (runs in parallel with conversion)
    const layerPromise = extractAiLayers(aiFilePath);

    // Try Inkscape first — it preserves layer names as <g> groups
    if (await hasInkscape()) {
        try {
            await execAsync(
                `inkscape "${aiFilePath}" --export-type=svg --export-plain-svg --export-filename="${svgPath}"`,
                { timeout: 60000 }
            );

            if (existsSync(svgPath)) {
                const svgContent = await readFile(svgPath, "utf-8");
                const layerManifest = await layerPromise;
                console.log("[ai-converter] Inkscape conversion successful (layers preserved)");
                return { svgPath, svgContent, layerManifest };
            }
        } catch (inkErr) {
            console.warn("[ai-converter] Inkscape failed, falling back to pdf2svg:", (inkErr as Error).message);
        }
    }

    // Fallback: pdf2svg (loses layer structure — manifest will be used for grouping)
    try {
        await execAsync(`pdf2svg "${aiFilePath}" "${svgPath}"`, { timeout: 30000 });
    } catch (error) {
        throw new Error(
            `AI dosyası SVG'ye dönüştürülemedi: ${(error as Error).message}`
        );
    }

    if (!existsSync(svgPath)) {
        throw new Error("Dönüştürme başarılı gibi görünüyor ama SVG dosyası oluşturulamadı");
    }

    const svgContent = await readFile(svgPath, "utf-8");
    const layerManifest = await layerPromise;
    console.log("[ai-converter] pdf2svg conversion done, layerManifest:", layerManifest ? `${layerManifest.totalLayers} layers` : "none");
    return { svgPath, svgContent, layerManifest };
}
