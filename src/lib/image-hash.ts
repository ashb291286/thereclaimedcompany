import sharp from "sharp";

export async function averageHashFromBuffer(buffer: Buffer): Promise<bigint> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(8, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const count = info.width * info.height;
  let sum = 0;
  for (let i = 0; i < count; i++) sum += pixels[i] ?? 0;
  const avg = sum / Math.max(count, 1);

  let hash = BigInt(0);
  const one = BigInt(1);
  for (let i = 0; i < Math.min(64, count); i++) {
    if ((pixels[i] ?? 0) >= avg) {
      hash |= one << BigInt(i);
    }
  }
  return hash;
}

export function hammingDistance64(a: bigint, b: bigint): number {
  let n = 0;
  let x = a ^ b;
  const one = BigInt(1);
  for (let i = 0; i < 64; i++) {
    n += Number((x >> BigInt(i)) & one);
  }
  return n;
}

export async function averageHashFromUrl(
  url: string,
  timeoutMs: number
): Promise<bigint | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    return averageHashFromBuffer(buf);
  } catch {
    return null;
  }
}
