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
  function ajouterMois(d, n) { d = date(d); return d ? new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), 28)) : null; }
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
      if (/[37]$/.test(s)) return Promise.resolve([{ date: ajouterJours(aujourdhui(), -25), famille: 'collective', famille_libelle: 'Procédures collectives', nature: "Jugement d'ouverture d'une procédure de redressement judiciaire", tribunal: 'Tribunal de commerce de Lyon (démo)', nom: 'Entreprise démo ' + s.slice(-3), url: 'https://www.bodacc.fr/', procedure_collective: true }]);
      return Promise.resolve([{ date: ajouterJours(aujourdhui(), -200), famille: 'dpc', famille_libelle: 'Dépôts des comptes', nature: '', tribunal: '', nom: 'Entreprise démo ' + s.slice(-3), url: 'https://www.bodacc.fr/', procedure_collective: false }]);
    }
  };

  return {
    apiDemo: apiDemo, normaliser: normaliser, num: num, date: date, siren: siren, iban: iban, texte: texte, convertir: convertir,
    sirenValide: sirenValide, ibanValide: ibanValide, tvaIntracomFR: tvaIntracomFR,
    formatEuro: formatEuro, formatNombre: formatNombre, formatDate: formatDate,
    joursEntre: joursEntre, aujourdhui: aujourdhui, creerOutils: creerOutils,
    correspondanceAuto: correspondanceAuto, convertirLignes: convertirLignes, convertirExemple: convertirExemple,
    valeurParametre: valeurParametre, lireTable: lireTable, lireCSV: lireCSV, trouverEntete: trouverEntete,
    versCSV: versCSV, verifierResultat: verifierResultat, score: score
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = OutilCore;
/* Interface commune des mini-apps. Nécessite OutilCore (core.js), window.OUTIL et les fonctions genererExemple / analyser du moteur. */
(function () {
  'use strict';
  var C = OutilCore, O = window.OUTIL || {}, cleStock = 'outil:' + (O.slug || location.pathname);
  var etat = { fichiers: {}, params: {}, resultat: null, demo: false };

  function el(tag, attrs, enfants) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    });
    (enfants || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function lireStock() { try { return JSON.parse(localStorage.getItem(cleStock) || '{}'); } catch (e) { return {}; } }
  function ecrireStock(o) { try { localStorage.setItem(cleStock, JSON.stringify(Object.assign(lireStock(), o))); } catch (e) { /* stockage indisponible */ } }

  /* ---------- API publiques (seuls des SIREN sont envoyés) ---------- */
  var cache = {}, file = Promise.resolve(), nbErreursApi = 0;
  function appel(url) {
    if (cache[url]) return cache[url];
    var p = file.then(function () { return new Promise(function (r) { setTimeout(r, 180); }); }).then(function essai(n) {
      return fetch(url).then(function (rep) {
        if (rep.status === 429 && (n || 0) < 3) return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return essai((n || 0) + 1); });
        if (!rep.ok) throw new Error('HTTP ' + rep.status);
        return rep.json();
      });
    });
    file = p.catch(function () {});
    cache[url] = p;
    return p;
  }
  var api = {
    entreprise: function (s) {
      s = C.siren(s); if (!s) return Promise.resolve(null);
      return appel('https://recherche-entreprises.api.gouv.fr/search?q=' + s + '&per_page=1').then(function (j) {
        var r = (j.results || []).filter(function (x) { return x.siren === s; })[0]; if (!r) return null;
        var sg = r.siege || {};
        return { siren: r.siren, nom: r.nom_complet || r.nom_raison_sociale || '', etat: r.etat_administratif === 'C' ? 'fermée' : 'active',
          date_creation: C.date(r.date_creation), date_fermeture: C.date(r.date_fermeture), adresse: sg.adresse || '', code_postal: sg.code_postal || '',
          naf: r.activite_principale || '', categorie: r.categorie_entreprise || '', effectif: r.tranche_effectif_salarie || '', nature_juridique: r.nature_juridique || '' };
      }).catch(function () { nbErreursApi++; return null; });
    },
    bodacc: function (s, opts) {
      s = C.siren(s); if (!s) return Promise.resolve([]);
      var depuis = C.date((opts || {}).depuis);
      var where = 'registre like "' + s + '"' + (depuis ? ' and dateparution >= date\'' + depuis.getFullYear() + '-' + String(depuis.getMonth() + 1).padStart(2, '0') + '-' + String(depuis.getDate()).padStart(2, '0') + '\'' : '');
      return appel('https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=' + encodeURIComponent(where) + '&order_by=dateparution%20desc&limit=50').then(function (j) {
        return (j.results || []).map(function (r) {
          var jug = {}; try { jug = r.jugement ? JSON.parse(r.jugement) : {}; } catch (e) { jug = {}; }
          return { date: C.date(r.dateparution), famille: r.familleavis || '', famille_libelle: r.familleavis_lib || '', nature: jug.nature || jug.famille || r.typeavis_lib || '',
            tribunal: r.tribunal || '', nom: r.commercant || '', url: r.url_complete || '', procedure_collective: r.familleavis === 'collective' };
        });
      }).catch(function () { nbErreursApi++; return []; });
    }
  };

  /* ---------- Lecture des fichiers ---------- */
  function lireFichier(f, entree) {
    return new Promise(function (ok, ko) {
      var nom = f.name.toLowerCase(), r = new FileReader();
      if (/\.(xlsx|xlsm|xls|ods)$/.test(nom)) {
        if (!window.XLSX) return ko(new Error('Lecteur Excel indisponible : enregistrez le fichier en CSV.'));
        r.onload = function () {
          try {
            var wb = XLSX.read(new Uint8Array(r.result), { type: 'array', cellDates: true });
            var ws = wb.Sheets[wb.SheetNames[0]];
            ok(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }));
          } catch (e) { ko(e); }
        };
        r.readAsArrayBuffer(f);
      } else {
        r.onload = function () {
          var t = r.result;
          if (t.indexOf('�') > -1) { var r2 = new FileReader(); r2.onload = function () { ok(C.lireCSV(r2.result)); }; r2.readAsText(f, 'windows-1252'); }
          else ok(C.lireCSV(t));
        };
        r.readAsText(f, 'utf-8');
      }
    }).then(function (rows) {
      var i = C.trouverEntete(rows, entree.champs);
      var entetes = (rows[i] || []).map(function (h) { return C.texte(h); });
      var lignes = rows.slice(i + 1).filter(function (l) { return l.some(function (v) { return String(v).trim() !== ''; }); });
      var memo = (lireStock().corresp || {})[entree.id + '|' + entetes.join('|')];
      return { nom: f.name, entetes: entetes, lignes: lignes, corresp: memo || C.correspondanceAuto(entetes, entree.champs) };
    });
  }

  /* ---------- Rendu ---------- */
  var formats = {
    euro: C.formatEuro, nombre: function (v) { return C.formatNombre(v); }, pourcent: function (v) { return v == null ? '' : C.formatNombre(v, 1) + ' %'; },
    jours: function (v) { return v == null ? '' : C.formatNombre(v, 0) + ' j'; }, date: C.formatDate,
    texte: function (v) { return v == null ? '' : String(v); }
  };
  function fmt(v, f) {
    if (f === 'niveau') return v;
    if (v instanceof Date) return C.formatDate(v);
    return (formats[f] || formats.texte)(v);
  }
  function badge(v) {
    var n = C.normaliser(v), cls = /danger|critique|rouge|eleve|bloque|ferme|fraude|liquidation|redressement/.test(n) ? 'danger' : /alerte|attention|orange|moyen|surveiller|a verifier/.test(n) ? 'alerte' : /ok|vert|faible|normal|actif|active|conforme|valide/.test(n) ? 'ok' : 'info';
    return el('span', { class: 'badge ' + cls, text: v == null ? '' : String(v) });
  }

  function rendreTableau(t, idx) {
    var filtre = '', triCol = null, triDesc = false, limite = 200;
    var bloc = el('section', { class: 'carte tableau', id: 'tableau-' + idx });
    var corps = el('div', { class: 'table-wrap' });
    var info = el('span', { class: 'note' });
    function lignesFiltrees() {
      var l = t.lignes;
      if (filtre) { var f = C.normaliser(filtre); l = l.filter(function (r) { return t.colonnes.some(function (c) { return C.normaliser(fmt(r[c.cle], c.format)).indexOf(f) > -1; }); }); }
      if (triCol) { var k = triCol; l = l.slice().sort(function (a, b) { var x = a[k], y = b[k]; if (x instanceof Date) x = +x; if (y instanceof Date) y = +y; if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (x < y ? -1 : x > y ? 1 : 0) * (triDesc ? -1 : 1); }); }
      return l;
    }
    function dessiner() {
      var l = lignesFiltrees();
      info.textContent = l.length + ' ligne' + (l.length > 1 ? 's' : '') + (l.length > limite ? ' (' + limite + ' affichées)' : '');
      var thead = el('tr', {}, t.colonnes.map(function (c) {
        return el('th', { class: (c.format === 'euro' || c.format === 'nombre' || c.format === 'pourcent' || c.format === 'jours') ? 'num' : '', onclick: function () { triDesc = triCol === c.cle ? !triDesc : false; triCol = c.cle; dessiner(); } }, [c.libelle + (triCol === c.cle ? (triDesc ? ' ▼' : ' ▲') : '')]);
      }));
      var tb = el('tbody', {}, l.slice(0, limite).map(function (r) {
        return el('tr', { class: r._niveau ? 'ligne-' + r._niveau : '' }, t.colonnes.map(function (c) {
          var v = r[c.cle], num = (c.format === 'euro' || c.format === 'nombre' || c.format === 'pourcent' || c.format === 'jours');
          if (c.format === 'niveau') return el('td', {}, [badge(v)]);
          if (c.format === 'lien' && v) return el('td', {}, [el('a', { href: v, target: '_blank', rel: 'noopener', text: 'Voir' })]);
          return el('td', { class: num ? 'num' : '' }, [fmt(v, c.format)]);
        }));
      }));
      corps.innerHTML = '';
      corps.appendChild(l.length ? el('table', {}, [el('thead', {}, [thead]), tb]) : el('p', { class: 'vide', text: 'Aucune ligne.' }));
      if (l.length > limite) corps.appendChild(el('button', { class: 'btn btn-ghost', text: 'Afficher plus', onclick: function () { limite += 500; dessiner(); } }));
    }
    bloc.appendChild(el('div', { class: 'tableau-tete' }, [
      el('div', {}, [el('h3', { text: t.titre }), t.description ? el('p', { class: 'note', text: t.description }) : null]),
      el('div', { class: 'tableau-actions' }, [
        el('input', { type: 'search', placeholder: 'Filtrer…', oninput: function (e) { filtre = e.target.value; dessiner(); } }),
        el('button', { class: 'btn btn-ghost', text: 'CSV', onclick: function () { telecharger(C.versCSV(t.colonnes, lignesFiltrees()), (t.id || 'tableau') + '.csv', 'text/csv;charset=utf-8'); } })
      ])
    ]));
    bloc.appendChild(info);
    bloc.appendChild(corps);
    dessiner();
    return bloc;
  }

  function rendreResultat(r) {
    var zone = document.getElementById('resultats'); zone.innerHTML = '';
    zone.appendChild(el('div', { class: 'res-tete' }, [
      el('h2', { text: etat.demo ? 'Résultats (données d\'exemple' + ((O.api || []).length ? ', vérifications en ligne simulées)' : ')') : 'Résultats' }),
      el('div', { class: 'tableau-actions' }, [
        el('button', { class: 'btn btn-primary', text: 'Exporter en Excel', onclick: exporterExcel }),
        el('button', { class: 'btn btn-ghost', text: 'Imprimer / PDF', onclick: function () { window.print(); } })
      ])
    ]));
    if (nbErreursApi) zone.appendChild(el('div', { class: 'alerte alerte-alerte' }, [el('strong', { text: 'Vérifications en ligne incomplètes. ' }), nbErreursApi + ' appel(s) aux API publiques ont échoué (connexion ou limite de débit). Relancez l\'analyse dans quelques minutes.']));
    if ((r.kpis || []).length) zone.appendChild(el('div', { class: 'kpis' }, r.kpis.map(function (k) {
      return el('div', { class: 'kpi kpi-' + (k.niveau || 'info') }, [el('span', { text: k.libelle }), el('b', { text: fmt(k.valeur, k.format) }), k.detail ? el('small', { text: k.detail }) : null]);
    })));
    (r.alertes || []).forEach(function (a) { zone.appendChild(el('div', { class: 'alerte alerte-' + (a.niveau || 'info') }, [el('strong', { text: a.titre }), a.detail ? el('p', { text: a.detail }) : null])); });
    (r.graphiques || []).forEach(function (g) {
      var m = Math.max.apply(null, g.barres.map(function (b) { return Math.abs(b.valeur) || 0; }).concat([1]));
      zone.appendChild(el('section', { class: 'carte graph' }, [el('h3', { text: g.titre })].concat(g.barres.slice(0, 30).map(function (b) {
        return el('div', { class: 'barre' }, [el('span', { class: 'barre-lib', text: b.libelle }), el('span', { class: 'barre-fond' }, [el('span', { class: 'barre-val' + (b.valeur < 0 ? ' neg' : ''), style: 'width:' + Math.max(1, Math.abs(b.valeur) / m * 100) + '%' })]), el('span', { class: 'barre-num', text: fmt(b.valeur, g.format || 'nombre') })]);
      }))));
    });
    (r.tableaux || []).forEach(function (t, i) { zone.appendChild(rendreTableau(t, i)); });
    zone.scrollIntoView({ behavior: 'smooth' });
  }

  function telecharger(contenu, nom, type) {
    var a = el('a', { href: URL.createObjectURL(contenu instanceof Blob ? contenu : new Blob([contenu], { type: type })), download: nom });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function exporterExcel() {
    var r = etat.resultat; if (!r) return;
    if (!window.XLSX) { (r.tableaux || []).forEach(function (t) { telecharger(C.versCSV(t.colonnes, t.lignes), (t.id || 'tableau') + '.csv', 'text/csv;charset=utf-8'); }); return; }
    var wb = XLSX.utils.book_new(), noms = {};
    function nomFeuille(s) { var n = String(s).replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 28).trim() || 'Feuille'; var b = n, i = 2; while (noms[n]) n = b.slice(0, 25) + ' ' + i++; noms[n] = 1; return n; }
    var synth = [['Indicateur', 'Valeur']].concat((r.kpis || []).map(function (k) { return [k.libelle, k.valeur instanceof Date ? k.valeur : (typeof k.valeur === 'number' ? k.valeur : fmt(k.valeur, k.format))]; }));
    (r.alertes || []).forEach(function (a) { synth.push([a.titre, a.detail || '']); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(synth), nomFeuille('Synthèse'));
    (r.tableaux || []).forEach(function (t) {
      var aoa = [t.colonnes.map(function (c) { return c.libelle; })].concat(t.lignes.map(function (l) { return t.colonnes.map(function (c) { var v = l[c.cle]; return v == null ? '' : v; }); }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), nomFeuille(t.titre));
    });
    XLSX.writeFile(wb, (O.slug || 'resultats') + '.xlsx');
  }

  /* ---------- Analyse ---------- */
  function lancer(demo) {
    var bouton = document.getElementById('lancer'), prog = document.getElementById('progression');
    etat.demo = !!demo; nbErreursApi = 0;
    var donnees = {}, manquants = [];
    try {
      var ex = demo ? genererExemple() : null;
      (O.entrees || []).forEach(function (e) {
        if (demo) { donnees[e.id] = C.convertirExemple((ex || {})[e.id], e.champs); return; }
        var f = etat.fichiers[e.id];
        if (!f) { donnees[e.id] = []; if (e.obligatoire !== false) manquants.push('le fichier « ' + e.libelle + ' »'); return; }
        e.champs.forEach(function (c) { if (c.obligatoire && f.corresp[c.cle] == null) manquants.push('la colonne « ' + c.libelle + ' » de « ' + e.libelle + ' »'); });
        donnees[e.id] = C.convertirLignes(f.lignes, f.entetes, e.champs, f.corresp);
      });
    } catch (err) { return afficherErreur(err); }
    if (manquants.length) return afficherErreur(new Error('Il manque ' + manquants.join(', ') + '.'));
    var params = {};
    (O.parametres || []).forEach(function (p) { params[p.cle] = C.valeurParametre(p, etat.params[p.cle]); });
    var outils = C.creerOutils(demo ? C.apiDemo : api, function (txt, frac) { prog.hidden = false; prog.querySelector('span').textContent = txt || ''; prog.querySelector('i').style.width = Math.round((frac || 0) * 100) + '%'; });
    bouton.disabled = true; bouton.textContent = 'Analyse en cours…';
    Promise.resolve().then(function () { return analyser(donnees, params, outils); }).then(function (r) {
      etat.resultat = r || {}; rendreResultat(etat.resultat);
    }).catch(afficherErreur).then(function () { bouton.disabled = false; bouton.textContent = 'Lancer l\'analyse'; prog.hidden = true; });
  }
  function afficherErreur(err) {
    var zone = document.getElementById('resultats'); zone.innerHTML = '';
    zone.appendChild(el('div', { class: 'alerte alerte-danger' }, [el('strong', { text: 'Impossible de lancer l\'analyse. ' }), String(err && err.message || err)]));
    zone.scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- Construction de la page ---------- */
  function blocEntree(e) {
    var zoneMap = el('div', { class: 'mapping' }), etiquette = el('span', { class: 'note', text: 'Aucun fichier. Formats acceptés : CSV, XLSX.' });
    var input = el('input', { type: 'file', accept: '.csv,.txt,.xlsx,.xls,.xlsm,.ods', onchange: function (ev) { charger(ev.target.files[0]); } });
    var depot = el('label', { class: 'depot' }, [el('b', { text: e.libelle + (e.obligatoire === false ? ' (facultatif)' : '') }), el('span', { text: 'Glissez votre fichier ici ou cliquez pour le choisir' }), input]);
    ['dragover', 'dragenter'].forEach(function (t) { depot.addEventListener(t, function (ev) { ev.preventDefault(); depot.classList.add('survol'); }); });
    ['dragleave', 'drop'].forEach(function (t) { depot.addEventListener(t, function () { depot.classList.remove('survol'); }); });
    depot.addEventListener('drop', function (ev) { ev.preventDefault(); if (ev.dataTransfer.files[0]) charger(ev.dataTransfer.files[0]); });
    function charger(f) {
      if (!f) return;
      etiquette.textContent = 'Lecture de ' + f.name + '…';
      lireFichier(f, e).then(function (res) { etat.fichiers[e.id] = res; etiquette.textContent = res.nom + ' : ' + res.lignes.length + ' lignes lues, dans votre navigateur.'; dessinerMap(); })
        .catch(function (err) { etiquette.textContent = 'Lecture impossible : ' + err.message; });
    }
    function dessinerMap() {
      var f = etat.fichiers[e.id]; zoneMap.innerHTML = ''; if (!f) return;
      zoneMap.appendChild(el('p', { class: 'note', text: 'Vérifiez la correspondance des colonnes (détectée automatiquement) :' }));
      zoneMap.appendChild(el('div', { class: 'grille-map' }, e.champs.map(function (c) {
        var sel = el('select', { onchange: function (ev) { var v = ev.target.value; if (v === '') delete f.corresp[c.cle]; else f.corresp[c.cle] = +v; var m = lireStock().corresp || {}; m[e.id + '|' + f.entetes.join('|')] = f.corresp; ecrireStock({ corresp: m }); } },
          [el('option', { value: '', text: '— non utilisée —' })].concat(f.entetes.map(function (h, i) { return el('option', { value: i, text: h || ('Colonne ' + (i + 1)), selected: f.corresp[c.cle] === i ? 'selected' : null }); })));
        return el('label', { class: c.obligatoire && f.corresp[c.cle] == null ? 'manque' : '' }, [el('span', { text: c.libelle + (c.obligatoire ? ' *' : '') }), sel]);
      })));
    }
    var ex = el('button', { class: 'lien', type: 'button', text: 'Télécharger un fichier d\'exemple', onclick: function () { var d = genererExemple()[e.id] || []; var lignes = C.convertirExemple(d, e.champs).map(function (l) { var o = {}; e.champs.forEach(function (c) { o[c.cle] = l[c.cle]; }); return o; }); telecharger(C.versCSV(e.champs.map(function (c) { return { cle: c.cle, libelle: c.libelle }; }), lignes), 'exemple-' + e.id + '.csv', 'text/csv;charset=utf-8'); } });
    return el('div', { class: 'entree' }, [el('p', { class: 'note', html: e.description_html || '' }), depot, el('div', { class: 'entree-pied' }, [etiquette, ex]), zoneMap]);
  }

  function blocParametre(p) {
    var memo = (lireStock().params || {})[p.cle];
    if (memo !== undefined) etat.params[p.cle] = memo;
    var val = etat.params[p.cle] !== undefined ? etat.params[p.cle] : p.defaut;
    function maj(v) { etat.params[p.cle] = v; var m = lireStock().params || {}; m[p.cle] = v; ecrireStock({ params: m }); }
    var champ;
    if (p.type === 'booleen') champ = el('input', { type: 'checkbox', checked: C.valeurParametre(p, val) ? 'checked' : null, onchange: function (ev) { maj(ev.target.checked); } });
    else if (p.type === 'choix') champ = el('select', { onchange: function (ev) { maj(ev.target.value); } }, (p.options || []).map(function (o) { return el('option', { value: o, text: o, selected: String(val) === String(o) ? 'selected' : null }); }));
    else if (p.type === 'table') {
      var entete = (p.colonnes || []).map(function (c) { return c.libelle; }).join('\t');
      var txt = Array.isArray(val) ? [entete].concat(val.map(function (l) { return (p.colonnes || []).map(function (c) { return l[c.cle] instanceof Date ? C.formatDate(l[c.cle]) : (l[c.cle] == null ? '' : l[c.cle]); }).join('\t'); })).join('\n') : String(val || '');
      var compte = el('span', { class: 'note' });
      var maj2 = function (v) { maj(v); compte.textContent = C.lireTable(v, p.colonnes || []).length + ' ligne(s) reconnue(s)'; };
      champ = el('div', {}, [el('textarea', { rows: 6, placeholder: 'Collez ici depuis Excel, avec la ligne d\'en-têtes : ' + entete.replace(/\t/g, ' | '), oninput: function (ev) { maj2(ev.target.value); } }, [txt]), compte]);
      compte.textContent = C.lireTable(txt, p.colonnes || []).length + ' ligne(s) reconnue(s)';
    } else champ = el('input', { type: p.type === 'date' ? 'date' : (p.type === 'texte' ? 'text' : 'text'), inputmode: (p.type === 'nombre' || p.type === 'pourcentage') ? 'decimal' : null, value: val == null ? '' : val, oninput: function (ev) { maj(ev.target.value); } });
    return el('label', { class: 'param' + (p.type === 'table' ? ' param-large' : '') }, [el('span', { text: p.libelle + (p.type === 'pourcentage' ? ' (%)' : '') }), champ, p.aide ? el('small', { text: p.aide }) : null]);
  }

  function construire() {
    var app = document.getElementById('app');
    var apiTxt = (O.api || []).length ? ' Pour les vérifications en ligne, seuls les numéros SIREN (données publiques) sont envoyés aux API officielles de l\'État (' + (O.api || []).map(function (a) { return a === 'bodacc' ? 'BODACC' : 'Recherche d\'entreprises'; }).join(', ') + ').' : '';
    app.appendChild(el('header', { class: 'entete' }, [
      el('div', { class: 'tags' }, [el('span', { class: 'tag', text: '100 % local' }), el('span', { class: 'tag', text: 'Gratuit' }), el('span', { class: 'tag', text: 'Compatible Pennylane' })]),
      el('h1', { text: O.titre || '' }), el('p', { class: 'promesse', text: O.promesse || '' }),
      el('div', { class: 'confidentialite' }, [el('strong', { text: 'Vos données ne quittent pas votre ordinateur. ' }), 'Les fichiers sont lus par votre navigateur ; aucun serveur ne les reçoit, aucun compte n\'est nécessaire.' + apiTxt]),
      el('div', { class: 'actions' }, [el('button', { class: 'btn btn-primary', text: 'Essayer avec des données d\'exemple', onclick: function () { lancer(true); } }), el('a', { class: 'btn btn-ghost', href: '#guide', text: 'Comment exporter depuis Pennylane ?' })])
    ]));
    if ((O.etapes || []).length) app.appendChild(el('section', { class: 'carte' }, [el('h2', { text: 'Ce que fait l\'outil' }), el('ol', {}, O.etapes.map(function (t) { return el('li', { text: t }); }))]));
    app.appendChild(el('section', { class: 'carte' }, [el('h2', { text: '1. Vos fichiers' })].concat((O.entrees || []).map(blocEntree))));
    if ((O.parametres || []).length) app.appendChild(el('section', { class: 'carte' }, [el('h2', { text: '2. Vos réglages' }), el('div', { class: 'params' }, O.parametres.map(blocParametre))]));
    app.appendChild(el('div', { class: 'lancement' }, [el('button', { id: 'lancer', class: 'btn btn-primary btn-grand', text: 'Lancer l\'analyse', onclick: function () { lancer(false); } }),
      el('div', { id: 'progression', class: 'progression', hidden: 'hidden' }, [el('span'), el('div', {}, [el('i')])])]));
    app.appendChild(el('div', { id: 'resultats' }));
    if (O.guide_html) app.appendChild(el('section', { class: 'carte guide', id: 'guide', html: '<h2>Guide</h2>' + O.guide_html }));
    if (O.limites) app.appendChild(el('section', { class: 'carte' }, [el('h2', { text: 'Limites et précautions' }), el('p', { text: O.limites }), el('p', { class: 'note', text: 'Outil gratuit fourni sans garantie. Vérifiez les résultats avant toute décision ; il ne remplace pas l\'avis de votre expert-comptable.' })]));
    app.appendChild(el('footer', {}, [document.createTextNode('Outil gratuit créé par ' + (O.signature || '')), O.lien_profil ? el('a', { href: O.lien_profil, target: '_blank', rel: 'noopener', text: ' · Me suivre sur LinkedIn' }) : null, O.repo_url ? el('a', { href: O.repo_url, target: '_blank', rel: 'noopener', text: ' · Code source' }) : null]));
  }

  if (typeof genererExemple !== 'function' || typeof analyser !== 'function') {
    document.getElementById('app').textContent = 'Cet outil est incomplet (moteur manquant).';
  } else construire();
})();
