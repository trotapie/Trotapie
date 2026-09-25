import { inject, Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SupabaseService } from './supabase.service';
import { TraduccionesService } from './traducciones.service';
import { CatalogoPestanaHotel } from './catalogo-pestanas-hotel.service';

export interface HotelDetalleCard {
  titulo: string;
  destacado: string;
  contenido: string;
}

export type HotelDetalleBloque =
  | { tipo: 'texto'; contenido: string }
  | { tipo: 'cards'; cards: HotelDetalleCard[] };

export interface HotelDetalleTraduccion {
  idioma_id: number;
  contenido_html: string;
  bloques: HotelDetalleBloque[];
}

export interface HotelDetalleSeccion {
  id: string;
  catalogo_pestana_id: number;
  catalogo_pestana?: CatalogoPestanaHotel | null;
  orden: number;
  icono: string;
  visible: boolean;
  traducciones: HotelDetalleTraduccion[];
}

@Injectable({ providedIn: 'root' })
export class HotelDetalleSeccionesService {
  private readonly supabase = inject(SupabaseService);
  private readonly traducciones = inject(TraduccionesService);
  private readonly sanitizer = inject(DomSanitizer);

  async obtener(hotelId: number): Promise<HotelDetalleSeccion[]> {
    const { data, error } = await this.supabase.getClient()
      .from('hotel_detalle_secciones')
      .select('id, catalogo_pestana_id, catalogo_pestana:catalogo_pestanas_hotel(id, titulo_es, icono, activo, traducciones:catalogo_pestanas_hotel_traducciones(idioma_id, titulo)), orden, icono, visible, traducciones:hotel_detalle_secciones_traducciones(idioma_id, contenido_html, bloques)')
      .eq('hotel_id', hotelId)
      .order('orden', { ascending: true });
    if (error) throw error;
    // PostgREST devuelve un objeto para la FK a catálogo (relación muchos-a-uno).
    return (data ?? []) as unknown as HotelDetalleSeccion[];
  }

  // El editor y la página pública usan la misma lista de etiquetas y enlaces admitidos.
  limpiarHtml(html: string): string {
    const entrada = new DOMParser().parseFromString(html || '', 'text/html');
    const salida = document.createElement('div');
    const permitidas = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'A']);
    const copiar = (origen: Node, destino: Node) => {
      if (origen.nodeType === Node.TEXT_NODE) {
        destino.appendChild(document.createTextNode(origen.textContent ?? ''));
        return;
      }
      if (origen.nodeType !== Node.ELEMENT_NODE) return;
      const elemento = origen as HTMLElement;
      if (!permitidas.has(elemento.tagName)) {
        // No conservar el contenido de elementos peligrosos.
        if (['SCRIPT', 'STYLE', 'IFRAME', 'SVG', 'OBJECT'].includes(elemento.tagName)) return;
        elemento.childNodes.forEach((hijo) => copiar(hijo, destino));
        return;
      }
      const nuevo = document.createElement(elemento.tagName.toLowerCase());
      if (elemento.tagName === 'A') {
        const href = elemento.getAttribute('href') ?? '';
        if (/^https?:\/\//i.test(href)) {
          nuevo.setAttribute('href', href);
          nuevo.setAttribute('target', '_blank');
          nuevo.setAttribute('rel', 'noopener noreferrer');
        }
      }
      elemento.childNodes.forEach((hijo) => copiar(hijo, nuevo));
      destino.appendChild(nuevo);
    };
    entrada.body.childNodes.forEach((nodo) => copiar(nodo, salida));
    return this.sanitizer.sanitize(SecurityContext.HTML, salida.innerHTML) ?? '';
  }

  private escapar(texto: string): string {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  generarHtml(bloques: HotelDetalleBloque[]): string {
    return bloques.map((bloque) => {
      if (bloque.tipo === 'texto') {
        return `<div class="hotel-contenido-texto">${this.limpiarHtml(bloque.contenido)}</div>`;
      }
      return `<div class="hotel-contenido-cards">${bloque.cards.map((card) => `
        <article class="hotel-contenido-card">
          ${card.titulo.trim() ? `<h4>${this.escapar(card.titulo.trim())}</h4>` : ''}
          ${card.destacado.trim() ? `<strong class="hotel-contenido-destacado">${this.escapar(card.destacado.trim())}</strong>` : ''}
          <div class="hotel-contenido-texto">${this.limpiarHtml(card.contenido)}</div>
        </article>`).join('')}</div>`;
    }).join('');
  }

  private recorrerTextosHtml(html: string, visitar: (texto: string) => string): string {
    const contenedor = document.createElement('div');
    contenedor.innerHTML = this.limpiarHtml(html);
    const walker = document.createTreeWalker(contenedor, NodeFilter.SHOW_TEXT);
    const nodos: Text[] = [];
    while (walker.nextNode()) nodos.push(walker.currentNode as Text);
    for (const nodo of nodos) {
      const original = nodo.textContent ?? '';
      if (original.trim()) nodo.textContent = visitar(original);
    }
    return contenedor.innerHTML;
  }

  async prepararSecciones(
    secciones: Array<HotelDetalleSeccion & { titulo: string; bloques: HotelDetalleBloque[] }>,
    idiomas: Array<{ id: number; codigo: string }>
  ): Promise<HotelDetalleSeccion[]> {
    const preparados = secciones.map((seccion, orden) => {
      if (!seccion.catalogo_pestana_id || !seccion.catalogo_pestana) {
        throw new Error('Selecciona una pestaña del catálogo para cada sección.');
      }
      const bloques = seccion.bloques.map((bloque): HotelDetalleBloque => bloque.tipo === 'texto'
        ? { tipo: 'texto', contenido: this.limpiarHtml(bloque.contenido) }
        : { tipo: 'cards', cards: bloque.cards.map((card) => ({ ...card, contenido: this.limpiarHtml(card.contenido) })) });
      const anteriorEs = seccion.traducciones.find((item) => item.idioma_id === 1);
      return { seccion, orden, bloques,
        sinCambios: JSON.stringify(anteriorEs?.bloques) === JSON.stringify(bloques) };
    });

    const textos = new Set<string>();
    const agregar = (texto: string): string => { if (texto.trim()) textos.add(texto); return texto; };
    for (const { seccion, bloques, sinCambios } of preparados) {
      if (idiomas.every((idioma) => idioma.codigo === 'es' ||
        (sinCambios && seccion.traducciones.some((item) => item.idioma_id === idioma.id)))) continue;
      for (const bloque of bloques) {
        if (bloque.tipo === 'texto') this.recorrerTextosHtml(bloque.contenido, agregar);
        else for (const card of bloque.cards) {
          agregar(card.titulo);
          agregar(card.destacado);
          this.recorrerTextosHtml(card.contenido, agregar);
        }
      }
    }

    const diccionario = new Map<string, Map<string, string>>();
    const separador = '\n\uE000\n';
    const pendientes = Array.from(textos);
    while (pendientes.length) {
      const lote = [pendientes.shift()!];
      let longitud = lote[0].length;
      while (pendientes.length && longitud + separador.length + pendientes[0].length <= 3500) {
        const siguiente = pendientes.shift()!;
        lote.push(siguiente);
        longitud += separador.length + siguiente.length;
      }
      let respuesta: Awaited<ReturnType<TraduccionesService['traducirDesdeEspanol']>>;
      try {
        respuesta = await this.traducciones.traducirDesdeEspanol({
          title: lote[0], description: lote.slice(1).join(separador)
        });
      } catch {
        throw new Error('No se pudo contactar al traductor. No se guardaron los cambios; vuelve a intentarlo.');
      }
      for (const idioma of idiomas.filter((item) => item.codigo !== 'es')) {
        const traducido = respuesta?.[idioma.codigo];
        const otros = lote.length > 1 && typeof traducido?.description === 'string'
          ? traducido.description.split(/\s*\uE000\s*/u) : [];
        const valores = [traducido?.title, ...otros];
        if (valores.length !== lote.length || valores.some((valor) => typeof valor !== 'string' || !valor.trim())) {
          throw new Error(`La traducción a ${idioma.codigo} no se completó. No se guardaron los cambios; vuelve a intentarlo.`);
        }
        const entradas = diccionario.get(idioma.codigo) ?? new Map<string, string>();
        lote.forEach((original, indice) => entradas.set(original, valores[indice]));
        diccionario.set(idioma.codigo, entradas);
      }
    }

    return preparados.map(({ seccion, orden, bloques, sinCambios }) => ({
      id: seccion.id, catalogo_pestana_id: seccion.catalogo_pestana_id,
      orden, icono: seccion.icono, visible: seccion.visible,
      traducciones: idiomas.map((idioma) => {
        if (idioma.codigo === 'es') {
          return { idioma_id: idioma.id, bloques, contenido_html: this.generarHtml(bloques) };
        }
        const previo = seccion.traducciones.find((item) => item.idioma_id === idioma.id);
        if (sinCambios && previo) return previo;
        const traducir = (texto: string): string => {
          if (!texto.trim()) return texto;
          const valor = diccionario.get(idioma.codigo)?.get(texto);
          if (!valor) throw new Error(`Falta una traducción a ${idioma.codigo}. No se guardaron los cambios.`);
          return valor;
        };
        const traducidos: HotelDetalleBloque[] = bloques.map((bloque) => bloque.tipo === 'texto'
          ? { tipo: 'texto', contenido: this.recorrerTextosHtml(bloque.contenido, traducir) }
          : { tipo: 'cards', cards: bloque.cards.map((card) => ({
            titulo: traducir(card.titulo), destacado: traducir(card.destacado),
            contenido: this.recorrerTextosHtml(card.contenido, traducir)
          })) });
        return { idioma_id: idioma.id, bloques: traducidos,
          contenido_html: this.generarHtml(traducidos) };
      })
    }));
  }

  async guardar(hotelId: number, secciones: HotelDetalleSeccion[]): Promise<void> {
    const { error } = await this.supabase.getClient().rpc('guardar_hotel_detalle_secciones', {
      p_hotel_id: hotelId,
      p_secciones: secciones
    });
    if (error) throw error;
  }
}
