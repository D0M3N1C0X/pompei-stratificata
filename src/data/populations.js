/*
 * Densità sceniche indicative, non stime demografiche.
 * La ricostruzione archeologica non dispone di un censimento per ciascuna
 * fase: questi valori servono a rendere leggibili le diverse attività.
 */
// serie / ruoli: quali figure di Blender (src/scene/figure.js) prendono il
// posto dei manichini in quella fase; senza serie restano i manichini.
// Ai recuperi lavorano uomini: niente donne né cittadini col pallio [regia].
export const POPULATIONS = [
  { epoch:0, name:'pompeii-79', people:320, dogs:18, pigeons:96, style:'tunic', cloth:0xc7a77b, serie:'romane' },
  { epoch:1, name:'eruption', people:120, dogs:8, pigeons:0, style:'tunic', cloth:0xb3926f, flow:'out', serie:'romane' },
  { epoch:2, name:'recovery', people:34, dogs:5, pigeons:12, style:'work', cloth:0x89735b, serie:'romane', ruoli:['popolano','servo','ragazzo'] },
  { epoch:3, name:'reoccupation', people:46, dogs:7, pigeons:20, style:'cloak', cloth:0x786955 },
  { epoch:4, name:'civita', people:72, dogs:11, pigeons:34, style:'cloak', cloth:0x967044 },
  { epoch:5, name:'canal-works', people:92, dogs:8, pigeons:26, style:'work', cloth:0x9d7146 },
  { epoch:6, name:'bourbon-excavation', people:112, dogs:7, pigeons:30, style:'coat', cloth:0x6f5947, serie:'borbonici' },
  { epoch:7, name:'modern-excavation', people:144, dogs:6, pigeons:42, style:'modern', cloth:0x536c72, serie:'oggi' }
];

// Ercolano: i quattro momenti della scena (79, 1738, 1958, oggi). Nel 1738
// in superficie non c'è nessuno da mostrare (tutto è sepolto), e per il 1958
// non ho ancora una fonte sulle vesti degli operai di Maiuri: restano vuoti.
export const POPULATIONS_ERCOLANO = [
  { epoch:0, name:'ercolano-79', people:110, dogs:6, pigeons:24, style:'tunic', cloth:0xc7a77b, serie:'romane' },
  { epoch:1, name:'ercolano-1738', people:0, dogs:0, pigeons:0, style:'coat', cloth:0x6f5947 },
  { epoch:2, name:'ercolano-1958', people:0, dogs:0, pigeons:0, style:'work', cloth:0x89735b },
  { epoch:3, name:'ercolano-oggi', people:70, dogs:0, pigeons:16, style:'modern', cloth:0x536c72, serie:'oggi' }
];
