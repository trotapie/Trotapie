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
  pdf_base64?: string;
  pdf_filename?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
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

    const mailerooApiKey = Deno.env.get('MAILEROO_API_KEY');

    if (!mailerooApiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: 'No existe MAILEROO_API_KEY en Supabase secrets.',
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

    const body = (await req.json()) as EmailPayload;

    const nombre = body.nombre?.trim() || 'Sin nombre';
    const correo = body.correo?.trim() || '';
    const asunto = body.asunto?.trim() || '';
    const telefono = body.telefono?.trim() || 'No proporcionado';
    const destino = body.destino?.trim() || 'No proporcionado';
    const hotel = body.hotel?.trim() || 'No proporcionado';
    const mensaje = body.mensaje?.trim() || 'Sin mensaje';
    const pdfBase64 = body.pdf_base64?.trim() || '';
    const pdfFilename = body.pdf_filename?.trim() || 'cotizacion.pdf';

    if (!correo) {
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

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <h2>Nueva solicitud de cotizacion</h2>

        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Correo:</strong> ${correo}</p>
        <p><strong>Telefono:</strong> ${telefono}</p>
        <p><strong>Destino:</strong> ${destino}</p>
        <p><strong>Hotel:</strong> ${hotel}</p>

        <hr />

        <p><strong>Mensaje:</strong></p>
        <p>${mensaje}</p>
      </div>
    `;

    const plain = `
Nueva solicitud de cotizacion

Nombre: ${nombre}
Correo: ${correo}
Telefono: ${telefono}
Destino: ${destino}
Hotel: ${hotel}

Mensaje:
${mensaje}
    `;

    const mailPayload: Record<string, unknown> = {
      from: {
        address: 'no-reply@1ad700884a9f9f2e.maileroo.org',
        display_name: 'Trotapie',
      },
      to: [
        {
          address: correo,
          display_name: nombre || 'Cliente',
        }
      ],
      reply_to: {
        address: 'alexsaenz539@gmail.com',
        display_name: 'Trotapie',
      },
      subject: asunto || `Cotizacion de ${hotel}`,
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

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Correo enviado correctamente.',
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
