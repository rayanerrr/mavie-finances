# MaVie · Finances foyer

App locale (Mac) — un seul budget partagé. UI type mockup MaVie, OCR via Cursor.

## Démarrer

```bash
npm install
npm run db:seed
npm run db:demo   # optionnel : 6 mois de données de démonstration
npm run dev
```

Repartir de zéro :

```bash
rm -f data/finances.db data/finances.db-wal data/finances.db-shm
find data/receipts -type f ! -name .gitkeep -delete
npm run db:seed
```

Import en lot : `npm run db:import -- fichier.json` (tableau d’objets `{date, amount, description, store, person, category, subcategory}`).

Ouvre [http://localhost:3000](http://localhost:3000).

## Ajouter un reçu (OCR Cursor)

1. Dans **Ajouter un achat**, dépose une photo/PDF → statut `pending`.
2. Dans Cursor : *« analyse le reçu #ID »* (l’agent lit le fichier et appelle `POST /api/receipts/ID/analyze`).
3. Dans MaVie : vérifie les items → **Confirmer l’import**.

### Analyze (Cursor)

```bash
curl -X POST http://localhost:3000/api/receipts/1/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "store":"Maxi",
    "items":[
      {"description":"Boeuf haché 500g","amount":9.99,"category":"Alimentation","subcategory":"Viande"},
      {"description":"Poitrine de poulet","amount":12.45,"category":"Alimentation","subcategory":"Poulet"}
    ]
  }'
```
