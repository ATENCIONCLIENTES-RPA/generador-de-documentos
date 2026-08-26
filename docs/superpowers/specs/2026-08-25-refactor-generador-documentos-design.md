# Diseño: Refactor por fases del Generador de Documentos (EPM)

Fecha: 2026-08-25
Estado: Aprobado por el usuario (sin Git, por solicitud)

## Objetivo

Hacer que el sistema sea fácil de entender, modificar y mantener tanto para una persona como para una IA, manteniendo intacta la funcionalidad actual. Mejorar estabilidad, rendimiento y experiencia de uso.

## Contexto

- App web local que se abre con doble clic al HTML (`file://`): **no** se pueden usar módulos ES; solo scripts clásicos cargados en orden.
- Problemas detectados:
  - `js/app.js` (~180 KB) en estilo minificado, con capas duplicadas acumuladas (funciones `*Copilot`, `$` vs `byId`, dos sistemas de arranque conviviendo).
  - `Generador_de_Plantillas_EPM.html` (~190 KB) con imágenes base64 gigantes embebidas y SVG inline enorme.
  - `css/estilos.css` (~284 KB) denso y sin organización.
  - Sin documentación de arquitectura.
- Dependencias locales en `DATOS/COMPONENTES/`: xlsx, pizzip/jszip, easy-template-x, docx-preview, FileSaver, fuentes EPM/Manrope.
- Plantillas .docx organizadas en carpetas: PETICIONES, QUEJAS, RECLAMOS, AGPE.

## Restricciones

- Sin Git (decisión del usuario). La red de seguridad es una copia de respaldo completa.
- Mantener doble clic al HTML como forma de uso.
- No eliminar funcionalidad existente.
- Conservar los nombres globales usados por los `onclick` inline del HTML durante la migración.

## Fases

### Fase 0 — Red de seguridad
- Copiar todo el proyecto a `_BACKUP_ORIGINAL/` antes de modificar nada.

### Fase 1 — Separar y limpiar `app.js`
- Formatear el código (una instrucción por línea, indentación consistente).
- Dividir en módulos temáticos (scripts clásicos, cargados en orden):
  - `js/config.js` — constantes y estado global (`app`)
  - `js/utils.js` — helpers compartidos; eliminar duplicados (`$`/`byId`, funciones `*Copilot` redundantes)
  - `js/excel.js` — carga y lectura del Excel
  - `js/plantillas.js` — detección de plantillas por carpeta/tipo/canal
  - `js/generador.js` — fusión de datos en .docx, firma y correo
  - `js/ui.js` — menú, KPIs, modales, toasts, vista previa
  - `js/main.js` — punto de arranque único

### Fase 2 — HTML
- Extraer imágenes base64 y banner SVG a archivos reales en `assets/`.
- El HTML queda legible, referenciando los recursos por ruta.

### Fase 3 — CSS
- Dividir `estilos.css` en archivos lógicos cargados en orden:
  `base.css`, `layout.css`, `componentes.css`, `login.css`.

### Fase 4 — Documentación para humanos e IA
- `README.md`: qué es el sistema, cómo ejecutarlo, mapa de archivos y conexiones.
- `AGENTS.md`: convenciones para IA (dónde va cada cosa, cómo agregar plantillas, reglas).

### Fase 5 — Estabilidad y rendimiento
- Manejo de errores claro al cargar Excel/plantillas (mensajes específicos).
- Eliminar procesos duplicados del arranque.
- Verificación de dependencias al inicio (`revisarLibs` ya existe: consolidarla).

## Verificación

- Tras cada fase: comprobación de sintaxis de todos los JS y prueba manual de la app en el navegador antes de continuar.
- Criterios de éxito: la app abre igual, carga Excel, lista plantillas, genera documentos Word y muestra vista previa exactamente como antes.

## Riesgos y mitigaciones

- Código minificado difícil de dividir con seguridad → formatear primero, dividir después, verificando tras cada movimiento.
- Comportamientos ocultos que solo el usuario conoce → probar tras cada fase; si algo falla, restaurar desde `_BACKUP_ORIGINAL/`.
