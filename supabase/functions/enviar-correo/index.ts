import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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

const GOOGLE_SCRIPT_EXEC_URL = 'https://script.google.com/macros/s/AKfycbxojdZ6fXbfu7ji0mIGGaMB1JO9SMIs0kqJW6NsWbyToFcXHuSKGPDKkU5598zTRU7q/exec';
const DEFAULT_REPLY_TO = 'cotizaciones@trotapie.com';
const DEFAULT_REMITENTE_NOMBRE = 'Trotapie';
const DEFAULT_TITULO_CORREO = 'Tu cotizacion esta lista';
const DEFAULT_MENSAJE_CORREO = 'Te compartimos tu cotizacion en PDF.';
const LOG_PREFIX = '[enviar-correo]';
const APP_URL = 'https://app.trotapie.com';

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
    const remitenteNombre = DEFAULT_REMITENTE_NOMBRE;
    const firma = publicId ? await obtenerFirmaEmpleado(publicId) : null;
    const firmaHtml = construirFirmaHtml(firma);

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; width: 100%; max-width: none; margin: 0;">
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-radius: 14px;">
          <h2 style="margin: 0 0 12px 0; color: #111827;">
            ${escapeHtml(tituloCorreo)}
          </h2>

          <p style="font-size: 15px; line-height: 1.5;">
            Hola <strong>${escapeHtml(nombre)}</strong>,
          </p>

          <p style="font-size: 15px; line-height: 1.5;">
            ${escapeHtml(mensajeFinal)}
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

          ${firmaHtml}
        </div>
      </div>
    `;

    const plain = `
${tituloCorreo}

Hola ${nombre},

${mensajeFinal}

Te atendio: ${firma?.nombre || remitenteNombre}.
    `.trim();

    const googleScriptResult = await enviarPrimeroConGoogleScript({
      url: GOOGLE_SCRIPT_EXEC_URL,
      correos,
      nombre,
      asunto: asuntoFinal,
      titulo: tituloCorreo,
      mensaje: mensajeFinal,
      remitenteNombre,
      replyTo,
      pdfBase64,
      pdfNombre: pdfFilename,
      firmaHtml,
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
        display_name: remitenteNombre,
      },
      to: destinatariosFallback.map((address) => ({ address, display_name: nombre || 'Cliente' })),
      reply_to: {
        address: replyTo,
        display_name: remitenteNombre,
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

type FirmaEmpleado = {
  nombre: string;
  cargo: string;
  email: string;
  telefono: string;
};

async function obtenerFirmaEmpleado(publicId: string): Promise<FirmaEmpleado | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(`${LOG_PREFIX} No se pudo cargar la firma: faltan credenciales de Supabase.`);
    return null;
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data: solicitud, error: solicitudError } = await client
    .from('solicitudes_cotizacion')
    .select('empleado_id')
    .eq('public_id', publicId)
    .maybeSingle();

  if (solicitudError || !solicitud?.empleado_id) {
    if (solicitudError) console.warn(`${LOG_PREFIX} No se pudo localizar la solicitud para la firma.`);
    return null;
  }

  const { data: empleado, error: empleadoError } = await client
    .from('empleados')
    .select('nombre, cargo, email, telefono')
    .eq('id', solicitud.empleado_id)
    .maybeSingle();

  if (empleadoError || !empleado) {
    if (empleadoError) console.warn(`${LOG_PREFIX} No se pudieron cargar los datos del empleado.`);
    return null;
  }

  return {
    nombre: String(empleado.nombre ?? '').trim() || DEFAULT_REMITENTE_NOMBRE,
    cargo: String(empleado.cargo ?? '').trim(),
    email: String(empleado.email ?? '').trim().toLowerCase(),
    telefono: String(empleado.telefono ?? '').trim(),
  };
}

function construirFirmaHtml(firma: FirmaEmpleado | null): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:none;border-collapse:collapse;font-family:Arial,sans-serif;font-size:0;line-height:0;">
      <tr>
        <td style="padding:20px 0 0;font-size:0;line-height:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;font-size:0;line-height:0;">
            <tr>
              <td width="22%" valign="top" style="padding:0;font-size:0;line-height:0;">
                <a href="${APP_URL}" style="text-decoration:none;"><img src="${APP_URL}/assets/images/banner-firma-qr.png" alt="Escanea el codigo QR para conocer Trotapie" width="430" style="display:block;width:100%;height:auto;border:0;"></a>
              </td>
              <td width="24%" align="center" valign="middle" style="padding:0;background:#ffffff;font-size:0;line-height:0;">
                <a href="${APP_URL}" style="text-decoration:none;"><img src="${APP_URL}/assets/images/logos/trotapie%20logo.gif" alt="Trotapie" width="300" style="display:block;width:100%;max-width:300px;height:auto;margin:0 auto;border:0;"></a>
              </td>
              <td width="54%" valign="top" style="padding:0;font-size:0;line-height:0;">
                <img src="${APP_URL}/assets/images/banner-firma-datos.png" alt="Firma de Trotapie" width="1083" usemap="#firma-contacto" style="display:block;width:100%;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td colspan="3" style="padding:0;font-size:0;line-height:0;">
                <img src="${APP_URL}/assets/images/banner-firma-footer.png" alt="Redes sociales de Trotapie" width="2000" usemap="#firma-redes" style="display:block;width:100%;height:auto;border:0;">
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <map name="firma-contacto" id="firma-contacto">
      <area shape="rect" coords="35,285,460,365" href="mailto:jtriego@trotapie.com" alt="Enviar correo a Javier Triego">
      <area shape="rect" coords="35,350,390,440" href="https://wa.me/526691957651" alt="Enviar WhatsApp a Javier Triego">
    </map>
    <map name="firma-redes" id="firma-redes">
      <area shape="rect" coords="145,0,265,165" href="https://instagram.com/trotapie" alt="Instagram de Trotapie">
      <area shape="rect" coords="275,0,410,165" href="https://facebook.com/trotapie" alt="Facebook de Trotapie">
      <area shape="rect" coords="420,0,555,165" href="https://www.tiktok.com/@trotapie" alt="TikTok de Trotapie">
      <area shape="rect" coords="555,0,700,165" href="https://wa.me/526691957651" alt="WhatsApp de Javier Triego">
      <area shape="rect" coords="685,0,850,165" href="${APP_URL}" alt="Sitio web de Trotapie">
    </map>`;
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
  firmaHtml: string;
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
          pdfNombre: input.pdfNombre || 'cotizacion.pdf',
          firmaHtml: input.firmaHtml,
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
