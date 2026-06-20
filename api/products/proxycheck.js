module.exports = async function proxycheck(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-vendoscity-proxy', 'vercel-api-products-proxycheck');

  const hdrs = req.headers || {};
  const contentLength = hdrs['content-length'] || hdrs['Content-Length'] || null;
  const contentType = hdrs['content-type'] || hdrs['Content-Type'] || null;

  return res.status(200).json({
    ok: true,
    message: 'proxycheck reached',
    method: req.method,
    url: req.url,
    contentLength,
    contentType,
    now: new Date().toISOString()
  });
};

