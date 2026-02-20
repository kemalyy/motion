import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

export async function ensureUploadDir(): Promise<void> {
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }
}

export async function saveFile(
    file: File,
    subdir: string = ""
): Promise<{ path: string; size: number }> {
    await ensureUploadDir();

    const dir = subdir ? path.join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }

    const ext = path.extname(file.name);
    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(dir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    return { path: filepath, size: buffer.length };
}

export async function readStoredFile(filepath: string): Promise<Buffer> {
    return readFile(filepath);
}

export async function deleteFile(filepath: string): Promise<void> {
    if (existsSync(filepath)) {
        await unlink(filepath);
    }
}

export function getPublicUrl(filepath: string): string {
    // Convert local path to public URL
    return filepath.replace("./public", "").replace("public", "");
}
