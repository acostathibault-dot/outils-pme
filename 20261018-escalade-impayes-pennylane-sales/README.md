# Escalade Automatisée des Impayés : De la Relance Pennylane à l'Appel Commercial

Transformez vos factures en souffrance en actions commerciales prioritaires en alertant automatiquement le bon commercial dès que les relances Pennylane échouent.

**Page de présentation :** https://acostathibault-dot.github.io/outils-pme/20261018-escalade-impayes-pennylane-sales/

# Escalade Automatisée des Impayés : De la Relance Pennylane à l'Appel Commercial

## À quoi ça sert
Cette automatisation est conçue pour les dirigeants et responsables financiers qui souhaitent réduire leur DSO (délai de paiement) sans alourdir la charge de travail de l'équipe comptable. 

Lorsqu'une facture reste impayée malgré les relances automatiques de Pennylane, le script prend le relais :
1. **Il identifie** les factures dépassant un certain montant et un certain délai de retard.
2. **Il alerte** personnellement le commercial en charge du client par email.
3. **Il crée une tâche** de suivi dans un Google Sheet partagé.
4. **Il met à jour** automatiquement le statut dès que le client a payé.

**Temps gagné estimé :** 3 à 5 heures par mois et une réactivité accrue sur les litiges clients.

---

## Prérequis
*   Un compte **Pennylane** avec un accès Administrateur (pour générer une clé API).
*   Un compte **Google** (Google Sheets et Gmail).
*   Une liste de vos clients avec le nom ou l'email du commercial associé (soit dans Pennylane via des tags, soit dans le tableau de mapping).

---

## Installation pas à pas

1.  **Créer le support :** Créez une nouvelle feuille **Google Sheets** vide.
2.  **Ouvrir l'éditeur :** Allez dans le menu **Extensions** > **Apps Script**.
3.  **Copier le code :** Supprimez le code existant dans l'éditeur et collez le code fourni dans le fichier `Code.gs`.
4.  **Enregistrer :** Cliquez sur l'icône de disquette (Enregistrer) et nommez le projet "Escalade Impayés Pennylane".
5.  **Initialiser l'interface :** Fermez l'onglet Apps Script et **actualisez (F5)** votre page Google Sheets. Un nouveau menu nommé **🚀 Pennylane Automation** apparaît en haut à droite.
6.  **Préparer les feuilles :** Cliquez sur **🚀 Pennylane Automation** > **⚙️ Configurer les feuilles**.
7.  **Autoriser le script :** Une fenêtre "Autorisation requise" s'ouvre. 
    *   Cliquez sur **Continuer**.
    *   Choisissez votre compte Google.
    *   Un écran d'avertissement "Google n'a pas validé cette application" s'affiche (c'est normal pour un script interne). Cliquez sur **Paramètres avancés** en bas à gauche, puis sur **Accéder à Escalade Impayés Pennylane (non sécurisé)**.
    *   Cliquez sur **Autoriser**.
8.  **Vérification :** Le script va créer automatiquement trois onglets : *Suivi des Impayés*, *Mapping Commerciaux* et *Journal d'Exécution*.

---

## Configuration

### 1. Paramètres du script
Retournez dans l'éditeur **Apps Script** pour modifier les valeurs dans le bloc `CONFIG` au début du code :

| Paramètre | Rôle | Valeur conseillée |
| :--- | :--- | :--- |
| `SEUIL_MONTANT_MIN` | Montant (en €) à partir duquel on alerte le commercial. | `500` |
| `JOURS_RETARD_CRITIQUE` | Nombre de jours de retard avant l'escalade. | `15` |
| `DRY_RUN` | Mode test (si `true`, aucun email n'est envoyé). | `true` (pour commencer) |
| `EMAIL_ADMIN_COPIE` | Email du dirigeant ou DAF pour supervision. | Votre email |

### 2. Clé API Pennylane
1.  Connectez-vous à **Pennylane**.
2.  Allez dans **Paramètres** > **Intégrations** > **API**.
3.  Générez une nouvelle clé API (Token) avec les droits de lecture sur les factures de vente.
4.  Dans votre Google Sheet, allez dans le menu **🚀 Pennylane Automation** > **🔑 Enregistrer le Token API** et collez votre clé.

### 3. Mapping des commerciaux
Dans l'onglet **Mapping Commerciaux**, listez le nom exact de vos clients (tel qu'écrit dans Pennylane) et l'adresse email du commercial responsable. 
*Note : Vous pouvez aussi utiliser des tags directement dans Pennylane (ex: "Commercial: marc@entreprise.fr").*

---

## Tester sans risque
1.  Assurez-vous que `DRY_RUN` est bien sur `true` dans le code.
2.  Allez dans le menu **🚀 Pennylane Automation** > **▶️ Lancer l'escalade maintenant**.
3.  Consultez l'onglet **Journal d'Exécution**. Le script affichera "Email simulé vers..." pour chaque facture détectée, sans réellement envoyer d'emails ni modifier le tableau de suivi.

---

## Mettre en service
Une fois que les tests dans le journal sont concluants :
1.  Dans le code, passez `DRY_RUN` à `false`.
2.  Allez dans le menu **🚀 Pennylane Automation** > **⏰ Activer le déclencheur quotidien**.
3.  Le script s'exécutera désormais de manière totalement autonome chaque matin à 8h30.

---

## En cas de problème

| Problème | Solution |
| :--- | :--- |
| **Le menu Pennylane n'apparaît pas** | Actualisez la page de votre navigateur (F5). |
| **Erreur "Token API manquant"** | Relancez l'étape "Enregistrer le Token API" via le menu. |
| **Le commercial ne reçoit rien** | Vérifiez que son email est correct dans l'onglet "Mapping" ou dans les tags Pennylane. Vérifiez aussi le dossier Spams. |
| **Erreur d'autorisation** | Relancez le menu "Configurer les feuilles" pour déclencher à nouveau la fenêtre de validation Google. |
| **Doublons d'alertes** | Le script vérifie l'ID de la facture dans l'onglet "Suivi". Ne supprimez pas les lignes de cet onglet manuellement. |

---

## Sécurité et limites
*   **Confidentialité :** Les données transitent uniquement entre Pennylane et votre compte Google. Aucune donnée n'est envoyée à des serveurs tiers.
*   **RGPD :** Assurez-vous que l'envoi d'emails internes contenant des noms de clients respecte votre politique de confidentialité.
*   **Limites :** L'automatisation ne détecte pas les litiges oraux. Si un client vous appelle pour contester une facture, marquez-la comme "Litige" dans Pennylane pour éviter l'escalade.
*   **Rigueur :** Le succès de l'outil dépend de la mise à jour régulière des commerciaux assignés aux clients.
