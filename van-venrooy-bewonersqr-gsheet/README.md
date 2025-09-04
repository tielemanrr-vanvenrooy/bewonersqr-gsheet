# Van Venrooy – Bewoners QR (Google Sheets gekoppeld)

Dit voorbeeld haalt de content uit een **Google Sheet** via de GViz JSON endpoint.

## Sheet structuur (tab 'content')
Kolommen: 
projectId, projectTitle, areaId, areaName_nl, areaName_en, areaName_pl, areaName_tr, areaName_ar, polygon_wkt, letter_nl, letter_en, letter_pl, letter_tr, letter_ar, contact_name, contact_phone, last_updated

**polygon_wkt**: `POLYGON((lng lat, lng lat, ...))` – let op volgorde: eerst **lng**, dan **lat**.

## Gebruik
- Lokale demo zonder Sheet: open `/?p=molenstraat-soest` (gebruikt demoContent).
- Met Sheet: stel omgevingsvariabele `SHEET_GVIZ_URL` in óf geef `?sheet=<GVIZ_URL>` mee.
  - Voorbeeld: `https://<project>.vercel.app/?p=molenstraat-soest&sheet=https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:json&sheet=content`

## Deploy
1. Nieuwe Vercel deploy (upload ZIP of koppel GitHub).
2. (Aanbevolen) Zet **Environment Variable** `SHEET_GVIZ_URL` met de GViz-URL van je Sheet.
3. Open de site en test met `?p=molenstraat-soest`.

Laatste update: 2025-09-04
