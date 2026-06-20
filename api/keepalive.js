module.exports = async function keepalive(req, res) {
  // This endpoint exists only to keep the Render backend awake.
  // Vercel Cron calls this every few minutes.
  try {
    const target =
      process.env.RENDER_KEEPALIVE_URL ||
      'https://vendoscity.onrender.com/api/ping';

    const r = await fetch(target, {
      method: 'GET',
      headers: {
        'user-agent': 'vendoscity-vercel-keepalive',
        'accept': 'application/json'
      }
    });

    // Do not forward large payloads; we just need the wake-up traffic.
    const bodyText = await r.text();
    return res.status(200).json({
      ok: true,
      target,
      status: r.status,
      snippet: bodyText ? bodyText.slice(0, 200) : ''
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err)
    });
  }
};

