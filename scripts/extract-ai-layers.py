#!/usr/bin/env python3
"""
Extract real OCG layer info from .ai (PDF) files.
Outputs JSON to stdout with layer names and their fill-operation counts,
in the sequential order they appear in the content stream.

This lets the SVG parser split pdf2svg's flat output into real layers
by matching the sequential order of drawing operations.

Usage: python3 extract-ai-layers.py input.ai
Output: JSON to stdout
"""

import sys
import json
import re

try:
    import fitz  # PyMuPDF
except ImportError:
    # Output empty result if PyMuPDF not installed
    print(json.dumps({"error": "PyMuPDF not installed", "layers": []}))
    sys.exit(0)

def extract_layers(ai_path: str) -> dict:
    try:
        doc = fitz.open(ai_path)
    except Exception as e:
        return {"error": str(e), "layers": []}

    if doc.page_count == 0:
        doc.close()
        return {"error": "No pages", "layers": []}

    page = doc[0]

    # Get OCG (Optional Content Group) definitions
    ocgs = doc.get_ocgs()
    if not ocgs:
        doc.close()
        return {"error": "No OCG layers found", "layers": []}

    # Build MC name → layer name mapping from page Resources/Properties
    page_xref = page.xref
    mc_to_layer = {}

    try:
        res_props = doc.xref_get_key(page_xref, "Resources/Properties")
        if res_props[0] == 'dict':
            prop_content = res_props[1]
            mc_refs = re.findall(r'/(\w+)\s+(\d+)\s+0\s+R', prop_content)
            for mc_name, obj_ref in mc_refs:
                obj_ref_int = int(obj_ref)
                if obj_ref_int in ocgs:
                    mc_to_layer[mc_name] = ocgs[obj_ref_int]['name']
    except Exception:
        # Fallback: try raw xref object
        try:
            raw = doc.xref_object(page_xref)
            prop_match = re.search(r'/Properties\s*<<(.*?)>>', raw, re.DOTALL)
            if prop_match:
                mc_refs = re.findall(r'/(\w+)\s+(\d+)\s+0\s+R', prop_match.group(1))
                for mc_name, obj_ref in mc_refs:
                    obj_ref_int = int(obj_ref)
                    if obj_ref_int in ocgs:
                        mc_to_layer[mc_name] = ocgs[obj_ref_int]['name']
        except Exception:
            pass

    if not mc_to_layer:
        doc.close()
        return {"error": "Could not map MC references to layers", "layers": []}

    # Get decompressed content stream
    try:
        content_bytes = page.read_contents()
        content_text = content_bytes.decode('latin-1', errors='replace')
    except Exception as e:
        doc.close()
        return {"error": f"Failed to read content stream: {e}", "layers": []}

    # Parse BDC/EMC sections in sequential order
    # Pattern: /OC /MCx BDC <drawing commands> EMC
    sections = re.findall(r'/OC\s+/(\w+)\s+BDC(.*?)EMC', content_text, re.DOTALL)

    result_layers = []
    for mc_name, content in sections:
        layer_name = mc_to_layer.get(mc_name, mc_name)

        # Count fill operations — each typically = one visible path in SVG
        # PDF fill operators: f, F, f*, B, B*, b, b*
        fill_count = len(re.findall(r'(?:^|\s)(?:f\*?|F|B\*?|b\*?)\s', content))

        # Count stroke operations: S, s
        stroke_count = len(re.findall(r'(?:^|\s)[Ss]\s', content))

        # Total visible elements
        element_count = fill_count + stroke_count

        result_layers.append({
            "name": layer_name,
            "mcName": mc_name,
            "elementCount": element_count,
            "fillCount": fill_count,
            "strokeCount": stroke_count,
        })

    doc.close()

    return {
        "totalLayers": len(result_layers),
        "totalElements": sum(l["elementCount"] for l in result_layers),
        "layers": result_layers,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: extract-ai-layers.py <input.ai>"}))
        sys.exit(1)

    result = extract_layers(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
