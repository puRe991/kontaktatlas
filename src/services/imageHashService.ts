export async function sha256Hex(
  data: ArrayBuffer | Uint8Array,
): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (typeof process !== "undefined" && process.versions?.node) {
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(bytes).digest("hex");
  }
  const input = bytes.slice().buffer as ArrayBuffer;
  const hash = await globalThis.crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function perceptualHashFromBytes(bytes: Uint8Array): string {
  if (!bytes.length) return "0".repeat(16);
  const bucketCount = 16;
  const bucketSize = Math.max(1, Math.ceil(bytes.length / bucketCount));
  const averages = Array.from({ length: bucketCount }, (_, bucket) => {
    const slice = bytes.slice(
      bucket * bucketSize,
      Math.min(bytes.length, (bucket + 1) * bucketSize),
    );
    return (
      slice.reduce((sum, value) => sum + value, 0) / Math.max(1, slice.length)
    );
  });
  const globalAverage =
    averages.reduce((sum, value) => sum + value, 0) / averages.length;
  return averages.map((value) => (value >= globalAverage ? "1" : "0")).join("");
}

export function hammingDistance(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  let distance = 0;
  for (let i = 0; i < max; i += 1)
    if ((a[i] ?? "0") !== (b[i] ?? "0")) distance += 1;
  return distance;
}

export function isNearDuplicate(a: string, b: string): boolean {
  return hammingDistance(a, b) <= 4;
}
