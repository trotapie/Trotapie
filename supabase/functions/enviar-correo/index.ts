const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type EmailPayload = {
  nombre?: string;
  correo?: string;
  asunto?: string;
  telefono?: string;
  destino?: string;
  hotel?: string;
  mensaje?: string;
  fecha_entrada?: string | Date;
  fecha_salida?: string | Date;
  noches?: number | string;
  public_id?: string;
  pdf_base64?: string;
  pdf_filename?: string;
};

const GOOGLE_SCRIPT_EXEC_URL = 'https://script.google.com/macros/s/AKfycbyOpwBR5DUqJHbKx8ZGN_IQ8NT06iwH-bb8BsgC9-jBxbgPOgqarHLdg-W5eXfGppyH7w/exec';
const DEFAULT_REPLY_TO = 'alexsaenz539@gmail.com';
const DEFAULT_REMITENTE_NOMBRE = 'Trotapie';
const DEFAULT_TITULO_CORREO = 'Tu cotizacion esta lista';
const DEFAULT_MENSAJE_CORREO = 'Te compartimos tu cotizacion en PDF.';
const LOG_PREFIX = '[enviar-correo]';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    console.log(`${LOG_PREFIX}[${requestId}] Inicio request. method=${req.method}`);

    if (req.method !== 'POST') {
      console.warn(`${LOG_PREFIX}[${requestId}] Metodo no permitido: ${req.method}`);
      return new Response(
        JSON.stringify({
          ok: false,
          message: 'Metodo no permitido. Usa POST.',
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const body = (await req.json()) as EmailPayload;

    const nombre = body.nombre?.trim() || 'Cliente';
    const correoRaw = body.correo?.trim() || '';
    const asunto = body.asunto?.trim() || '';
    const telefono = body.telefono?.trim() || '';
    const destino = body.destino?.trim() || '';
    const hotel = body.hotel?.trim() || '';
    const mensaje = body.mensaje?.trim() || '';
    const fechaEntrada = formatDate(body.fecha_entrada);
    const fechaSalida = formatDate(body.fecha_salida);
    const publicId = body.public_id?.trim() || '';
    const noches = Number(body.noches ?? 0);
    const pdfBase64 = body.pdf_base64?.trim() || '';
    const pdfFilename = body.pdf_filename?.trim() || 'cotizacion.pdf';

    const correos = splitEmails(correoRaw);
    console.log(
      `${LOG_PREFIX}[${requestId}] Payload recibido. public_id=${publicId || 'N/A'} correos=${correos.length} pdfAdjunto=${pdfBase64 ? 'si' : 'no'}`
    );

    if (!correos.length) {
      console.warn(`${LOG_PREFIX}[${requestId}] Request sin correo destino.`);
      return new Response(
        JSON.stringify({
          ok: false,
          message: 'El correo del cliente es obligatorio.',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const correosInvalidos = correos.filter((email) => !isValidEmail(email));
    if (correosInvalidos.length) {
      console.warn(`${LOG_PREFIX}[${requestId}] Correos invalidos: ${correosInvalidos.join(', ')}`);
      return new Response(
        JSON.stringify({
          ok: false,
          message: `Hay correos invalidos: ${correosInvalidos.join(', ')}`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const asuntoFinal =
      asunto ||
      (publicId
        ? `Cotizacion ${publicId}`
        : hotel
          ? `Cotizacion de viaje para ${hotel}`
          : 'Cotizacion de viaje');
    const tituloCorreo = DEFAULT_TITULO_CORREO;
    const mensajeFinal = mensaje || DEFAULT_MENSAJE_CORREO;
    const replyTo = Deno.env.get('MAILEROO_REPLY_TO') || DEFAULT_REPLY_TO;

    const resumen = [
      hotel ? `Hotel: ${hotel}` : '',
      destino ? `Destino: ${destino}` : '',
      fechaEntrada ? `Entrada: ${fechaEntrada}` : '',
      fechaSalida ? `Salida: ${fechaSalida}` : '',
      Number.isFinite(noches) && noches > 0 ? `Noches: ${noches}` : '',
      telefono ? `Telefono: ${telefono}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    const appPublicUrl = (Deno.env.get('APP_PUBLIC_URL') || 'https://app.trotapie.com').replace(/\/+$/, '');
    const cotizacionUrl = publicId
      ? `${appPublicUrl}/cotizacion/${encodeURIComponent(publicId)}`
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <h2 style="margin:0 0 12px;">Cotizacion de viaje${publicId ? ` #${escapeHtml(publicId)}` : ''}</h2>
        <p style="margin:0 0 8px;">Hola ${escapeHtml(nombre)},</p>
        <p style="margin:0 0 10px;">Adjunto encontrarás el PDF con el detalle completo de tu solicitud de cotización.</p>
        ${mensajeFinal ? `<p style="margin:0 0 10px;"><strong>Descripcion:</strong> ${escapeHtml(mensajeFinal)}</p>` : ''}
        ${resumen ? `<pre style="white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:8px;border:1px solid #e5e7eb;">${escapeHtml(resumen)}</pre>` : ''}
        ${cotizacionUrl ? `<p style="margin:14px 0;"><a href="${escapeHtml(cotizacionUrl)}" style="display:inline-block;padding:10px 14px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;">Ver cotizacion</a></p>` : ''}
        <p style="margin:12px 0 0;">Gracias por confiar en Trotapie.</p>
      </div>
    `;

    const plainLines = [
      `Hola ${nombre},`,
      '',
      'Adjunto encontrarás el PDF con el detalle completo de tu solicitud de cotización.',
      mensajeFinal ? `Descripcion: ${mensajeFinal}` : '',
      resumen,
      cotizacionUrl ? `Ver cotizacion: ${cotizacionUrl}` : '',
      '',
      'Gracias por confiar en Trotapie.'
    ].filter(Boolean);

    const plain = plainLines.join('\n');

    const googleScriptResult = await enviarPrimeroConGoogleScript({
      url: GOOGLE_SCRIPT_EXEC_URL,
      correos,
      nombre,
      asunto: asuntoFinal,
      titulo: tituloCorreo,
      mensaje: mensajeFinal,
      remitenteNombre: DEFAULT_REMITENTE_NOMBRE,
      replyTo,
      pdfBase64,
      pdfNombre: pdfFilename,
      requestId
    });

    console.log(
      `${LOG_PREFIX}[${requestId}] Resultado Google Script: total=${googleScriptResult.results.length} fallidos=${googleScriptResult.failedEmails.length}`
    );

    if (googleScriptResult.failedEmails.length === 0) {
      console.log(`${LOG_PREFIX}[${requestId}] Envio completado por Google Script.`);
      return new Response(
        JSON.stringify({
          ok: true,
          provider: 'google-script',
          message: 'Correo enviado correctamente por Google Script.',
          data: googleScriptResult.results
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const mailerooApiKey = Deno.env.get('MAILEROO_API_KEY');
    if (!mailerooApiKey) {
      console.error(`${LOG_PREFIX}[${requestId}] Sin MAILEROO_API_KEY para fallback.`);
      return new Response(
        JSON.stringify({
          ok: false,
          message: 'Google Script no pudo enviar todos los correos y no existe MAILEROO_API_KEY para respaldo.',
          googleScriptResult
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const destinatariosFallback =
      googleScriptResult.failedEmails.length > 0 ? googleScriptResult.failedEmails : correos;
    console.log(
      `${LOG_PREFIX}[${requestId}] Entrando a Maileroo fallback para ${destinatariosFallback.length} correo(s).`
    );

    const mailPayload: Record<string, unknown> = {
      from: {
        address: 'no-reply@1ad700884a9f9f2e.maileroo.org',
        display_name: DEFAULT_REMITENTE_NOMBRE,
      },
      to: destinatariosFallback.map((address) => ({ address, display_name: nombre || 'Cliente' })),
      reply_to: {
        address: replyTo,
        display_name: DEFAULT_REMITENTE_NOMBRE,
      },
      subject: asuntoFinal,
      html,
      plain,
    };

    if (pdfBase64) {
      mailPayload.attachments = [
        {
          file_name: pdfFilename,
          content_type: 'application/pdf',
          content: pdfBase64,
          inline: false,
        }
      ];
    }

    const response = await fetch('https://smtp.maileroo.com/api/v2/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mailerooApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(
        `${LOG_PREFIX}[${requestId}] Error Maileroo fallback. status=${response.status} message=${data?.message ?? 'N/A'}`
      );
      return new Response(
        JSON.stringify({
          ok: false,
          message: data?.message ?? 'No se pudo enviar el correo.',
          error: data,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`${LOG_PREFIX}[${requestId}] Envio completado por Maileroo fallback.`);
    return new Response(
      JSON.stringify({
        ok: true,
        provider: 'maileroo-fallback',
        message: 'Correo enviado usando respaldo Maileroo.',
        googleScriptResult,
        data,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error(
      `${LOG_PREFIX}[${requestId}] Error interno: ${error instanceof Error ? error.message : String(error)}`
    );
    return new Response(
      JSON.stringify({
        ok: false,
        message: 'Error interno al enviar el correo.',
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function splitEmails(value: string): string[] {
  return String(value ?? '')
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDate(value: string | Date | undefined): string {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

type GoogleScriptSendInput = {
  url: string;
  correos: string[];
  nombre: string;
  asunto: string;
  titulo: string;
  mensaje: string;
  remitenteNombre: string;
  replyTo: string;
  pdfBase64?: string;
  pdfNombre?: string;
  requestId: string;
};

type GoogleScriptSendResult = {
  failedEmails: string[];
  results: Array<{
    correo: string;
    ok: boolean;
    puedeEnviar: boolean;
    status?: number;
    message?: string;
    data?: unknown;
  }>;
};

async function enviarPrimeroConGoogleScript(input: GoogleScriptSendInput): Promise<GoogleScriptSendResult> {
  const failedEmails: string[] = [];
  const results: GoogleScriptSendResult['results'] = [];

  for (let i = 0; i < input.correos.length; i += 1) {
    const correo = input.correos[i];
    console.log(`${LOG_PREFIX}[${input.requestId}] Intentando Google Script para ${correo}.`);
    try {
      const response = await fetch(input.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo,
          nombre: input.nombre,
          asunto: input.asunto,
          titulo: input.titulo,
          mensaje: input.mensaje,
          remitenteNombre: input.remitenteNombre,
          replyTo: input.replyTo,
          pdfBase64: input.pdfBase64 || '',
          pdfNombre: input.pdfNombre || 'cotizacion.pdf'
        }),
      });

      const data = await safeJson(response);
      const ok = Boolean(data?.ok);
      const puedeEnviar = data?.puedeEnviar !== false;

      const envioExitoso = response.ok && ok && puedeEnviar;
      if (!envioExitoso) {
        failedEmails.push(correo);
      }

      console.log(
        `${LOG_PREFIX}[${input.requestId}] Google Script resultado para ${correo}: status=${response.status} ok=${ok} puedeEnviar=${puedeEnviar}`
      );

      results.push({
        correo,
        ok,
        puedeEnviar,
        status: response.status,
        message: data?.message ? String(data.message) : undefined,
        data
      });

      // Si el script indica que ya no puede enviar (por ejemplo, cuota diaria),
      // marcamos los correos restantes para enviarlos por fallback sin volver a intentarlo.
      if (data?.puedeEnviar === false) {
        console.warn(
          `${LOG_PREFIX}[${input.requestId}] Google Script reporta cupo agotado o bloqueo de envio. Se deriva el resto a fallback.`
        );
        const restantes = input.correos.slice(i + 1);
        for (const correoRestante of restantes) {
          failedEmails.push(correoRestante);
          results.push({
            correo: correoRestante,
            ok: false,
            puedeEnviar: false,
            message: data?.message ? String(data.message) : 'Google Script no puede enviar mas correos por ahora.',
            data
          });
        }
        break;
      }
    } catch (error) {
      console.error(
        `${LOG_PREFIX}[${input.requestId}] Error en Google Script para ${correo}: ${error instanceof Error ? error.message : String(error)}`
      );
      failedEmails.push(correo);
      results.push({
        correo,
        ok: false,
        puedeEnviar: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    failedEmails,
    results
  };
}

async function safeJson(response: Response): Promise<any> {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();

  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    const text = await response.text();
    return text ? { message: text } : {};
  } catch {
    return {};
  }
}
