# MaVie iPhone

L’app dépose les reçus dans le dossier iCloud Drive `MaVie/A-traiter`. Elle ne demande aucune capability iCloud payante : le dossier est choisi une seule fois dans l’app et un bookmark sécurisé est conservé localement.

## Construire l’IPA

Sur un Mac avec Xcode et XcodeGen :

```sh
brew install xcodegen
./build-ipa.sh
./build-ipa.sh --copy-to ~/Desktop
```

La build est non signée (`CODE_SIGNING_ALLOWED=NO`).

## Installer sur un iPhone

1. **Xcode + Apple ID gratuit** : ouvre le projet généré, sélectionne ton iPhone, choisis ton Apple ID dans Signing & Capabilities et lance l’app. Le certificat gratuit expire après 7 jours.
2. **Sideloadly** : donne-lui `MaVie.ipa`, connecte ton Apple ID et suis l’assistant. Avec un compte gratuit, l’installation doit généralement être renouvelée tous les 7 jours.
3. **AltStore** : installe AltStore sur l’iPhone et AltServer sur le Mac, puis ouvre/import l’IPA dans AltStore. Le renouvellement se fait depuis AltServer, en principe tous les 7 jours avec un compte gratuit.

Dans tous les cas, active le **Mode développeur** dans Réglages › Confidentialité et sécurité si iOS le demande, puis redémarre l’iPhone. La première ouverture peut aussi demander de faire confiance au profil développeur.
