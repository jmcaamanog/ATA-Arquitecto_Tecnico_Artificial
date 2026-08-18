# ATA - Arquitecto Técnico Artificial 🏗️🤖

| 🏗️ Perfil & ConTech | 📈 Repositorio & Datos |
| :--- | :--- |
| ![Profesión](https://img.shields.io/badge/Profesi%C3%B3n-Arquitectos%20T%C3%A9cnicos-2e7d32?logo=micro%3Abit&logoColor=white&style=plastic) <br> ![Role](https://img.shields.io/badge/Role-BIM%20%26%20ConTech-007ACC?logo=bim360&style=plastic) <br> ![Location](https://img.shields.io/badge/Location-A%20Coru%C3%B1a%20%F0%9F%8C%8A-005B94?logo=lighthouse&logoColor=white&style=plastic) <br> ![Sector](https://img.shields.io/badge/Sector-ConTech%20%7C%20AECO-E65100?logo=construct3&style=plastic) <br> ![Maker](https://img.shields.io/badge/Maker-Software-red?logo=makerbot&style=plastic) <br> ![Hardware](https://img.shields.io/badge/Hardware---grey?style=plastic) | [![Stars](https://img.shields.io/github/stars/jmcaamanog/ATA-Arquitecto_Tecnico_Artificial?style=plastic&label=Stars&color=f59e0b&logo=github)](https://github.com/jmcaamanog/ATA-Arquitecto_Tecnico_Artificial/stargazers) <br> ![Registros](https://img.shields.io/badge/Registros%20CEE-308.265-10b981?style=plastic&logo=databricks&logoColor=white) <br> ![Shards](https://img.shields.io/badge/Shards-100%20JSON-3b82f6?style=plastic&logo=json&logoColor=white) <br> [![Licencia Datos](https://img.shields.io/badge/Datos-CC%20BY--SA%204.0-8b5cf6?style=plastic&logo=creativecommons&logoColor=white)](https://creativecommons.org/licenses/by-sa/4.0/) <br> ![Actualización](https://img.shields.io/badge/Actualizaci%C3%B3n-Diaria%20%E2%80%A2%20GitHub%20Actions-06b6d4?style=plastic&logo=githubactions&logoColor=white) <br> [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=plastic&logo=linkedin)](https://www.linkedin.com/in/jmcaamanog/) |

### Backend de datos para el **Asesor IA de Jose Manuel Caamaño González** — Col. 2.873 COATAC.
*Dataset oficial del RGEEE (Galicia) transformado en 100 shards JSON para consulta ultrarrápida desde Cloudflare Workers sin límites de CPU.*

---

## ⚡ Enlaces y Accesos Rápidos

| 🌟 Recurso | 🚀 Acción / Enlace | 📝 Descripción |
| :--- | :--- | :--- |
| **Dataset en producción** | 👉 **[Ver GitHub Release](https://github.com/jmcaamanog/ATA-Arquitecto_Tecnico_Artificial/releases/tag/cee-data-latest)** | 101 shards JSON públicos (~97MB total) |
| **Fuente oficial RGEEE** | 🏛️ **[Portal Abertos Xunta](https://abertos.xunta.gal/catalogo/economia-empresa-emprego/-/dataset/0432)** | Dataset CSV original de la Xunta de Galicia |
| **INEGA Certificación** | ⚡ **[Consulta INEGA](https://www.inega.gal/es/eficiencia-energetica/certificacion-energetica-de-edificios)** | Portal oficial del registro RGEEE |
| **Normativa RD 390/2021** | 📜 **[BOE A-2021-9176](https://www.boe.es/buscar/doc.php?id=BOE-A-2021-9176)** | Real Decreto de Certificación Energética |

---

> [!IMPORTANT]
> ### 📥 Datos del RGEEE — Xunta de Galicia / INEGA
> Este repositorio hospeda el dataset oficial del **Registro de Certificados de Eficiencia Energética de Edificios de Galicia (RGEEE)** procesado para su consulta eficiente:
> - **~308.265** certificados energéticos registrados
> - **~128.552** referencias catastrales únicas de Galicia
> - **Licencia de los datos**: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — Xunta de Galicia / INEGA
> - **Licencia del código**: MIT — Jose Manuel Caamaño González
>
> Los datos **se actualizan automáticamente cada día a las 03:00 UTC** mediante GitHub Actions. El tag `cee-data-latest` siempre apunta al dataset más reciente.

---

## 🌟 Características Principales

| Módulo | Icono | Descripción |
| :--- | :---: | :--- |
| **ETL Automático** | ⚙️ | Script Node.js que descarga el CSV oficial del RGEEE (~65MB, ISO-8859-1), lo parsea y genera 100 shards JSON equilibrados |
| **Sharding por RC14** | 🔀 | Hash djb2 determinista sobre la Referencia Catastral de 14 dígitos → asigna cada inmueble a un shard estable |
| **GitHub Releases** | 📦 | Los 100 shards (~1MB/shard) se publican en el release `cee-data-latest`, accesibles públicamente sin autenticación |
| **Cache Cloudflare** | ⚡ | El Worker descarga el shard una vez y lo cachea 24h en la Cache API de Cloudflare por datacenter |
| **Paralelización** | 🚀 | Las consultas al RGEEE (CEE) y REGIAE (IEEG) se ejecutan en paralelo con `Promise.all` para minimizar la latencia |
| **Tabla 3 Dinámica** | 📊 | El asistente IA muestra datos reales del RGEEE: expediente, calificación con emoji de color 🟢🟡🔴, vigencia y normativa |
| **Actualización Diaria** | 🔄 | GitHub Actions descarga el CSV fresco del portal Abertos de la Xunta cada madrugada y publica un nuevo release |

---

## 🔋 Cómo funciona (Arquitectura)

```
CSV oficial Xunta/INEGA (~65MB · diario · ISO-8859-1)
        ↓
GitHub Action (03:00 UTC) → process-cee-shards.js
        ↓
100 shards JSON (~1MB/shard) + metadata.json
        ↓
GitHub Release: cee-data-latest (público · sin auth)
        ↓
Cloudflare Worker (assistant.js)
  └─ fetchCeeFromShards(rc14, ctx)
       ├─ Cache API hit  → respuesta en <5ms
       └─ Cache API miss → fetch shard (~1.2s) → cache 24h
        ↓
Dossier 360° con datos CEE reales ✅
```

### Algoritmo de sharding (Hash djb2)

```javascript
// CRÍTICO: este hash DEBE ser idéntico en process-cee-shards.js y assistant.js
let hash = 5381;
for (let i = 0; i < rc14.length; i++) {
  hash = ((hash << 5) + hash + rc14.charCodeAt(i)) >>> 0;
}
const shardIndex = hash % 100;  // → shard-00.json … shard-99.json
```

---

## 📁 Estructura del Repositorio

```
ATA-Arquitecto_Tecnico_Artificial/
├── scripts/
│   └── process-cee-shards.js    # ETL: CSV RGEEE → 100 shards JSON
├── .github/
│   └── workflows/
│       └── update-cee.yml       # GitHub Action: actualización diaria 03:00 UTC
├── CONTRIBUTING.md               # Guía para contribuir
├── CODE_OF_CONDUCT.md            # Código de conducta
├── SECURITY.md                   # Política de seguridad
├── .gitignore
└── README.md
```

> [!NOTE]
> La carpeta `shards/` y el archivo `data/rgeee.csv` **NO se incluyen en el repositorio** (excluidos en `.gitignore`). Los shards viven exclusivamente en el [GitHub Release `cee-data-latest`](https://github.com/jmcaamanog/ATA-Arquitecto_Tecnico_Artificial/releases/tag/cee-data-latest).

---

## 🚀 Ejecutar localmente

```bash
# 1. Clonar el repo
git clone https://github.com/jmcaamanog/ATA-Arquitecto_Tecnico_Artificial.git
cd ATA-Arquitecto_Tecnico_Artificial

# 2. Instalar dependencias
npm install papaparse

# 3. Descargar el CSV oficial del RGEEE
mkdir -p data
curl -L "https://abertos.xunta.gal/catalogo/economia-empresa-emprego/-/dataset/0432/rexistro-certificados-eficiencia-enerxetica/001/acceso-aos-datos.csv" -o data/rgeee.csv

# 4. Generar los 100 shards JSON
mkdir -p shards
node scripts/process-cee-shards.js data/rgeee.csv shards/

# Los shards quedan en shards/shard-00.json … shards/shard-99.json
```

---

## ⚙️ GitHub Actions — Configuración

El workflow `update-cee.yml` se ejecuta automáticamente cada día a las **03:00 UTC**. Para que funcione necesita un **Secret** en el repositorio:

| Secret | Valor | Permisos necesarios |
| :--- | :--- | :--- |
| `GH_TOKEN` | Token Personal de GitHub (`ghp_...`) | `repo` + `workflow` |

> [!TIP]
> Crea el Secret en: **Settings → Secrets and variables → Actions → New repository secret**

---

## 📦 Formato de los Shards

Cada shard tiene la forma:
```json
{
  "7506501NJ4070N": [
    {
      "n": "GA2015/12345",
      "lC": "E",
      "lE": "F",
      "con": 245.3,
      "em": 51.2,
      "vig": "Vigente",
      "cad": "15/03/2030",
      "norm": "RD 235/2013",
      "desc": "Residencial"
    }
  ]
}
```

| Campo | Significado |
| :--- | :--- |
| `n` | Número de expediente RGEEE |
| `lC` | Letra calificación consumo (A–G) |
| `lE` | Letra calificación emisiones (A–G) |
| `con` | Consumo de energía primaria no renovable (kWh/m²·año) |
| `em` | Emisiones de CO₂ (kg CO₂/m²·año) |
| `vig` | Estado de vigencia (`Vigente` / `Caduco`) |
| `cad` | Fecha de caducidad (DD/MM/AAAA) |
| `norm` | Normativa aplicada |
| `desc` | Tipología del uso certificado |

---

## 📜 Fuentes Oficiales & Licencia

| Recurso | Enlace | Licencia |
| :--- | :--- | :--- |
| **Dataset RGEEE** | [Portal Abertos da Xunta](https://abertos.xunta.gal/catalogo/economia-empresa-emprego/-/dataset/0432) | CC BY-SA 4.0 |
| **INEGA Certificación** | [inega.gal](https://www.inega.gal/es/eficiencia-energetica/certificacion-enerxetica-de-edificios) | CC BY-SA 4.0 |
| **RD 390/2021** | [BOE](https://www.boe.es/buscar/doc.php?id=BOE-A-2021-9176) | Dominio Público |
| **Código de este repo** | [MIT License](./LICENSE) | MIT |

> **Atribución requerida por CC BY-SA 4.0**: *Datos del RGEEE — Xunta de Galicia / INEGA — [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)*

---

*Jose Manuel Caamaño González | Arquitecto Técnico & BIM Manager · Col. 2.873 COATAC · Digital Product Lead | ConTech & AECO — Hecho con código y café desde A Coruña. ☕*

[LinkedIn](https://www.linkedin.com/in/jmcaamanog/) · [Web](https://jmcaamanog.pages.dev) · [COATAC](https://www.coatac.es)