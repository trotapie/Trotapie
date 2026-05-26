module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const apiKey = process.env.MAILEROO_API_KEY;
  const fromEmail = process.env.MAILEROO_FROM_EMAIL;
  const fromName = process.env.MAILEROO_FROM_NAME || 'Trotapie';
  const replyTo = process.env.MAILEROO_REPLY_TO;

  if (!apiKey || !fromEmail) {
    return res.status(500).json({
      success: false,
      message: 'Maileroo no esta configurado. Falta MAILEROO_API_KEY o MAILEROO_FROM_EMAIL.'
    });
  }

  const body = parseBody(req.body);

  const toEmail = String(body?.to_email ?? '').trim();
  const toName = String(body?.to_name ?? '').trim();
  const hotelNombre = String(body?.hotel_nombre ?? '').trim();
  const telefono = String(body?.telefono ?? '').trim();
  const publicId = String(body?.public_id ?? '').trim();
  const noches = Number(body?.noches ?? 0);
  const fechaEntrada = formatDate(body?.fecha_entrada);
  const fechaSalida = formatDate(body?.fecha_salida);

  if (!toEmail) {
    return res.status(400).json({ success: false, message: 'to_email es requerido.' });
  }

  const cotizacionUrl = publicId ? `${getRequestOrigin(req)}/cotizacion/${encodeURIComponent(publicId)}` : '';
  const subject = publicId
    ? `Tu cotizacion Trotapie #${publicId}`
    : 'Tu cotizacion Trotapie';

  const resumen = [
    hotelNombre ? `Hotel: ${hotelNombre}` : '',
    fechaEntrada ? `Entrada: ${fechaEntrada}` : '',
    fechaSalida ? `Salida: ${fechaSalida}` : '',
    Number.isFinite(noches) && noches > 0 ? `Noches: ${noches}` : '',
    telefono ? `Telefono: ${telefono}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const plainLines = [
    `Hola${toName ? ` ${toName}` : ''},`,
    '',
    'Recibimos tu solicitud de cotizacion en Trotapie.',
    resumen,
    cotizacionUrl ? '' : null,
    cotizacionUrl ? `Puedes revisar tu cotizacion aqui: ${cotizacionUrl}` : null,
    '',
    'Gracias por confiar en Trotapie.'
  ].filter((line) => line !== null);

  const html = `
<div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;">
  <h2 style="margin:0 0 12px;">Recibimos tu cotizacion${publicId ? ` #${escapeHtml(publicId)}` : ''}</h2>
  <p style="margin:0 0 10px;">Hola${toName ? ` ${escapeHtml(toName)}` : ''},</p>
  <p style="margin:0 0 10px;">Recibimos tu solicitud de cotizacion en Trotapie.</p>
  ${resumen ? `<pre style="white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:8px;border:1px solid #e5e7eb;">${escapeHtml(resumen)}</pre>` : ''}
  ${cotizacionUrl ? `<p style="margin:14px 0;"><a href="${escapeHtml(cotizacionUrl)}" style="display:inline-block;padding:10px 14px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;">Ver cotizacion</a></p>` : ''}
  <p style="margin:12px 0 0;">Gracias por confiar en Trotapie.</p>
</div>`.trim();

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const to = toName ? `${toName} <${toEmail}>` : toEmail;
  const form = new FormData();
  form.append('from', from);
  form.append('to', to);
  form.append('subject', subject);
  form.append('html', html);
  form.append('plain', plainLines.join('\n'));

  if (replyTo) {
    form.append('reply_to', replyTo);
  }

  try {
    const providerResponse = await fetch('https://smtp.maileroo.com/send', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey
      },
      body: form
    });

    const providerJson = await safeJson(providerResponse);

    if (!providerResponse.ok) {
      return res.status(providerResponse.status).json({
        success: false,
        message: providerJson?.message || 'Maileroo rechazo la solicitud.',
        provider: providerJson || null
      });
    }

    return res.status(200).json({
      success: true,
      message: providerJson?.message || 'Correo enviado.',
      data: providerJson?.data || null
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: 'No se pudo conectar con Maileroo.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function formatDate(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRequestOrigin(req) {
  const protocolHeader = req.headers['x-forwarded-proto'];
  const host = req.headers.host || 'app.trotapie.com';
  const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader || 'https';
  return `${protocol}://${host}`;
}

async function safeJson(response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    const text = await response.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
