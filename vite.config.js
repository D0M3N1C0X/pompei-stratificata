import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/*
   Il sorgente sta in src/ ed è fatto di moduli leggibili; il prodotto è un
   index.html autosufficiente nella radice del repository — cioè esattamente
   quello che GitHub Pages serviva prima, senza toccare nessuna impostazione.

   Vite scrive in dist/, poi scripts/publish.js copia dist/index.html nella
   radice. Il passaggio in due tempi è voluto: costruire direttamente in radice
   significherebbe puntare l'uscita sulla cartella che contiene i sorgenti.

   Perché il prodotto sta in radice e non in dist/: perché Pages qui pubblica
   la radice del ramo main. Spostarlo richiederebbe di cambiare le impostazioni
   del repository, e il sito è già stato fuori uso una volta oggi.

   Il prodotto è versionato apposta. È il file che gira, e vederlo nel diff è
   il modo più semplice per accorgersi se una build è andata storta.
*/
export default defineConfig({
  root: 'src',
  base: './',
  publicDir: false,          // icone, manifest e service worker stanno già in radice
  plugins: [viteSingleFile()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // es2022 per il top-level await in src/main.js: la lingua va risolta
    // prima che app.js costruisca la scena, e quello richiede un await in
    // cima al modulo. Copre Chrome 94+, Safari 15+, Firefox 93+ — sotto
    // quei livelli non c'è comunque il WebGL2 che serve alla scena.
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  }
});
