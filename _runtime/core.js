/* Socle commun des mini-apps : fonctions pures, sans DOM (testables dans Node et n8n). */
var OutilCore = (function () {
  'use strict';

  function normaliser(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function estVide(v) { return v === undefined || v === null || (typeof v === 'string' && v.trim() === ''); }

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (estVide(v)) return null;
    var s = String(v).trim().replace(/[\s  ]/g, '').replace(/[€$£]|EUR|HT|TTC/gi, '');
    var negatif = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s);
    s = s.replace(/[()+-]/g, '');
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (s.indexOf(',') > -1) {
      s = s.replace(',', '.');
    } else if ((s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, '');
    }
    s = s.replace(/%$/, '');
    if (!/^\d*\.?\d+$/.test(s)) return null;
    var n = parseFloat(s);
    return isFinite(n) ? (negatif ? -n : n) : null;
  }

  function dateLocale(a, m, j) {
    var d = new Date(a, m - 1, j);
    return (d.getFullYear() === a && d.getMonth() === m - 1 && d.getDate() === j) ? d : null;
  }

  function date(v) {
    if (v instanceof Date) return isNaN(v) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
    if (estVide(v)) return null;
    if (typeof v === 'number') {
      if (v > 20000 && v < 80000) { var b = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000); return dateLocale(b.getUTCFullYear(), b.getUTCMonth() + 1, b.getUTCDate()); }
      return null;
    }
    var s = String(v).trim(), m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return dateLocale(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) {
      var a = +m[3]; if (a < 100) a += 2000;
      return dateLocale(a, +m[2], +m[1]);
    }
    var mois = { janv: 1, janvier: 1, fevr: 2, fevrier: 2, mars: 3, avr: 4, avril: 4, mai: 5, juin: 6, juil: 7, juillet: 7, aout: 8, sept: 9, septembre: 9, oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, decembre: 12 };
    if ((m = normaliser(s).match(/^(\d{1,2}) ([a-z]+) (\d{4})/)) && mois[m[2]]) return dateLocale(+m[3], mois[m[2]], +m[1]);
    return null;
  }

  function siren(v) {
    if (estVide(v)) return null;
    var d = String(v).replace(/\D/g, '');
    if (d.length === 11 && /^FR/i.test(String(v).replace(/\s/g, ''))) d = d.slice(2);
    if (d.length === 14) d = d.slice(0, 9);
    return d.length === 9 ? d : null;
  }

  function iban(v) { return estVide(v) ? null : String(v).toUpperCase().replace(/[^A-Z0-9]/g, '') || null; }

  function texte(v) {
    if (v instanceof Date) return formatDate(v);
    return estVide(v) ? '' : String(v).trim();
  }

  function convertir(v, type) {
    switch (type) {
      case 'nombre': return num(v);
      case 'date': return date(v);
      case 'siren': return siren(v);
      case 'iban': return iban(v);
      case 'booleen': { var n = normaliser(v); return n === '' ? null : ['oui', 'vrai', 'true', '1', 'x', 'yes', 'paye', 'payee', 'regle', 'reglee'].indexOf(n) > -1; }
      default: return texte(v);
    }
  }

  function sirenValide(s) {
    s = siren(s); if (!s) return false;
    var t = 0;
    for (var i = 0; i < 9; i++) { var c = +s[8 - i]; if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9; } t += c; }
    return t % 10 === 0 || s === '356000000';
  }

  function ibanValide(v) {
    var s = iban(v); if (!s || s.length < 15 || s.length > 34 || !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) return false;
    var r = s.slice(4) + s.slice(0, 4), reste = 0;
    for (var i = 0; i < r.length; i++) {
      var ch = r[i], val = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
      for (var k = 0; k < val.length; k++) reste = (reste * 10 + (+val[k])) % 97;
    }
    return reste === 1;
  }

  function tvaIntracomFR(s) {
    s = siren(s); if (!s) return null;
    var cle = (12 + 3 * (Number(s) % 97)) % 97;
    return 'FR' + (cle < 10 ? '0' : '') + cle + s;
  }

  function formatEuro(v) { return v == null || !isFinite(v) ? '' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v); }
  function formatNombre(v, dec) { return v == null || !isFinite(v) ? '' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: dec == null ? 2 : dec }).format(v); }
  function formatDate(d) { d = date(d); if (!d) return ''; var p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear(); }

  function aujourdhui() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function joursEntre(d1, d2) { d1 = date(d1); d2 = date(d2); if (!d1 || !d2) return null; return Math.round((Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate()) - Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate())) / 86400000); }
  function ajouterJours(d, n) { d = date(d); return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) : null; }
  function ajouterMois(d, n) { d = date(d); if (!d) return null; var fin = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate(); return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), fin)); }
  function debutMois(d) { d = date(d); return d ? new Date(d.getFullYear(), d.getMonth(), 1) : null; }
  function moisCle(d) { d = date(d); return d ? d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) : ''; }

  function cleFn(k) { return typeof k === 'function' ? k : function (x) { return x == null ? undefined : x[k]; }; }
  function grouper(liste, k) { var f = cleFn(k), r = {}; (liste || []).forEach(function (x) { var c = f(x); c = c == null || c === '' ? '(vide)' : String(c); (r[c] = r[c] || []).push(x); }); return r; }
  function valeurs(liste, k) { var f = cleFn(k); return (liste || []).map(f).map(function (v) { return typeof v === 'number' ? v : num(v); }).filter(function (v) { return v != null && isFinite(v); }); }
  function somme(liste, k) { return valeurs(liste, k).reduce(function (a, b) { return a + b; }, 0); }
  function moyenne(liste, k) { var v = valeurs(liste, k); return v.length ? somme(v, function (x) { return x; }) / v.length : 0; }
  function mediane(liste, k) { var v = valeurs(liste, k).sort(function (a, b) { return a - b; }); if (!v.length) return 0; var m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }
  function max(liste, k) { var v = valeurs(liste, k); return v.length ? Math.max.apply(null, v) : 0; }
  function min(liste, k) { var v = valeurs(liste, k); return v.length ? Math.min.apply(null, v) : 0; }
  function arrondi(v, dec) { if (v == null || !isFinite(v)) return 0; var p = Math.pow(10, dec == null ? 2 : dec); return Math.round(v * p) / p; }
  function pourcent(a, b) { return b ? arrondi(a / b * 100, 1) : 0; }
  function trier(liste, k, desc) { var f = cleFn(k); return (liste || []).slice().sort(function (a, b) { var x = f(a), y = f(b); if (x instanceof Date) x = +x; if (y instanceof Date) y = +y; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); }); }

  function creerOutils(api, progression) {
    return {
      num: num, date: date, texte: texte, siren: siren, iban: iban, normaliser: normaliser,
      aujourdhui: aujourdhui(), joursEntre: joursEntre, ajouterJours: ajouterJours, ajouterMois: ajouterMois,
      debutMois: debutMois, moisCle: moisCle, grouper: grouper, somme: somme, moyenne: moyenne, mediane: mediane,
      max: max, min: min, arrondi: arrondi, pourcent: pourcent, trier: trier,
      sirenValide: sirenValide, ibanValide: ibanValide, tvaIntracomFR: tvaIntracomFR,
      formatEuro: formatEuro, formatNombre: formatNombre, formatDate: formatDate,
      api: api || {}, progression: progression || function () {}
    };
  }

  function score(entete, champ) {
    var h = normaliser(entete); if (!h) return 0;
    var cands = [champ.libelle, champ.cle].concat(champ.motscles || []).map(normaliser).filter(Boolean);
    var best = 0;
    cands.forEach(function (c) {
      if (h === c) best = Math.max(best, 100);
      else if ((' ' + h + ' ').indexOf(' ' + c + ' ') > -1) best = Math.max(best, 70 + Math.min(c.length, 20));
      else if (h.indexOf(c) > -1 && c.length >= 4) best = Math.max(best, 55 + Math.min(c.length, 20));
      else {
        var mh = h.split(' '), mc = c.split(' '), com = mc.filter(function (w) { return w.length > 2 && mh.indexOf(w) > -1; }).length;
        if (com) best = Math.max(best, 30 + 15 * com);
      }
    });
    return best;
  }

  function correspondanceAuto(entetes, champs) {
    var res = {}, pris = {};
    var paires = [];
    champs.forEach(function (c) { entetes.forEach(function (h, i) { var s = score(h, c); if (s >= 40) paires.push({ c: c.cle, i: i, s: s + (c.obligatoire ? 1 : 0) }); }); });
    paires.sort(function (a, b) { return b.s - a.s; });
    paires.forEach(function (p) { if (res[p.c] == null && !pris[p.i]) { res[p.c] = p.i; pris[p.i] = true; } });
    return res;
  }

  function convertirLignes(lignesBrutes, entetes, champs, corresp) {
    var out = [];
    lignesBrutes.forEach(function (l) {
      if (!l || !l.some(function (v) { return !estVide(v); })) return;
      var o = { _brut: {} };
      entetes.forEach(function (h, i) { o._brut[h || ('Colonne ' + (i + 1))] = l[i]; });
      champs.forEach(function (c) { var i = corresp[c.cle]; o[c.cle] = i == null ? null : convertir(l[i], c.type); });
      out.push(o);
    });
    return out;
  }

  function convertirExemple(lignes, champs) {
    return (lignes || []).map(function (l) {
      var o = { _brut: {} };
      champs.forEach(function (c) { o[c.cle] = convertir(l[c.cle], c.type); o._brut[c.libelle] = l[c.cle]; });
      return o;
    });
  }

  function valeurParametre(p, brut) {
    var v = brut === undefined ? p.defaut : brut;
    switch (p.type) {
      case 'nombre': case 'pourcentage': { var n = num(v); return n == null ? (num(p.defaut) || 0) : n; }
      case 'booleen': return v === true || ['true', 'oui', '1', 'vrai'].indexOf(normaliser(v)) > -1;
      case 'date': return date(v);
      case 'table': return lireTable(v, p.colonnes || []);
      default: return v == null ? '' : String(v);
    }
  }

  function lireTable(v, colonnes) {
    if (Array.isArray(v)) return v;
    var txt = String(v || '').trim(); if (!txt) return [];
    if (/^\[/.test(txt)) { try { var j = JSON.parse(txt); if (Array.isArray(j)) return j; } catch (e) { /* texte collé */ } }
    var lignes = txt.split(/\r?\n/).filter(function (l) { return l.trim(); });
    var sep = lignes[0].indexOf('\t') > -1 ? '\t' : (lignes[0].indexOf(';') > -1 ? ';' : ',');
    var cells = lignes.map(function (l) { return l.split(sep).map(function (c) { return c.trim().replace(/^"|"$/g, ''); }); });
    var premiere = cells[0].map(normaliser);
    var aEntete = colonnes.some(function (c) { return premiere.indexOf(normaliser(c.libelle)) > -1 || premiere.indexOf(normaliser(c.cle)) > -1; });
    var idx = colonnes.map(function (c, i) {
      if (!aEntete) return i;
      var k = premiere.indexOf(normaliser(c.libelle)); if (k < 0) k = premiere.indexOf(normaliser(c.cle)); return k;
    });
    return cells.slice(aEntete ? 1 : 0).map(function (r) {
      var o = {}; colonnes.forEach(function (c, i) { o[c.cle] = idx[i] < 0 ? null : convertir(r[idx[i]], c.type || 'texte'); }); return o;
    });
  }

  function detecterSeparateur(ligne) {
    var cands = [';', ',', '\t', '|'], best = ';', n = -1;
    cands.forEach(function (c) { var k = 0, q = false; for (var i = 0; i < ligne.length; i++) { var ch = ligne[i]; if (ch === '"') q = !q; else if (ch === c && !q) k++; } if (k > n) { n = k; best = c; } });
    return best;
  }

  function lireCSV(txt) {
    txt = String(txt || '').replace(/^﻿/, '');
    var premiere = txt.split(/\r?\n/).find(function (l) { return l.trim(); }) || '';
    var sep = detecterSeparateur(premiere), rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < txt.length; i++) {
      var ch = txt[i];
      if (q) {
        if (ch === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function trouverEntete(rows, champs) {
    var best = 0, bestScore = -1;
    for (var i = 0; i < Math.min(rows.length, 15); i++) {
      var r = rows[i] || [], nonVides = r.filter(function (v) { return !estVide(v); }).length;
      if (nonVides < 2) continue;
      var sc = nonVides;
      (champs || []).forEach(function (c) { r.forEach(function (h) { if (score(h, c) >= 55) sc += 10; }); });
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    return best;
  }

  function versCSV(colonnes, lignes) {
    var esc = function (v) { var s = v instanceof Date ? formatDate(v) : (typeof v === 'number' ? String(v).replace('.', ',') : (v == null ? '' : String(v))); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '﻿' + [colonnes.map(function (c) { return esc(c.libelle); }).join(';')].concat(lignes.map(function (l) { return colonnes.map(function (c) { return esc(l[c.cle]); }).join(';'); })).join('\r\n');
  }

  function verifierResultat(r) {
    var err = [];
    if (!r || typeof r !== 'object') return ['analyser() doit renvoyer un objet'];
    ['kpis', 'alertes', 'tableaux'].forEach(function (k) { if (r[k] != null && !Array.isArray(r[k])) err.push(k + ' doit être un tableau'); });
    var mauvais = function (v) { return (typeof v === 'number' && !isFinite(v)) || (typeof v === 'string' && /^(NaN|undefined|Infinity|-Infinity|null|\[object Object\])$/.test(v.trim())) || (v instanceof Date && isNaN(v)); };
    (r.kpis || []).forEach(function (k, i) { if (!k || !k.libelle) err.push('kpis[' + i + '] sans libelle'); else if (mauvais(k.valeur)) err.push('KPI « ' + k.libelle + ' » = ' + k.valeur); });
    (r.alertes || []).forEach(function (a, i) { if (!a || !a.titre) err.push('alertes[' + i + '] sans titre'); });
    (r.tableaux || []).forEach(function (t, i) {
      if (!t || !t.titre || !Array.isArray(t.colonnes) || !Array.isArray(t.lignes)) { err.push('tableaux[' + i + '] doit avoir titre, colonnes[] et lignes[]'); return; }
      t.colonnes.forEach(function (c) { if (!c || !c.cle || !c.libelle) err.push('Colonne sans cle/libelle dans « ' + t.titre + ' »'); });
      t.lignes.slice(0, 500).forEach(function (l) { t.colonnes.forEach(function (c) { if (c && mauvais(l[c.cle])) err.push('Valeur invalide « ' + l[c.cle] + ' » colonne « ' + c.libelle + ' » du tableau « ' + t.titre + ' »'); }); });
      if (t.lignes.length && t.colonnes.length) {
        t.colonnes.forEach(function (c) { if (c && t.lignes.every(function (l) { return l[c.cle] === undefined; })) err.push('Colonne « ' + c.libelle + ' » toujours vide (clé « ' + c.cle + ' » absente des lignes) dans « ' + t.titre + ' »'); });
      }
    });
    (r.graphiques || []).forEach(function (g, i) { if (!g || !g.titre || !Array.isArray(g.barres)) err.push('graphiques[' + i + '] doit avoir titre et barres[]'); else g.barres.forEach(function (b) { if (mauvais(b.valeur)) err.push('Barre invalide dans « ' + g.titre + ' »'); }); });
    return err.filter(function (e, i, a) { return a.indexOf(e) === i; }).slice(0, 15);
  }



  /* Analyse d'une annonce BODACC de procédure collective : type de procédure et type de jugement. */
  function analyserJugement(famille, nature) {
    var t = normaliser((famille || '') + ' ' + (nature || ''));
    var procedure = /liquidation/.test(t) ? 'liquidation' : (/redressement/.test(t) ? 'redressement' : (/sauvegarde/.test(t) ? 'sauvegarde' : (/retablissement/.test(t) ? 'rétablissement professionnel' : null)));
    var type = /cloture/.test(t) ? 'clôture' : (/ouverture/.test(t) ? 'ouverture' : (/prononcant la liquidation|conversion/.test(t) ? 'conversion' : (/plan/.test(t) ? 'plan' : 'autre')));
    return { procedure: procedure, type_jugement: type, procedure_en_cours: type !== 'clôture' };
  }


  /* ---------- Connecteur Pennylane (API v2) : réponses de l'API → tableaux aux colonnes françaises ---------- */
  var STATUTS_FACTURE = { paid: 'Payée', partially_paid: 'Partiellement payée', late: 'En retard', upcoming: 'À venir', draft: 'Brouillon', cancelled: 'Annulée', partially_cancelled: 'Partiellement annulée', archived: 'Archivée', incomplete: 'Incomplète', credit_note: 'Avoir', proforma: 'Proforma' };
  var STATUTS_DEVIS = { pending: 'En attente', accepted: 'Accepté', denied: 'Refusé', invoiced: 'Facturé', estimate_pending: 'En attente', estimate_accepted: 'Accepté', estimate_denied: 'Refusé', estimate_invoiced: 'Facturé', draft: 'Brouillon', expired: 'Expiré' };
  var STATUTS_PAIEMENT = { to_be_processed: 'À traiter', to_be_paid: 'À payer', partially_paid: 'Partiellement payée', paid: 'Payée', payment_error: 'Erreur de paiement', payment_scheduled: 'Paiement programmé', payment_in_progress: 'Paiement en cours', payment_emitted: 'Paiement émis', payment_found: 'Paiement trouvé', paid_offline: 'Payée hors Pennylane', payment_not_needed: 'Aucun paiement nécessaire' };
  function nb(v) { var n = num(v); return n == null ? null : n; }
  function idDe(o) { return o && typeof o === 'object' ? o.id : o; }
  function adresse(a) { a = a || {}; return { adresse: a.address || '', cp: a.postal_code || '', ville: a.city || '', pays: a.country_alpha2 || '' }; }
  function tiers(refs, cle, id) { return (refs && refs[cle] && refs[cle][id]) || {}; }
  var SOURCES = {
    clients: { libelle: 'Clients', chemin: 'customers', parDate: false, colonnes: ['Nom', 'SIREN', 'N° TVA', 'Email', 'Adresse', 'Code postal', 'Ville', 'Pays', 'Conditions de paiement', 'Type', 'Référence', 'IBAN', 'Date de création'],
      ligne: function (c) { var a = adresse(c.billing_address); return ['' + (c.name || [c.first_name, c.last_name].filter(Boolean).join(' ')), c.reg_no || '', c.vat_number || '', (c.emails || [])[0] || '', a.adresse, a.cp, a.ville, a.pays, c.payment_conditions || '', c.customer_type === 'individual' ? 'Particulier' : 'Entreprise', c.reference || '', c.billing_iban || '', c.created_at || '']; } },
    fournisseurs: { libelle: 'Fournisseurs', chemin: 'suppliers', parDate: false, colonnes: ['Nom', 'SIREN', 'SIRET', 'N° TVA', 'IBAN', 'Email', 'Adresse', 'Code postal', 'Ville', 'Pays', 'Délai de paiement (jours)', 'Mode de paiement', 'Date de création', 'Dernière mise à jour'],
      ligne: function (s) { var a = adresse(s.postal_address); return [s.name || '', s.reg_no || '', s.establishment_no || '', s.vat_number || '', s.iban || '', (s.emails || [])[0] || '', a.adresse, a.cp, a.ville, a.pays, s.supplier_due_date_delay == null ? '' : s.supplier_due_date_delay, s.supplier_payment_method || '', s.created_at || '', s.updated_at || '']; } },
    factures_clients: { libelle: 'Factures clients', chemin: 'customer_invoices', parDate: true, jointure: 'clients', colonnes: ['Numéro de facture', 'Libellé', 'Client', 'SIREN client', 'Email client', 'Date de facture', "Date d'échéance", 'Montant TTC', 'Montant HT', 'TVA', 'Reste à payer', 'Payée', 'Statut', 'Avoir', 'Devise', 'Date de création', 'Dernière mise à jour'],
      ligne: function (f, refs) { var c = tiers(refs, 'clients', idDe(f.customer)); var ttc = nb(f.amount), tva = nb(f.tax); return [f.invoice_number || '', f.label || '', c.name || '', c.reg_no || '', (c.emails || [])[0] || '', f.date || '', f.deadline || '', ttc, ttc == null ? null : ttc - (tva || 0), tva, nb(f.remaining_amount_with_tax), f.paid ? 'oui' : 'non', STATUTS_FACTURE[f.status] || f.status || '', (f.credit_note || f.status === 'credit_note' || (ttc != null && ttc < 0)) ? 'oui' : 'non', f.currency || 'EUR', f.created_at || '', f.updated_at || '']; } },
    factures_fournisseurs: { libelle: 'Factures fournisseurs', chemin: 'supplier_invoices', parDate: true, jointure: 'fournisseurs', colonnes: ['Numéro de facture', 'Libellé', 'Fournisseur', 'SIREN fournisseur', 'IBAN fournisseur', 'Date de facture', "Date d'échéance", 'Montant TTC', 'Montant HT', 'TVA', 'Reste à payer', 'Payée', 'Statut de paiement', 'Devise', 'Date de création', 'Dernière mise à jour'],
      ligne: function (f, refs) { var s = tiers(refs, 'fournisseurs', idDe(f.supplier)); var ttc = nb(f.amount), tva = nb(f.tax); return [f.invoice_number || '', f.label || '', s.name || '', s.reg_no || '', s.iban || '', f.date || '', f.deadline || '', ttc, ttc == null ? null : ttc - (tva || 0), tva, nb(f.remaining_amount_with_tax), f.paid ? 'oui' : 'non', STATUTS_PAIEMENT[f.payment_status] || f.payment_status || '', f.currency || 'EUR', f.created_at || '', f.updated_at || '']; } },
    devis: { libelle: 'Devis', chemin: 'quotes', parDate: false, jointure: 'clients', colonnes: ['Numéro de devis', 'Libellé', 'Client', 'SIREN client', 'Date du devis', 'Date de validité', 'Montant TTC', 'Montant HT', 'Statut', 'Date de création', 'Dernière mise à jour'],
      ligne: function (q, refs) { var c = tiers(refs, 'clients', idDe(q.customer)); var ttc = nb(q.amount), tva = nb(q.tax); return [q.quote_number || '', q.label || '', c.name || '', c.reg_no || '', q.date || '', q.deadline || '', ttc, ttc == null ? null : ttc - (tva || 0), STATUTS_DEVIS[q.status] || q.status || '', q.created_at || '', q.updated_at || '']; } },
    transactions: { libelle: 'Transactions bancaires', chemin: 'transactions', parDate: true, colonnes: ['Date', 'Libellé', 'Montant', 'Reste à rapprocher', 'Justificatif requis', 'Compte bancaire', 'Devise', 'Date de création'],
      ligne: function (t) { return [t.date || '', t.label || '', nb(t.amount), nb(t.outstanding_balance), t.attachment_required ? 'oui' : 'non', idDe(t.bank_account) == null ? '' : String(idDe(t.bank_account)), t.currency || 'EUR', t.created_at || '']; } }
  };
  function sourcesNecessaires(entrees) {
    var s = [];
    (entrees || []).forEach(function (e) { var src = SOURCES[e.source]; if (!src) return; if (src.jointure && s.indexOf(src.jointure) < 0) s.push(src.jointure); if (s.indexOf(e.source) < 0) s.push(e.source); });
    return s;
  }
  function indexer(items) { var r = {}; (items || []).forEach(function (x) { if (x && x.id != null) r[x.id] = x; }); return r; }
  function tablePennylane(source, items, refs) {
    var src = SOURCES[source]; if (!src) return { entetes: [], lignes: [] };
    return { entetes: src.colonnes.slice(), lignes: (items || []).map(function (x) { return src.ligne(x, refs || {}); }) };
  }
  function correspondancePennylane(source, champs) {
    var src = SOURCES[source]; if (!src) return {};
    var res = {}, pris = {};
    champs.forEach(function (c) { var i = c.colonne_pennylane ? src.colonnes.indexOf(c.colonne_pennylane) : -1; if (i > -1) { res[c.cle] = i; pris[i] = true; } });
    var auto = correspondanceAuto(src.colonnes, champs.filter(function (c) { return res[c.cle] == null; }));
    Object.keys(auto).forEach(function (k) { if (!pris[auto[k]]) { res[k] = auto[k]; pris[auto[k]] = true; } });
    return res;
  }

  /* ---------- Lecture des réponses des API publiques (partagée par le navigateur et n8n) ---------- */
  function lireEntreprise(json, s) {
    s = siren(s); var r = ((json && json.results) || []).filter(function (x) { return x.siren === s; })[0]; if (!r) return null;
    var sg = r.siege || {};
    return { siren: r.siren, nom: r.nom_complet || r.nom_raison_sociale || '', etat: r.etat_administratif === 'C' ? 'fermée' : 'active',
      date_creation: date(r.date_creation), date_fermeture: date(r.date_fermeture), adresse: sg.adresse || '', code_postal: sg.code_postal || '',
      naf: r.activite_principale || '', categorie: r.categorie_entreprise || '', effectif: r.tranche_effectif_salarie || '', nature_juridique: r.nature_juridique || '' };
  }
  function lireBodacc(json) {
    return ((json && json.results) || []).map(function (r) {
      var jug = {}; try { jug = r.jugement ? (typeof r.jugement === 'string' ? JSON.parse(r.jugement) : r.jugement) : {}; } catch (e) { jug = {}; }
      var nature = jug.nature || jug.famille || r.typeavis_lib || '';
      var a = { date: date(r.dateparution), date_jugement: date(jug.date), famille: r.familleavis || '', famille_libelle: r.familleavis_lib || '', nature: nature,
        tribunal: r.tribunal || '', nom: r.commercant || '', url: r.url_complete || '', procedure_collective: r.familleavis === 'collective' };
      var j = r.familleavis === 'collective' ? analyserJugement(jug.famille, jug.nature) : { procedure: null, type_jugement: null, procedure_en_cours: false };
      Object.keys(j).forEach(function (k) { a[k] = j[k]; });
      return a;
    }).sort(function (x, y) { return (y.date ? +y.date : 0) - (x.date ? +x.date : 0); });
  }
  function urlEntreprise(s) { return 'https://recherche-entreprises.api.gouv.fr/search?q=' + siren(s) + '&per_page=1'; }
  function urlBodacc(s, depuis) {
    s = siren(s); depuis = date(depuis);
    var where = 'registre like "' + s + '"' + (depuis ? " and dateparution >= date'" + depuis.getFullYear() + '-' + (depuis.getMonth() < 9 ? '0' : '') + (depuis.getMonth() + 1) + '-' + (depuis.getDate() < 10 ? '0' : '') + depuis.getDate() + "'" : '');
    return 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=' + encodeURIComponent(where) + '&order_by=dateparution%20desc&limit=50';
  }

  /* Encodage base64 UTF-8 sans dépendance (pièces jointes n8n). */
  function base64(txt) {
    var bytes = unescape(encodeURIComponent(String(txt))), tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', out = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var a = bytes.charCodeAt(i), b = bytes.charCodeAt(i + 1), c = bytes.charCodeAt(i + 2);
      var t = (a << 16) | ((b || 0) << 8) | (c || 0);
      out += tab[(t >> 18) & 63] + tab[(t >> 12) & 63] + (i + 1 < bytes.length ? tab[(t >> 6) & 63] : '=') + (i + 2 < bytes.length ? tab[t & 63] : '=');
    }
    return out;
  }

  /* API simulée pour le mode démonstration et les tests automatiques (aucun appel réseau). */
  var apiDemo = {
    entreprise: function (s) {
      s = siren(s); if (!s) return Promise.resolve(null);
      var fermee = /0$/.test(s);
      return Promise.resolve({ siren: s, nom: 'Entreprise démo ' + s.slice(-3), etat: fermee ? 'fermée' : 'active', date_creation: new Date(2015, 0, 1), date_fermeture: fermee ? ajouterJours(aujourdhui(), -40) : null,
        adresse: '1 rue de la Démo 69001 LYON', code_postal: '69001', naf: '62.01Z', categorie: 'PME', effectif: '11', nature_juridique: '5710' });
    },
    bodacc: function (s) {
      s = siren(s); if (!s) return Promise.resolve([]);
      var nom = 'Entreprise démo ' + s.slice(-3), base = { tribunal: 'Tribunal de commerce de Lyon (démo)', nom: nom, url: 'https://www.bodacc.fr/' };
      function annonce(jours, famille, libelle, nature) {
        var j = analyserJugement(famille, nature);
        return Object.assign({ date: ajouterJours(aujourdhui(), jours), date_jugement: ajouterJours(aujourdhui(), jours - 6), famille: famille, famille_libelle: libelle, nature: nature, procedure_collective: famille === 'collective' }, j, base);
      }
      if (/7$/.test(s)) return Promise.resolve([annonce(-25, 'collective', 'Procédures collectives', "Jugement d'ouverture d'une procédure de redressement judiciaire")]);
      if (/3$/.test(s)) return Promise.resolve([annonce(-50, 'collective', 'Procédures collectives', "Jugement d'ouverture d'une procédure de liquidation judiciaire")]);
      if (/9$/.test(s)) return Promise.resolve([annonce(-15, 'collective', 'Procédures collectives', "Jugement de clôture pour insuffisance d'actif"), annonce(-300, 'collective', 'Procédures collectives', "Jugement d'ouverture d'une procédure de liquidation judiciaire")]);
      return Promise.resolve([annonce(-200, 'dpc', 'Dépôts des comptes', '')]);
    }
  };

  return {
    apiDemo: apiDemo, analyserJugement: analyserJugement, ajouterMois: ajouterMois, SOURCES: SOURCES, sourcesNecessaires: sourcesNecessaires, indexer: indexer, tablePennylane: tablePennylane, correspondancePennylane: correspondancePennylane, lireEntreprise: lireEntreprise, lireBodacc: lireBodacc, urlEntreprise: urlEntreprise, urlBodacc: urlBodacc, base64: base64, normaliser: normaliser, num: num, date: date, siren: siren, iban: iban, texte: texte, convertir: convertir,
    sirenValide: sirenValide, ibanValide: ibanValide, tvaIntracomFR: tvaIntracomFR,
    formatEuro: formatEuro, formatNombre: formatNombre, formatDate: formatDate,
    joursEntre: joursEntre, aujourdhui: aujourdhui, creerOutils: creerOutils,
    correspondanceAuto: correspondanceAuto, convertirLignes: convertirLignes, convertirExemple: convertirExemple,
    valeurParametre: valeurParametre, lireTable: lireTable, lireCSV: lireCSV, trouverEntete: trouverEntete,
    versCSV: versCSV, verifierResultat: verifierResultat, score: score
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = OutilCore;
