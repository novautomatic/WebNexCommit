// Data the privacy policy must publish (Ley 21.719, art. 14 ter letters a-c).
// Empty fields are simply not shown: fill them in and the policy shows them.
export const RESPONSABLE = {
  marca: 'NexCommit',
  razonSocial: '', // e.g. 'NexCommit SpA'
  rut: '',
  representanteLegal: '',
  domicilio: '', // postal address, required by art. 14 ter c)
  correo: 'nexcommit@gmail.com', // where data subjects send their requests (art. 11)
};

// Bump the version and date every time the policy text changes (art. 14 ter a).
export const POLITICA = { version: '2.0', vigenteDesde: '19 de octubre de 2026' };
