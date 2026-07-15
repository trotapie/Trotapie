# ✈️ Trotapie - Plataforma de Cotizaciones y Gestión de Viajes

¡Bienvenido al repositorio de **Trotapie**! Esta es una aplicación web moderna de alto rendimiento diseñada para la administración integral de agencias de viajes, visualización interactiva de destinos y hoteles, cotizaciones personalizadas y cálculo automático de itinerarios.

La arquitectura se compone de un frontend robusto basado en **Angular 19** y la plantilla **Fuse Admin**, complementado por servicios en la nube a través de **Supabase** y Serverless Functions en **Vercel** para la distribución de correos dinámicos e indexación de contenido enriquecido en redes sociales (SEO/OpenGraph).

---

## 🏗️ Arquitectura del Sistema

```mermaid
graph TD
    %% Componentes Principales
    Client[Cliente / Navegador PWA]
    Vercel[Vercel Serverless Platform]
    Supabase[Supabase BaaS]
    MailService[Maileroo API]
    GScript[Google Apps Script Translation API]

    %% Flujos de Navegación y Consumo
    Client -->|Consulta e Interacción| SupabaseService[supabase.service.ts]
    SupabaseService -->|Autenticación y CRUD| Supabase
    SupabaseService -->|Traducciones en tiempo real| GScript

    %% Compartir / SEO Crawler
    Social[Social Media Crawler WhatsApp/FB] -->|Request /cotizacion/:id| Vercel
    Vercel -->|Meta tag rendering| ShareFunction[api/share/cotizacion/[id].js]
    ShareFunction -->|RPC Calls| Supabase
    ShareFunction -->|Dynamic HTML response| Social

    %% Enviar Correo
    Client -->|Post request| SendEmail[api/mail/cotizacion.js]
    SendEmail -->|Send email API| MailService
```

---

## 🌟 Características Clave

1. **Buscador & Cotizador Interactivo (`Bot Cotizador`)**:
   - Componente conversacional asistente en la planificación y cálculo automatizado de presupuestos de viaje.
2. **Gestión Administrativa Completa**:
   - Gestión de Hoteles (CRUD, clasificación por estrellas, administración de imágenes).
   - Catálogos de Atracciones Principales e Itinerarios vinculados a Destinos.
   - Administración de empleados, estatus de cotización, políticas, descuentos y tarifas.
3. **Múltiples Idiomas (Internacionalización - i18n)**:
   - Integración nativa de `@jsverse/transloco` para soporte dinámico en español (`es`), inglés (`en`), portugués (`pt`), alemán (`de`) y francés (`fr`).
   - Servicio de traducción auxiliar remoto mediante **Google Apps Script**.
4. **Optimización OpenGraph para Redes Sociales**:
   - Arquitectura inteligente de Serverless Functions que analiza el `User-Agent` de crawlers (WhatsApp, Facebook, Twitter, Discord) y devuelve tags OpenGraph dinámicos específicos de la cotización antes de redirigir a la SPA.
5. **Generador y Exportador de Reportes PDF**:
   - Generación de cotizaciones listas para impresión y descarga en PDF en el cliente gracias a la combinación de `jspdf` y `html2canvas`.
6. **Integración con Mapas**:
   - Visualización interactiva de hoteles mediante mapas integrados con la librería `Leaflet`.
7. **Soporte PWA (Progressive Web App)**:
   - Configuración de Service Worker (`ngsw-config.json`) para almacenamiento en caché de activos, reduciendo drásticamente la latencia y permitiendo uso offline básico.

---

## 📂 Estructura del Proyecto y Rutas Clave

A continuación, se describen los componentes neurálgicos de la aplicación con enlaces directos para facilitar la navegación en el entorno de desarrollo:

### 🌐 Rutas y Navegación
* **Rutas Globales de la Aplicación**: Definidas en [app.routes.ts](file:///d:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/src/app/app.routes.ts). Maneja redirecciones, layouts de Fuse (`empty`, `compact`, etc.) y protección mediante guards (`AuthGuard`, `NoAuthGuard`, `ClearSessionGuard`).
* **Módulos Administrativos**: Enrutamiento detallado para la gestión de catálogos, destinos y cotizaciones en [admin.routes.ts](file:///d:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/src/app/components/admin/admin.routes.ts).

### ⚙️ Servicios y Configuración Core
* **Controlador Supabase Central**: Todo el consumo de tablas, llamadas RPC, autenticación y manejo de sesión se encuentra centralizado en [supabase.service.ts](file:///d:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/src/app/core/supabase.service.ts).
* **Parámetros del Entorno**: Configuración del cliente Supabase (`supabaseUrl` y `supabaseAnonKey`) en [environment.ts](file:///d:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/src/environments/environment.ts).

### 💬 Lógica de Negocio y UI
* **Constructor del Cotizador**: La interfaz visual y procesamiento lógico para armar cotizaciones complejas se encuentra en [cotizacion.component.ts](file:///d:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/src/app/components/admin/solicitudes-cotizacion/cotizacion/cotizacion.component.ts).
* **Bot de Cotizaciones**: El asistente interactivo que asiste a los clientes está implementado en [bot-cotizador.component.ts](file:///d:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/src/app/bot-cotizador/bot-cotizador.component.ts).

### ⚡ Serverless Functions & Hosting en Vercel
* **Reglas de Enrutamiento Vercel**: El archivo [vercel.json](file:///d:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/vercel.json) redirige los rastreadores de redes sociales a la función de metadata OpenGraph, y gestiona las fallas de refresco en la SPA.
* **Previsualización para Redes Sociales**: [[id].js](file:///d:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/api/share/cotizacion/%5Bid%5D.js) intercepta las peticiones de bots y extrae mediante consultas RPC la información para poblar las etiquetas de OpenGraph.
* **Despacho de Correos**: [cotizacion.js](file:///d:/Users/Alex_Saenz/Documents/Proyectos/Trotapie/api/mail/cotizacion.js) gestiona las notificaciones y resúmenes de cotizaciones enviados a través del proveedor de email **Maileroo**.

---

## 🛠️ Requisitos e Instalación

### Requisitos Previos
* **Node.js**: v18 o superior (administrado idealmente mediante `.nvmrc`).
* **Angular CLI**: v19 instalado globalmente o mediante ejecución local (`npx ng`).

### Instalación de Dependencias
Ejecuta el siguiente comando para restaurar los paquetes de desarrollo y producción:
```bash
npm install
```

### Servidor de Desarrollo
Para levantar el servidor de desarrollo local de Angular:
```bash
npm run start
# o alternativamente: npx ng serve
```
El servidor web local estará disponible en `http://localhost:4200/`.

---

## 🚀 Compilación y Despliegue

### Generar Build de Producción
Compila el proyecto frontend de Angular para empaquetar activos optimizados:
```bash
npm run build
```
Los archivos de salida se guardarán en la carpeta `dist/`.

### Despliegue en GitHub Pages (Manual)
Si utilizas el script integrado de despliegue para GitHub Pages:
```bash
npm run deploy
```
Este script compilará la aplicación en modo producción y utilizará `angular-cli-ghpages` para subir el bundle compilado en `dist/fuse/browser`.
