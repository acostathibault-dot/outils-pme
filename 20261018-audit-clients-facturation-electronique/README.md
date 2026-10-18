# Audit clients facturation électronique

Détectez les SIREN manquants, invalides ou fermés et préparez votre base clients à la facturation électronique.

**Utiliser l'outil :** https://acostathibault-dot.github.io/outils-pme/20261018-audit-clients-facturation-electronique/

> Outil gratuit et 100 % local : vos fichiers sont lus par votre navigateur, rien n'est envoyé sur un serveur. Seuls les numéros SIREN (données publiques) sont envoyés aux API officielles de l'État pour les vérifications en ligne.

## Ce que fait l'outil

1. Analyse la liste des clients exportée depuis Pennylane
2. Interroge l'API Recherche d'entreprises pour vérifier le SIREN et l'état d'activité (actif / fermé)
3. Contrôle la présence des mentions obligatoires (adresse, code postal, N° TVA)
4. Génère le bilan de conformité et la liste exacte des fiches à corriger dans Pennylane

## L'automatiser

[automatisation-n8n.json](automatisation-n8n.json) : workflow n8n à importer (lecture de Pennylane, même calcul, email seulement s'il y a du nouveau). Un rappel d'agenda récurrent est aussi disponible sur la page de l'outil.

## Fichiers d'exemple

- [exemple-base_clients.csv](exemple-base_clients.csv) : Export de la base clients

# Guide d'utilisation : Audit clients facturation électronique

Bienvenue dans votre guide d'utilisation. Cette mini-application gratuite vous permet de détecter en quelques clics les SIREN manquants, invalides ou fermés dans votre base clients, afin de préparer sereinement votre entreprise à la facturation électronique. Vous gagnez ainsi environ 3 heures de travail par trimestre.

## Exporter vos données

Pour réaliser l'audit, vous devez exporter votre fichier clients depuis Pennylane.

1. Connectez-vous à votre compte Pennylane.
2. Rendez-vous dans la liste de vos clients (l'intitulé exact du menu peut varier selon votre version de Pennylane).
3. Utilisez le bouton d'export pour télécharger le fichier complet de vos clients.
4. Choisissez d'exporter le fichier au format **CSV** ou **Excel**. 

*Note : Les champs attendus dans votre fichier sont : Nom du client, SIREN, N° TVA Intracommunautaire, Adresse, Code postal, Ville et Pays.*

## Utiliser l'outil

L'utilisation de l'application est simple et rapide :

1. Cliquez sur le bouton **Essayer avec des données d'exemple** si vous souhaitez tester l'outil avant d'importer vos propres données.
2. Déposez votre fichier exporté depuis Pennylane dans la zone dédiée.
3. Vérifiez la correspondance des colonnes, qui est détectée automatiquement par l'application.
4. Ajustez vos réglages si nécessaire :
   * Ignorer les particuliers (B2C)
   * Exiger le N° de TVA pour les clients FR
   * Définir le seuil d'alerte du taux de non-conformité
5. Cliquez sur **Lancer l'analyse**.
6. Consultez les résultats et cliquez sur **Exporter en Excel** pour récupérer la liste exacte des fiches à corriger.

## Lire les résultats

L'application vous offre une vision claire et immédiate de la conformité de votre base clients :

* **Les indicateurs (KPIs) :**
  * **Taux de conformité global (%) :** Indique le pourcentage de clients prêts pour la facturation électronique (par exemple, 75 % sur les données d'exemple).
  * **Nombre total de clients analysés :** Le volume total de fiches traitées.
  * **Clients non conformes :** Le nombre de clients ayant un SIREN manquant, invalide ou une entreprise fermée.
  * **Adresses incomplètes :** Le nombre de fiches où il manque des informations de domiciliation.

* **Les alertes :**
  * **Rouge :** S'affiche si une entreprise est radiée ou fermée au Registre du Commerce, ou si le SIREN est invalide. Action : Mettre à jour la fiche ou cesser la facturation.
  * **Orange :** S'affiche si le SIREN est manquant sur un client B2B. Action : Demander le numéro SIREN au client.
  * **Jaune :** S'affiche si l'adresse ou le code postal est absent. Action : Compléter l'adresse postale.

* **Le tableau détaillé :** 
  Il présente ligne par ligne chaque client avec son statut INSEE (Actif ou Fermé), la validité de son SIREN, la complétude de l'adresse et l'action corrective recommandée à mener directement dans Pennylane.

* **Le graphique de répartition :** 
  Il visualise la répartition de votre portefeuille clients selon quatre catégories : Conforme, À corriger, Entreprise fermée et Incomplet.

* **Cas concret d'utilisation :** 
  Pour une PME de négoce de 150 clients professionnels, l'audit peut révéler 14 SIREN manquants, 3 sociétés fermées/liquidées (représentant 12 500 € d'encours) et 8 adresses incomplètes. Le taux de conformité initial passe par exemple de 83,3 % à 100 % après la correction des 25 fiches signalées.

## Confidentialité

Votre sécurité et la protection de vos données sont assurées :

* Vos fichiers sont lus directement par votre navigateur Internet et **rien n'est envoyé sur un serveur tiers**.
* Vos réglages personnalisés sont mémorisés uniquement sur votre propre ordinateur.
* Concernant les vérifications en ligne, **seuls les numéros SIREN** (qui sont des données publiques) sont envoyés aux API officielles de l'État (API Recherche d'entreprises) pour vérifier leur validité et l'état d'activité.

## Questions fréquentes

**1. Puis-je utiliser cet outil avec un autre logiciel que Pennylane ?**
L'outil est optimisé pour les exports de Pennylane. Si vous utilisez un autre logiciel, vous devez vous assurer que votre fichier Excel ou CSV contient les colonnes obligatoires correspondantes (Nom, SIREN, TVA, Adresse, Code postal, Ville, Pays).

**2. Que se passe-t-il si mon client est une entreprise étrangère ?**
L'API Recherche d'entreprises vérifie uniquement les entités immatriculées en France (possédant un SIREN à 9 chiffres). Les clients étrangers ne sont donc pas contrôlés via l'INSEE par cet outil.

**3. Comment fonctionne l'intégration automatique dans n8n ?**
Si vous utilisez la version automatique, n8n lit votre base clients dans Pennylane chaque mois. L'outil vous envoie un e-mail uniquement s'il y a du nouveau, c'est-à-dire si un client B2B a un SIREN invalide ou si une entreprise est fermée, afin de vous faire gagner du temps.

## Limites

L'API Recherche d'entreprises vérifie uniquement les entités immatriculées en France (SIREN à 9 chiffres). Les clients étrangers ne sont pas contrôlés via l'INSEE.

Outil créé par Thibault Acosta-Mendez.
