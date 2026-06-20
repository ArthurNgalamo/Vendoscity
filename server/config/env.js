function hasSupabaseEnv() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  return !!(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function isHostingProd() {
  // Hosting/runtime production (where we should enforce strict CORS and generally not serve local static files).
  // We avoid tying this to Supabase env vars, because you may use Supabase in local dev.
  return (
    process.env.NODE_ENV === 'production' ||
    !!process.env.VERCEL ||
    !!process.env.RENDER ||
    !!process.env.FLY_APP_NAME
  );
}

function parseAllowedOriginsEnv() {
  const raw =
    process.env.CORS_ALLOWED_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    // Normalize trailing slashes for stable comparisons.
    .map((s) => s.replace(/\/+$/, ''));
}

module.exports = {
  hasSupabaseEnv,
  isHostingProd,
  parseAllowedOriginsEnv
};
