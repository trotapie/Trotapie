import { ConfiguracionFondo } from 'app/core/imagen-fondo-visual';

export interface IImagenesFondo {
    id: number;
    url_imagen:     string;
    nombre_destino: string;
    configuracion_visual?: Partial<ConfiguracionFondo>;
}
