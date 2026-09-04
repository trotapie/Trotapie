const APP_BASE_URL = 'https://www.trotapie.com';
const OG_IMAGE_URL = `${APP_BASE_URL}/assets/images/logos/trotapie-iso.png`;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ;

module.exports = async (req, res) => {
  const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id || '').trim();
  if (!id) {
    res.status(400).send('Missing comparativa id.');
    return;
  }

  const shouldRedirectToSpa = ['1', 'true', 'yes'].includes(String(req.query.share || '').toLowerCase());
  const spaUrl = `${APP_BASE_URL}/comparativa/${encodeURIComponent(id)}`;
  const comparativa = await obtenerComparativa(id).catch(() => null);
  const hoteles = Array.isArray(comparativa?.cotizacion) ? comparativa.cotizacion : [];
  const destinos = [...new Set(hoteles.map((hotel) => texto(hotel?.destino_nombre)).filter(Boolean))].join(', ');
  const image = imagen(hoteles[0]?.fondo);
  const title = destinos ? `Comparativa de hoteles en ${destinos} | Trotapie` : 'Comparativa de hoteles | Trotapie';
  const description = destinos
    ? `Revisa las alternativas de hoteles para tu viaje a ${destinos}.`
    : 'Revisa las alternativas de hoteles para tu viaje con Trotapie.';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><meta property="og:type" content="website"><meta property="og:site_name" content="Trotapie"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(image)}"><meta property="og:url" content="${escapeHtml(spaUrl)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}"><link rel="canonical" href="${escapeHtml(spaUrl)}">${shouldRedirectToSpa ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}">` : ''}</head><body>${shouldRedirectToSpa ? `<script>window.location.replace(${JSON.stringify(spaUrl)});</script>` : ''}</body></html>`);
};

async function obtenerComparativa(publicId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/obtener_comparativa_por_public_id`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_public_id: publicId })
  });
  return response.ok ? response.json() : null;
}

function texto(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function imagen(value) {
  const url = texto(value);
  if (!url) return OG_IMAGE_URL;
  if (/^https?:\/\//i.test(url)) return url;
  return `${APP_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
