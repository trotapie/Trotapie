# AGENTS.md

## Proposito
Este proyecto usa Angular + Supabase y tiene un enfoque fuerte en pantallas administrativas, formularios, tablas, modales y galerias.

Cuando se pidan mejoras de UI/UX, debes mantener la logica existente y aplicar un criterio de producto profesional, sin romper flujos ya funcionando.

## Reglas Generales

### Angular
- Respeta la arquitectura actual del proyecto.
- No rompas `@Input`, `@Output`, servicios, guards, rutas o contratos de datos existentes.
- Prefiere cambios pequenos y controlados sobre refactors amplios.
- Mantiene separadas la logica de negocio, el estado de vista y el estilo.
- Si un cambio visual exige tocar TS, hazlo solo lo necesario y valida que no altere el flujo actual.

### Tailwind CSS
- Usa Tailwind cuando el componente ya lo use o cuando acelere una mejora visual sin duplicar estilos.
- Evita clases sueltas que generen inconsistencias visuales entre pantallas.
- Prioriza espaciado, jerarquia tipografica y consistencia de colores.
- Si hay estilos SCSS existentes, respeta el sistema previo antes de introducir nuevas utilidades.

### Diseno UI/UX
- Busca claridad, jerarquia visual y accion principal evidente.
- Evita interfaces genericas o sobradas de elementos.
- Cada pantalla debe responder rapido a estas preguntas: donde estoy, que puedo hacer, que pasa si guardo, que pasa si cancelo.
- La pantalla debe verse bien en desktop, tablet y mobile.
- Si hay acciones destructivas, deben estar separadas y bien advertidas.

### Dark Mode
- Si el componente o layout soporta dark mode, asegurese de que texto, fondos, bordes y estados sigan teniendo contraste suficiente.
- No uses colores fijos que solo funcionen en modo claro.
- Usa tokens, variables o patrones ya existentes para tonos, sombras y bordes.

### Responsive Design
- No asumas pantalla grande.
- Evita overflow horizontal.
- En mobile, prioriza apilado vertical, botones de ancho utilizable y modales adaptados a viewport pequeno.
- Verifica que tablas, cards, drawers y modales no corten contenido esencial.

### Accesibilidad
- Usa elementos semanticos cuando sea posible.
- Todo input debe tener label claro.
- Todo boton iconico debe tener texto accesible o `aria-label`.
- No dependas solo del color para comunicar estado.
- Asegura navegacion por teclado, foco visible y contraste adecuado.

### Formularios
- Mantiene validaciones, mensajes de error y estados disabled/loading.
- No borres valores del usuario al cambiar de seccion salvo que el flujo lo requiera.
- Separa claramente `Guardar`, `Cancelar`, `Eliminar` y acciones auxiliares.
- Los formularios deben indicar que campos son obligatorios y cuales son informativos.

### Dashboards Administrativos
- La estructura debe favorecer trabajo rapido: filtros arriba, contenido central, acciones primarias visibles.
- Usa cards, panels y resaltes con moderacion.
- Evita saturar la pantalla con demasiadas acciones visibles a la vez.
- Las acciones destructivas deben quedar en segundo nivel visual.

### Tablas
- Prioriza legibilidad, alineacion y densidad consistente.
- Si una tabla tiene muchos datos, agrega estado vacio, loading y una jerarquia clara de acciones.
- No escondas informacion critica detras de demasiados clics.
- Usa encabezados claros y evita columnas redundantes.

### Modales
- Usa modales para confirmacion, edicion focalizada y decisiones importantes.
- Mantener el contexto visible cuando aporte valor, pero sin sobrecargar.
- Un modal debe tener titulo, descripcion breve, accion primaria y salida clara.
- Para acciones destructivas, exige confirmacion explicita.

### Estados
- Toda pantalla relevante debe contemplar `loading`, `empty`, `error` y `success`.
- `loading` debe verse intencional, no como pantalla rota.
- `empty` debe orientar al usuario a la siguiente accion.
- `error` debe explicar que fallo y como recuperarse.
- `success` debe confirmar el cambio cuando tenga impacto real.

### Seguridad Visual y Logica
- No rompas la logica existente por buscar solo estetica.
- Si una mejora visual cambia comportamiento, documenta el impacto y conserva la compatibilidad.
- Antes de tocar una pantalla compleja, identifica estados, dependencias y acciones persistentes.

## Skills UI/UX
Cuando una tarea sea de diseno, UI, UX, layout, componentes visuales, tablas, formularios, modales o motion, consulta mentalmente las skills en `.codex/skills/` y aplica la mas adecuada.

Orden sugerido:
- `design-system.md` para consistencia general.
- `frontend-design.md` para pantallas completas.
- `dashboard-design.md` para vistas administrativas.
- `form-design.md` para formularios.
- `component-polish.md` para mejorar componentes existentes.
- `accessibility-review.md` para revision de accesibilidad.
- `motion-microinteractions.md` para animaciones y feedback.

Si varias aplican, combinalas sin duplicar reglas ni sobrecargar el resultado.

