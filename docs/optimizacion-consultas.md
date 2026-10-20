# Optimización de consultas

## Cambios aplicados

- Dashboard: actualización automática a los 2 minutos de terminar cada carga,
  pausa con la pestaña oculta, sin cargas superpuestas y espera progresiva
  ante errores (hasta 10 minutos). La recarga manual invalida la caché.
- Catálogos administrativos y tipos de destino/turísticos: caché de 15 minutos.
- Configuración global de hoteles: caché de 5 minutos.
- Datos de referencia del dashboard: caché de 15 minutos; empleados solicita
  solo identificadores, no teléfonos, correos ni relaciones completas.
- Cotizaciones: una sola resolución de usuario/empleado por carga del listado.
- Listado de destinos: cancela búsquedas anteriores, ignora respuestas obsoletas
  y evita duplicar solicitudes con los mismos parámetros mientras están en curso.
- Galería compartida: carga diferida de imágenes de cuadrícula y miniaturas.
- Editor de hotel: la galería se instancia solo al abrir su pestaña por primera
  vez y después se conserva para mantener selección y filtros. Las miniaturas
  conocidas de Drive se muestran a 320 px; la URL original permanece intacta
  para edición y vista de detalle. La portada solo se solicita al abrir su pestaña.
- Opciones de destinos: lotes independientes de hasta 1000 filas, total contado
  una sola vez y caché de 5 minutos. Antes se solicitaban lotes de 1000 a un método
  de tablas que los reducía a 100, multiplicando los viajes a Supabase. Si el
  servidor limita a menos filas, se avanza por la cantidad realmente recibida.
  Un lote vacío inesperado produce error en vez de un bucle sin progreso.
- Restaurar ubicación de un hotel internacional consulta su destino por ID,
  después solo los países de su región y los destinos de su país. No descarga
  el catálogo internacional completo ni confunde IDs de país con IDs de región.

## Garantías y límites

La caché es optativa, en memoria, con hasta 100 resultados. Se separa por
contexto público/administrativo, idioma y parámetros de cada consulta.
Deduplica cargas simultáneas y entrega copias para no compartir objetos editables.
No guarda errores ni cotizaciones y no usa localStorage para persistir resultados.

Los eventos de autenticación y las solicitudes de escritura invalidan la caché.
También se invalida al terminar la escritura para descartar lecturas iniciadas
durante ella. Las RPC desconocidas y Edge Functions con POST se consideran
posibles escrituras. Solo se exceptúan las RPC de listado existentes
`obtener_solicitudes_cotizacion` y `obtener_cotizaciones_multiples`.
Si estas RPC incorporan escrituras en el futuro, deben retirarse de la excepción.

Las lecturas de caché administrativa mantienen la validación de sesión existente.
Cambios de otros navegadores se verán al vencer el TTL o al recargar manualmente;
esta implementación no incorpora sincronización en tiempo real entre usuarios.

## Verificación en navegador

Pruebas automatizadas focalizadas: `npm run test:queries`. Su configuración
aislada evita que tests antiguos ajenos a estos cambios bloqueen la ejecución.
Compilación de producción: `npm run build`.

1. Abrir DevTools > Network, conservar el registro y mantener habilitada la caché
   del navegador. Separar los dominios Vercel, Supabase y Google Drive.
2. Abrir el dashboard y observar 10 minutos: las solicitudes operativas deben
   espaciarse al menos 2 minutos después de cada carga; los catálogos vigentes
   no deben consultarse en cada ciclo.
3. Ocultar la pestaña durante más de 2 minutos: no deben iniciarse nuevos ciclos.
   Una carga que ya había comenzado puede terminar. Al regresar, debe actualizar
   si los datos vencieron.
4. Usar la recarga manual: los catálogos deben volver a consultarse.
5. Abrir dos pantallas que reutilicen un catálogo: mientras siga vigente, no debe
   repetirse la lectura. Guardar un cambio y volver a abrirlo para validar la
   invalidación.
6. Cerrar sesión y entrar con otro usuario: no reutilizar resultados anteriores.
7. Revisar cotizaciones como administrador y empleado: conservar los mismos
   registros visibles y las mismas restricciones de edición.
8. Abrir una galería extensa: las miniaturas alejadas del viewport no deben
   descargarse todas inmediatamente. El umbral de precarga lo decide el navegador.

Comparar cantidades, bytes y tiempos con los mismos recorridos antes/después.
No exportar ni compartir HAR sin retirar tokens, cookies y datos personales.

## Pendiente de métricas y esquema real

- Identificar las rutas que originaron el volumen histórico de Vercel.
- Revisar las definiciones de las RPC para eliminar consultas complementarias
  o devolver resúmenes del dashboard sin descargar todo el historial.
- Paginar en servidor los listados que aún descargan todos los registros,
  conservando exportaciones, filtros y reordenamiento.
- Medir consultas y planes de ejecución antes de crear índices o cambiar RLS.
- Revisar el manifiesto de producción antes de cambiar la precarga del service worker.

Estos cambios reducen lecturas del cliente, pero no demuestran la causa de las
solicitudes históricas de Vercel ni garantizan una reducción concreta de su CDN.
