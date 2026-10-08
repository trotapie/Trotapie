import { Component, AfterViewInit, OnInit, OnChanges, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';

import { Hotel, ICoordenadas } from '../hoteles.interface';

@Component({
    selector: 'app-mapa',
    templateUrl: './mapa.component.html',
    imports: [TranslocoModule],
})
export class MapaComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    @Input() ubicacion: string | null | undefined;
    @Input() nombreHotel = '';
    private mapContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('mapContainer')
    set contenedorMapa(container: ElementRef<HTMLDivElement> | undefined) {
        this.mapContainer = container;
        this.inicializarMapa();
    }
    private map: any;
    private L: any = null;
    private viewInitialized = false;
    private mapInitialized = false;
    private destroyed = false;
    cargando = true;
    coordenadas: ICoordenadas | null = null;
    hotel: Hotel | null = null;

    async ngOnInit() {
        // Conserva los usos antiguos que no reciben la ubicación por Input.
        if (this.ubicacion === undefined) {
            try {
                const hotel = sessionStorage.getItem('hotel');
                this.hotel = hotel ? JSON.parse(hotel) : null;
            } catch {
                this.hotel = null;
            }
        }
        this.actualizarCoordenadas();
        try {
            const leaflet = await import('leaflet');
            if (this.destroyed) return;
            this.L = (leaflet as any).default ?? leaflet;
            this.inicializarMapa();
        } catch {
            this.coordenadas = null;
        } finally {
            this.cargando = false;
        }
    }

    ngOnChanges(): void {
        this.map?.remove();
        this.map = null;
        this.mapInitialized = false;
        this.actualizarCoordenadas();
        this.inicializarMapa();
    }

    private actualizarCoordenadas(): void {
        const url = this.ubicacion !== undefined ? this.ubicacion : this.hotel?.ubicacion;
        this.coordenadas = this.extraerCoordenadasDesdeUrl(url);
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.map?.remove();
    }

    ngAfterViewInit(): void {
        this.viewInitialized = true;
        this.inicializarMapa();
    }

    private inicializarMapa(): void {
        if (this.destroyed || !this.viewInitialized || !this.mapContainer || !this.L || !this.coordenadas || this.mapInitialized) {
            return;
        }

        this.mapInitialized = true;
        this.map = this.L.map(this.mapContainer.nativeElement).setView([this.coordenadas.lat, this.coordenadas.lng], this.hotel?.vistaLejana ? 12 : 17);
        const icon = this.L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });
        this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        const marker = this.L.marker([this.coordenadas.lat, this.coordenadas.lng], { icon }).addTo(this.map);
        const nombre = this.nombreHotel || this.hotel?.nombre_hotel;
        if (nombre) {
            const label = document.createElement('span');
            label.textContent = nombre;
            marker.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -40] });
        }
    }

    extraerCoordenadasDesdeUrl(url: string | null | undefined): ICoordenadas | null {
        if (typeof url !== 'string' || !url.trim()) return null;
        // Prefiere el punto del hotel frente al centro de la vista indicado por @.
        const match = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
            ?? url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
            ?? url.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return { lat, lng };
            }
        }

        return null;
    }

}
