export const config = { runtime: 'edge' };

/**
 * API: /api/select-letter?projectId=<slug>&lang=nl&lat=<lat>&lng=<lng>&sheet=<GVIZ_JSON_URL>
 * - If ?sheet is missing, tries environment var SHEET_GVIZ_URL
 * - Fallback: uses embedded demoContent
 *
 * GViz URL format:
 * https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:json&sheet=content
 * Expected columns (header row on the sheet named 'content'):
 * projectId,projectTitle,areaId,areaName_nl,areaName_en,areaName_pl,areaName_tr,areaName_ar,polygon_wkt,letter_nl,letter_en,letter_pl,letter_tr,letter_ar,contact_name,contact_phone,last_updated
 */

const demoContent = {
  "molenstraat-soest": {
    "title": "Project Molenstraat – Soest",
    "updated": new Date().toISOString().slice(0,10),
    "contact": {"name": "Jan de Vries", "phone": "+31 6 12 34 56 78"},
    "areas": [
      {
        "id": "molenstraat-zuid",
        "name": {"nl":"Molenstraat – Zuid","en":"Molenstraat – South","pl":"Molenstraat – Południe","tr":"Molenstraat – Güney","ar":"مولنسترات – الجنوب"},
        "polygon": [[52.17476,5.29956],[52.17476,5.3021],[52.1734,5.3021],[52.1734,5.29956]],
        "letter": {
          "nl": "Werkzaamheden hellende daken\nStart: 15 september 2025\nWerktijden: 07:00–16:00",
          "en": "Pitched roof works\nStart: 15 September 2025\nWorking hours: 07:00–16:00",
          "pl": "Prace na dachach stromych\nStart: 15 września 2025\nGodziny: 07:00–16:00",
          "tr": "Eğimli çatı çalışmaları\nBaşlangıç: 15 Eylül 2025\nSaatler: 07:00–16:00",
          "ar": "أعمال الأسطح المائلة\nالبداية: 15 سبتمبر 2025\nالساعات: 07:00–16:00"
        }
      },
      {
        "id": "molenstraat-noord",
        "name": {"nl":"Molenstraat – Noord","en":"Molenstraat – North","pl":"Molenstraat – Północ","tr":"Molenstraat – Kuzey","ar":"مولنسترات – الشمال"},
        "polygon": [[52.1757,5.29956],[52.1757,5.3021],[52.17476,5.3021],[52.17476,5.29956]],
        "letter": {
          "nl": "Werkzaamheden platte daken\nStart: 1 oktober 2025\nWerktijden: 07:00–16:00",
          "en": "Flat roof works\nStart: 1 October 2025\nWorking hours: 07:00–16:00",
          "pl": "Prace na dachach płaskich\nStart: 1 października 2025\nGodziny: 07:00–16:00",
          "tr": "Düz çatı çalışmaları\nBaşlangıç: 1 Ekim 2025\nSaatler: 07:00–16:00",
          "ar": "أعمال الأسطح المسطحة\nالبداية: 1 أكتوبر 2025\nالساعات: 07:00–16:00"
        }
      }
    ]
  }
};

function inPolygon(point, polygon) {
  const [y, x] = point; // lat, lng
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pickLang(pref) {
  const p = (pref || 'nl').toLowerCase();
  if (p.startsWith('nl')) return 'nl';
  if (p.startsWith('en')) return 'en';
  if (p.startsWith('pl')) return 'pl';
  if (p.startsWith('tr')) return 'tr';
  if (p.startsWith('ar')) return 'ar';
  return 'nl';
}

// Parse Google GViz JSON (remove wrapper, parse rows)
async function fetchSheetContent(sheetUrl) {
  const res = await fetch(sheetUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error('sheet_fetch_failed');
  const raw = await res.text();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const json = JSON.parse(raw.slice(start, end + 1));
  const cols = json.table.cols.map(c => c.label);
  const rows = json.table.rows.map(r => r.c ? r.c.map(c => (c && c.v) ?? '') : []);
  const data = rows.map(row => Object.fromEntries(cols.map((k, i) => [k, row[i]])));
  // Transform rows to the same structure as demoContent
  const byProject = {};
  for (const rec of data) {
    if (!rec.projectId) continue;
    if (!byProject[rec.projectId]) {
      byProject[rec.projectId] = {
        title: rec.projectTitle || rec.projectId,
        updated: rec.last_updated || new Date().toISOString().slice(0,10),
        contact: { name: rec.contact_name || '', phone: rec.contact_phone || '' },
        areas: []
      };
    }
    // Parse polygon WKT: POLYGON((lng lat, lng lat, ...))
    let polygon = [];
    if (rec.polygon_wkt && typeof rec.polygon_wkt === 'string') {
      const m = rec.polygon_wkt.match(/POLYGON\\(\\((.*)\\)\\)/i);
      if (m) {
        polygon = m[1].split(',').map(p => {
          const [lng, lat] = p.trim().split(/\\s+/).map(Number);
          return [lat, lng]; // store as [lat,lng]
        });
      }
    }
    byProject[rec.projectId].areas.push({
      id: rec.areaId,
      name: {
        nl: rec.areaName_nl || rec.areaId,
        en: rec.areaName_en || rec.areaId,
        pl: rec.areaName_pl || rec.areaId,
        tr: rec.areaName_tr || rec.areaId,
        ar: rec.areaName_ar || rec.areaId,
      },
      polygon,
      letter: {
        nl: rec.letter_nl || '',
        en: rec.letter_en || '',
        pl: rec.letter_pl || '',
        tr: rec.letter_tr || '',
        ar: rec.letter_ar || '',
      }
    });
  }
  return byProject;
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId') || 'molenstraat-soest';
  const urlLang = searchParams.get('lang');
  const lang = (urlLang || pickLang(req.headers.get('accept-language'))).toLowerCase();
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));
  const sheetParam = searchParams.get('sheet');

  let content = demoContent;

  try {
    const sheetUrl = sheetParam || (typeof process !== 'undefined' && process.env && process.env.SHEET_GVIZ_URL);
    if (sheetUrl) {
      const fromSheet = await fetchSheetContent(sheetUrl);
      if (fromSheet && Object.keys(fromSheet).length) content = fromSheet;
    }
  } catch (e) {
    // Silently fall back to demoContent
  }

  const project = content[projectId];
  if (!project) {
    return new Response(JSON.stringify({ error: 'project_not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  }

  let selectedAreaId = null;
  const areas = project.areas.map(a => {
    if (!selectedAreaId && !Number.isNaN(lat) && !Number.isNaN(lng) && a.polygon && a.polygon.length && inPolygon([lat,lng], a.polygon)) {
      selectedAreaId = a.id;
    }
    return {
      id: a.id,
      name: a.name[lang] || a.name['nl'],
      letter: a.letter[lang] || a.letter['nl']
    };
  });

  const body = {
    projectTitle: project.title,
    updated: project.updated,
    contactName: project.contact.name,
    contactPhone: project.contact.phone,
    areas,
    selectedAreaId
  };

  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
