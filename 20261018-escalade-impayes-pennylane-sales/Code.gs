/**
 * CONFIGURATION DE L'AUTOMATISATION
 * Modifiez les valeurs ci-dessous pour adapter le script à votre entreprise.
 */
const CONFIG = {
  // --- Paramètres Métier ---
  SEUIL_MONTANT_MIN: 500, // Montant minimum de la facture (EUR) pour déclencher l'alerte
  JOURS_RETARD_CRITIQUE: 15, // Nombre de jours après l'échéance pour escalader au commercial
  DRY_RUN: true, // true = simule l'envoi d'emails et les logs, false = exécution réelle
  EMAIL_ADMIN_COPIE: "direction@votre-pme.fr", // Email en copie pour suivi DAF/Dirigeant
  
  // --- Noms des Feuilles Google Sheets ---
  SHEET_SUIVI: "Suivi des Impayés",
  SHEET_MAPPING: "Mapping Commerciaux",
  SHEET_JOURNAL: "Journal d'Exécution",
  
  // --- Configuration API Pennylane ---
  PENNYLANE_BASE_URL: "https://app.pennylane.com/api/external/v2",
  CHAMPS_FACTURE: {
    ID: "id",
    NUMERO: "invoice_number",
    DATE_ECHEANCE: "deadline",
    MONTANT_TOTAL: "amount",
    MONTANT_RESTANT: "remaining_amount",
    STATUT: "status",
    CLIENT: "customer", // Objet contenant name, id, tags
    LIEN_PENNYLANE: "pennylane_url" // URL directe si disponible ou générée
  },

  // --- Textes des Emails ---
  EMAIL_SUJET: "⚠️ ACTION REQUISE : Retard de paiement critique - [CLIENT]",
  EMAIL_CORPS_HTML: `
    <p>Bonjour [PRENOM_COMMERCIAL],</p>
    <p>La facture n°<strong>[NUMERO_FACTURE]</strong> du client <strong>[CLIENT]</strong> est en retard de <strong>[JOURS] jours</strong>.</p>
    <p>Malgré les relances automatiques de Pennylane, le montant de <strong>[MONTANT] €</strong> n'a toujours pas été réglé.</p>
    <p><strong>Action requise :</strong> Merci de contacter le client pour identifier un éventuel litige et obtenir une promesse de règlement.</p>
    <p>👉 <a href="[LIEN_FACTURE]">Consulter la facture sur Pennylane</a></p>
    <br>
    <p><i>Ceci est une alerte automatisée du service comptable.</i></p>
  `
};

/**
 * FONCTION PRINCIPALE : Exécutée chaque matin
 */
function executerEscaladeImpayes() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return; // Évite les exécutions simultanées

  try {
    logAction("DEBUT", "Lancement du script d'escalade des impayés");
    
    const token = PropertiesService.getScriptProperties().getProperty('PENNYLANE_TOKEN');
    if (!token) throw new Error("Token API Pennylane manquant. Utilisez le menu 'Configuration' pour l'enregistrer.");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetSuivi = ss.getSheetByName(CONFIG.SHEET_SUIVI);
    const mappingCommerciaux = getMappingCommerciaux(ss);

    // 1. Récupération des factures en retard via API Pennylane
    // Filtre : statut = overdue
    const filtres = JSON.stringify([{ field: "status", operator: "eq", value: "overdue" }]);
    const factures = fetchPennylaneData("customer_invoices", filtres);
    
    logAction("INFO", `${factures.length} factures en retard récupérées.`);

    let alertesEnvoyees = 0;
    let montantsParCommercial = {};

    // 2. Traitement de chaque facture
    factures.forEach(facture => {
      const montant = parseFloat(facture[CONFIG.CHAMPS_FACTURE.MONTANT_RESTANT]);
      const dateEcheance = new Date(facture[CONFIG.CHAMPS_FACTURE.DATE_ECHEANCE]);
      const joursRetard = Math.floor((new Date() - dateEcheance) / (1000 * 60 * 60 * 24));
      const clientNom = facture[CONFIG.CHAMPS_FACTURE.CLIENT].name;
      const factureId = facture[CONFIG.CHAMPS_FACTURE.ID];

      // Critères de filtrage
      if (montant >= CONFIG.SEUIL_MONTANT_MIN && joursRetard >= CONFIG.JOURS_RETARD_CRITIQUE) {
        
        // Vérifier si déjà traité (Idempotence)
        if (estDejaTraite(sheetSuivi, factureId)) {
          // Mise à jour du statut si nécessaire (ex: si payée entre temps, mais ici on traite les overdue)
          return;
        }

        // 3. Identification du commercial
        const emailCommercial = identifierCommercial(facture, mappingCommerciaux);
        
        if (emailCommercial) {
          // 4. Envoi de l'alerte
          envoyerAlerteCommercial(facture, emailCommercial, joursRetard);
          
          // 5. Ajout au tableau de suivi
          ajouterLigneSuivi(sheetSuivi, facture, emailCommercial, joursRetard);
          
          // 6. Accumulation pour rapport
          montantsParCommercial[emailCommercial] = (montantsParCommercial[emailCommercial] || 0) + montant;
          alertesEnvoyees++;
        } else {
          logAction("AVERTISSEMENT", `Aucun commercial trouvé pour le client ${clientNom}`);
        }
      }
    });

    // 7. Mise à jour des factures payées dans le suivi
    synchroniserStatutsPayes(sheetSuivi, factures);

    logAction("FIN", `Traitement terminé. ${alertesEnvoyees} alertes générées.`);

  } catch (e) {
    logAction("ERREUR", e.toString());
    MailApp.sendEmail(CONFIG.EMAIL_ADMIN_COPIE, "Erreur Script Escalade Pennylane", e.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * GESTION API PENNYLANE AVEC PAGINATION
 */
function fetchPennylaneData(resource, filterJson) {
  const token = PropertiesService.getScriptProperties().getProperty('PENNYLANE_TOKEN');
  let allData = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    let url = `${CONFIG.PENNYLANE_BASE_URL}/${resource}?filter=${encodeURIComponent(filterJson)}`;
    if (cursor) url += `&cursor=${cursor}`;

    const options = {
      method: "get",
      headers: { "Authorization": `Bearer ${token}` },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();

    if (code === 429) {
      Utilities.sleep(2000);
      continue;
    }
    if (code !== 200) throw new Error(`Erreur API Pennylane (${code}): ${response.getContentText()}`);

    const json = JSON.parse(response.getContentText());
    const items = json.data || json.items || [];
    allData = allData.concat(items);

    cursor = json.next_cursor;
    hasNextPage = !!cursor;
  }
  return allData;
}

/**
 * IDENTIFICATION DU COMMERCIAL
 * Priorité 1 : Mapping dans Google Sheet
 * Priorité 2 : Tag "Commercial: Nom" ou "Sales: Email" dans Pennylane
 */
function identifierCommercial(facture, mapping) {
  const client = facture[CONFIG.CHAMPS_FACTURE.CLIENT];
  const clientNom = client.name;
  
  // Recherche dans le mapping Sheet
  if (mapping[clientNom]) return mapping[clientNom];

  // Recherche dans les tags Pennylane
  const tags = client.tags || [];
  for (let tag of tags) {
    if (tag.toLowerCase().startsWith("commercial:") || tag.toLowerCase().startsWith("sales:")) {
      const email = tag.split(":")[1].trim();
      if (email.includes("@")) return email;
    }
  }
  return null;
}

/**
 * ENVOI DE L'EMAIL VIA GMAIL
 */
function envoyerAlerteCommercial(facture, emailCommercial, jours) {
  const clientNom = facture[CONFIG.CHAMPS_FACTURE.CLIENT].name;
  const montant = facture[CONFIG.CHAMPS_FACTURE.MONTANT_RESTANT];
  const numero = facture[CONFIG.CHAMPS_FACTURE.NUMERO];
  const lien = `https://app.pennylane.com/customer_invoices/${facture[CONFIG.CHAMPS_FACTURE.ID]}`;

  const sujet = CONFIG.EMAIL_SUJET.replace("[CLIENT]", clientNom);
  const corpsHtml = CONFIG.EMAIL_CORPS_HTML
    .replace("[PRENOM_COMMERCIAL]", emailCommercial.split('@')[0])
    .replace("[NUMERO_FACTURE]", numero)
    .replace("[CLIENT]", clientNom)
    .replace("[JOURS]", jours)
    .replace("[MONTANT]", montant)
    .replace("[LIEN_FACTURE]", lien);

  if (CONFIG.DRY_RUN) {
    logAction("DRY_RUN", `Email simulé vers ${emailCommercial} pour ${clientNom} (${montant}€)`);
  } else {
    GmailApp.sendEmail(emailCommercial, sujet, "", {
      htmlBody: corpsHtml,
      cc: CONFIG.EMAIL_ADMIN_COPIE,
      name: "Service Comptabilité"
    });
  }
}

/**
 * GESTION DU GOOGLE SHEET
 */
function estDejaTraite(sheet, factureId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === factureId) return true;
  }
  return false;
}

function ajouterLigneSuivi(sheet, facture, email, jours) {
  if (CONFIG.DRY_RUN) return;
  sheet.appendRow([
    facture[CONFIG.CHAMPS_FACTURE.ID],
    new Date(),
    facture[CONFIG.CHAMPS_FACTURE.CLIENT].name,
    facture[CONFIG.CHAMPS_FACTURE.NUMERO],
    facture[CONFIG.CHAMPS_FACTURE.MONTANT_RESTANT],
    jours,
    email,
    "À appeler",
    "" // Notes
  ]);
}

function synchroniserStatutsPayes(sheet, facturesOverdue) {
  if (CONFIG.DRY_RUN) return;
  const data = sheet.getDataRange().getValues();
  const idsOverdue = facturesOverdue.map(f => f.id);

  for (let i = 1; i < data.length; i++) {
    const idFactureSheet = data[i][0];
    const statutActuel = data[i][7];

    if (statutActuel === "À appeler" && !idsOverdue.includes(idFactureSheet)) {
      // Si elle n'est plus dans la liste "overdue", on vérifie son statut réel
      sheet.getRange(i + 1, 8).setValue("Payée / Régularisée");
      sheet.getRange(i + 1, 8).setBackground("#d9ead3");
    }
  }
}

function getMappingCommerciaux(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_MAPPING);
  const data = sheet.getDataRange().getValues();
  let mapping = {};
  for (let i = 1; i < data.length; i++) {
    mapping[data[i][0]] = data[i][1]; // Nom Client -> Email Commercial
  }
  return mapping;
}

/**
 * CONFIGURATION ET SETUP
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Pennylane Automation')
    .addItem('⚙️ Configurer les feuilles', 'setup')
    .addItem('🔑 Enregistrer le Token API', 'enregistrerToken')
    .addSeparator()
    .addItem('▶️ Lancer l\'escalade maintenant', 'executerEscaladeImpayes')
    .addItem('⏰ Activer le déclencheur quotidien', 'installerDeclencheur')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Feuille de Suivi
  if (!ss.getSheetByName(CONFIG.SHEET_SUIVI)) {
    const s = ss.insertSheet(CONFIG.SHEET_SUIVI);
    const headers = ["ID Facture", "Date Alerte", "Client", "N° Facture", "Montant", "Jours Retard", "Commercial", "Statut", "Commentaires"];
    s.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#f3f3f3");
    s.setFrozenRows(1);
  }

  // Feuille de Mapping
  if (!ss.getSheetByName(CONFIG.SHEET_MAPPING)) {
    const s = ss.insertSheet(CONFIG.SHEET_MAPPING);
    const headers = ["Nom Exact Client Pennylane", "Email du Commercial"];
    s.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  }

  // Feuille de Journal
  if (!ss.getSheetByName(CONFIG.SHEET_JOURNAL)) {
    const s = ss.insertSheet(CONFIG.SHEET_JOURNAL);
    s.getRange(1, 1, 1, 3).setValues([["Date", "Type", "Message"]]).setFontWeight("bold");
  }

  SpreadsheetApp.getUi().alert("Configuration terminée. N'oubliez pas d'enregistrer votre Token API.");
}

function enregistrerToken() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Configuration API Pennylane', 'Collez votre token API Pennylane (v2) :', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() == ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty('PENNYLANE_TOKEN', response.getResponseText());
    ui.alert("✅ Token enregistré avec succès.");
  }
}

function installerDeclencheur() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  ScriptApp.newTrigger('executerEscaladeImpayes')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .nearMinute(30)
    .create();
    
  SpreadsheetApp.getUi().alert("⏰ Déclencheur installé : le script s'exécutera chaque matin à 8h30.");
}

function logAction(type, message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_JOURNAL);
  if (sheet) {
    sheet.appendRow([new Date(), type, message]);
    if (sheet.getLastRow() > 1000) sheet.deleteRow(2); // Nettoyage auto
  }
  console.log(`[${type}] ${message}`);
}