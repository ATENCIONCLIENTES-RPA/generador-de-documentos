# Ordenamiento de Registros por Estado - Módulo 3: Revisión de Datos

## Resumen de Cambios

Se ha implementado un ordenamiento automático de los registros en la tabla del Módulo 3 según su estado/semáforo, siguiendo un orden de prioridad específico.

## Orden de Prioridad Implementado

| Prioridad | Estado | Color | Campo Calculado |
|-----------|--------|-------|-----------------|
| 1 | **Completado** | 🟢 Verde | Con número de proceso y observación de revisión |
| 2 | **Tiene revisión** | 🟣 Violeta | Con número de proceso, sin observación |
| 3 | **Tiene insumos** | 🔵 Azul | Con responsable de insumo asignado |
| 4 | **No tiene insumos** | 🟠 Naranja | Sin responsable de insumo |
| 5 | **Sin proceso** | 🔴 Rojo | Sin número de proceso |

## Función Implementada: `getStateOrder()`

```typescript
function getStateOrder(record: EssaRecord): number {
  const semaforo = record.estadoSemaforo || getEstadoSemaforo(record.numeroProceso, record.observacionRevision);
  const respInsumo = String(record.usuarioResponsableInsumo || record.responsableInsumo || '').trim();
  const hasInsumo = respInsumo !== '—' && respInsumo !== '' && respInsumo.toLowerCase() !== 'null' && respInsumo.toLowerCase() !== 'undefined';

  // Order: Completado (0) → Tiene revisión (1) → Tiene insumos (2) → No tiene insumos (3) → Sin proceso (4)
  if (semaforo === 'verde') return 0;
  if (semaforo === 'violeta') return 1;
  if (semaforo === 'rojo') {
    if (hasInsumo) return 2;
    return 3;
  }
  return 4;
}
```

## Dónde Se Aplica

En el `useMemo` que calcula `filteredRecords`:
1. Se aplican todos los filtros (búsqueda, cuenta, proceso, radicado, fechas, estado, días PQR)
2. Se aplica el filtro de "mostrar solo seleccionados" si está activo
3. Se ordena la lista usando `out.sort((a, b) => getStateOrder(a) - getStateOrder(b))`

```typescript
// Sort by state order: Completado → Tiene revisión → Tiene insumos → No tiene insumos → Sin proceso
out.sort((a, b) => getStateOrder(a) - getStateOrder(b));
return out;
```

## Características

✅ **Aplicable a datos filtrados:** El ordenamiento se mantiene incluso cuando se aplican filtros  
✅ **Automático:** No requiere interacción del usuario  
✅ **Sin modificación de datos:** Solo cambia el orden visual, no elimina ni modifica registros  
✅ **Preserva paginación:** El ordenamiento se aplica antes de la paginación  
✅ **Intuitivo:** Muestra primero los casos más avanzados (completados) y luego los pendientes  

## Cómo Funciona

1. Usuario carga datos en el módulo
2. Tabla se muestra automáticamente ordenada por estado
3. Todos los registros "Completado" aparecen primero
4. Seguidos de "Tiene revisión", luego "Tiene insumos", etc.
5. Si el usuario aplica filtros, la tabla respeta ambos: los filtros + el orden de estado
6. La paginación se aplica después del ordenamiento

## Ejemplo Práctico

**Datos sin ordenar:**
- Registro 1: Sin proceso
- Registro 2: Completado
- Registro 3: Tiene revisión
- Registro 4: No tiene insumos
- Registro 5: Tiene insumos

**Después del ordenamiento:**
- Registro 2: Completado ✅
- Registro 3: Tiene revisión
- Registro 5: Tiene insumos
- Registro 4: No tiene insumos
- Registro 1: Sin proceso

## Validaciones

✅ **Build:** Compilado exitosamente  
✅ **Tests:** 110 tests pasados  
✅ **TypeScript:** Sin errores  
✅ **Filtros:** Funcionando correctamente con ordenamiento  
✅ **Exportación:** Respeta el ordenamiento  

## Cambios en el Código

### Archivo: `src/views/DataView.tsx`

**Líneas 38-51:** Nueva función `getStateOrder()`
- Determina el nivel de prioridad de cada registro basado en su estado
- Retorna un número (0-4) que se usa para ordenar

**Líneas 245-246:** Aplicación del ordenamiento
- Llama a `.sort()` con la función comparadora
- Se ejecuta después de todos los filtros

## Notas Importantes

- El ordenamiento es **estable**: registros con el mismo estado mantienen su orden relativo
- La función se ejecuta eficientemente dentro del `useMemo`
- El ordenamiento es recalculado automáticamente cuando cambian los filtros
- No afecta la selección de registros ni la exportación
