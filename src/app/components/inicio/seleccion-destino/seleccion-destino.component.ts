import { AfterViewInit, Component, ElementRef, inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FuseCardComponent } from '@fuse/components/card';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';
import { startWith } from 'rxjs';
import { FuseSplashScreenService } from '@fuse/services/splash-screen';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { getDefaultLang } from 'app/lang.utils';
import { FooterComponent } from 'app/footer/footer.component';
import { DatosService } from 'app/components/hoteles/hoteles.service';
import { Destinos, GrupoDestino, Hotel, IHoteles } from 'app/components/hoteles/hoteles.interface';

@Component({
  selector: 'app-seleccion-destino',
  imports: [MaterialModule, TranslocoModule, FormsModule, FooterComponent],
  templateUrl: './seleccion-destino.component.html',
  encapsulation: ViewEncapsulation.None,
  standalone: true
})
export class SeleccionDestinoComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private datosService = inject(DatosService);
  private splashScreen = inject(FuseSplashScreenService)
  private supabase = inject(SupabaseService);
  private sanitizer = inject(DomSanitizer)
  private _translocoService = inject(TranslocoService);

  /**
   * Constructor
   */

  hotelesForm: FormGroup;
  listaHoteles: any[];
  listaHotelesFiltrada: IHoteles[] = [];
  hotelesPorCiudad: Hotel[] = [];
  ciudadSeleccionada: boolean;
  cargando = false;
  hotel: Hotel;
  rating: Number;
  descuentoEstilos = ['descuento-rect', 'descuento-estrella', 'descuento-circulo'];
  // @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('internacionalesSentinela') internacionalesSentinela!: ElementRef;
  @ViewChild('sentinelaInternacionales') sentinelaInternacionales!: ElementRef;
  internacionalesEnVista = false;
  tabIndexSeleccionado = 0;
  tabOffsets: number[] = [];
  tabWidths: number[] = [];
  error = '';
  @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('ancla', { static: false }) ancla!: ElementRef<HTMLElement>;
  @ViewChild('anclaNacionales', { static: false }) anclaNacionales!: ElementRef<HTMLElement>;
  mostrarInfo: boolean = false;
  destinos: Destinos[] = [];
  destinosNacionales: Destinos[] = [];
  tipoDestino: number = 1;
  gruposDestinos: GrupoDestino[] = [];

  imagenesFondo: string[] = [];

  currentIndex = 0;
  currentImage = this.imagenesFondo[Math.floor(Math.random() * this.imagenesFondo.length)];
  overlayImage: string | null = null;
  isTransitioning = false;

  previousIndex = -1;
  intervalId: any;

  continentes: any[] = [];
  destinoSelected: Destinos;
  openDropdown = false;
  agrupadosDestinos: { nombrePadre: string; destinos: any[] }[] = [];
  destinoCtrl = new FormControl<string>('');
  filteredAgrupadosDestinos: { nombrePadre: string; destinos: any[] }[] = [];
  destinoId: number;
  selectedDestinoLabel: string | null = null;
  modoDestino: 'padres' | 'hijos' = 'padres';
  grupoSeleccionado: any | null = null;
  destinoFiltroCtrl = new FormControl(''); // solo para el texto del autocomplete
  @ViewChild('selectDestino') selectDestinoInternacionales!: MatSelect;
  overlayAnimatedOnce = false;
  @ViewChild('heroCard', { static: false })
  heroCard!: FuseCardComponent;


  avisoUrl = '';
  filtroDestino: string = '';
  verTodos = false;
  panelActivo = '';
  showMenu: boolean = false;

  dropdownOpen = false;
  filterForm: FormGroup;

  destinosFiltrados: any[] = [];
  constructor() {
  }

  ngOnInit() {
    this.obtenerImagenesFondo();
    this.filterForm = this.formBuilder.group({
      busqueda: ['']
    });
    this.filterForm.valueChanges.subscribe((value) => {
      this.filtrarDestinos(value.busqueda);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.dropdownOpen = true;
    }, 500);
  }


  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }



  cargarDestinos(id: number) {
    this.tipoDestino = id;
    this.obtenerSoloDestinos();

  }

  startRandomCarousel(): void {
    this.intervalId = setInterval(() => {
      if (this.mostrarInfo) {
        clearInterval(this.intervalId);
        return;
      }

      if (!this.imagenesFondo || this.imagenesFondo.length === 0) {
        return;
      }


      let newIndex: number;

      // Elegir índice aleatorio distinto al anterior (si hay más de 1 imagen)
      do {
        newIndex = Math.floor(Math.random() * this.imagenesFondo.length);
      } while (newIndex === this.previousIndex && this.imagenesFondo.length > 1);

      this.previousIndex = newIndex;
      const nuevaUrl = this.imagenesFondo[newIndex];

      // Usar transición en lugar de asignar directo
      this.cambiarFondoConTransicion(nuevaUrl);

    }, 3000); // 5 segundos
  }

  cambiarFondoConTransicion(url: string): void {
    // Si ya estamos en transición, opcional: ignorar para no encimar
    if (this.isTransitioning) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      // Nueva imagen lista en memoria
      this.overlayImage = url;
      this.isTransitioning = true;

      // Duración debe coincidir con la del CSS (500ms)
      setTimeout(() => {
        this.currentImage = url;      // Actualizamos el fondo base
        this.isTransitioning = false; // Fin de transición
        this.overlayImage = null;     // Quitamos la capa extra
      }, 500);
    };

    img.onerror = () => {
      console.warn('Error cargando imagen de fondo', url);
    };

    img.src = url;
  }

  async obtenerSoloDestinos() {
    const { data, error } = await this.supabase.obtenerDestinos(this.tipoDestino);
    if (error) { this.error = error.message; return; }

    this.destinos = data;

    if (this.tipoDestino === 2) {
      const mapa = new Map<string, any[]>();
      this.destinos.forEach(dest => {
        const padre = dest.continente.nombre;
        if (!mapa.has(padre)) mapa.set(padre, []);
        mapa.get(padre)!.push(dest);
      });

      this.agrupadosDestinos = Array.from(mapa, ([nombrePadre, destinos]) => ({
        nombrePadre,
        destinos
      }));
    }

    this.destinosFiltrados = this.tipoDestino === 1
      ? this.destinos
      : this.agrupadosDestinos;
  }

  cargaInfo(item) {
    this.destinoId = this.tipoDestino === 1 ? +item.id : +item.destinos[0].id
    sessionStorage.setItem('ciudad', this.destinoId.toString())
    sessionStorage.setItem('tipoDestino', this.tipoDestino.toString())
    this.router.navigate(['/detalle-destino/' + this.destinoId]);
  }

  async obtenerImagenesFondo() {
    this.imagenesFondo = await this.supabase.getImagenesFondo();

    if (!this.imagenesFondo?.length) return;

    // ✅ 1) Mostrar la primera imagen inmediatamente (sin esperar al interval)
    const firstIndex = Math.floor(Math.random() * this.imagenesFondo.length);
    this.previousIndex = firstIndex;

    const firstUrl = this.imagenesFondo[firstIndex];

    // (opcional pero recomendado) precarga para evitar parpadeo/latencia
    await this.preloadImage(firstUrl);

    this.cambiarFondoConTransicion(firstUrl);

    // ✅ 2) Ya después arrancas el carrusel
    this.startRandomCarousel();
  }

  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // no bloquea si falla
      img.src = url;
    });
  }

  showOverlay(): void {
    this.heroCard.face = 'back';

    if (!this.overlayAnimatedOnce) {
      setTimeout(() => {
        this.overlayAnimatedOnce = true;
      }, 350); // ajusta al tiempo del flip
    }
  }

  hideOverlay(): void {
    this.heroCard.face = 'front';
    this.overlayAnimatedOnce = false;
    setTimeout(() => {
      this.dropdownOpen = true;
    }, 500);
  }

  toggleDropdown(ev: Event) {
    ev.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown() {
    this.dropdownOpen = false;
  }

  private normalize(s?: string): string {
    return (s ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')     // acentos fuera
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')        // símbolos -> espacio
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(term: string): string[] {
    const t = this.normalize(term);
    if (!t) return [];
    // tokens útiles (evita ruido)
    return t.split(' ').filter(x => x.length >= 2);
  }

  // ===================
  // Variantes de búsqueda por item
  // ===================
  private buildSearchTextDestino(d: { nombre: string; continente: string | null }): string {
    const nombre = d?.nombre ?? '';
    const norm = this.normalize(nombre);

    // quitar paréntesis: "Nuevo Vallarta (Riviera Nayarit)" => "Nuevo Vallarta"
    const sinParen = this.normalize(nombre.replace(/\([^)]*\)/g, ' '));

    // extraer lo de paréntesis como keywords aparte: "Riviera Nayarit"
    const parenMatches = [...nombre.matchAll(/\(([^)]*)\)/g)].map(m => m[1]);
    const paren = this.normalize(parenMatches.join(' '));

    // quitar "y alrededores" para que "cancun" encuentre "Cancún y alrededores" fuerte
    const sinAlrededores = this.normalize(nombre.replace(/\by\s+alrededores\b/gi, ' '));

    // continente (si lo llenas después)
    const cont = this.normalize(d?.continente ?? '');

    // sinónimos/aliases “manuales” (puedes ampliar)
    const aliases: string[] = [];
    if (norm.includes('cancun')) aliases.push('cancun zona hotelera quintana roo');
    if (norm.includes('riviera maya')) aliases.push('playa del carmen tulum quintana roo');
    if (norm.includes('los cabos')) aliases.push('cabo san lucas san jose del cabo baja california sur');
    if (norm.includes('puerto vallarta')) aliases.push('vallarta jalisco');
    if (norm.includes('nuevo vallarta')) aliases.push('nayarit riviera nayarit');

    return this.normalize(
      [
        nombre,
        norm,
        sinParen,
        paren,
        sinAlrededores,
        cont,
        ...aliases,
      ].filter(Boolean).join(' ')
    );
  }

  // ===================
  // Fuzzy ligero (typos)
  // ===================
  private levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  private fuzzyTokenInText(text: string, token: string): boolean {
    if (!token) return true;
    if (text.includes(token)) return true;
    if (token.length < 4) return false;

    const maxDist = token.length <= 6 ? 1 : 2;
    const win = token.length;

    for (let i = 0; i <= text.length - win; i++) {
      const slice = text.slice(i, i + win);
      if (this.levenshtein(slice, token) <= maxDist) return true;
    }
    return false;
  }

  // ===================
  // Scoring (ranking)
  // ===================
  private score(hay: string, raw: string, tokens: string[]): number {
    const term = this.normalize(raw);
    if (!term) return 0;

    let score = 0;

    // match fuerte por frase completa
    if (hay === term) score += 1000;
    if (hay.startsWith(term)) score += 700;
    if (hay.includes(term)) score += 450;

    // tokens (modo AND: todos deben matchear)
    for (const t of tokens) {
      if (hay.includes(t)) score += 120;
      else if (this.fuzzyTokenInText(hay, t)) score += 80;
      else return 0; // <- si quieres OR, quita este return y solo no sumes
    }

    return score;
  }

  // ===================
  // Tu filtro final
  // ===================
  filtrarDestinos(value?: string) {
    const lista = this.tipoDestino === 1 ? this.destinos : this.agrupadosDestinos;

    const raw = value ?? '';
    const term = this.normalize(raw);

    if (!term) {
      this.destinosFiltrados = lista;
      return;
    }

    const tokens = this.tokenize(raw);

    this.destinosFiltrados = lista
      .map((d: any) => {
        const hay = this.buildSearchTextDestino(d);
        const s = this.score(hay, raw, tokens);
        return { d, s };
      })
      .filter(x => x.s > 0)
      .sort((a, b) => (b.s - a.s) || ((a.d?.orden ?? 9999) - (b.d?.orden ?? 9999)))
      .map(x => x.d);
  }
}
