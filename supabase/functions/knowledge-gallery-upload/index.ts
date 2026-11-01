// CHS Moro Knowledge Gallery: secure upload endpoint.
// Deploy as Supabase Edge Function: knowledge-gallery-upload.
// Set KNOWLEDGE_GALLERY_ADMIN_KEY as a Supabase Function secret.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are supplied by Supabase.
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://chs-moro-portal.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gallery-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("KNOWLEDGE_GALLERY_ADMIN_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!expected || !serviceKey || !supabaseUrl) {
    return json({ error: "Server upload is not configured" }, 503);
  }

  const supplied = req.headers.get("x-gallery-admin-key") || "";
  const encoder = new TextEncoder();
  const suppliedHash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(supplied)));
  const expectedHash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(expected)));
  let mismatch = 0;
  for (let i = 0; i < expectedHash.length; i++) mismatch |= suppliedHash[i] ^ expectedHash[i];
  if (mismatch !== 0) {
    return json({ error: "Admin verification failed" }, 401);
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const category = String(form.get("category") || "General Knowledge").trim();
    const caption = String(form.get("caption") || "").trim().slice(0, 180);
    const allowedCategories = [
      "Digital Books", "Educational Notes", "Computer & Excel",
      "AI & Technology", "Teaching Ideas", "General Knowledge",
      "Teacher Training", "PDFs", "Educational Videos"
    ];
    if (!(file instanceof File)) return json({ error: "A file is required" }, 400);
    if (!allowedCategories.includes(category)) return json({ error: "Invalid category" }, 400);
    if (file.size < 1 || file.size > 25 * 1024 * 1024) {
      return json({ error: "File must be 1 byte to 25 MB" }, 400);
    }
    const allowedTypes = new Set([
      "application/pdf", "video/mp4", "video/webm",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg", "image/png", "image/webp", "text/plain"
    ]);
    if (!allowedTypes.has(file.type)) return json({ error: "This file type is not allowed" }, 415);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "resource";
    const path = `${encodeURIComponent(category)}/${crypto.randomUUID()}-${safeName}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/knowledge-gallery/${path}`;
    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: file
    });
    const result = await upload.json().catch(() => ({}));
    if (!upload.ok) {
      return json({ error: "Storage upload failed", details: result.message || result.error || upload.statusText }, 502);
    }
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/knowledge-gallery/${path}`;
    return json({ ok: true, path, publicUrl, category, caption, fileName: file.name, size: file.size });
  } catch (_error) {
    return json({ error: "Upload request could not be processed" }, 400);
  }
});
