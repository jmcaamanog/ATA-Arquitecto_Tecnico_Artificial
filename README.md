# ATA - Arquitecto Técnico Artificial 🏗️🤖

> Dataset y herramientas de soporte para el Asesor IA de Jose Manuel Caamaño González (jmcaamanog).
> Módulo de integración de datos oficiales del **Registro de Certificados de Eficiencia Energética (RGEEE)** de Galicia.

## 🔋 Datos CEE — RGEEE (Xunta de Galicia / INEGA)

| Campo | Detalle |
|:------|:--------|
| **Fuente oficial** | Portal Abertos da Xunta de Galicia |
| **Licencia** | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| **Cobertura** | Galicia (España) |
| **Actualización** | Diaria (automática vía GitHub Actions) |
| **Registros** | ~308.000 certificados |
| **Formato almacenado** | 100 shards JSON (~1MB/shard) en GitHub Releases |

### Cómo funciona

```
CSV oficial Xunta (~65MB, diario)
        ↓ GitHub Action (03:00 UTC)
process-cee-shards.js → 100 shards JSON
        ↓ GitHub Release: cee-data-latest
Cloudflare Worker → descarga shard específico (~1MB)
        ↓ Cache API (24h por datacenter)
Dossier 360º con datos CEE reales ✅
```

### Ejecutar localmente

```bash
# Descargar el CSV oficial
curl -L "https://abertos.xunta.gal/catalogo/economia-empresa-emprego/-/dataset/0432/rexistro-certificados-eficiencia-enerxetica/001/acceso-aos-datos.csv" -o data/rgeee.csv

# Generar los 100 shards
node scripts/process-cee-shards.js data/rgeee.csv shards/
```

## 📁 Estructura

```
ATA-Arquitecto_Tecnico_Artificial/
├── scripts/
│   └── process-cee-shards.js    # ETL: CSV → 100 shards JSON
├── .github/
│   └── workflows/
│       └── update-cee.yml       # GitHub Action de actualización diaria
├── .gitignore
└── README.md
```

## Fuentes Oficiales

- **RGEEE Dataset**: https://abertos.xunta.gal/catalogo/economia-empresa-emprego/-/dataset/0432
- **INEGA Certificación**: https://www.inega.gal/es/eficiencia-energetica/certificacion-energetica-de-edificios
- **Normativa RD 390/2021**: https://www.boe.es/buscar/doc.php?id=BOE-A-2021-9176

---

*Jose Manuel Caamaño González | Arquitecto Técnico & BIM Manager — hecho con código y café desde A Coruña. ☕*