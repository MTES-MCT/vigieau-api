# API Sécheresse

API permettent de retourner les restrictions en vigueur en lien avec la politique de préservation de la ressource en eau.

Elle se base sur les données de VigiEau Admin.

## Pré-requis

- Node.js 18.12 ou supérieur
- Yarn

## Utilisation

```bash
# Installation des dépendances
yarn

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## API

Documentation OpenAPI disponible ici : https://api.vigieau.beta.gouv.fr/swagger/

Ce service expose plusieurs points d’entrée d’API dont la liste suivante est publiquement accessible et stabilisée :

### Récupérer la réglementation applicable à une localisation

La localisation peut se faire à la coordonnée géographique ou au code commune (INSEE).

Pour obtenir des coordonnées à partir d’une adresse ou d’un nom de lieu-dit ou d’une commune, nous recommandons d’utiliser l’[API Adresse](https://adresse.data.gouv.fr/api-doc/adresse).

Pour recherche une commune par auto-complétion ou à partir d’un code postal, nous recommandons d’utiliser l’[API Géo Découpage administratif](https://geo.api.gouv.fr/decoupage-administratif/communes).

`GET /zones`

#### Paramètres de la requête

| Nom du paramètre | Description                                                                                                                                                                                |
|------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `lon`, `lat`     | Coordonnées WGS-84 du lieu dont on veut récupérer la réglementation applicable (obligatoire si pas de commune)                                                                             |
| `commune`        | Code INSEE de la commune de rattachement (obligatoire si pas de lon / lat)                                                                                                                 |
| `profil`         | Catégorie d’usager à prendre en compte pour la liste des restrictions en vigueur (`particulier`, `exploitation`, `collectivite`, `entreprise`). Si non renseigné, renvoie tout les usages. |
| `zoneType`       | Type d'eau (classé par zone) sur lequel s'applique les restrictions (`SUP`, `SOU`, `AEP`). Si non renseigné, renvoie toutes les zones.                                                     |

#### Exemple de requête

https://api.vigieau.gouv.fr/api/zones?lon=3.16265&lat=43.37829&commune=34148&profil=exploitation&zoneType=SUP

#### Exemple de réponse

```json
{
  "id": 2418,
  "code": "76_34_0011",
  "nom": "Bassin versant de l'Orb à l'aval de la confluence avec le Jaur jusqu'à l'embouchure hors axe Orb soutenu",
  "type": "SUP",
  "niveauGravite": "alerte_renforcee",
  "departement": "34",
  "arrete": {
    "id": 34668,
    "dateDebutValidite": "2024-04-16",
    "dateFinValidite": "2024-04-30",
    "cheminFichier": "https://regleau.s3.gra.perf.cloud.ovh.net/arrete-restriction/34668/AP_DDTM34-2024-04-14827_restriction_eau_secheresse_16-04-2024_AvecAnnexe.pdf",
    "cheminFichierArreteCadre": "https://regleau.s3.gra.perf.cloud.ovh.net/arrete-cadre/30262/ACD2023_24_Mai_2023_AvecAnnexes.pdf"
  },
  "usages": [
    {
      "nom": "Remplissage / vidange des plans d'eau",
      "thematique": "Remplir ou vidanger",
      "description": "Interdit sauf pour les usages commerciaux après accord du service de police de l’eau.",
      "concerneParticulier": true,
      "concerneEntreprise": true,
      "concerneCollectivite": true,
      "concerneExploitation": true
    },
    {
      "nom": "Travaux en cours d’eau",
      "thematique": "Travaux et activités en cours d'eau",
      "description": "Report des travaux sauf après déclaration au service de police de l’eau pour les cas suivants :\r\n- situation d’assec total;\r\n- pour des raisons de sécurité publique.\r\n\r\nLa réalisation de seuils provisoires est interdite sauf alimentation en eau potable.",
      "concerneParticulier": true,
      "concerneEntreprise": true,
      "concerneCollectivite": true,
      "concerneExploitation": true
    },
    {
      "nom": "ICPE soumises à un APC relatif à la sécheresse",
      "thematique": "ICPE",
      "description": "Application des dispositions spécifiques prévues dans leur arrêté préfectoral ou dans un arrêté ministériel.",
      "concerneParticulier": false,
      "concerneEntreprise": true,
      "concerneCollectivite": true,
      "concerneExploitation": true
    },
    {
      "nom": "Usage ICPE non soumis à un APC relatif à la sécheresse",
      "thematique": "ICPE",
      "description": "Voir détails dans l'arrêté préfectoral.",
      "concerneParticulier": false,
      "concerneEntreprise": true,
      "concerneCollectivite": true,
      "concerneExploitation": true
    },
    {
      "nom": "Irrigation des cultures par système d’irrigation localisée",
      "thematique": "Irriguer",
      "description": "Voir détails dans l'arrêté préfectoral.",
      "concerneParticulier": false,
      "concerneEntreprise": false,
      "concerneCollectivite": false,
      "concerneExploitation": true
    },
    {
      "nom": "Irrigation par aspersion des cultures",
      "thematique": "Irriguer",
      "description": "Voir détails dans l'arrêté préfectoral.",
      "concerneParticulier": false,
      "concerneEntreprise": false,
      "concerneCollectivite": false,
      "concerneExploitation": true
    },
    {
      "nom": "Nettoyage des façades, toitures, trottoirs et autres surfaces imperméabilisées",
      "thematique": "Nettoyer",
      "description": "Interdit sauf impératif sanitaire ou sécuritaire, et réalisé par une collectivité ou une entreprise de\r\nnettoyage professionnel.",
      "concerneParticulier": true,
      "concerneEntreprise": true,
      "concerneCollectivite": true,
      "concerneExploitation": true
    }
  ]
}
```

#### Erreurs possibles

* `400 La paramètre commune est requis`
* `400 Commune invalide`
* `400 Coordonnées non valides`
* `404 Les données pour ce département ne sont pas disponibles` : Le département n’est pas couvert par VigiEau (certains territoires ultramarins)
* `404 Aucune zone d’alerte en vigueur pour la requête donnée` : votre préfecture n’a pas défini de zone d’alerte pour cette localisation ou alors vous êtes en limite technique
* `409 Veuillez renseigner une adresse pour préciser la réglementation applicable` : la commune est traversée par plusieurs zones d’alertes, vous devez préciser la localisation avec `lon`/`lat`
* `500 Un problème avec les données ne permet pas de répondre à votre demande` : Notre algorithme n’a pas réussi à déterminer la zone d’alerte correspondant à votre situation.
