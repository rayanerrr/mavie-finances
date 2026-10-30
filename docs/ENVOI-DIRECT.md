# Envoi direct iPhone → Mac (Wi-Fi local) — contrat v1

But : un reçu scanné sur l'iPhone arrive et est analysé en ~5-15 s quand
l'iPhone et le Mac sont sur le même réseau. iCloud (`MaVie/A-traiter`) reste le
chemin de secours, inchangé.

## Découverte et jeton

Le Mac écrit dans `MaVie/config.json` (déjà lu par l'iPhone) un champ en plus :

```json
"direct": {
  "port": 47800,
  "token": "<64 caractères hex, généré une fois, gardé dans settings: directToken>",
  "hosts": ["Rayanes-MacBook-Pro.local", "192.168.1.23"]
}
```

- `hosts` : nom Bonjour `.local` du Mac (via `scutil --get LocalHostName` + `.local`,
  sinon `os.hostname()`), puis les IPv4 non internes de `os.networkInterfaces()`.
- Le champ est réécrit quand les adresses changent (au démarrage et à chaque
  écriture de config).
- Champ absent ⇒ l'iPhone n'essaie pas l'envoi direct.

## Écoute réseau (Mac)

- Le serveur Next reste lié à `127.0.0.1` (port aléatoire) : rien d'autre de
  l'app n'est exposé au réseau.
- Le processus Electron ouvre en plus un petit serveur HTTP sur `0.0.0.0:47800`
  (variable `MAVIE_DIRECT_PORT` pour changer) qui ne relaie QUE :
  - `GET  /api/inbox/direct` (ping)
  - `POST /api/inbox/direct` (envoi)
  vers le serveur Next local. Toute autre route ⇒ 404. Corps limité à 25 Mo.

## API

Toutes les requêtes : en-tête `Authorization: Bearer <token>`. Jeton absent ou
faux ⇒ `401 {"error":"unauthorized"}` (comparaison à temps constant).

### `GET /api/inbox/direct`
`200 {"ok":true,"householdName":...}`

### `POST /api/inbox/direct` — `Content-Type: application/json`

Reçu :
```json
{"kind":"receipt","id":"2026-10-30_07-55-30_7D9D","ext":"jpg",
 "dataBase64":"...","companion":{"person":null,"accountName":null,"note":null,"capturedAt":"2026-10-30T11:55:30Z"}}
```
`ext` ∈ `jpg|pdf`. Le Mac fait exactement le même traitement qu'un fichier
iCloud (déduplication par sha256 `inboxKey`, `origin: "icloud"` conservé ou
`"phone"`, analyse Gemini **attendue avant de répondre**), puis répond :
```json
{"status":"analyzed|error|...","receiptId":12,"store":"Maxi","total":42.1,"itemsCount":7,"error":null,"processedAt":"..."}
```
(même forme que `Traites/<id>.result.json`). Le Mac écrit aussi
`Traites/<id>.result.json` pour que l'historique reste cohérent.

Dépense manuelle :
```json
{"kind":"expense","id":"2026-10-30_07-56-30_19AF","expense":{ ...même JSON que <id>.expense.json... }}
```
Réponse : `{"status":"added","expenseId":2,"description":"...","amount":30,"category":"..."}`
(même forme que le `.result.json` actuel). Idempotent sur `id` : un 2ᵉ envoi
du même `id` renvoie le résultat déjà enregistré sans recréer la dépense.

Erreurs de validation ⇒ `400 {"error":"message en français"}`.

## iPhone

1. Photo : redimensionnée à 2000 px max (côté long), JPEG qualité 0,7
   (aussi pour le chemin iCloud). Multi-pages : PDF avec pages redimensionnées.
2. Si `config.direct` existe : essaie chaque hôte (`http://<host>:<port>`),
   timeout de connexion ~2 s, timeout total 60 s pour l'envoi d'un reçu.
   Succès (2xx) ⇒ résultat enregistré directement dans l'historique, rien
   écrit dans iCloud.
3. Échec réseau / timeout / 5xx ⇒ chemin iCloud actuel (puis file d'attente).
   401 ⇒ idem, mais relire `config.json` (jeton peut-être changé).
4. Info.plist : `NSAppTransportSecurity › NSAllowsLocalNetworking = true`,
   `NSLocalNetworkUsageDescription`.

## Mac : traitement iCloud plus rapide

Fichiers venant du téléphone (média accompagné de son `<id>.json`) : traités
dès qu'ils sont vus, sans attendre 2 scans de taille stable. Les autres
fichiers gardent l'attente de stabilité.
