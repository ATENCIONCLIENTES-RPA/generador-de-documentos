/* ────────────────────────────────────────────────────────────────────────────
   Nombre del solicitante en orden «nombres + apellidos» (Módulo 3 · v44)

   ordenaNombreSolicitante(nombre, cedulaSolicitante)
   1. Si CEDULA_SOLICITANTE es un NIT (9 dígitos que empiezan por 8 o 9; también
      «900123456-7» con dígito de verificación) → el nombre se deja EXACTAMENTE igual.
   2. Si es cédula (cualquier otro número):
      - Se agrupan los nombres/apellidos compuestos como una sola palabra:
        «de la Cruz», «de los Ángeles», «de Jesús», «de Dios», «del Carmen»…
      - Si se reconoce el orden (por un listado de nombres de pila comunes), se usa:
        nombres primero y apellidos después.
      - Si no se reconoce, se aplica la regla fija:
          4 palabras: 3-4 + 1-2  → «martinez rueda carlos andres» = «Carlos Andrés Martínez Rueda»
          3 palabras: 3 + 1-2    → «gonzales morales sara»        = «Sara Gonzales Morales»
          2 palabras: 2 + 1      → «rodriguez camilo»             = «Camilo Rodríguez»
          otro número de palabras: no se cambia el orden.
      - Mayúscula inicial en cada palabra (partículas «de», «la», «del»… en minúscula)
        y tildes en nombres y apellidos comunes.
   3. Sin identificación: el nombre se deja igual.
   ──────────────────────────────────────────────────────────────────────────── */

const norm = (s: string): string =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** NIT: 9 dígitos que empiezan por 8 o 9 (con o sin dígito de verificación «-X»). */
export function esNit(identificacion: unknown): boolean {
  const s = String(identificacion ?? '').trim();
  if (!s) return false;
  const base = s.split('-')[0].replace(/\D/g, '');
  return base.length === 9 && /^[89]/.test(base);
}

/* Partículas que se unen a la palabra siguiente (nombres/apellidos compuestos). */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa', 'van', 'von', 'da', 'di']);
const MINUSCULA = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'di', 'van', 'von']);

/* Tildes de nombres y apellidos frecuentes en Colombia (clave sin tilde → forma correcta). */
const TILDES: Record<string, string> = Object.fromEntries(`
Rodríguez Martínez González Gómez Pérez Sánchez Ramírez Díaz Hernández López García Jiménez Álvarez Suárez Gutiérrez
Fernández Vásquez Velásquez Vélez Muñoz Peña Ordóñez Núñez Ibáñez Ortíz:Ortiz Cárdenas Ríos Ángel Martín Benítez Domínguez
Gálvez Méndez Báez Sáenz Páez Rincón Calderón Chacón León Cortés Bermúdez Velázquez Márquez Vásquez Avendaño Patiño Castaño
Londoño Zuluaga:Zuluaga Peñaloza Montañez Montaño Cañas Ñañez Narváez Galván Durán Beltrán Guzmán Quintín Malagón Colón
Gaitán Arévalo Agudelo:Agudelo Ramón Tobón Monsalve:Monsalve Ardila:Ardila Uribe:Uribe Ochoa:Ochoa Pabón Villamizar:Villamizar
Ibáñez Bolívar Rendón Garzón Marín Galindo:Galindo Durán Barón Ledesma:Ledesma Estupiñán Albarracín Gualdrón Ayala:Ayala
Álvaro Andrés José María Jesús Ramón Julián Sebastián Martín Iván Óscar Héctor Víctor Nicolás Tomás Lucía Sofía Matías
Ángela Mónica Verónica Inés Belén Raúl Rubén Germán Joaquín Adrián Fabián Damián Simón Efraín Elías Isaías Jeremías
Zoé Noé Moisés Andrés Cristóbal Gonzalo:Gonzalo Ismael:Ismael Rafael:Rafael Leonardo:Leonardo Eugenio:Eugenio Hernán Edén Rocío
Dolores:Dolores Concepción Asunción Encarnación Purificación Ascensión Begoña Dámaris Débora Bárbara Fátima Génesis Ángeles
Yesenia:Yesenia Darío Mario:Mario Julio:Julio Rogelio:Rogelio Nelsón:Nelson Edisón:Edison Wilsón:Wilson Abraham:Abraham
Félix Máximo Sixto:Sixto Néstor Aníbal Benjamín Agustín Valentín Celestino:Celestino Cristián:Cristian Sebastián Josué Mauricio:Mauricio
`.split(/\s+/).filter(Boolean).map(w => {
  const [k, v] = w.includes(':') ? [w.split(':')[0], w.split(':')[1]] : [w, w];
  return [norm(k), v];
}));

/* Nombres de pila comunes: si el PRIMER bloque es uno de estos y el último no,
   el nombre ya viene en orden «nombres + apellidos» y no se reordena. */
const NOMBRES_PILA = new Set(`
maria jose juan carlos luis jorge andres camilo sara laura ana diana paula andrea carolina claudia sandra martha marta
luz gloria nancy patricia adriana sonia liliana angela monica veronica natalia daniela valentina juliana alejandra
catalina mariana isabella sofia lucia camila manuela gabriela valeria karen erika jessica yesenia johana yuli yenny
pedro pablo jairo jaime javier julian sebastian santiago mateo nicolas tomas alejandro diego david daniel miguel angel
fernando francisco gustavo hector oscar victor ricardo roberto rodrigo sergio cesar edwin edgar eduardo william wilson
nelson henry jhon john jhonatan jonathan alexander alexis fabian german hernan jesus ramon raul ruben mauricio leonardo
hugo ivan jose gerardo rafael alberto antonio arturo enrique esteban felipe guillermo ignacio joaquin manuel mario
orlando omar samuel simon armando alvaro alfonso alirio ancizar libardo ever fredy freddy yesid yeison brayan kevin
cristian christian jhonny elkin wilmer duvan stiven steven dairo dario edison efrain emilio ernesto fidel gonzalo
humberto ismael jeronimo julio lorenzo marco marcos martin moises nestor octavio pastor reinaldo rogelio rosa rocio
beatriz blanca carmen cecilia cristina doris elena elizabeth esperanza estela eugenia fanny flor graciela ines irma
isabel janeth jenny leidy lida lina lorena lucy luisa marcela margarita maritza mercedes miriam myriam nelly nidia
nora olga piedad pilar rosalba ruth silvia teresa yolanda zulma dora amparo aura alba ximena viviana tatiana katherine
yuliana yurani yurley stefany estefania angie dayana lizeth lizeth yaneth yineth zayda zaida leyla kelly jessica
`.split(/\s+/).filter(Boolean));

function formatoPalabra(w: string): string {
  const k = norm(w);
  if (MINUSCULA.has(k)) return k;
  const t = TILDES[k];
  if (t) return t;
  return k.replace(/(^|[-'’])(\p{L})/gu, (_m, a: string, b: string) => a + b.toLocaleUpperCase('es-CO'));
}

/* Separa el nombre en bloques; las partículas se unen a la palabra siguiente. */
function bloques(nombre: string): string[][] {
  const ws = String(nombre ?? '').replace(/[,;]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const out: string[][] = [];
  let pend: string[] = [];
  ws.forEach((w, i) => {
    const k = norm(w);
    if (PARTICULAS.has(k) && i < ws.length - 1) { pend.push(w); return; }
    out.push(pend.concat(w)); pend = [];
  });
  if (pend.length) { if (out.length) out[out.length - 1].push(...pend); else out.push(pend); }
  return out;
}

const esPila = (b: string[]): boolean => b.length === 1 && NOMBRES_PILA.has(norm(b[0]));
const textoBloque = (b: string[]): string => {
  const s = b.map(formatoPalabra).join(' ');
  return s.charAt(0).toLocaleUpperCase('es-CO') + s.slice(1);   // «De la Cruz» si inicia el bloque
};
const textoBloqueInterno = (b: string[]): string => b.map(formatoPalabra).join(' ');

/** Reordena el nombre según la identificación (ver reglas arriba). */
export function ordenaNombreSolicitante(nombre: unknown, cedulaSolicitante: unknown): string {
  const original = String(nombre ?? '');
  const ced = String(cedulaSolicitante ?? '').replace(/[^\d-]/g, '');
  if (!original.trim() || !ced.replace(/\D/g, '') || esNit(ced)) return original;

  const B = bloques(original);
  const n = B.length;
  let orden: number[];

  const primeroPila = n >= 2 && esPila(B[0]);
  const ultimoPila = n >= 2 && esPila(B[n - 1]);
  if (primeroPila && !ultimoPila) {
    orden = B.map((_, i) => i);                        // ya está «nombres + apellidos»
  } else if (n === 4) orden = [2, 3, 0, 1];
  else if (n === 3) orden = [2, 0, 1];
  else if (n === 2) orden = [1, 0];
  else orden = B.map((_, i) => i);                     // 1 o 5+ bloques: mismo orden

  return orden.map((i, pos) => (pos === 0 ? textoBloque(B[i]) : textoBloqueInterno(B[i]))).join(' ');
}
