import { Directive, HostListener, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExperienciasService, ExperienciaTipo, FichaExperiencia, IDIOMAS_EXPERIENCIAS, IdiomaExperiencia } from 'app/core/experiencias.service';
import { TraduccionesService } from 'app/core/traducciones.service';
import { TpToastService } from 'app/shared/tp-toast/tp-toast.service';
import { TpActionMenuItem } from 'app/shared/tp-actions-menu/tp-actions-menu.component';

function fichaNueva(tipo: ExperienciaTipo): FichaExperiencia {
  return {
    id: 0, tipo, publicada: false, catalogo_destino_id: null, destinoFiltroId: null, hotel_id: null, destinoNombre: '', hotelNombre: '',
    imagen_principal: '', imagenes: [], precio_desde: null, precio_promocional: null, precio_anterior: null,
    descuento_porcentaje: null, moneda: 'MXN', precio_por: 'noche', precio_personas: 2, adultos_max: 2, ninos_max: 0,
    habitaciones: 1, disponible_desde: '', disponible_hasta: '', vigencia_desde: '', vigencia_hasta: '', viaje_desde: '', viaje_hasta: '',
    amenidadIds: [], amenidades: [], traducciones: { es: {}, en: {}, fr: {}, de: {}, pt: {} }, nombre: '', descripcion: '', camas: '', experiencia: '', zona: '',
    referencia_mapa: '', etiqueta: '', condiciones: ''
  };
}

@Directive()
export abstract class ExperienciasAdminBase implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(ExperienciasService);
  private readonly traduccionesService = inject(TraduccionesService);
  private readonly toast = inject(TpToastService);
  readonly idiomas = IDIOMAS_EXPERIENCIAS;
  tipo: ExperienciaTipo = 'cabana';
  modoEditor = false;
  paso = 0;
  mostrarErrores = false;
  private estadoGuardado = '';
  private cargaOpcionesVersion = 0;
  private cargaUbicacionVersion = 0;
  fichas: FichaExperiencia[] = [];
  ficha: FichaExperiencia | null = null;
  tipoDestino: 'NACIONAL' | 'INTERNACIONAL' | null = null;
  continenteId: number | null = null;
  paisId: number | null = null;
  divisionAreaId: number | null = null;
  readonly opcionesTipoDestino = [
    { value: 'NACIONAL', label: 'Nacional' },
    { value: 'INTERNACIONAL', label: 'Internacional' }
  ];
  idioma: IdiomaExperiencia = 'es';
  destinos: Array<{ id: number; nombre: string; divisionAreaId: number; estado: string; pais: string; paisId: number; region: string; regionId: number; tipo: 'NACIONAL' | 'INTERNACIONAL'; activo: boolean }> = [];
  regionesInternacionales: Array<{ id: number; nombre: string }> = [];
  paisesInternacionales: Array<{ id: number; nombre: string }> = [];
  hoteles: Array<{ id: number; nombre: string; destinoId: number | null }> = [];
  amenidades: Array<{ id: number; nombre: string }> = [];
  imagenNueva = '';
  filtroDestino: number | null = null;
  filtroTexto = '';
  cargando = true;
  cargandoCatalogo = false;
  errorCatalogo = '';
  private faseCatalogoFallida: 'opciones' | 'paises' | 'destinos' | null = null;
  guardando = false;
  traduciendo = false;
  subiendoImagen = false;
  error = '';

  get rutaListado(): string { return `/admin/${this.tipo === 'cabana' ? 'cabanas' : 'promociones'}`; }
  get nombreSingular(): string { return this.tipo === 'cabana' ? 'cabaña' : 'promoción'; }
  get ubicacionResumen(): string {
    if (!this.ficha) return 'Sin ubicación';
    if (this.ficha.hotel_id) return this.hoteles.find((hotel) => hotel.id === this.ficha?.hotel_id)?.nombre ?? 'Hotel seleccionado';
    const destino = this.destinos.find((item) => item.id === this.ficha?.catalogo_destino_id);
    return destino ? `${destino.nombre}, ${destino.estado}, ${destino.pais}` : 'Sin destino';
  }
  get pasos(): string[] {
    return this.tipo === 'cabana' ? ['Lo básico', 'Capacidad y precio', 'Fotos y detalles', 'Revisar y guardar']
      : ['Lo básico', 'La oferta', 'Fechas e imagen', 'Revisar y guardar'];
  }
  get tieneCambiosPendientes(): boolean {
    return this.modoEditor && (this.subiendoImagen || (!!this.ficha && !!this.estadoGuardado && this.estadoGuardado !== this.estadoActual()));
  }
  private estadoActual(): string { return JSON.stringify({ ficha: this.ficha, imagenNueva: this.imagenNueva }); }
  private marcarGuardado(): void { this.estadoGuardado = this.estadoActual(); }

  @HostListener('window:beforeunload', ['$event'])
  antesDeSalir(event: BeforeUnloadEvent): void {
    if ((!this.tieneCambiosPendientes && !this.subiendoImagen) || this.guardando) return;
    event.preventDefault();
    event.returnValue = '';
  }

  async ngOnInit(): Promise<void> {
    this.modoEditor = !!this.route.snapshot.data['editor'];
    if (this.modoEditor && !this.route.snapshot.paramMap.has('id')) {
      this.crear();
      this.marcarGuardado();
      this.cargando = false;
      return;
    }
    await this.cargar();
  }

  async cargarOpciones(categoria?: 'NACIONAL' | 'INTERNACIONAL'): Promise<void> {
    if (this.modoEditor && !this.ficha?.id && !this.tipoDestino) return;
    const version = ++this.cargaOpcionesVersion;
    const tipo = categoria ?? (this.modoEditor && !this.ficha?.id ? this.tipoDestino! : undefined);
    this.cargandoCatalogo = true;
    this.errorCatalogo = '';
    this.faseCatalogoFallida = null;
    try {
      const opciones = await this.service.opciones(tipo);
      if (version !== this.cargaOpcionesVersion) return;
      this.destinos = opciones.destinos;
      this.regionesInternacionales = opciones.regiones;
      this.hoteles = opciones.hoteles;
      this.amenidades = opciones.amenidades;
      this.inferirTipoDestino();
      if (this.filtroDestino && !this.opcionesDestinosFiltro.some((opcion) => opcion.value === this.filtroDestino)) this.filtroDestino = null;
    } catch (error: any) {
      if (version === this.cargaOpcionesVersion) {
        this.faseCatalogoFallida = 'opciones';
        this.errorCatalogo = error?.message ?? 'No se pudo cargar el catálogo de destinos.';
      }
    } finally {
      if (version === this.cargaOpcionesVersion) this.cargandoCatalogo = false;
    }
  }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      const fichas = await this.service.listar(this.tipo, 'es', true);
      this.fichas = fichas;
      if (this.filtroDestino && !this.opcionesDestinosFiltro.some((opcion) => opcion.value === this.filtroDestino)) this.filtroDestino = null;
      if (this.modoEditor && !this.ficha) {
        const idParam = this.route.snapshot.paramMap.get('id');
        if (idParam) {
          const ficha = fichas.find((item) => item.id === Number(idParam));
          if (ficha) this.editar(ficha);
          else this.error = `No se encontró la ${this.nombreSingular} solicitada.`;
        } else this.crear();
        if (this.ficha) this.marcarGuardado();
      }
      if (this.modoEditor && this.ficha && this.cargaOpcionesVersion === 0) void this.cargarOpciones();
    } catch (error: any) { this.error = error?.message ?? 'No se pudieron cargar los datos.'; }
    finally { this.cargando = false; }
  }

  crear(): void {
    if (!this.modoEditor) { void this.router.navigateByUrl(`${this.rutaListado}/nueva`); return; }
    this.ficha = fichaNueva(this.tipo); this.tipoDestino = null; this.continenteId = null; this.paisId = null; this.divisionAreaId = null; this.idioma = 'es'; this.imagenNueva = ''; this.paso = 0;
  }
  editar(ficha: FichaExperiencia): void {
    if (!this.modoEditor) { void this.router.navigateByUrl(`${this.rutaListado}/editar/${ficha.id}`); return; }
    this.ficha = { ...ficha, imagenes: [...ficha.imagenes], amenidadIds: [...ficha.amenidadIds], traducciones: structuredClone(ficha.traducciones) };
    for (const codigo of this.idiomas) this.ficha.traducciones[codigo] ??= {};
    this.divisionAreaId = null;
    this.inferirTipoDestino();
    this.idioma = 'es'; this.imagenNueva = ''; this.paso = 0;
  }
  private inferirTipoDestino(): void {
    if (!this.ficha) return;
    const destinoId = this.ficha.catalogo_destino_id ?? this.hoteles.find((hotel) => hotel.id === this.ficha?.hotel_id)?.destinoId;
    const destino = this.destinos.find((item) => item.id === destinoId);
    if (!destino) return;
    this.tipoDestino = destino.tipo;
    this.continenteId = destino.tipo === 'INTERNACIONAL' ? destino.regionId : null;
    this.paisId = destino.tipo === 'INTERNACIONAL' ? destino.paisId : null;
    this.divisionAreaId = destino.divisionAreaId;
  }
  seleccionarTipoDestino(tipo: 'NACIONAL' | 'INTERNACIONAL' | null): void {
    if (this.tipoDestino === tipo) return;
    this.tipoDestino = tipo;
    this.continenteId = null;
    this.paisId = null;
    this.divisionAreaId = null;
    this.limpiarUbicacion();
    this.cargaUbicacionVersion++;
    this.destinos = [];
    this.regionesInternacionales = [];
    this.paisesInternacionales = [];
    this.hoteles = [];
    this.amenidades = [];
    if (tipo) void this.cargarOpciones(tipo);
    else {
      this.cargaOpcionesVersion++;
      this.cargandoCatalogo = false;
      this.errorCatalogo = '';
      this.faseCatalogoFallida = null;
    }
  }
  seleccionarContinente(id: number | null): void {
    if (this.continenteId === id) return;
    this.continenteId = id;
    this.paisId = null;
    this.divisionAreaId = null;
    this.limpiarUbicacion();
    this.cargaUbicacionVersion++;
    this.paisesInternacionales = [];
    this.destinos = [];
    if (id) void this.cargarPaises(id);
    else { this.cargandoCatalogo = false; this.errorCatalogo = ''; }
  }
  seleccionarPais(id: number | null): void {
    if (this.paisId === id) return;
    this.paisId = id;
    this.divisionAreaId = null;
    this.limpiarUbicacion();
    this.cargaUbicacionVersion++;
    this.destinos = [];
    if (id) void this.cargarDestinosPais(id);
    else { this.cargandoCatalogo = false; this.errorCatalogo = ''; }
  }
  private async cargarPaises(continenteId: number): Promise<void> {
    const version = this.cargaUbicacionVersion;
    this.cargandoCatalogo = true;
    this.errorCatalogo = '';
    this.faseCatalogoFallida = null;
    try {
      const paises = await this.service.paisesPorContinente(continenteId);
      if (version === this.cargaUbicacionVersion) this.paisesInternacionales = paises.map((pais) => ({ id: pais.id, nombre: pais.nombre }));
    } catch (error: any) {
      if (version === this.cargaUbicacionVersion) {
        this.faseCatalogoFallida = 'paises';
        this.errorCatalogo = error?.message ?? 'No se pudieron cargar los países.';
      }
    } finally {
      if (version === this.cargaUbicacionVersion) this.cargandoCatalogo = false;
    }
  }
  private async cargarDestinosPais(paisId: number): Promise<void> {
    const version = this.cargaUbicacionVersion;
    this.cargandoCatalogo = true;
    this.errorCatalogo = '';
    this.faseCatalogoFallida = null;
    try {
      const destinos = await this.service.destinosPorPais(paisId);
      if (version === this.cargaUbicacionVersion) this.destinos = destinos;
    } catch (error: any) {
      if (version === this.cargaUbicacionVersion) {
        this.faseCatalogoFallida = 'destinos';
        this.errorCatalogo = error?.message ?? 'No se pudieron cargar los destinos del país.';
      }
    } finally {
      if (version === this.cargaUbicacionVersion) this.cargandoCatalogo = false;
    }
  }
  reintentarCatalogo(): void {
    if (this.faseCatalogoFallida === 'destinos' && this.paisId) { void this.cargarDestinosPais(this.paisId); return; }
    if (this.faseCatalogoFallida === 'paises' && this.continenteId) { void this.cargarPaises(this.continenteId); return; }
    void this.cargarOpciones(this.modoEditor ? this.tipoDestino ?? undefined : undefined);
  }
  private limpiarUbicacion(): void {
    if (!this.ficha) return;
    this.ficha.catalogo_destino_id = null;
    this.ficha.hotel_id = null;
    if (this.tipo === 'cabana') this.actualizarZona('');
    this.error = '';
    this.mostrarErrores = false;
  }
  seleccionarDivisionArea(id: number | null): void {
    if (this.divisionAreaId === id) return;
    this.divisionAreaId = id;
    if (!this.ficha) return;
    this.ficha.catalogo_destino_id = null;
    this.actualizarZona('');
  }
  seleccionarZona(id: number | null): void {
    if (!this.ficha) return;
    this.ficha.catalogo_destino_id = id;
    this.actualizarZona(this.destinos.find((destino) => destino.id === id && destino.divisionAreaId === this.divisionAreaId)?.nombre ?? '');
  }
  private actualizarZona(nombre: string): void {
    if (!this.ficha || this.ficha.traducciones['es']?.['zona'] === nombre) return;
    (this.ficha.traducciones['es'] ??= {})['zona'] = nombre;
    for (const idioma of this.idiomas.filter((codigo) => codigo !== 'es')) {
      if (this.ficha.traducciones[idioma]) this.ficha.traducciones[idioma]['zona'] = '';
    }
  }
  cerrar(): void { if (!this.guardando) void this.router.navigateByUrl(this.rutaListado); }
  get texto(): Record<string, string> {
    if (!this.ficha) return {};
    return this.ficha.traducciones[this.idioma] ??= {};
  }
  get opcionesDestinos() {
    return this.destinos.map((destino) => ({ value: destino.id, label: destino.nombre }));
  }
  get opcionesDestinosPorTipo() {
    if (!this.tipoDestino) return [];
    const ids = new Set(this.destinos.filter((destino) => destino.tipo === this.tipoDestino &&
      (this.tipoDestino !== 'INTERNACIONAL' || (this.continenteId && this.paisId && destino.regionId === this.continenteId && destino.paisId === this.paisId)))
      .map((destino) => destino.id));
    return this.opcionesDestinos.filter((opcion) => ids.has(opcion.value as number));
  }
  get opcionesDivisionesArea() {
    const divisiones = new Map<number, string>();
    for (const destino of this.destinos) {
      if (destino.tipo === this.tipoDestino && (this.tipoDestino !== 'INTERNACIONAL' || destino.paisId === this.paisId) && destino.divisionAreaId) {
        divisiones.set(destino.divisionAreaId, destino.estado);
      }
    }
    return [...divisiones].sort((a, b) => a[1].localeCompare(b[1], 'es')).map(([value, label]) => ({ value, label }));
  }
  get opcionesZonas() {
    return this.destinos.filter((destino) => destino.divisionAreaId === this.divisionAreaId && destino.tipo === this.tipoDestino &&
      (this.tipoDestino !== 'INTERNACIONAL' || destino.paisId === this.paisId))
      .map((destino) => ({ value: destino.id, label: destino.nombre }));
  }
  get opcionesContinentes() {
    if (this.regionesInternacionales.length) return this.regionesInternacionales.map((region) => ({ value: region.id, label: region.nombre }));
    const continentes = new Map<number, string>();
    for (const destino of this.destinos) if (destino.tipo === 'INTERNACIONAL') continentes.set(destino.regionId, destino.region);
    return [...continentes].sort((a, b) => a[1].localeCompare(b[1], 'es')).map(([value, label]) => ({ value, label }));
  }
  get opcionesPaises() {
    if (this.paisesInternacionales.length) return this.paisesInternacionales.map((pais) => ({ value: pais.id, label: pais.nombre }));
    const paises = new Map<number, string>();
    for (const destino of this.destinos) if (destino.tipo === 'INTERNACIONAL' && destino.regionId === this.continenteId) paises.set(destino.paisId, destino.pais);
    return [...paises].sort((a, b) => a[1].localeCompare(b[1], 'es')).map(([value, label]) => ({ value, label }));
  }
  get opcionesDestinosFiltro() {
    const destinos = new Map<number, string>();
    for (const ficha of this.fichas) {
      if (ficha.destinoFiltroId) destinos.set(ficha.destinoFiltroId, ficha.destinoNombre || `Destino #${ficha.destinoFiltroId}`);
    }
    return [...destinos].sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([value, label]) => ({ value, label }));
  }
  get fichasFiltradas(): FichaExperiencia[] {
    const termino = this.filtroTexto.trim().toLocaleLowerCase();
    return this.fichas.filter((item) =>
      (!this.filtroDestino || item.destinoFiltroId === this.filtroDestino) &&
      (!termino || `${item.nombre} ${item.destinoNombre} ${item.hotelNombre}`.toLocaleLowerCase().includes(termino))
    );
  }
  get opcionesHoteles() {
    if (!this.tipoDestino) return [];
    const destinosPorId = new Map(this.destinos.map((destino) => [destino.id, destino]));
    return this.hoteles.filter((hotel) => !hotel.destinoId || (destinosPorId.get(hotel.destinoId)?.tipo === this.tipoDestino &&
      (this.tipoDestino !== 'INTERNACIONAL' || destinosPorId.get(hotel.destinoId)?.paisId === this.paisId)))
      .map((hotel) => ({ value: hotel.id, label: hotel.nombre }));
  }
  get hotelTieneDestino(): boolean {
    return !!this.hoteles.find((hotel) => hotel.id === this.ficha?.hotel_id)?.destinoId;
  }
  seleccionarHotel(id: number | null): void {
    if (!this.ficha) return;
    this.ficha.hotel_id = id;
    const destinoId = this.hoteles.find((hotel) => hotel.id === id)?.destinoId;
    if (destinoId) this.ficha.catalogo_destino_id = destinoId;
  }
  get opcionesPeriodo() { return [{ value: 'noche', label: 'Por noche' }, { value: 'estancia', label: 'Por estancia' }]; }
  get opcionesAmenidades() { return this.amenidades.filter((a) => !this.ficha?.amenidadIds.includes(a.id)); }
  nombreAmenidad(id: number): string { return this.amenidades.find((a) => a.id === id)?.nombre ?? `#${id}`; }
  agregarAmenidad(id: string | number | null): void {
    if (id && this.ficha && !this.ficha.amenidadIds.includes(Number(id))) this.ficha.amenidadIds.push(Number(id));
  }
  agregarImagen(): void {
    const url = this.imagenNueva.trim();
    if (!this.ficha || this.ficha.imagenes.length >= 10) return;
    if (!this.urlValida(url)) { this.error = 'La foto debe tener una URL HTTPS válida.'; return; }
    this.ficha.imagenes.push(url); this.imagenNueva = '';
    this.error = '';
  }
  async seleccionarArchivo(event: Event, portada: boolean): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || !this.ficha || this.subiendoImagen) return;
    if (!portada && this.ficha.imagenes.length >= 10) { this.error = 'La galería admite hasta 10 fotos.'; return; }
    this.subiendoImagen = true; this.error = '';
    try {
      const url = await this.service.subirImagen(this.tipo, archivo);
      if (portada) this.ficha.imagen_principal = url;
      else this.ficha.imagenes.push(url);
    } catch (error: any) { this.error = error?.message ?? 'No se pudo subir la imagen. Vuelve a intentarlo.'; }
    finally { this.subiendoImagen = false; }
  }
  private urlValida(value: string): boolean {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }

  async generarTraducciones(): Promise<void> {
    if (!this.ficha) return;
    const base = this.ficha.traducciones['es'];
    if (!base?.['nombre']?.trim()) { this.error = 'Captura primero el nombre o título en español.'; return; }
    this.traduciendo = true; this.error = '';
    try {
      const campos = this.tipo === 'cabana'
        ? ['nombre', 'descripcion', 'camas', 'experiencia', 'zona', 'referencia_mapa']
        : ['nombre', 'etiqueta', 'condiciones'];
      for (const campo of campos) {
        const valor = base[campo]?.trim();
        if (!valor) continue;
        const resultado = await this.traduccionesService.traducirDesdeEspanol({ title: valor, description: '' });
        for (const codigo of this.idiomas.filter((i) => i !== 'es')) {
          const traducido = resultado[codigo]?.title;
          if (!traducido?.trim()) throw new Error(`Falta la traducción de ${campo} a ${codigo}.`);
          (this.ficha.traducciones[codigo] ??= {})[campo] = traducido.trim();
        }
      }
      this.toast.show({ title: 'Traducciones listas', message: 'Revísalas antes de publicar.', variant: 'success' });
    } catch (error: any) { this.error = error?.message ?? 'No se pudieron generar las traducciones.'; }
    finally { this.traduciendo = false; }
  }

  private validarPaso(paso: number, publicar: boolean): string {
    const f = this.ficha;
    if (!f) return 'No se encontró el contenido.';
    const es = f.traducciones['es'] ?? {};
    if (paso === 0) {
      if (!this.tipoDestino) return 'Selecciona si el destino es nacional o internacional.';
      if (this.tipoDestino === 'INTERNACIONAL' && !this.continenteId) return 'Selecciona un continente.';
      if (this.tipoDestino === 'INTERNACIONAL' && !this.paisId) return 'Selecciona un país.';
      if (!es['nombre']?.trim()) return `Escribe ${this.tipo === 'cabana' ? 'el nombre de la cabaña' : 'el título de la promoción'}.`;
      if (f.tipo === 'cabana' && !this.divisionAreaId) return 'Selecciona una división de área.';
      if (f.tipo === 'cabana' ? !f.catalogo_destino_id : !f.hotel_id && !f.catalogo_destino_id) return f.tipo === 'cabana' ? 'Selecciona una zona o ubicación.' : 'Selecciona un destino o un hotel.';
      if (f.tipo === 'promocion' && f.hotel_id && !this.hotelTieneDestino && !f.catalogo_destino_id) return 'Selecciona un destino para este hotel; no tiene uno asignado.';
      if (publicar && f.tipo === 'cabana' && !es['descripcion']?.trim()) return 'Escribe una descripción breve.';
    }
    if (paso === 1) {
      if (!/^[A-Z]{3}$/.test(f.moneda)) return 'La moneda debe tener tres letras, por ejemplo MXN.';
      if (f.tipo === 'cabana') {
        if (f.precio_desde === null || !Number.isFinite(Number(f.precio_desde)) || Number(f.precio_desde) < 0) return 'Indica el precio desde (cero o mayor).';
        if (!['noche', 'estancia'].includes(f.precio_por)) return 'Selecciona si el precio es por noche o por estancia.';
        if (!f.precio_personas || f.precio_personas < 1 || !f.adultos_max || f.adultos_max < 1 || f.ninos_max === null || f.ninos_max < 0 || !f.habitaciones || f.habitaciones < 1) return 'Revisa personas incluidas, capacidad y habitaciones.';
        if (f.disponible_hasta && f.disponible_desde && f.disponible_hasta < f.disponible_desde) return 'La fecha final de disponibilidad debe ser posterior a la inicial.';
        if (publicar && !es['camas']?.trim()) return 'Describe las camas de la cabaña.';
      } else {
        if (f.precio_promocional === null && f.descuento_porcentaje === null) return 'Indica un precio promocional o un descuento.';
        if (f.precio_promocional !== null && (Number(f.precio_promocional) < 0 || !Number.isFinite(Number(f.precio_promocional)))) return 'El precio promocional debe ser cero o mayor.';
        if (f.precio_anterior !== null && (Number(f.precio_anterior) < 0 || !Number.isFinite(Number(f.precio_anterior)))) return 'Revisa el precio anterior.';
        if (f.descuento_porcentaje !== null && (Number(f.descuento_porcentaje) <= 0 || Number(f.descuento_porcentaje) > 100)) return 'El descuento debe estar entre 1 y 100 %.';
        if (f.precio_anterior !== null && f.precio_promocional !== null && Number(f.precio_anterior) <= Number(f.precio_promocional)) return 'El precio anterior debe superar al promocional.';
        if (publicar && !es['condiciones']?.trim()) return 'Escribe las condiciones de la oferta.';
      }
    }
    if (paso === 2) {
      if (!this.urlValida(f.imagen_principal)) return 'Agrega una URL HTTPS válida para la portada.';
      if (f.tipo === 'cabana') {
        if (this.imagenNueva.trim()) return 'Agrega la foto pendiente o borra su enlace antes de continuar.';
        if (f.imagenes.some((url) => !this.urlValida(url))) return 'Revisa las URLs de la galería.';
        if (publicar && (f.imagenes.length < 5 || f.imagenes.length > 10)) return 'Para publicar, agrega entre 5 y 10 fotos a la galería.';
      } else if (!f.vigencia_desde || !f.vigencia_hasta || !f.viaje_desde || !f.viaje_hasta || f.vigencia_hasta < f.vigencia_desde || f.viaje_hasta < f.viaje_desde) {
        return 'Completa las fechas de vigencia y viaje en orden.';
      }
    }
    if (paso === 3) {
      const requeridos = f.tipo === 'cabana' ? ['nombre', 'descripcion', 'camas', 'experiencia', 'zona'] : ['nombre', 'etiqueta', 'condiciones'];
      const idiomas = publicar ? this.idiomas : (['es'] as const);
      for (const idioma of idiomas) {
        const faltante = requeridos.find((campo) => !f.traducciones[idioma]?.[campo]?.trim());
        if (faltante && (publicar || faltante === 'nombre')) { this.idioma = idioma; return `Completa ${faltante} en ${idioma.toUpperCase()} antes de ${publicar ? 'publicar' : 'guardar'}.`; }
      }
    }
    return '';
  }

  irAlPaso(paso: number): void {
    if (paso < 0 || paso > 3) return;
    if (paso > this.paso) {
      for (let indice = this.paso; indice < paso; indice++) {
        const error = this.validarPaso(indice, false);
        if (error) { this.error = error; this.mostrarErrores = true; this.paso = indice; return; }
      }
    }
    this.paso = paso; this.error = ''; this.mostrarErrores = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async guardar(publicar = false): Promise<void> {
    if (!this.ficha || this.guardando || this.subiendoImagen) return;
    for (let indice = 0; indice < 4; indice++) {
      const error = this.validarPaso(indice, publicar);
      if (error) { this.paso = indice; this.error = error; this.mostrarErrores = true; window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    }
    this.guardando = true;
    this.error = '';
    try {
      this.ficha.publicada = publicar;
      await this.service.guardar(this.ficha);
      this.toast.show({ title: this.tipo === 'cabana' ? 'Cabaña guardada' : 'Promoción guardada', message: publicar ? 'El contenido ya puede aparecer en el sitio público.' : 'Se guardó como borrador.', variant: 'success' });
      this.marcarGuardado();
      await this.router.navigateByUrl(this.rutaListado);
    } catch (error: any) { this.error = error?.message ?? `No se pudo guardar la ${this.tipo === 'cabana' ? 'cabaña' : 'promoción'}.`; }
    finally { this.guardando = false; }
  }

  acciones(ficha: FichaExperiencia): TpActionMenuItem[] {
    return [
      { id: 'editar', label: 'Editar', icon: 'heroicons_outline:pencil-square' },
      { id: 'eliminar', label: 'Eliminar', icon: 'heroicons_outline:trash', danger: true }
    ];
  }
  async accion(id: string, ficha: FichaExperiencia): Promise<void> {
    if (id === 'editar') { this.editar(ficha); return; }
    if (id !== 'eliminar' || !window.confirm(`¿Eliminar definitivamente “${ficha.nombre}”?`)) return;
    try {
      await this.service.eliminar(this.tipo, ficha.id);
      this.toast.show({ title: this.tipo === 'cabana' ? 'Cabaña eliminada' : 'Promoción eliminada', message: ficha.nombre, variant: 'success' });
      await this.cargar();
    } catch (error: any) { this.error = error?.message ?? 'No se pudo eliminar.'; }
  }
}
