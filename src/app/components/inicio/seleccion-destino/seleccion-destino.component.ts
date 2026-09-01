import { AfterViewInit, Component, ElementRef, inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FuseCardComponent } from '@fuse/components/card';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SupabaseService } from 'app/core/supabase.service';
import { DestinosService, TipoTuristicoCatalogo } from 'app/core/destinos.service';
import { MaterialModule } from 'app/shared/material.module';
import { startWith, Subscription } from 'rxjs';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { getDefaultLang } from 'app/lang.utils';
import { FooterComponent } from 'app/footer/footer.component';
import { DatosService } from 'app/components/hoteles/hoteles.service';
import { Destinos, GrupoDestino, Hotel, IHoteles } from 'app/components/hoteles/hoteles.interface';
import { IImagenesFondo } from './imagenes-fondo.interface';

@Component({
  selector: 'app-seleccion-destino',
  imports: [MaterialModule, TranslocoModule, FormsModule, FooterComponent],
  templateUrl: './seleccion-destino.component.html',
  styleUrl: './seleccion-destino.component.scss',
  encapsulation: ViewEncapsulation.None,
  standalone: true
})
export class SeleccionDestinoComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private datosService = inject(DatosService);
  private supabase = inject(SupabaseService);
  private destinosService = inject(DestinosService);
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

  imagenesFondo: IImagenesFondo[] = [];

  currentIndex = 0;
  index = Math.floor(Math.random() * this.imagenesFondo.length)
  currentText = this.imagenesFondo[this.index]?.nombre_destino;
  currentImage = this.imagenesFondo[this.index]?.url_imagen;
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
  destinosFiltrados: any[] = [];
  tiposTuristicos: TipoTuristicoCatalogo[] = [];
  selectedTipoTuristicoId: number | null = null;
  vistaDestinos: 'lista' | 'cards' = 'cards';
  private languageChangesSubscription?: Subscription;
  constructor() {
  }

  ngOnInit() {
    this.obtenerImagenesFondo();
    this.languageChangesSubscription = this._translocoService.langChanges$.subscribe((idioma) => {
      if (this.overlayAnimatedOnce) {
        this.obtenerSoloDestinos(idioma);
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.dropdownOpen = true;
    }, 500);
  }


  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.languageChangesSubscription?.unsubscribe();
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

      this.previousIndex = (this.previousIndex + 1) % this.imagenesFondo.length;
      const nuevaUrl = this.imagenesFondo[this.previousIndex];

      this.cambiarFondoConTransicion(nuevaUrl.url_imagen, nuevaUrl.nombre_destino);

    }, 3000); // 5 segundos
  }

  cambiarFondoConTransicion(url: string, text): void {
    if (this.isTransitioning) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      // Nueva imagen lista en memoria
      this.overlayImage = url;
      this.isTransitioning = true;

      // Duración debe coincidir con la del CSS (500ms)
      this.currentText = text
      setTimeout(() => {
        this.currentImage = url;      // Actualizamos el fondo base
        this.currentText = text
        this.isTransitioning = false; // Fin de transición
        this.overlayImage = null;     // Quitamos la capa extra
      }, 500);
    };

    img.onerror = () => {
      console.warn('Error cargando imagen de fondo', url);
    };

    img.src = url;
  }

  async obtenerSoloDestinos(idioma?: string) {
    this.cargando = true;
    this.error = '';
    try {
      const tipo = this.tipoDestino === 1 ? 'NACIONAL' : 'INTERNACIONAL';
      const [publicables, tipos] = await Promise.all([
        this.destinosService.obtenerDestinosCatalogoPublicables(tipo),
        this.destinosService.obtenerTiposTuristicosCatalogo(false, idioma)
      ]);

      // Durante la vinculación manual conservamos el selector vigente como fallback.
      this.destinos = (publicables as any[])
        .filter((destino) => destino.activo === true)
        .sort((a, b) => (a.prioridad - b.prioridad) || a.nombre.localeCompare(b.nombre)) as Destinos[];

      this.agrupadosDestinos = [];
      const tiposDisponibles = new Set(this.destinos.map((destino: any) => destino.tipo_turistico_id).filter(Number.isFinite));
      this.tiposTuristicos = tipos.filter((tipo) => tiposDisponibles.has(tipo.id));
      this.selectedTipoTuristicoId = null;
      this.filtrarDestinos();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron cargar los destinos.';
    } finally {
      this.cargando = false;
    }
  }

  cargaInfo(item) {
    this.destinoId = +item.id;
    sessionStorage.setItem('ciudad', this.destinoId.toString())
    sessionStorage.setItem('tipoDestino', this.tipoDestino.toString())
    this.router.navigate(['/detalle-destino/' + this.destinoId]);
  }

  async obtenerImagenesFondo() {
    try {
      this.imagenesFondo = await this.supabase.getImagenesFondo();
      if (!this.imagenesFondo?.length) return;

      // Mostrar la primera imagen sin bloquear el resto de la pantalla.
      const firstIndex = Math.floor(Math.random() * this.imagenesFondo.length);
      this.previousIndex = firstIndex;

      const firstUrl = this.imagenesFondo[firstIndex];

      await this.preloadImage(firstUrl.url_imagen);

      this.cambiarFondoConTransicion(firstUrl.url_imagen, firstUrl.nombre_destino);

      this.startRandomCarousel();
    } catch (error) {
      this.error = error instanceof Error
        ? error.message
        : 'No se pudieron cargar las imagenes de inicio.';
      console.error('No se pudieron cargar las imagenes de fondo.', error);
    }
  }

  private preloadImage(url: string, timeoutMs = 3_000): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      let timeoutId: number;
      const finalize = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };

      timeoutId = window.setTimeout(finalize, timeoutMs);
      img.onload = finalize;
      img.onerror = finalize;
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

  filtrarDestinos() {
    const lista = this.selectedTipoTuristicoId === null
      ? this.destinos
      : this.destinos.filter((destino: any) => destino.tipo_turistico_id === this.selectedTipoTuristicoId);
    this.destinosFiltrados = lista;
  }

  cambiarVistaDestinos(vista: 'lista' | 'cards'): void {
    this.vistaDestinos = vista;
  }

  filtrarPorTipo(tipoId: number | null): void {
    this.selectedTipoTuristicoId = tipoId;
    this.filtrarDestinos();
  }
}
