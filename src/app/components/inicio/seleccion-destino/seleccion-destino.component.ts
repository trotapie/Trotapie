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
      this.filtrarDestinos();
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
    this.router.navigate(['/detalle-destino']);
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


  filtrarDestinos() {
    const { busqueda } = this.filterForm.value;
    const term = this.normalize(busqueda);
    const lista = this.tipoDestino === 1 ? this.destinos : this.agrupadosDestinos;

    if (!term) return this.destinosFiltrados = lista;

    this.destinosFiltrados = lista.filter((d: any) =>
      this.normalize(this.tipoDestino === 1 ? d.nombre : d.nombrePadre).includes(term)
    );
  }


  private normalize(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .trim();
}
}
