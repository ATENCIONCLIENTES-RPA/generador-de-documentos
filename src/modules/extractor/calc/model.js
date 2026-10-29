/* Modelo de la calculadora integrada (antes un libro Excel) y autoverificación. */
import { selfTest } from './engine.js';

/* ==========================================================================
   4. CALCULADORA INTEGRADA (antes: Excel «Calculadora Consumo Meta.xlsx»)
   Todo lo que el libro contiene quedó embebido aquí; NO hace falta cargarlo:
   - formulas: texto original de cada celda (C8…F19), sus dependencias, el
     formato numérico de Excel y el valor que Excel tenía guardado («cached»),
     que se usa para la autoverificación al iniciar.
   - params: constantes extraídas de las fórmulas (90 %, 110 %, 30 %, 120 %,
     clases que contribuyen, textos de salida y dígitos de ROUND).
   - factor: rango con nombre FACTOR (Hoja1!$A$1:$B$8).
   - rules: validaciones de datos del libro (lista de clases, días 1–32, ≥ 0).
   Para actualizar una regla de negocio basta con editar este objeto.
   ========================================================================== */
const CALC_MODEL = {
 "fileName": "Calculadora Consumo Meta.xlsx",
 "sheet": "Calculadora",
 "params": {
  "pMin": 0.9,
  "pMax": 1.1,
  "pTope": 0.3,
  "contrib": [
   "Comercial",
   "Residencial 5",
   "Residencial 6",
   "Industrial"
  ],
  "f7Yes": "Sí",
  "f7No": "No",
  "noAhorro": "No Ahorro",
  "f10Test": "Sí",
  "f10Yes": "Tarifa",
  "f10No": "CU",
  "f11Test": "Sí",
  "pTarifa": 1.2,
  "factorName": "FACTOR",
  "factorCol": 2,
  "roundDigits": 0,
  "f19Cero": "Sin ajuste",
  "f19Pos": "Cobro adicional",
  "f19Neg": "Descontar"
 },
 "formulas": {
  "C8": {
   "cell": "C8",
   "deps": [
    "C6",
    "C7"
   ],
   "formula": "=C6*C7",
   "label": "Meta del período (kWh)",
   "ok": true,
   "fmt": "0.000",
   "cached": 43.044802,
   "cachedType": "n"
  },
  "C9": {
   "cell": "C9",
   "deps": [
    "C8"
   ],
   "formula": "=C8*90%",
   "label": "Mínimo 90% (kWh)",
   "ok": true,
   "fmt": "0.000",
   "cached": 38.7403218,
   "cachedType": "n"
  },
  "C10": {
   "cell": "C10",
   "deps": [
    "C8"
   ],
   "formula": "=C8*110%",
   "label": "Límite de 110% de la Meta de Ciclo kWh",
   "ok": true,
   "fmt": "0.000",
   "cached": 47.3492822,
   "cachedType": "n"
  },
  "C11": {
   "cell": "C11",
   "deps": [
    "C8"
   ],
   "formula": "=C8*30%",
   "label": "Tope de ahorro 30% (kWh)",
   "ok": true,
   "fmt": "0.000",
   "cached": 12.9134406,
   "cachedType": "n"
  },
  "F7": {
   "cell": "F7",
   "deps": [
    "C5"
   ],
   "formula": "=IF(OR(C5=\"Comercial\",C5=\"Residencial 5\",C5=\"Residencial 6\",C5=\"Industrial\"),\"Sí\",\"No\")",
   "label": "Contribuye",
   "ok": true,
   "fmt": "General",
   "cached": "No",
   "cachedType": "s"
  },
  "F8": {
   "cell": "F8",
   "deps": [
    "F5",
    "C10"
   ],
   "formula": "=IF(F5>C10,(F5-C10),0)",
   "label": "Consumo Excedente kWh",
   "ok": true,
   "fmt": "0.00",
   "cached": 387.6507178,
   "cachedType": "n"
  },
  "F9": {
   "cell": "F9",
   "deps": [
    "F5",
    "C9",
    "C11"
   ],
   "formula": "=IF(F5<C9,MIN((F5-C9)*-1,C11),\"No Ahorro\")",
   "label": "Ahorró",
   "ok": true,
   "fmt": "0.000",
   "cached": "No Ahorro",
   "cachedType": "s"
  },
  "F10": {
   "cell": "F10",
   "deps": [
    "F7"
   ],
   "formula": "=IF(F7=\"Sí\",\"Tarifa\",\"CU\")",
   "label": "Aplica CU o Tarifa",
   "ok": true,
   "fmt": "General",
   "cached": "CU",
   "cachedType": "s"
  },
  "F11": {
   "cell": "F11",
   "deps": [
    "F7",
    "F6"
   ],
   "formula": "=IF(F7=\"Sí\",F6*120%,F6)",
   "label": "Tarifa a Aplicar",
   "ok": true,
   "fmt": "\"$\"\\ #,##0.00",
   "cached": 1031.5922,
   "cachedType": "n"
  },
  "F12": {
   "cell": "F12",
   "deps": [
    "C5"
   ],
   "formula": "=VLOOKUP(C5,FACTOR,2,FALSE)",
   "label": "% Factor Cobro",
   "ok": true,
   "fmt": "0%",
   "cached": 0.3,
   "cachedType": "n"
  },
  "F13": {
   "cell": "F13",
   "deps": [
    "F11",
    "F12"
   ],
   "formula": "=F11*F12",
   "label": "CU o Tarifa con Factor",
   "ok": true,
   "fmt": "\"$\"\\ #,##0.00",
   "cached": 309.47766,
   "cachedType": "n"
  },
  "F14": {
   "cell": "F14",
   "deps": [
    "F8",
    "F13"
   ],
   "formula": "=IF(ISNUMBER(F8),F8*F13,0)",
   "label": "Total Cobro Adicional",
   "ok": true,
   "fmt": "\"$\"\\ #,##0",
   "cached": 119969.23704206436,
   "cachedType": "n"
  },
  "F18": {
   "cell": "F18",
   "deps": [
    "F17",
    "F14"
   ],
   "formula": "=IF(F17=\"\",\"\",ROUND(F14-F17,0))",
   "label": "Valor del ajuste",
   "ok": true,
   "fmt": "\"$\"\\ #,##0;[Red]\\-\"$\"\\ #,##0",
   "cached": -388312,
   "cachedType": "n"
  },
  "F19": {
   "cell": "F19",
   "deps": [
    "F17",
    "F18"
   ],
   "formula": "=IF(F17=\"\",\"\",IF(F18=0,\"Sin ajuste\",IF(F18>0,\"Cobro adicional\",\"Descontar\")))",
   "label": "Ajuste que procede",
   "ok": true,
   "fmt": "General",
   "cached": "Descontar",
   "cachedType": "s"
  }
 },
 "factor": {
  "name": "FACTOR",
  "ref": "Hoja1!$A$1:$B$8",
  "rows": [
   {
    "key": "Residencial 1",
    "val": 0.3
   },
   {
    "key": "Residencial 2",
    "val": 0.3
   },
   {
    "key": "Residencial 3",
    "val": 0.3
   },
   {
    "key": "Residencial 4",
    "val": 0.5
   },
   {
    "key": "Residencial 5",
    "val": 0.5
   },
   {
    "key": "Residencial 6",
    "val": 0.5
   },
   {
    "key": "Comercial",
    "val": 0.7
   },
   {
    "key": "Industrial",
    "val": 0.7
   }
  ]
 },
 "rules": {
  "F5": {
   "type": "decimal",
   "operator": "greaterThanOrEqual",
   "min": 0,
   "src": "0"
  },
  "F6": {
   "type": "decimal",
   "operator": "greaterThanOrEqual",
   "min": 0,
   "src": "0"
  },
  "F7": {
   "type": "list",
   "values": [
    "Sí",
    "No"
   ],
   "src": "\"Sí,No\""
  },
  "C5": {
   "type": "list",
   "values": [
    "Residencial 1",
    "Residencial 2",
    "Residencial 3",
    "Residencial 4",
    "Residencial 5",
    "Residencial 6",
    "Comercial",
    "Industrial"
   ],
   "src": "Hoja1!$A$1:$A$8"
  },
  "C7": {
   "type": "list",
   "values": [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
    32
   ],
   "src": "Hoja1!$D$2:$D$33"
  }
 },
 "inputs": {
  "C5": {
   "label": "Clase Servicio",
   "fmt": "General",
   "value": "Residencial 1",
   "rule": {
    "type": "list",
    "values": [
     "Residencial 1",
     "Residencial 2",
     "Residencial 3",
     "Residencial 4",
     "Residencial 5",
     "Residencial 6",
     "Comercial",
     "Industrial"
    ],
    "src": "Hoja1!$A$1:$A$8"
   }
  },
  "C6": {
   "label": "Meta Diaria (kWh)",
   "fmt": "0.0000",
   "value": 1.388542,
   "rule": null
  },
  "C7": {
   "label": "Número de Ciclos/Días Facturados",
   "fmt": "0",
   "value": 31,
   "rule": {
    "type": "list",
    "values": [
     1,
     2,
     3,
     4,
     5,
     6,
     7,
     8,
     9,
     10,
     11,
     12,
     13,
     14,
     15,
     16,
     17,
     18,
     19,
     20,
     21,
     22,
     23,
     24,
     25,
     26,
     27,
     28,
     29,
     30,
     31,
     32
    ],
    "src": "Hoja1!$D$2:$D$33"
   }
  },
  "F5": {
   "label": "Consumo Registrado kWh",
   "fmt": "0",
   "value": 435,
   "rule": {
    "type": "decimal",
    "operator": "greaterThanOrEqual",
    "min": 0,
    "src": "0"
   }
  },
  "F6": {
   "label": "Ingrese CU",
   "fmt": "\"$\"\\ #,##0.00",
   "value": 1031.5922,
   "rule": {
    "type": "decimal",
    "operator": "greaterThanOrEqual",
    "min": 0,
    "src": "0"
   }
  },
  "F17": {
   "label": "Ingrese cobro actual",
   "fmt": "\"$\"\\ #,##0",
   "value": 508281,
   "rule": null
  }
 },
 "issues": [],
 "sections": {
  "E16": "AJUSTE A APLICAR"
 }
};

/** Modelo listo para usar + autoverificación contra los valores guardados por Excel. */
/* Ciclos de facturación: el programa aplica a usuarios con facturación mensual o BIMESTRAL (Res. CREG 101 120 de 2026). La lista de días del Excel
   (1–32) sólo cubría ciclos mensuales y bloqueaba cualquier ciclo bimestral: se amplía hasta 62 días (31 + 31). */
const MAX_DIAS_CICLO = 62;
{ const dias = Array.from({ length: MAX_DIAS_CICLO }, (_, i) => i + 1);
  CALC_MODEL.rules.C7.values = dias; CALC_MODEL.rules.C7.src = '1–' + MAX_DIAS_CICLO;
  CALC_MODEL.inputs.C7.rule.values = dias; CALC_MODEL.inputs.C7.rule.src = '1–' + MAX_DIAS_CICLO; }
export const MODEL = (() => { const m = CALC_MODEL; m.selfTest = selfTest(m); return m; })();
