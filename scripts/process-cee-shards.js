// =============================================================================
// process-cee-shards.js
// 🔋 CEE RGEEE GALICIA — Procesador de Shards para GitHub Releases
//
// Divide el CSV oficial del RGEEE (Xunta de Galicia / INEGA) en 100 shards JSON
// para que los Cloudflare Workers descarguen solo ~1MB por peticion en lugar
// del CSV completo de 65MB. Los shards se publican como GitHub Release assets.
//
// Uso:
//   node scripts/process-cee-shards.js [ruta_csv] [directorio_salida]
//
// Dataset: https://abertos.xunta.gal/catalogo/economia-empresa-emprego/
//          -/dataset/0432/rexistro-certificados-eficiencia-enerxetica/
// Licencia: CC BY-SA 4.0 — Xunta de Galicia / INEGA
// Formato CSV: separador ; | encoding: ISO-8859-1 (Latin-1)
// Campos: numSol;numeroRegistro;tipoCEE;enderezo;normativa;refCatastral;
//         municipio;cpCat;provincia;consumo;letraConsumo;emisions;
//         letraEmisions;dataRexistro;fechaCaducidade;descViv
// =============================================================================

const fs = require('fs');
const path = require('path');

const CSV_PATH   = process.argv[2] || path.join(__dirname, '../data/rgeee.csv');
const OUTPUT_DIR = process.argv[3] || path.join(__dirname, '../shards');
const NUM_SHARDS = 100;

// Hash determinista RC14 → indice de shard (0-99)
// MISMO ALGORITMO que usa el Cloudflare Worker para encontrar el shard correcto.
// NO CAMBIAR SIN SINCRONIZAR CON fetchCeeFromShards() EN assistant.js
function rc14ToShardIndex(rc14) {
  if (!rc14 || rc14.length < 7) return 0;
  let hash = 5381;
  for (let i = 0; i < rc14.length; i++) {
    hash = ((hash << 5) + hash + rc14.charCodeAt(i)) >>> 0;
  }
  return hash % NUM_SHARDS;
}

// Normalizar fecha a formato ISO yyyy-mm-dd para ordenacion y comparacion
function normalizarFecha(str) {
  if (!str) return null;
  str = str.trim();
  // Formato dd/mm/yyyy (fechaCaducidade)
  const m1 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  // Formato yyyy-mm-dd HH:MM:SS (dataRexistro)
  const m2 = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m2) return m2[1];
  return str.slice(0, 10);
}

// Calcular vigencia del CEE (Reglamento RD 390/2021)
function determinarVigencia(fechaCad) {
  if (!fechaCad) return 'Desconocida';
  const hoy = new Date().toISOString().slice(0, 10);
  const fCad = normalizarFecha(fechaCad);
  if (!fCad) return 'Desconocida';
  return fCad >= hoy ? 'Vigente' : 'Caducado';
}

// --- MAIN ---
console.log('\n🔋 CEE RGEEE Galicia — Procesador de Shards');
console.log(`📂 Leyendo CSV: ${CSV_PATH}`);

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ No se encontro el CSV en: ${CSV_PATH}`);
  process.exit(1);
}

// Leer como buffer binario y decodificar como Latin-1 (ISO-8859-1)
// La Xunta publica el CSV en este encoding. Con latin1, los caracteres
// Gallegas/Espanolas (N con tilde, vocales con acento) se leen correctamente.
const buffer  = fs.readFileSync(CSV_PATH);
const content = buffer.toString('latin1');
const lines   = content.split('\n');
const header  = lines[0].replace(/\r/g, '').split(';');

console.log(`✅ Total lineas: ${lines.length.toLocaleString()}`);
console.log(`📋 Campos: ${header.join(', ')}`);

// Mapear columnas por nombre (tolerante a cambios de esquema)
const idx = {};
header.forEach((col, i) => { idx[col.trim()] = i; });

// Validar columnas obligatorias
const required = ['refCatastral','numeroRegistro','letraConsumo','letraEmisions','dataRexistro'];
const missing  = required.filter(c => idx[c] === undefined);
if (missing.length > 0) {
  console.error(`❌ Columnas obligatorias no encontradas: ${missing.join(', ')}`);
  console.error(`   Columnas disponibles: ${Object.keys(idx).join(', ')}`);
  process.exit(1);
}

// Inicializar shards
const shards = Array.from({ length: NUM_SHARDS }, () => ({}));
let totalProcesados = 0, totalRc14Unicos = 0, totalSinRc = 0;

// Procesar cada registro
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].replace(/\r/g, '').trim();
  if (!line) continue;

  const cols = line.split(';');
  const rc = (cols[idx['refCatastral']] || '').trim().toUpperCase().replace(/[\s\-]/g, '');

  if (!rc || rc.length < 14) { totalSinRc++; continue; }

  const rc14 = rc.substring(0, 14);
  const shardIndex = rc14ToShardIndex(rc14);

  const dr  = normalizarFecha(cols[idx['dataRexistro']] || '');
  const cad = normalizarFecha(cols[idx['fechaCaducidade']] || '');

  // Registro compacto (claves cortas para reducir tamaño del shard)
  const registro = {
    n:    (cols[idx['numeroRegistro']] || '').trim(),        // nº expediente INEGA
    t:    (cols[idx['tipoCEE']] || '').trim(),               // tipo certificado
    e:    (cols[idx['enderezo']] || '').trim(),              // direccion
    norm: (cols[idx['normativa']] || '').trim(),             // normativa aplicada
    rc:   rc,                                                 // RC completa (20 chars)
    mun:  (cols[idx['municipio']] || '').trim(),             // municipio
    cp:   (cols[idx['cpCat']] || '').trim(),                 // codigo postal
    prov: (cols[idx['provincia']] || '').trim(),             // provincia
    con:  parseFloat(cols[idx['consumo']] || '0') || null,   // consumo kWh/m2*año
    lC:   (cols[idx['letraConsumo']] || '').trim(),          // letra calificacion consumo
    em:   parseFloat(cols[idx['emisions']] || '0') || null,  // emisiones kgCO2/m2*año
    lE:   (cols[idx['letraEmisions']] || '').trim(),         // letra calificacion emisiones
    dr:   dr,                                                 // fecha inscripcion (ISO)
    cad:  cad,                                               // fecha caducidad (ISO)
    vig:  determinarVigencia(cols[idx['fechaCaducidade']] || ''), // Vigente | Caducado
    desc: (cols[idx['descViv']] || '').trim()                // descripcion tipologia
  };

  if (!shards[shardIndex][rc14]) { shards[shardIndex][rc14] = []; totalRc14Unicos++; }
  shards[shardIndex][rc14].push(registro);
  totalProcesados++;
}

// Ordenar por fecha de inscripcion (mas reciente primero)
for (let si = 0; si < NUM_SHARDS; si++) {
  for (const rc14 in shards[si]) {
    shards[si][rc14].sort((a, b) => (a.dr && b.dr ? b.dr.localeCompare(a.dr) : 0));
  }
}

// Crear directorio de salida
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Escribir 100 shards + metadata
console.log(`\n💾 Escribiendo ${NUM_SHARDS} shards en: ${OUTPUT_DIR}`);
let maxSize = 0, totalSize = 0;
for (let si = 0; si < NUM_SHARDS; si++) {
  const filename = path.join(OUTPUT_DIR, `shard-${String(si).padStart(2, '0')}.json`);
  const json = JSON.stringify(shards[si]);
  fs.writeFileSync(filename, json, 'utf8');
  const size = Buffer.byteLength(json, 'utf8');
  totalSize += size;
  if (size > maxSize) maxSize = size;
}

const meta = {
  generated_at: new Date().toISOString(),
  source: 'RGEEE - Xunta de Galicia / INEGA',
  license: 'CC BY-SA 4.0',
  source_url: 'https://abertos.xunta.gal/catalogo/economia-empresa-emprego/-/dataset/0432',
  total_records: totalProcesados,
  total_rc14_unique: totalRc14Unicos,
  records_without_rc: totalSinRc,
  num_shards: NUM_SHARDS,
  avg_shard_kb: Math.round(totalSize / NUM_SHARDS / 1024),
  max_shard_kb: Math.round(maxSize / 1024),
  total_size_mb: (totalSize / 1024 / 1024).toFixed(2)
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(meta, null, 2), 'utf8');

console.log('\n✅ Procesamiento completado:');
console.log(`   📊 Registros:       ${totalProcesados.toLocaleString()}`);
console.log(`   🏠 RC14 unicas:     ${totalRc14Unicos.toLocaleString()}`);
console.log(`   ⚠️  Sin RC:          ${totalSinRc.toLocaleString()}`);
console.log(`   📦 Shard promedio:  ${Math.round(totalSize / NUM_SHARDS / 1024)} KB`);
console.log(`   📦 Shard maximo:    ${Math.round(maxSize / 1024)} KB`);
console.log(`   💽 Total:           ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`\n🚀 Shards listos. Subir a GitHub Release como 'cee-data-latest'\n`);