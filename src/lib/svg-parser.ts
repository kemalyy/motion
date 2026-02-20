import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { AiLayerManifest } from "./ai-converter";

export interface ParsedLayer {
    name: string;
    sortOrder: number;
    svgContent: string;
    x: number;
    y: number;
    width: number;
    height: number;
    metadata: Record<string, unknown>;
}

/* ──────────────────────────────────────────────
 * Helper: Decode ID patterns
 * ────────────────────────────────────────────── */
function decodeName(id: string): string {
    if (!id) return "";
    return id
        .replace(/_x([0-9A-Fa-f]{2})_/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

/* ──────────────────────────────────────────────
 * Helper: Get a layer name from an element
 * ────────────────────────────────────────────── */
function getElementName($el: cheerio.Cheerio<Element>, fallback: string): string {
    return (
        $el.attr("inkscape:label") ||
        $el.attr("data-name") ||
        $el.attr("aria-label") ||
        decodeName($el.attr("id") || "") ||
        fallback
    );
}

/* ──────────────────────────────────────────────
 * Helper: Name colors in Turkish for layer names
 * ────────────────────────────────────────────── */
function colorToName(fillStr: string, index: number): string {
    if (!fillStr || fillStr === "none") return `Çizgi ${index + 1}`;

    let r = 0, g = 0, b = 0;

    // Parse rgb(x%, y%, z%) format from pdf2svg
    const pctMatch = fillStr.match(/rgb\(([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (pctMatch) {
        r = Math.round(parseFloat(pctMatch[1]) * 2.55);
        g = Math.round(parseFloat(pctMatch[2]) * 2.55);
        b = Math.round(parseFloat(pctMatch[3]) * 2.55);
    }

    // Parse rgb(r, g, b)
    const rgbMatch = fillStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        r = parseInt(rgbMatch[1]);
        g = parseInt(rgbMatch[2]);
        b = parseInt(rgbMatch[3]);
    }

    // Parse hex #RRGGBB
    const hexMatch = fillStr.match(/#([0-9a-fA-F]{6})/);
    if (hexMatch) {
        r = parseInt(hexMatch[1].slice(0, 2), 16);
        g = parseInt(hexMatch[1].slice(2, 4), 16);
        b = parseInt(hexMatch[1].slice(4, 6), 16);
    }

    // Parse hex #RGB
    const hex3Match = fillStr.match(/#([0-9a-fA-F]{3})$/);
    if (hex3Match) {
        r = parseInt(hex3Match[1][0] + hex3Match[1][0], 16);
        g = parseInt(hex3Match[1][1] + hex3Match[1][1], 16);
        b = parseInt(hex3Match[1][2] + hex3Match[1][2], 16);
    }

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;

    if (max - min < 30) {
        if (lightness > 220) return "Beyaz";
        if (lightness > 160) return "Açık Gri";
        if (lightness > 80) return "Gri";
        return "Koyu / Siyah";
    }

    // Determine dominant hue
    if (r > g && r > b) {
        if (g > 150) return "Turuncu / Sarı";
        if (r > 200 && g > 100) return "Somon / Ten";
        return "Kırmızı";
    }
    if (g > r && g > b) {
        if (b > 150) return "Turkuaz";
        return "Yeşil";
    }
    if (b > r && b > g) {
        if (r > 100 && lightness > 150) return "Açık Mavi";
        if (r < 50 && lightness < 100) return "Lacivert";
        return "Mavi";
    }

    return `Renk ${index + 1}`;
}

/* ──────────────────────────────────────────────
 * Helper: Parse bounding box from path d attribute
 * ────────────────────────────────────────────── */
interface PathBounds {
    minX: number; maxX: number;
    minY: number; maxY: number;
    cx: number; cy: number;
}

function getPathBounds($el: cheerio.Cheerio<Element>): PathBounds | null {
    const d = $el.attr("d") || "";
    if (!d) {
        // Try x/y/width/height attributes (rect, circle, etc.)
        const x = parseFloat($el.attr("x") || "0");
        const y = parseFloat($el.attr("y") || "0");
        const w = parseFloat($el.attr("width") || "0");
        const h = parseFloat($el.attr("height") || "0");
        if (w > 0 && h > 0) {
            return { minX: x, maxX: x + w, minY: y, maxY: y + h, cx: x + w / 2, cy: y + h / 2 };
        }
        return null;
    }

    const nums = d.match(/[-]?[\d.]+/g);
    if (!nums || nums.length < 4) return null;

    const values = nums.map(Number);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < values.length - 1; i += 2) {
        xs.push(values[i]);
        ys.push(values[i + 1]);
    }

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/* ══════════════════════════════════════════════
 * MAIN PARSER
 * ══════════════════════════════════════════════ */

/**
 * Parse SVG into layers with smart grouping.
 *
 * Strategy priority:
 * 0. If layerManifest is provided → split by real OCG layer boundaries
 * 1. If SVG has multiple top-level <g> groups → each group = 1 layer (structured SVG)
 * 2. If single root <g> with sub-groups → sub-groups = layers (Illustrator pattern)
 * 3. If flat (pdf2svg output) → **color+spatial clustering** to create meaningful groups
 */
export function parseSvgLayers(svgContent: string, layerManifest?: AiLayerManifest | null): ParsedLayer[] {
    const $ = cheerio.load(svgContent, { xmlMode: true });
    const layers: ParsedLayer[] = [];

    const svg = $("svg");
    const viewBox = svg.attr("viewBox")?.split(" ").map(Number) || [0, 0, 1920, 1080];
    const svgWidth = parseFloat(svg.attr("width")?.replace("pt", "") || String(viewBox[2]));
    const svgHeight = parseFloat(svg.attr("height")?.replace("pt", "") || String(viewBox[3]));

    // Collect ALL shared defs/styles/clipPaths for reuse
    const sharedHtml: string[] = [];
    svg.find("defs, style").each((_i, el) => {
        sharedHtml.push($.html(el) || "");
    });
    // Also grab top-level clipPaths
    svg.children("clipPath").each((_i, el) => {
        const h = $.html(el) || "";
        if (!sharedHtml.includes(h)) sharedHtml.push(h);
    });
    const defsHtml = sharedHtml.length > 0 ? `<defs>${sharedHtml.join("\n")}</defs>` : "";

    const wrapInSvg = (innerHtml: string): string => {
        return `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='${viewBox.join(" ")}' width='${svgWidth}' height='${svgHeight}'>${defsHtml}\n${innerHtml}</svg>`;
    };

    // ── Collect top-level children (skip defs/style/clipPath) ──
    const topChildren = svg.children().toArray().filter((el) => {
        const tag = (el as unknown as { tagName: string }).tagName;
        return !["defs", "style", "clipPath"].includes(tag);
    });

    const topGroups = topChildren.filter(
        (el) => (el as unknown as { tagName: string }).tagName === "g"
    );

    // ════════════════════════════════════════════
    // STRATEGY 0: Layer manifest from AI/PDF OCG extraction
    // Splits flat SVG paths into real Illustrator layers
    // ════════════════════════════════════════════
    if (layerManifest && layerManifest.layers.length > 0) {
        // Collect ALL visible leaf elements (paths, rects, etc.)
        let allLeaves: Element[] = [];
        if (topGroups.length === 1) {
            // pdf2svg pattern: 1 group + many siblings
            const rootGroup = $(topGroups[0]);
            const groupChildren = rootGroup.children().toArray().filter((el) => {
                const tag = (el as unknown as { tagName: string }).tagName;
                return !["defs", "style", "clipPath"].includes(tag);
            });
            const topNonGroups = topChildren.filter(
                (el) => (el as unknown as { tagName: string }).tagName !== "g"
            );
            allLeaves = [...groupChildren, ...topNonGroups] as Element[];
        } else {
            allLeaves = topChildren as Element[];
        }

        // Skip the first element if it's a clip-path-only element (fill="none")
        const firstEl = allLeaves[0] ? $(allLeaves[0]) : null;
        const firstFill = firstEl?.attr("fill") || "";
        const startIdx = (firstFill === "none" || firstEl?.attr("clip-rule")) ? 1 : 0;

        let elementIdx = startIdx;
        let sortOrder = 0;

        for (const layerInfo of layerManifest.layers) {
            const count = layerInfo.elementCount;
            if (count <= 0) continue;

            // Grab the next `count` elements for this layer
            const layerElements = allLeaves.slice(elementIdx, elementIdx + count);
            elementIdx += count;

            if (layerElements.length === 0) continue;

            const layerHtml = layerElements.map((el) => $.html(el)).join("\n");

            layers.push({
                name: layerInfo.name,
                sortOrder: sortOrder++,
                svgContent: wrapInSvg(`<g>${layerHtml}</g>`),
                x: 0, y: 0,
                width: svgWidth, height: svgHeight,
                metadata: {
                    groupName: layerInfo.name,
                    isGroupChild: true,
                    childCount: layerElements.length,
                    sourceLayer: layerInfo.mcName,
                },
            });
        }

        // Any remaining elements go into an "Diğer" layer
        if (elementIdx < allLeaves.length) {
            const remaining = allLeaves.slice(elementIdx);
            if (remaining.length > 0) {
                const remHtml = remaining.map((el) => $.html(el)).join("\n");
                layers.push({
                    name: "Diğer",
                    sortOrder: sortOrder++,
                    svgContent: wrapInSvg(`<g>${remHtml}</g>`),
                    x: 0, y: 0,
                    width: svgWidth, height: svgHeight,
                    metadata: { groupName: "Diğer", isGroupChild: true, childCount: remaining.length },
                });
            }
        }

        if (layers.length > 0) return layers;
    }

    // ════════════════════════════════════════════
    // STRATEGY 1: Multiple top-level <g> groups
    // ════════════════════════════════════════════
    if (topGroups.length > 1) {
        return buildGroupLayers($, topGroups, wrapInSvg, svgWidth, svgHeight, topChildren);
    }

    // ════════════════════════════════════════════
    // STRATEGY 2: Single root <g> with sub-groups
    // ════════════════════════════════════════════
    if (topGroups.length === 1) {
        const rootGroup = $(topGroups[0]);
        const subGroups = rootGroup.children("g").toArray();

        if (subGroups.length > 1) {
            // Sub-groups are the real layers
            const otherElements = rootGroup.children().toArray().filter(
                (el) => !["g", "defs", "style", "clipPath"].includes(
                    (el as unknown as { tagName: string }).tagName
                )
            );
            // Combine with any top-level non-group elements
            const nonGroupBg = topChildren.filter(
                (el) => (el as unknown as { tagName: string }).tagName !== "g"
            );
            const bgElements = [...nonGroupBg, ...otherElements];
            return buildGroupLayers($, subGroups, wrapInSvg, svgWidth, svgHeight, bgElements);
        }

        // Single group, possibly deep nesting
        if (subGroups.length === 1) {
            const inner = $(subGroups[0]);
            const deepGroups = inner.children("g").toArray();
            if (deepGroups.length > 1) {
                return buildGroupLayers($, deepGroups, wrapInSvg, svgWidth, svgHeight, []);
            }
        }

        // ════════════════════════════════════════════
        // STRATEGY 3: Flat elements (pdf2svg output)
        // Collect from BOTH inside the group AND top-level siblings
        // ════════════════════════════════════════════
        const topNonGroups = topChildren.filter(
            (el) => (el as unknown as { tagName: string }).tagName !== "g"
        );
        const groupLeaves = getAllLeafElements($, rootGroup);
        const topLeaves = topNonGroups.map((el) => ({
            element: el,
            $el: $(el),
        }));
        const allElements = [...groupLeaves, ...topLeaves];
        if (allElements.length > 0) {
            return buildColorSpatialLayers($, allElements, wrapInSvg, svgWidth, svgHeight);
        }
    }

    // No groups at all — flat SVG children
    if (topChildren.length > 1) {
        const allElements = topChildren.map((el) => ({
            element: el,
            $el: $(el),
        }));
        return buildColorSpatialLayers($, allElements, wrapInSvg, svgWidth, svgHeight);
    }

    // ════════════════════════════════════════════
    // FALLBACK: entire SVG as single layer
    // ════════════════════════════════════════════
    layers.push({
        name: "Arka Plan",
        sortOrder: 0,
        svgContent: svgContent,
        x: 0, y: 0,
        width: svgWidth, height: svgHeight,
        metadata: {},
    });
    return layers;
}

/* ──────────────────────────────────────────────
 * Build layers from named <g> groups (structured SVG)
 * ────────────────────────────────────────────── */
function buildGroupLayers(
    $: cheerio.CheerioAPI,
    groups: Element[],
    wrapInSvg: (html: string) => string,
    svgWidth: number,
    svgHeight: number,
    bgElements: Element[],
): ParsedLayer[] {
    const layers: ParsedLayer[] = [];
    let sortOrder = 0;

    // Background elements (non-group siblings)
    if (bgElements.length > 0) {
        const bgHtml = bgElements.map((el) => $.html(el)).join("\n");
        layers.push({
            name: "Arka Plan",
            sortOrder: sortOrder++,
            svgContent: wrapInSvg(bgHtml),
            x: 0, y: 0,
            width: svgWidth, height: svgHeight,
            metadata: { groupName: "Arka Plan", isGroupChild: true },
        });
    }

    for (const groupEl of groups) {
        const $g = $(groupEl);
        const name = getElementName($g, `Grup ${sortOrder + 1}`);
        const groupContent = $.html(groupEl) || "";
        const childCount = $g.children().length;

        layers.push({
            name,
            sortOrder: sortOrder++,
            svgContent: wrapInSvg(groupContent),
            x: 0, y: 0,
            width: svgWidth, height: svgHeight,
            metadata: {
                groupName: name,
                isGroupChild: true,
                childCount,
            },
        });
    }

    return layers;
}

/* ──────────────────────────────────────────────
 * Get all leaf elements from a container
 * ────────────────────────────────────────────── */
function getAllLeafElements(
    $: cheerio.CheerioAPI,
    container: cheerio.Cheerio<Element>,
): Array<{ element: Element; $el: cheerio.Cheerio<Element> }> {
    const results: Array<{ element: Element; $el: cheerio.Cheerio<Element> }> = [];

    container.children().each((_i, el) => {
        const tag = (el as unknown as { tagName: string }).tagName;
        if (["defs", "style", "clipPath"].includes(tag)) return;

        const $el = $(el);
        // If it's a group with no ID/name, unwrap it and take its children
        if (tag === "g" && !$el.attr("id") && !$el.attr("inkscape:label")) {
            $el.children().each((_j, child) => {
                const childTag = (child as unknown as { tagName: string }).tagName;
                if (!["defs", "style", "clipPath"].includes(childTag)) {
                    results.push({ element: child, $el: $(child) });
                }
            });
        } else {
            results.push({ element: el, $el });
        }
    });

    return results;
}

/* ──────────────────────────────────────────────
 * Color + Spatial Clustering
 * Groups flat elements by fill color similarity
 * ────────────────────────────────────────────── */
function buildColorSpatialLayers(
    $: cheerio.CheerioAPI,
    elements: Array<{ element: Element; $el: cheerio.Cheerio<Element> }>,
    wrapInSvg: (html: string) => string,
    svgWidth: number,
    svgHeight: number,
): ParsedLayer[] {
    // Step 1: Extract fill color and bounds for each element
    interface ElementInfo {
        element: Element;
        fill: string;
        bounds: PathBounds | null;
        html: string;
    }

    const infos: ElementInfo[] = [];
    for (const { element, $el } of elements) {
        const fill = $el.attr("fill") ||
            ($el.attr("style") || "").match(/fill:\s*([^;]+)/)?.[1] ||
            "none";
        const bounds = getPathBounds($el);
        const html = $.html(element) || "";
        infos.push({ element, fill: fill.trim(), bounds, html });
    }

    // Step 2: Group by fill color (normalize)
    const colorGroups = new Map<string, ElementInfo[]>();
    for (const info of infos) {
        const key = info.fill.toLowerCase().replace(/\s/g, "");
        if (!colorGroups.has(key)) colorGroups.set(key, []);
        colorGroups.get(key)!.push(info);
    }

    // Step 3: Build layers — each color group = one layer
    const layers: ParsedLayer[] = [];
    let sortOrder = 0;
    const usedNames = new Set<string>();

    // Sort by average Y position (top-to-bottom)
    const sortedGroups = [...colorGroups.entries()].sort((a, b) => {
        const avgYa = a[1].reduce((sum, el) => sum + (el.bounds?.cy || 0), 0) / a[1].length;
        const avgYb = b[1].reduce((sum, el) => sum + (el.bounds?.cy || 0), 0) / b[1].length;
        return avgYa - avgYb;
    });

    for (const [_colorKey, groupElements] of sortedGroups) {
        const fill = groupElements[0].fill;
        let baseName = colorToName(fill, sortOrder);

        // Ensure unique name
        let name = baseName;
        let counter = 2;
        while (usedNames.has(name)) {
            name = `${baseName} ${counter++}`;
        }
        usedNames.add(name);

        // Combine all elements in this group
        const groupHtml = groupElements.map((el) => el.html).join("\n");

        // Calculate group bounding box
        const validBounds = groupElements.filter((el) => el.bounds).map((el) => el.bounds!);
        const groupBounds = validBounds.length > 0 ? {
            minX: Math.min(...validBounds.map((b) => b.minX)),
            maxX: Math.max(...validBounds.map((b) => b.maxX)),
            minY: Math.min(...validBounds.map((b) => b.minY)),
            maxY: Math.max(...validBounds.map((b) => b.maxY)),
        } : null;

        layers.push({
            name,
            sortOrder: sortOrder++,
            svgContent: wrapInSvg(`<g>${groupHtml}</g>`),
            x: 0, y: 0,
            width: svgWidth, height: svgHeight,
            metadata: {
                groupName: name,
                isGroupChild: true,
                childCount: groupElements.length,
                fillColor: fill,
                bounds: groupBounds,
            },
        });
    }

    return layers;
}

/* ══════════════════════════════════════════════
 * Dimension Extractor
 * ══════════════════════════════════════════════ */
export function extractSvgDimensions(svgContent: string): {
    width: number;
    height: number;
} {
    const $ = cheerio.load(svgContent, { xmlMode: true });
    const svg = $("svg");
    const viewBox = svg.attr("viewBox")?.split(" ").map(Number);
    const widthAttr = svg.attr("width") || "";
    const heightAttr = svg.attr("height") || "";
    const width = parseFloat(widthAttr.replace("pt", "")) || viewBox?.[2] || 1920;
    const height = parseFloat(heightAttr.replace("pt", "")) || viewBox?.[3] || 1080;
    return { width, height };
}
