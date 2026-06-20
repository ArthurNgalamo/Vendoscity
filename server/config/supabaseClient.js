const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Server-side: prefer Service Role key (Render/backend) to allow storage uploads + bypass RLS safely.
// Never expose the service role key to the browser.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Attention: SUPABASE_URL ou cle Supabase manquante (SERVICE_ROLE/ANON) dans le fichier .env");
}

// "Admin" client:
// - If service role is present: bypasses RLS (recommended server-side for storage uploads)
// - Otherwise: falls back to anon (will require Storage RLS policies or user-scoped client)
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Extra helpers (non-breaking): allow creating a user-scoped client for operations that must respect RLS.
// When only anon key is available, storage uploads can still work if policies allow authenticated inserts.
supabase.asUser = (accessToken) => {
  const token = String(accessToken || '').trim();
  const baseKey = anonKey || supabaseKey || '';
  const client = createClient(supabaseUrl || '', baseKey, {
    global: {
      headers: {
        'apikey': baseKey,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  
  // Si nous sommes en mode mock (ou si auth est l'objet mock), on curry le token pour updateUser
  if (client.auth && (client.auth.isMock || !baseKey) && typeof client.auth.updateUser === 'function') {
      const originalUpdateUser = client.auth.updateUser;
      client.auth.updateUser = (attributes) => originalUpdateUser(token, attributes);
  }
  
  return client;
};

supabase.__vendoscityKeys = {
  hasServiceRole: !!serviceRoleKey,
  hasAnon: !!anonKey,
  supabaseUrl,
  supabaseKey
};

module.exports = supabase;
