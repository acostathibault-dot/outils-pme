# Surveillance BODACC & Procédures Collectives Clients

Détectez instantanément les clients en procédure collective (redressement, liquidation) pour déclarer vos créances avant le délai légal de 2 mois.

**Utiliser l'outil :** https://acostathibault-dot.github.io/outils-pme/20261018-surveillance-bodacc-procedures-collectives/

> Outil gratuit et 100 % local : vos fichiers sont lus par votre navigateur, rien n'est envoyé sur un serveur. Seuls les numéros SIREN (données publiques) sont envoyés aux API officielles de l'État pour les vérifications en ligne.

## Ce que fait l'outil

1. Analyse la liste de vos clients et le détail des factures non soldées
2. Interroge en temps réel les API officielles BODACC et Recherche d'entreprises (INSEE)
3. Identifie les procédures collectives, calcule le compte à rebours de déclaration (60 jours) et isole le montant total des créances à risque

## Fichiers d'exemple

- [exemple-clients.csv](exemple-clients.csv) : Export de la base clients
- [exemple-factures_non_soldees.csv](exemple-factures_non_soldees.csv) : Export des factures clients non soldées

# Guide d'utilisation : Surveillance BODACC & Procédures Collectives Clients

## Introduction

En tant que dirigeant de PME, vous n'avez pas de temps à perdre pour surveiller la santé financière de vos clients. Cette mini-application gratuite détecte instantanément vos clients en procédure collective (redressement, liquidation). 

Vous gagnez environ 2 heures par mois et évitez la perte définitive de vos créances en agissant avant le délai légal de 2 mois.

---

## Exporter vos données

Pour lancer l'analyse, vous avez besoin de deux fichiers exportés depuis votre logiciel (par exemple, Pennylane). 

*Note : selon votre version du logiciel, l'intitulé exact des menus peut légèrement varier.*

### 1. L'export de la base clients
* Depuis le menu de gestion des tiers ou de vos clients, utilisez le bouton d'export pour télécharger la liste de vos clients.
* **Format conseillé :** CSV ou Excel.
* **Champs obligatoires :** Nom du client, SIREN ou SIRET, Code client.

### 2. L'export des factures clients non soldées
* Depuis la liste de vos factures clients, filtrez sur les factures non soldées ou en retard.
* Utilisez le bouton d'export.
* **Format conseillé :** CSV ou Excel.
* **Champs obligatoires :** Nom du client, SIREN, Numéro de facture, Date de facture, Date d'échéance, Restant dû (TTC).

---

## Utiliser l'outil

1. Ouvrez l'application et cliquez sur le bouton **Essayer avec des données d'exemple** si vous souhaitez tester immédiatement l'outil sans vos fichiers.
2. Déposez vos deux fichiers (base clients et factures non soldées) dans les zones prévues à cet effet.
3. Vérifiez la correspondance des colonnes (l'outil les détecte automatiquement).
4. Ajustez vos **Réglages** si nécessaire :
   * Le délai légal de déclaration (en jours).
   * Le seuil d'urgence extrême (en jours restants).
   * L'option pour alerter aussi sur les entreprises radiées ou fermées.
5. Cliquez sur **Lancer l'analyse**.
6. Une fois les résultats affichés, cliquez sur **Exporter en Excel** pour conserver un double de travail.

---

## Lire les résultats

L'écran de résultats vous offre une vision claire et immédiate des risques :

### Les indicateurs clés (KPI)
* **Créances exposées en procédure collective (€ TTC) :** Le montant total d'argent dû par des clients officiellement en difficulté.
* **Nombre de clients sous procédure collective :** Le volume d'entreprises concernées.
* **Nombre de procédures à déclarer d'urgence (< 15 jours restants) :** Les dossiers brûlants qui nécessitent une action immédiate.
* **Créances sur entreprises radiées (€ TTC) :** Le montant bloqué auprès de sociétés fermées.

### Les alertes à traiter
* **Alerte Rouge (Critique) :** Pour chaque client en redressement ou liquidation, un compte à rebours indique le nombre de jours J-X avant la prescription. Un lien direct vous permet d'accéder à l'annonce officielle sur le BODACC.
* **Alerte Orange :** Concerne les sociétés fermées ou radiées à l'INSEE, sans publication BODACC directe.

### Le tableau et le graphique
* **Répertoire exhaustif des clients à risque :** Un tableau détaillé reprenant le nom du client, son SIREN, son statut INSEE/BODACC, le type de procédure (Sauvegarde, Redressement, Liquidation, Radiation), la date d'ouverture, la date limite de déclaration, les jours restants, le total restant dû TTC et le nombre de factures impactées.
* **Graphique de répartition :** Visualisez le solde client non soldé selon l'état de santé juridique (Sain, Sauvegarde, Redressement, Liquidation, Radié).

**Action concrète à mener :** Dès qu'une Alerte Rouge apparaît, rédigez et envoyez immédiatement votre déclaration de créance au mandataire désigné avant la date limite.

---

## Cas concret

Une PME de prestations de services dispose de 140 000 € d'en-cours clients non soldés répartis sur 62 clients. L'outil croise les SIREN avec le BODACC et l'INSEE :

* **Client A** (Redressement Judiciaire publié au BODACC il y a 20 jours) doit 12 500 € TTC. Il reste 40 jours pour déclarer la créance au mandataire.
* **Client B** (Liquidation Judiciaire publiée il y a 52 jours) doit 4 800 € TTC. C'est une **urgence absolue** : il ne reste que 8 jours pour adresser la déclaration de créance.

*Sans cet outil, le dirigeant dépassait le délai des 60 jours pour le Client B et perdait tout recours légal.*

---

## Confidentialité

* **Sécurité des données :** Vos fichiers sont lus directement par votre navigateur web. Rien n'est jamais envoyé sur un serveur distant.
* **Réglages :** Vos préférences de réglages sont mémorisées uniquement sur votre propre ordinateur.
* **Vérifications en ligne :** Seuls les numéros SIREN (qui sont des données publiques) sont interrogés auprès des API officielles de l'État (BODACC et INSEE) pour vérifier la santé des entreprises.

---

## Questions fréquentes

### 1. Que se passe-t-il si un client n'a pas de numéro SIREN dans mon fichier ?
L'outil repose sur la présence de numéros SIREN valides dans vos données. Si le numéro est absent ou erroné, l'entreprise ne pourra pas être croisée avec les fichiers officiels du BODACC et de l'INSEE.

### 2. Pourquoi vois-je un décalage de quelques jours avec le jugement ?
L'actualisation officielle du BODACC comporte un délai légal de publication de 24h à 72h après le prononcé du jugement par le tribunal. 

### 3. Que dois-je faire une fois l'alerte détectée ?
Vous devez télécharger ou consulter l'avis BODACC, récupérer les coordonnées du mandataire judiciaire nommé, et lui déclarer officiellement votre créance par courrier recommandé avec accusé de réception (ou via le portail dédié) avant la date limite indiquée par l'outil.

## Limites

Repose sur la présence de numéros SIREN valides dans vos données Pennylane. L'actualisation du BODACC comporte un délai légal de publication de 24h à 72h après le jugement.

Outil créé par Thibault Acosta-Mendez.
