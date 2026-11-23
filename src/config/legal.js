// Identity of the data controller and online seller. Shown in the privacy policy
// (Ley 19.628), the site footer and «Quiénes somos» (Ley 19.496 art. 12 A, D.S. 6/2021).
// Empty fields are simply not shown: fill them in and the policy shows them.
export const RESPONSABLE = {
  marca: 'NexCommit',
  // From the "Certificado de Estatuto Actualizado" (Registro de Empresas y Sociedades, CVE CRUAFsPBle7b).
  razonSocial: 'TPB Soluciones Digitales Limitada',
  rut: '78.375.968-3',
  // Statute art. 7: joint administration, any two of the three partners sign together.
  representanteLegal: 'sus socios administradores Fabián Ignacio Tobar Muñoz, Juan Pablo Andrés Pizarro Martínez y Stephania Jasmin Bilbao La Vieja Peñaranda', // «Jasmin» con s y sin tilde (corregido el 9-nov-2026)
  // Registered seat per statute art. 3. Never use a partner's home address here.
  domicilio: 'la comuna de Las Condes, Región Metropolitana de Santiago',
  correo: 'nexcommit@gmail.com', // where data subjects send their requests (Ley 19.628 art. 12; answer within 2 business days, art. 16)
};

// Bump the version and date every time the policy text changes.
export const POLITICA = { version: '3.1', vigenteDesde: '28 de octubre de 2026' };
