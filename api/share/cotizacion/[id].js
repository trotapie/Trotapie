const APP_BASE_URL = 'https://app.trotapie.com';
const OG_IMAGE_URL = `${APP_BASE_URL}/assets/images/logos/trotapie-iso.png`;

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ygcvxwtvkmeqfbwexhzx.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnY3Z4d3R2a21lcWZid2V4aHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTQ5NzYsImV4cCI6MjA3MTk5MDk3Nn0.pRI84_4kMysr8C7sXFL_UnYZIpSpqEpz8JiUYeHRu-o';

module.exports = async (req, res) => {
  const id = getQueryValue(req.query.id);
  if (!id) {
    res.status(400).send('Missing cotizacion id.');
    return;
  }

  const shouldRedirectToSpa = isTruthy(getQueryValue(req.query.share));
  const spaUrl = `${APP_BASE_URL}/cotizacion/${encodeURIComponent(id)}`;

  let cotizacion = null;
  try {
    cotizacion = await obtenerCotizacionPorPublicId(id);
  } catch {
    cotizacion = null;
  }

  const nombreHotel = normalizeText(cotizacion?.nombre_hotel);
  const destinoNombre = normalizeText(cotizacion?.destino_nombre);

  const title = nombreHotel
    ? `${nombreHotel} | Cotizacion Trotapie`
    : 'Cotizacion de viaje | Trotapie';

  const description = buildDescription(nombreHotel, destinoNombre);
  const image = OG_IMAGE_URL;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Trotapie" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(spaUrl)}" />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <link rel="canonical" href="${escapeHtml(spaUrl)}" />
  ${shouldRedirectToSpa ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}" />` : ''}
</head>
<body>${shouldRedirectToSpa ? `<script>window.location.replace(${JSON.stringify(spaUrl)});</script>` : ''}</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(html);
};

async function obtenerCotizacionPorPublicId(publicId) {
  const rpcNames = [
    'obtener_cotizacion_por_public_id_cliente',
    'obtener_cotizacion_por_public_id'
  ];

  for (const rpcName of rpcNames) {
    const data = await ejecutarRpc(rpcName, publicId);
    if (data) {
      return data;
    }
  }

  return null;
}

async function ejecutarRpc(rpcName, publicId) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  const url = `${SUPABASE_URL}/rest/v1/rpc/${rpcName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_public_id: publicId
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  return payload[0];
}

function buildDescription(nombreHotel, destinoNombre) {
  if (nombreHotel && destinoNombre) {
    return `Cotizacion para ${nombreHotel} en ${destinoNombre} con Trotapie.`;
  }

  if (nombreHotel) {
    return `Cotizacion para ${nombreHotel} con Trotapie.`;
  }

  return 'Revisa tu cotizacion de viaje con Trotapie.';
}

function getQueryValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim();
  }

  return String(value ?? '').trim();
}

function isTruthy(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function normalizeText(value) {
  if (!value) {
    return '';
  }

  return String(value).replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
