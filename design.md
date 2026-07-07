# Trotapie Design System

## Propósito
Este documento resume los criterios de diseño para Trotapie: una plataforma de cotizaciones, gestión de viajes y administración de contenido sobre Angular 19, Fuse Admin, Tailwind CSS y Supabase.

El objetivo es mantener una experiencia clara, rápida y consistente en pantallas administrativas, formularios, tablas, modales, galerías y flujos públicos.

## Principios
- Prioriza claridad sobre decoración.
- La acción principal debe ser obvia desde el primer vistazo.
- Cada pantalla debe responder: dónde estoy, qué puedo hacer y qué pasa si guardo o cancelo.
- Mantén los flujos existentes y cambia solo lo necesario para mejorar la experiencia.
- Evita interfaces genéricas; usa jerarquía visual real y estados bien definidos.

## Identidad Visual
- Base visual: Fuse Admin + extensiones propias del negocio.
- Sensación buscada: profesional, confiable, eficiente y orientada a operación.
- El contenido manda; el chrome visual debe acompañar, no competir.

## Color
- Usa los tokens y patrones existentes del proyecto antes de introducir colores nuevos.
- Reserva el color primario para acciones de avance y estados destacados.
- Usa colores semánticos para éxito, advertencia y error.
- No dependas solo del color para comunicar estado.

## Tipografía
- Jerarquía simple: título, subtítulo, cuerpo, ayuda y metadatos.
- Los títulos deben ser breves y funcionales.
- Evita saturar la interfaz con demasiados pesos o tamaños distintos.

## Espaciado y Layout
- Usa una grilla limpia con respiración suficiente entre bloques.
- Agrupa por intención: filtros, contenido, acciones y feedback.
- En desktop, conserva densidad útil para trabajo administrativo.
- En mobile, apila contenido y evita overflow horizontal.

## Componentes Base
- Cards para agrupación de información.
- Tablas para listados y administración masiva.
- Modales para confirmaciones y edición focalizada.
- Drawers o paneles laterales solo cuando ayuden a mantener contexto.
- Inputs con labels claros, estados de error y ayuda visible.

## Formularios
- Indica campos obligatorios de forma explícita.
- Conserva valores del usuario al cambiar de sección.
- Separa acciones primarias y destructivas.
- Usa mensajes de error concretos y accionables.
- Deshabilita guardar cuando el formulario no esté listo o no haya cambios.

## Tablas
- Encabezados claros, alineación consistente y acciones visibles.
- Incluye estados de loading, empty y error.
- No ocultes datos críticos tras demasiados clics.
- Si hay muchas columnas, prioriza la lectura y evita ruido visual.

## Modales
- Todo modal debe tener título, descripción breve, acción principal y salida clara.
- Para acciones destructivas, exige confirmación explícita.
- Mantén el tamaño adaptado al viewport y evita cortar contenido.

## Estados
- Loading: debe verse intencional, no rota la pantalla.
- Empty: debe orientar al usuario a la siguiente acción.
- Error: debe explicar qué falló y cómo continuar.
- Success: confirma el impacto real de una acción importante.

## Accesibilidad
- Usa elementos semánticos cuando sea posible.
- Todo control debe tener label o `aria-label`.
- Mantén contraste suficiente en texto, bordes y estados.
- Asegura navegación por teclado y foco visible.

## Responsive
- Desktop: prioriza productividad y lectura rápida.
- Tablet: conserva jerarquía y reduce densidad donde haga falta.
- Mobile: apila, simplifica acciones y evita elementos demasiado pequeños.

## Dark Mode
- Si una vista soporta dark mode, valida contraste en texto, fondo, bordes y estados.
- Evita colores fijos que rompan la legibilidad.
- Usa los patrones visuales ya existentes del tema.

## Administración
- Filtros arriba.
- Contenido al centro.
- Acciones primarias visibles.
- Acciones destructivas en segundo nivel visual.

## Criterio de Edición
- Si una mejora visual requiere tocar lógica, hazlo solo si es estrictamente necesario.
- No rompas contratos existentes de componentes, servicios o rutas.
- Prefiere cambios pequeños, controlados y verificables.

## Stack de Referencia
- Angular 19
- Fuse Admin
- Tailwind CSS
- Supabase
- Vercel
