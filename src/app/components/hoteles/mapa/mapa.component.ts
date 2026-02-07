import { Component, AfterViewInit, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { Hotel, ICoordenadas } from '../hoteles.interface';

@Component({
    selector: 'app-mapa',
    templateUrl: './mapa.component.html',
})
export class MapaComponent implements OnInit, AfterViewInit {
    private map: L.Map | undefined;
    coordenadas: ICoordenadas;
    hotel: Hotel;
    ngOnInit() {

        this.hotel = JSON.parse(sessionStorage.getItem('hotel'))       
        const url = this.hotel.ubicacion;

        this.coordenadas = this.extraerCoordenadasDesdeUrl(url);
    }

    ngAfterViewInit(): void {
        this.map = L.map('map').setView([this.coordenadas.lat, this.coordenadas.lng], 17);
        const icon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        L.marker([this.coordenadas.lat, this.coordenadas.lng], { icon })
            .addTo(this.map)
            .bindTooltip(this.hotel.nombre_hotel, { permanent: true, direction: 'top', offset: [0, -40] });
    }

    extraerCoordenadasDesdeUrl(url: string): { lat: number, lng: number } | null {
        const regex = /!3d([-0-9.]+)!4d([-0-9.]+)/;
        const match = url.match(regex);

        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            return { lat, lng };
        }

        return null;
    }

}