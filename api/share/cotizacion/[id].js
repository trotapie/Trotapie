module.exports = async (req, res) => {
  const id = req.query.id;

  const title = 'Reserva tu viaje a Cancún - Cotización';
  const description = 'Cotiza hoteles en Cancún fácil y rápido con Trotapie.';
  const image = 'https://app.trotapie.com/assets/images/og/cancun-cotizacion.jpg';

  const spaUrl = `https://app.trotapie.com/cotizacion/${encodeURIComponent(id)}`;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} | Trotapie</title>

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Trotapie" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(spaUrl)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}" />
</head>
<body></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
};

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
