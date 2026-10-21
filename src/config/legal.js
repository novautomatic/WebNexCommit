// Data the privacy policy must publish (Ley 21.719, art. 14 ter letters a-c).
// Empty fields are simply not shown: fill them in and the policy shows them.
export const RESPONSABLE = {
  marca: 'NexCommit',
  // From the "Certificado de Estatuto Actualizado" (Registro de Empresas y Sociedades, CVE CRUAFsPBle7b).
  razonSocial: 'TPB Soluciones Digitales Limitada',
  rut: '78.375.968-3',
  // Statute art. 7: joint administration, any two of the three partners sign together.
  representanteLegal: 'sus socios administradores Fabián Ignacio Tobar Muñoz, Juan Pablo Andrés Pizarro Martínez y Stephania Jasmín Bilbao La Vieja Peñaranda',
  // Registered seat per statute art. 3. Never use a partner's home address here.
  domicilio: 'la comuna de Las Condes, Región Metropolitana de Santiago',
  correo: 'nexcommit@gmail.com', // where data subjects send their requests (art. 11)
};

// Bump the version and date every time the policy text changes (art. 14 ter a).
export const POLITICA = { version: '2.2', vigenteDesde: '21 de octubre de 2026' };
