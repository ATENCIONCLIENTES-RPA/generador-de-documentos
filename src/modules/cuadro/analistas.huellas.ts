export const SAL_ANALISTAS='essa-sc-v1';
/* Huellas SHA-256 (nunca nombres) de los usuarios que pueden recalcular el
   vencimiento además de los miembros de «Somos» y «Ruta especializada».
   Se incluyen variantes de escritura del mismo nombre para que la persona
   conserve el acceso aunque el reporte la escriba con otra grafía. */
export const HUELLAS_PLAZO: string[] = [
  '44f079e4d7fd4437b6e21058',
  'cb2971692ea99c5a5218056f',
  'c4ac8956b74c1db89409b6b2',
  '2da43c1e72b04b87c3c8042e',
];
export const HUELLAS_RUTAS: Record<string,string[]> = {
  rs: ['1eac2415470ab54cf670bf2a', '8779bc6f0a88816c05fc8f51'],
  sp: ['9ad9606f33753390bfda2c11'],
  so: ['6124197efe9f4971a56aeaeb'],
  pq: ['6cdb49bd446fc6b7b04f61aa', '865289e088336075c509db00', 'a8a64daa9b052e8974394cb3', 'b76562a2abb0a4b0cda9f12c', 'c16db215e6dd548ea65566ca', 'c53e8eb4d8ff0f1b91787e28', 'c9ff43fe9ad31279e0c9b7e3', 'cdf3a77c3b2bcf2952d1e886', 'daf6d207118849b8c70d2a57', 'e47b45b7c3294162068f8c5c', 'ecf399c69b51293907079016'],
  rc: ['7a4ab1f609823462daa756a3', '198dac034e9a569e60304847', '2b4dd5906d775d6f66994d0b', '3461f96461a2db0dc6d28255', 'a08c56b0bf699fd66ec5dcaa', 'b266565c6b4890d0c6f7b982', 'd6abee645788eb83d8476fa9', 'df58d953ed2c98dc6e2c7fc3', 'e11ba9cee952ed7feb3b26b5', 'e66b841ded9c6b3f4d8f6cfa', 'fcc4f58d654343a1e8588429'],
};
/* v42 · Sub-rutas de Peticiones. Solo huellas (nunca nombres).
   es = Ruta Especializada · so = SOMOS. Sus miembros ven la sub-ruta y la
   columna «Vencimiento» de «Radicados del día». */
export const HUELLAS_SUBRUTAS: Record<string,string[]> = {
  es: ['6cdb49bd446fc6b7b04f61aa'],
  so: ['6124197efe9f4971a56aeaeb'],
};
/* v48 · Administradores del editor «Reglas de coincidencia» (duplicados). Solo huellas. */
export const HUELLAS_ADMIN_DUP: string[] = ['c16db215e6dd548ea65566ca'];
