import { FlyerTemplate } from '../models/flyer-template.interface';

type Orientation = 'portrait' | 'landscape';

function svgThumbnail(nombre: string, badge: string, colors: [string, string, string, string], orientacion: Orientation): string {
  const [bg1, bg2, accent, text] = colors;
  const w = orientacion === 'portrait' ? 540 : 720;
  const h = orientacion === 'portrait' ? 960 : 405;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="${w * 0.5}" y="${h * 0.24}" text-anchor="middle" fill="${accent}" font-family="Arial" font-size="${orientacion === 'portrait' ? 14 : 12}" font-weight="700" letter-spacing="3">${badge}</text>
    <text x="${w * 0.5}" y="${h * 0.38}" text-anchor="middle" fill="${text}" font-family="Georgia" font-size="${orientacion === 'portrait' ? 42 : 32}" font-weight="700">${nombre}</text>
    <rect x="${w * 0.5 - 80}" y="${h * 0.48}" width="160" height="${orientacion === 'portrait' ? 44 : 36}" rx="8" fill="${accent}" opacity="0.9"/>
    <text x="${w * 0.5}" y="${h * 0.48 + (orientacion === 'portrait' ? 28 : 24)}" text-anchor="middle" fill="${text}" font-family="Arial" font-size="${orientacion === 'portrait' ? 18 : 14}" font-weight="700">$12,900</text>
    <rect x="0" y="${h - 48}" width="${w}" height="48" fill="${bg2}" opacity="0.85"/>
    <text x="${w * 0.5}" y="${h - 22}" text-anchor="middle" fill="${text}" font-family="Arial" font-size="${orientacion === 'portrait' ? 12 : 11}" opacity="0.8" letter-spacing="1">TROTAPIE</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function textEl(id: string, left: number, top: number, text: string, extras: Record<string, unknown> = {}) {
  return { id, type: 'text' as const, fabricConfig: { left, top, width: 820, fontSize: 32, fontFamily: 'Arial', fill: '#111827', text, textAlign: 'left', ...extras } };
}

function rectEl(id: string, left: number, top: number, width: number, height: number, extras: Record<string, unknown> = {}) {
  return { id, type: 'rectangle' as const, fabricConfig: { left, top, width, height, fill: '#ffffff', rx: 0, ry: 0, selectable: false, evented: false, ...extras } };
}

function circleEl(id: string, left: number, top: number, radius: number, extras: Record<string, unknown> = {}) {
  return { id, type: 'circle' as const, fabricConfig: { left, top, radius, fill: '#ffffff', selectable: false, evented: false, ...extras } };
}

function chipEl(id: string, left: number, top: number, text: string, bg: string, textColor: string, extras: Record<string, unknown> = {}) {
  return [
    rectEl(`${id}_bg`, left, top, 0, 34, { fill: bg, rx: 17, ry: 17, ...extras }),
    textEl(`${id}_label`, left + 14, top + 6, text, { fontSize: 14, fill: textColor, fontWeight: 'bold', width: 200, ...extras }),
  ];
}

function portraitGranTour(id: number, nombre: string, descripcion: string, categoria: string, colors: [string, string, string, string], badge: string): FlyerTemplate {
  const [bg1, bg2, accent, text] = colors;
  return {
    id, nombre, descripcion, orientacion: 'portrait', ancho: 1080, alto: 1920,
    thumbnail: svgThumbnail(nombre, badge, colors, 'portrait'),
    categoria, activo: true,
    config: {
      background: { type: 'color', value: bg1 },
      elements: [
        rectEl('hero_bg', 0, 0, 1080, 1080, { fill: bg1, selectable: false }),
        rectEl('hero_overlay', 0, 600, 1080, 480, { fill: bg2, opacity: 0.15, selectable: false }),
        rectEl('image_placeholder', 60, 100, 960, 860, { fill: '#ffffff', opacity: 0.08, stroke: accent, strokeWidth: 2, strokeDashArray: [16, 10], rx: 20, ry: 20 }),
        textEl('image_hint', 340, 500, 'IMAGEN PRINCIPAL', { width: 400, fontSize: 22, fill: accent, textAlign: 'center', fontWeight: 'bold', charSpacing: 120, opacity: 0.7 }),

        rectEl('title_bg', 0, 1000, 1080, 200, { fill: 'rgba(0,0,0,0.6)', selectable: false }),
        textEl('eyebrow', 60, 1030, badge, { width: 960, fontSize: 16, fill: accent, fontWeight: 'bold', charSpacing: 160 }),
        textEl('title', 60, 1070, 'Nombre del Circuito', { width: 960, fontSize: 68, fontFamily: 'Georgia', fill: text, fontWeight: 'bold', lineHeight: 1.1 }),
        textEl('subtitle', 60, 1170, 'Descubre una experiencia unica llena de cultura, naturaleza y sabor.', { width: 860, fontSize: 20, fill: text, opacity: 0.82 }),

        rectEl('footer_bar', 0, 1760, 1080, 160, { fill: bg2, selectable: false }),
        textEl('since_badge', 60, 1780, 'DESDE', { width: 100, fontSize: 13, fill: accent, charSpacing: 120, fontWeight: 'bold' }),
        textEl('price_value', 60, 1802, '$12,900 MXN', { width: 400, fontSize: 38, fontFamily: 'Georgia', fill: text, fontWeight: 'bold' }),
        textEl('duration', 320, 1812, '5 dias / 4 noches', { width: 260, fontSize: 16, fill: text, opacity: 0.8 }),
        textEl('footer_text', 700, 1812, 'www.trotapie.com', { width: 320, fontSize: 16, fill: text, opacity: 0.7, textAlign: 'right' }),

        rectEl('destinations_bar', 60, 1260, 960, 100, { fill: '#ffffff', rx: 50, ry: 50, opacity: 0.12, selectable: false }),
        textEl('destinations', 140, 1288, 'CDMX    Queretaro    San Miguel    Guanajuato', { width: 800, fontSize: 18, fill: text, fontWeight: 'bold', charSpacing: 40 }),

        rectEl('divider', 60, 1400, 960, 2, { fill: accent, opacity: 0.5 }),
        textEl('description', 60, 1430, 'Incluye vuelos redondos, hospedaje 4 estrellas, desayunos, transportacion y guia certificado.', { width: 960, fontSize: 18, fill: text, opacity: 0.78, lineHeight: 1.6 }),
      ],
    },
  };
}

function landscapeGranTour(id: number, nombre: string, descripcion: string, categoria: string, colors: [string, string, string, string], badge: string): FlyerTemplate {
  const [bg1, bg2, accent, text] = colors;
  return {
    id, nombre, descripcion, orientacion: 'landscape', ancho: 1920, alto: 1080,
    thumbnail: svgThumbnail(nombre, badge, colors, 'landscape'),
    categoria, activo: true,
    config: {
      background: { type: 'color', value: bg1 },
      elements: [
        rectEl('hero_bg', 0, 0, 1920, 1080, { fill: bg1, selectable: false }),
        rectEl('image_placeholder', 0, 0, 920, 1080, { fill: '#ffffff', opacity: 0.06, stroke: accent, strokeWidth: 2, strokeDashArray: [20, 12], rx: 0, ry: 0 }),
        textEl('image_hint', 260, 520, 'IMAGEN PRINCIPAL', { width: 400, fontSize: 22, fill: accent, textAlign: 'center', fontWeight: 'bold', charSpacing: 120, opacity: 0.6 }),

        rectEl('info_panel', 970, 60, 890, 500, { fill: bg2, rx: 24, ry: 24, opacity: 0.12 }),
        textEl('eyebrow', 1000, 100, badge, { width: 400, fontSize: 16, fill: accent, fontWeight: 'bold', charSpacing: 160 }),
        textEl('title', 1000, 145, 'Nombre del Circuito', { width: 800, fontSize: 64, fontFamily: 'Georgia', fill: text, fontWeight: 'bold', lineHeight: 1.05 }),
        textEl('subtitle', 1000, 240, 'Vive una experiencia disenada para sorprenderte en cada destino.', { width: 760, fontSize: 20, fill: text, opacity: 0.82 }),

        rectEl('price_card', 1000, 320, 300, 90, { fill: accent, rx: 16, ry: 16, opacity: 0.9 }),
        textEl('since_label', 1020, 340, 'DESDE', { width: 80, fontSize: 13, fill: text, charSpacing: 100, fontWeight: 'bold' }),
        textEl('price_value', 1020, 365, '$15,800 MXN', { width: 260, fontSize: 30, fontFamily: 'Georgia', fill: text, fontWeight: 'bold' }),
        textEl('duration', 1340, 345, '6 dias / 5 noches', { width: 200, fontSize: 15, fill: text, opacity: 0.8 }),
        textEl('duration_label', 1340, 370, 'duracion', { width: 180, fontSize: 12, fill: accent, charSpacing: 80 }),

        rectEl('destinations_bar', 1000, 440, 800, 48, { fill: '#ffffff', rx: 24, ry: 24, opacity: 0.1 }),
        textEl('destinations', 1040, 452, 'CDMX  •  Queretaro  •  San Miguel  •  Guanajuato', { width: 720, fontSize: 15, fill: text, fontWeight: 'bold' }),

        rectEl('footer_bar', 0, 960, 1920, 120, { fill: bg2, selectable: false }),
        textEl('footer_text', 60, 1000, 'www.trotapie.com  |  contacto@www.trotapie.com', { width: 600, fontSize: 16, fill: text, opacity: 0.68 }),
        textEl('cta', 1400, 1000, 'Cotiza este circuito', { width: 460, fontSize: 16, fill: accent, textAlign: 'right', fontWeight: 'bold' }),
      ],
    },
  };
}

const P = (id: number, n: string, d: string, c: string, colors: [string, string, string, string], badge: string) =>
  portraitGranTour(id, n, d, c, colors, badge);
const L = (id: number, n: string, d: string, c: string, colors: [string, string, string, string], badge: string) =>
  landscapeGranTour(id, n, d, c, colors, badge);

export const PRESET_FLYER_TEMPLATES: FlyerTemplate[] = [
  P(1001, 'Gran Tour Italia', 'Plantilla editorial vertical estilo folleto premium para circuitos destacados.', 'premium', ['#0a1628', '#0f2a44', '#d4af37', '#f8fafc'], 'CIRCUITO PREMIUM'),
  L(1002, 'Gran Tour Executive', 'Composicion horizontal con panel informativo para presentaciones ejecutivas.', 'premium', ['#0a1628', '#0f2a44', '#c08429', '#f3f4f6'], 'EDICION EJECUTIVA'),
  P(1003, 'Aventura Natural', 'Plantilla vertical para circuitos de naturaleza, senderismo y destinos ecologicos.', 'aventura', ['#0d2818', '#1a4a32', '#34d399', '#ecfdf5'], 'RUTA AVENTURA'),
  L(1004, 'Aventura Explorer', 'Layout horizontal con estilo magazine para expediciones y rutas extremas.', 'aventura', ['#0d2818', '#1a4a32', '#84cc16', '#f7fee7'], 'EXPEDICION'),
  P(1005, 'Romantico Esencia', 'Diseno vertical suave y elegante para escapadas en pareja.', 'romantico', ['#2d0a14', '#4a1528', '#f9a8d4', '#fff1f2'], 'ESCAPADA ROMANTICA'),
  L(1006, 'Familiar Aventura', 'Composicion horizontal alegre con espacios claros para planes familiares.', 'familiar', ['#0a1e4a', '#153075', '#f59e0b', '#eff6ff'], 'PLAN EN FAMILIA'),
  P(1007, 'Tropical Escape', 'Vertical fresca y vibrant para destinos de playa y descanso.', 'playa', ['#042f4a', '#0a4a6e', '#22d3ee', '#ecfeff'], 'ESCAPE TROPICAL'),
  L(1008, 'Urbano Contemporaneo', 'Diseno horizontal limpio con acentos modernos para circuitos de ciudad.', 'urbano', ['#111827', '#1f2937', '#60a5fa', '#f9fafb'], 'CITY CIRCUIT'),
  P(1009, 'Promo Relampago', 'Formato vertical de alta conversion para ofertas y campanas.', 'promo', ['#3d0c11', '#5c1420', '#fb7185', '#fff7ed'], 'OFERTA LIMITADA'),
  L(1010, 'Lujo Exclusivo', 'Estetica horizontal minimalista y refinada para circuitos de alta gama.', 'lujo', ['#0a0a0f', '#1a1a2e', '#eab308', '#f8fafc'], 'SELECCION LUJO'),
];
