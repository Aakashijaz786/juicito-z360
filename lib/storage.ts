// Supabase Storage helpers. Buckets are created on demand (idempotent) so there
// is no dashboard setup required.
import { getSupabaseAdmin } from "./supabase/server";

const ensured = new Set<string>();

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extForContentType(contentType: string): string {
  return EXT_BY_TYPE[contentType.toLowerCase()] ?? "bin";
}

async function ensureBucket(bucket: string) {
  if (ensured.has(bucket)) return;
  const sb = getSupabaseAdmin();
  // Ignore "already exists" — createBucket returns an error object, not a throw.
  await sb.storage.createBucket(bucket, { public: true, fileSizeLimit: "10MB" });
  ensured.add(bucket);
}

async function uploadToBucket(
  bucket: string,
  path: string,
  bytes: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await ensureBucket(bucket);
  const sb = getSupabaseAdmin();
  const { error } = await sb.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadPaymentScreenshot(
  userId: string,
  bytes: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const safeUser = userId.replace(/[^a-zA-Z0-9]/g, "_");
  const ext = extForContentType(contentType);
  const path = `${safeUser}/${crypto.randomUUID().slice(0, 8)}.${ext}`;
  return uploadToBucket("payments", path, bytes, contentType);
}

export async function uploadReceipt(
  orderId: string,
  bytes: Buffer | Uint8Array
): Promise<string> {
  const path = `receipt-${orderId}.pdf`;
  return uploadToBucket("receipts", path, bytes, "application/pdf");
}
