import crypto from "node:crypto";
import { imageSize } from "image-size";
import { getSupabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/errors.js";

export const MEDIA_BUCKET = "lounge-covers";

async function ensureBucket() {
  const supabase = getSupabaseAdmin();
  const { error: createError } = await supabase.storage.createBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: "7MB",
  });
  if (createError && !/already exists|already been created|already exist|duplicate|resource exists/i.test(createError.message || "")) {
    console.error("[media_bucket_create_failed]", {
      message: createError.message,
      status: createError.status,
      statusCode: createError.statusCode,
    });
    throw new ApiError(503, "MEDIA_STORAGE_UNAVAILABLE", "Unable to create the Supabase Storage bucket.");
  }
  const { error: updateError } = await supabase.storage.updateBucket(MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: "7MB",
  });
  if (updateError) {
    console.error("[media_bucket_update_failed]", {
      message: updateError.message,
      status: updateError.status,
      statusCode: updateError.statusCode,
    });
    throw new ApiError(503, "MEDIA_STORAGE_UNAVAILABLE", "Unable to configure the Supabase Storage bucket.");
  }
}

export async function uploadCover(file, folder) {
  if (!file || !file.mimetype.startsWith("image/")) {
    throw new ApiError(400, "INVALID_IMAGE", "Please upload an image file.");
  }
  let dimensions;
  try {
    dimensions = imageSize(file.buffer);
  } catch {
    throw new ApiError(400, "INVALID_IMAGE", "The uploaded file is not a valid image.");
  }
  await ensureBucket();
  const extension = (file.originalname.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) {
    console.error("[media_upload_failed]", {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
    });
    throw new ApiError(503, "MEDIA_STORAGE_UNAVAILABLE", "The image could not be saved to Supabase Storage.");
  }
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, width: dimensions.width, height: dimensions.height };
}

export async function removeCover(path) {
  if (!path) return;
  const { error } = await getSupabaseAdmin().storage.from(MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}
