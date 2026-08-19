// =============================================================================
// actualizar-cee-local.js
// Script de 1 clic para procesar el CSV recién descargado de INEGA
// =============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const userDownloads = path.join(process.env.USERPROFILE || process.env.HOME, 'Downloads');
const candidateNames = [
  'acceso-aos-datos.csv',
  'rgeee.csv',
  'rexistro-certificados-eficiencia-enerxetica.csv'
];

let csvPath = null;

// 1. Buscar en Descargas
for (const name of candidateNames) {
  const full = path.join(userDownloads, name);
  if (fs.existsSync(full)) {
    csvPath = full;
    break;
  }
}

// 2. Si no, buscar el archivo .csv más reciente en Descargas que contenga numSol
if (!csvPath && fs.existsSync(userDownloads)) {
  const files = fs.readdirSync(userDownloads)
    .filter(f => f.toLowerCase().endsWith('.csv'))
    .map(f => ({ name: f, time: fs.statSync(path.join(userDownloads, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  for (const f of files) {
    const p = path.join(userDownloads, f.name);
    try {
      const header = fs.readFileSync(p, { encoding: 'latin1', flag: 'r' }).slice(0, 500);
      if (header.includes('numSol') || header.includes('numeroRegistro') || header.includes('tipoCEE')) {
        csvPath = p;
        break;
      }
    } catch (e) {}
  }
}

if (!csvPath) {
  console.error('\n❌ No se encontró ningún archivo CSV de CEE en tu carpeta de Descargas.');
  console.log('👉 Por favor descarga el archivo desde:');
  console.log('   https://abertos.xunta.gal/catalogo/economia-empresa-emprego/-/dataset/0432/rexistro-certificados-eficiencia-enerxetica/001/acceso-aos-datos.csv\n');
  process.exit(1);
}

console.log(`\n📂 CSV detectado: ${csvPath}`);
const sizeMB = (fs.statSync(csvPath).size / (1024 * 1024)).toFixed(2);
console.log(`📦 Tamaño del archivo: ${sizeMB} MB`);

const targetDirWeb = path.join(__dirname, '../../web_jmcaamanog/data/shards');
const targetDirAta = path.join(__dirname, '../shards');

if (!fs.existsSync(targetDirWeb)) fs.mkdirSync(targetDirWeb, { recursive: true });
if (!fs.existsSync(targetDirAta)) fs.mkdirSync(targetDirAta, { recursive: true });

console.log('\n⚙️ Generando 100 shards JSON optimizados...');
const processScript = path.join(__dirname, 'process-cee-shards.js');
execSync(`node "${processScript}" "${csvPath}" "${targetDirWeb}"`, { stdio: 'inherit' });

// Copiar también a shards de ATA
const shardFiles = fs.readdirSync(targetDirWeb).filter(f => f.endsWith('.json'));
for (const sf of shardFiles) {
  fs.copyFileSync(path.join(targetDirWeb, sf), path.join(targetDirAta, sf));
}

console.log(`\n✅ ${shardFiles.length} shards actualizados con éxito en web_jmcaamanog y ATA.`);

// Commit y Push automático a web_jmcaamanog
try {
  console.log('\n🚀 Desplegando a Cloudflare Pages (git push)...');
  const webDir = path.join(__dirname, '../../web_jmcaamanog');
  execSync('git add data/shards/*.json', { cwd: webDir, stdio: 'inherit' });
  const dateStr = new Date().toISOString().slice(0, 10);
  try {
    execSync(`git commit -m "chore(cee): actualizacion mensual del censo RGEEE (${dateStr})"`, { cwd: webDir, stdio: 'inherit' });
    execSync('git push origin main', { cwd: webDir, stdio: 'inherit' });
    console.log('✨ Despliegue en vivo en Cloudflare Pages completado.');
  } catch (e) {
    console.log('ℹ️ No había cambios nuevos que commitear (los shards ya estaban al día).');
  }
} catch (e) {
  console.warn('⚠️ Error al hacer git push:', e.message);
}

console.log('\n======================================================');
console.log('🎉 ¡PROCESO FINALIZADO CON ÉXITO!');
console.log('======================================================\n');