/* ═══════════════════════════════════════════════════════════════════════════
   Écran de saisie « Nouvelle étude de marché »
   - famille de bien → adapte la nature et le libellé de surface
   - récapitulatif recalculé à chaque frappe
   - brouillon enregistré automatiquement, études récentes, modèles
   - référence de dossier, résumé compact une fois l'analyse affichée
   Ne modifie pas lancerAnalyse() : les identifiants de champs historiques
   (inputAdresse, selectType, inputSurface, selectPerimetre, opt*) sont conservés.
   Persistance : localStorage. Aucune dépendance hors Bootstrap.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var K_DRAFT = 'fidi_em_brouillon';
  var K_RECENT = 'fidi_em_recentes';
  var K_MODELES = 'fidi_em_modeles';
  var K_SEQ = 'fidi_em_seq_';
  var MAX_RECENT = 8;

  var FAMILLES = {
    residentiel: { surface: 'Surface habitable', ph: 'Ex : 120', max: 9999,
      types: [['maison', 'Maison'], ['appartement', 'Appartement'], ['tous', 'Immeuble']] },
    terrain: { surface: 'Surface du terrain', ph: 'Ex : 800', max: 999999,
      types: [['terrain', 'Terrain à bâtir'], ['terrain', 'Terrain agricole'], ['terrain', 'Terrain de loisirs']] },
    pro: { surface: 'Surface utile', ph: 'Ex : 250', max: 99999,
      types: [['local', 'Local commercial'], ['local', 'Entrepôt'], ['local', 'Bureau'],
              ['local', 'Bâtiment industriel'], ['local', 'Parking / garage'],
              ['tous', 'Bien mixte (habitation + pro)']] },
    tous: { surface: 'Surface', ph: 'Ex : 120', max: 999999, types: [['tous', 'Tous types']] }
  };

  var SOURCES = ['BAN', 'DVF', 'VALORIS', 'ADEME DPE', 'Géorisques', 'INSEE', 'OpenStreetMap', 'Carte des loyers'];

  var MODELES_BASE = [
    { nom: 'Maison — quartier', famille: 'residentiel', typeLabel: 'Maison', perimetre: 'rayon_1km' },
    { nom: 'Appartement — proximité', famille: 'residentiel', typeLabel: 'Appartement', perimetre: 'rayon_500m' },
    { nom: 'Terrain à bâtir — commune', famille: 'terrain', typeLabel: 'Terrain à bâtir', perimetre: 'commune' },
    { nom: 'Local commercial — secteur', famille: 'pro', typeLabel: 'Local commercial', perimetre: 'rayon_5km' }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var el = {};
  var refUsed = false;
  var saveTimer = null;

  // ─── Stockage ───────────────────────────────────────────────────────────────
  function load(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  // ─── Référence de dossier : EM-AAAA-NNN ─────────────────────────────────────
  function newRef() {
    var year = new Date().getFullYear();
    var seq = parseInt(load(K_SEQ + year, 0), 10) || 0;
    return 'EM-' + year + '-' + String(seq + 1).padStart(3, '0');
  }
  function consumeRef() {
    var year = new Date().getFullYear();
    var seq = parseInt(load(K_SEQ + year, 0), 10) || 0;
    store(K_SEQ + year, seq + 1);
  }

  // ─── Famille → nature + surface ─────────────────────────────────────────────
  function famille() {
    var checked = document.querySelector('input[name="famille"]:checked');
    return checked ? checked.value : 'residentiel';
  }
  function applyFamille(key, typeLabel) {
    var f = FAMILLES[key] || FAMILLES.residentiel;
    var radio = document.querySelector('input[name="famille"][value="' + key + '"]');
    if (radio) radio.checked = true;
    el.type.innerHTML = '';
    f.types.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t[0]; o.textContent = t[1];
      if (t[1] === typeLabel) o.selected = true;
      el.type.appendChild(o);
    });
    $('typeWrap').classList.toggle('d-none', f.types.length < 2);
    $('surfaceLabel').textContent = f.surface;
    el.surface.placeholder = f.ph;
    el.surface.max = f.max;
  }
  function typeLabel() {
    var o = el.type.options[el.type.selectedIndex];
    return o ? o.textContent : '';
  }
  function perimetreLabel() {
    var o = el.perimetre.options[el.perimetre.selectedIndex];
    if (!o) return '';
    return (el.perimetre.value.indexOf('rayon_') === 0 ? 'Rayon ' : '') + o.textContent;
  }

  // ─── État du formulaire ─────────────────────────────────────────────────────
  function getState() {
    return {
      adresse: el.adresse.value.trim(),
      famille: famille(),
      typeLabel: typeLabel(),
      surface: el.surface.value,
      perimetre: el.perimetre.value,
      optEntreprise: el.optE.checked, entrepriseQ: el.entQ.value.trim(),
      optFinance: el.optF.checked, financeSiren: el.finS.value.trim(),
      optPermis: el.optP.checked,
      ref: el.ref.value.trim(),
      refUsed: refUsed
    };
  }
  function applyState(s, partial) {
    applyFamille(s.famille || 'residentiel', s.typeLabel);
    if (s.perimetre) el.perimetre.value = s.perimetre;
    el.optE.checked = !!s.optEntreprise;
    el.optF.checked = !!s.optFinance;
    el.optP.checked = !!s.optPermis;
    if (!partial) {
      el.adresse.value = s.adresse || '';
      el.surface.value = s.surface || '';
      el.entQ.value = s.entrepriseQ || '';
      el.finS.value = s.financeSiren || '';
    }
    syncOptions();
    refresh();
  }
  // Les cases sont cochées par programme : on aligne l'affichage sans voler le focus.
  function syncOptions() {
    $('entrepriseQueryWrap').classList.toggle('d-none', !el.optE.checked);
    $('financeQueryWrap').classList.toggle('d-none', !el.optF.checked);
    if (el.optE.checked || el.optF.checked || el.optP.checked) openCompl(true);
  }
  function openCompl(open) {
    $('complBloc').classList.toggle('d-none', !open);
    el.plus.setAttribute('aria-expanded', open ? 'true' : 'false');
    el.plus.classList.toggle('d-none', open);
  }

  // ─── Récapitulatif en direct ────────────────────────────────────────────────
  function refresh() {
    var s = getState();
    var surf = parseFloat(s.surface);
    $('recapAdresse').textContent = s.adresse || '—';
    $('recapType').textContent = s.typeLabel || '—';
    $('recapSurface').textContent = surf > 0 ? surf.toLocaleString('fr-FR') + ' m²' : 'Non renseignée';
    $('recapPerimetre').textContent = perimetreLabel() || '—';

    var opts = [], extra = [];
    if (s.optEntreprise) { opts.push('Société'); extra.push('RNE / INPI'); }
    if (s.optFinance) { opts.push('Finances'); extra.push('Pappers'); }
    if (s.optPermis) { opts.push('Permis'); extra.push('SITADEL'); }
    $('recapOptions').textContent = opts.length ? opts.join(' · ') : 'Aucune';
    $('recapSources').textContent = SOURCES.length + extra.length;

    var chips = $('recapChips');
    chips.innerHTML = '';
    SOURCES.forEach(function (n) { chips.appendChild(chip(n, false)); });
    extra.forEach(function (n) { chips.appendChild(chip(n, true)); });

    $('surfaceHint').classList.toggle('d-none', surf > 0);

    // Avertissements non bloquants : une option cochée sans identifiant est ignorée par l'analyse.
    var warn = [];
    if (s.optEntreprise && !s.entrepriseQ) warn.push('Indiquez un SIREN, un SIRET ou une raison sociale pour la vérification de société.');
    if (s.optFinance && !/^\d{9}$/.test(s.financeSiren.replace(/\s+/g, ''))) warn.push('Indiquez un SIREN à 9 chiffres pour la santé financière.');
    showAlerte(warn.join(' '));
    if (s.adresse) el.adresse.classList.remove('is-missing');
  }
  function chip(text, opt) {
    var c = document.createElement('span');
    c.textContent = text;
    if (opt) c.className = 'opt';
    return c;
  }
  function showAlerte(msg) {
    var a = $('saisieAlerte');
    a.textContent = msg || '';
    a.classList.toggle('d-none', !msg);
  }

  // ─── Brouillon automatique ──────────────────────────────────────────────────
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 400);
  }
  function saveDraft() {
    if (!store(K_DRAFT, getState())) return;
    var t = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    $('saisieStamp').textContent = 'Brouillon enregistré à ' + t;
  }

  // ─── Études récentes ────────────────────────────────────────────────────────
  function pushRecent(s) {
    var list = load(K_RECENT, []).filter(function (r) {
      return !(r.adresse === s.adresse && r.typeLabel === s.typeLabel);
    });
    s.date = new Date().toISOString();
    list.unshift(s);
    store(K_RECENT, list.slice(0, MAX_RECENT));
  }
  function showRecents() {
    var list = load(K_RECENT, []);
    var box = $('recentList');
    if (!list.length || el.adresse.value.trim()) { box.classList.add('d-none'); return; }
    box.innerHTML = '';
    var title = document.createElement('div');
    title.className = 'recent-title';
    title.textContent = 'Études récentes';
    box.appendChild(title);
    list.forEach(function (r) {
      var item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      var i = document.createElement('i');
      i.className = 'bi bi-clock-history text-muted me-1';
      item.appendChild(i);
      item.appendChild(document.createTextNode(r.adresse));
      var sub = document.createElement('small');
      var surf = parseFloat(r.surface) > 0 ? ' · ' + r.surface + ' m²' : '';
      sub.textContent = (r.ref ? r.ref + ' · ' : '') + r.typeLabel + surf + ' · ' +
        new Date(r.date).toLocaleDateString('fr-FR');
      item.appendChild(sub);
      var pick = function () {
        applyState(r);
        box.classList.add('d-none');
        scheduleSave();
      };
      item.addEventListener('mousedown', function (e) { e.preventDefault(); pick(); });
      item.addEventListener('keydown', function (e) { if (e.key === 'Enter') pick(); });
      box.appendChild(item);
    });
    box.classList.remove('d-none');
  }

  // ─── Modèles ────────────────────────────────────────────────────────────────
  function renderModeles() {
    var box = $('modelesList');
    var perso = load(K_MODELES, []);
    box.innerHTML = '';
    MODELES_BASE.concat(perso).forEach(function (m, idx) {
      var row = document.createElement('div');
      row.className = 'saisie-modele';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dropdown-item';
      b.textContent = m.nom;
      var sub = document.createElement('small');
      var opt = el.perimetre.querySelector('option[value="' + m.perimetre + '"]');
      sub.textContent = m.typeLabel + ' · ' + (opt ? opt.textContent : m.perimetre);
      b.appendChild(sub);
      b.addEventListener('click', function () {
        applyState(m, true);
        scheduleSave();
        var dd = bootstrap.Dropdown.getInstance($('btnModele'));
        if (dd) dd.hide();
      });
      row.appendChild(b);
      var persoIdx = idx - MODELES_BASE.length;
      if (persoIdx >= 0) {
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'saisie-modele-del';
        del.title = 'Supprimer ce modèle';
        del.setAttribute('aria-label', 'Supprimer le modèle ' + m.nom);
        del.innerHTML = '<i class="bi bi-x-lg"></i>';
        del.addEventListener('click', function () {
          var l = load(K_MODELES, []);
          l.splice(persoIdx, 1);
          store(K_MODELES, l);
          renderModeles();
        });
        row.appendChild(del);
      }
      box.appendChild(row);
    });
  }
  function saveModele() {
    var input = $('inputModeleNom');
    var nom = input.value.trim();
    if (!nom) { input.focus(); return; }
    var s = getState();
    var l = load(K_MODELES, []);
    l.push({ nom: nom, famille: s.famille, typeLabel: s.typeLabel, perimetre: s.perimetre,
             optEntreprise: s.optEntreprise, optFinance: s.optFinance, optPermis: s.optPermis });
    store(K_MODELES, l);
    input.value = '';
    renderModeles();
  }

  // ─── Lancement : contrôle en ligne plutôt qu'une boîte d'alerte ─────────────
  function guard(e) {
    if (el.adresse.value.trim()) return true;
    if (e) { e.preventDefault(); e.stopPropagation(); }
    el.adresse.classList.add('is-missing');
    showAlerte('Saisissez l\'adresse du bien pour lancer l\'analyse.');
    el.adresse.focus();
    return false;
  }

  // ─── Formulaire ⇄ résumé compact ────────────────────────────────────────────
  function collapse() {
    var s = getState();
    var surf = parseFloat(s.surface) > 0 ? parseFloat(s.surface).toLocaleString('fr-FR') + ' m² · ' : '';
    $('resumeRef').textContent = s.ref;
    $('resumeRef').classList.toggle('d-none', !s.ref);
    $('resumeAdresse').textContent = s.adresse;
    $('resumeDetails').textContent = s.typeLabel + ' · ' + surf + perimetreLabel();
    $('saisieForm').classList.add('d-none');
    $('saisieResume').classList.remove('d-none');
  }
  function expand() {
    $('saisieResume').classList.add('d-none');
    $('saisieForm').classList.remove('d-none');
  }
  function onResults() {
    var s = getState();
    if (!refUsed) { consumeRef(); refUsed = true; }
    pushRecent(s);
    saveDraft();
    // Référence rappelée dans l'en-tête des résultats (donc sur le PDF et l'impression).
    var badge = $('res-ref');
    var date = $('res-date');
    if (!badge && date) {
      badge = document.createElement('span');
      badge.id = 'res-ref';
      badge.className = 'badge';
      badge.style.cssText = 'font-size:.7rem;background:var(--fidi-blue);align-self:center;';
      date.parentNode.insertBefore(badge, date);
    }
    if (badge) { badge.textContent = s.ref; badge.classList.toggle('d-none', !s.ref); }
    collapse();
  }
  function reset() {
    var keepRef = !refUsed && el.ref.value.trim();
    refUsed = false;
    applyState({ famille: 'residentiel', typeLabel: 'Maison', perimetre: 'rayon_1km' });
    openCompl(false);
    el.ref.value = keepRef || newRef();
    el.adresse.classList.remove('is-missing');
    expand();
    refresh();
    saveDraft();
  }
  function nouvelleEtude() {
    reset();
    $('results-panel').classList.add('d-none');
    $('init-panel').classList.remove('d-none');
    ['btnPrint', 'btnPdf', 'btnAvis'].forEach(function (id) { var b = $(id); if (b) b.classList.add('d-none'); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    el.adresse.focus();
  }

  // ─── Initialisation ─────────────────────────────────────────────────────────
  function init() {
    el = {
      adresse: $('inputAdresse'), type: $('selectType'), surface: $('inputSurface'),
      perimetre: $('selectPerimetre'), optE: $('optEntreprise'), optF: $('optFinance'),
      optP: $('optPermis'), entQ: $('inputEntrepriseQ'), finS: $('inputFinanceSiren'),
      ref: $('inputRef'), plus: $('btnPlus')
    };
    if (!el.adresse || !$('saisie')) return;

    var draft = load(K_DRAFT, null);
    if (draft) {
      refUsed = !!draft.refUsed;
      applyState(draft);
      el.ref.value = draft.ref || newRef();
    } else {
      applyFamille('residentiel', 'Maison');
      el.ref.value = newRef();
      refresh();
    }
    renderModeles();

    var form = $('saisieForm');
    form.addEventListener('input', function () { refresh(); scheduleSave(); });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'famille') applyFamille(e.target.value);
      refresh(); scheduleSave();
    });
    el.ref.addEventListener('input', function () { refUsed = false; });

    el.plus.addEventListener('click', function () { openCompl(true); });
    $('btnReset').addEventListener('click', reset);
    $('btnModeleSave').addEventListener('click', saveModele);
    $('inputModeleNom').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveModele(); }
    });
    $('btnModifier').addEventListener('click', function () { expand(); el.adresse.focus(); });
    $('btnNouvelle').addEventListener('click', nouvelleEtude);

    // Études récentes : proposées tant que le champ adresse est vide.
    el.adresse.addEventListener('focus', showRecents);
    el.adresse.addEventListener('input', showRecents);
    el.adresse.addEventListener('blur', function () {
      setTimeout(function () { $('recentList').classList.add('d-none'); }, 150);
    });

    // Contrôle avant lancement, en phase de capture : passe avant lancerAnalyse().
    $('btnAnalyse').addEventListener('click', function (e) {
      if (!guard(e)) e.stopImmediatePropagation();
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target === el.adresse) guard(e);
    }, true);
    $('btnAnalyse2').addEventListener('click', function () {
      if (guard() && typeof window.lancerAnalyse === 'function') window.lancerAnalyse();
    });

    // Résultats affichés → résumé compact ; retour à l'état initial (erreur) → formulaire.
    var results = $('results-panel');
    var initPanel = $('init-panel');
    var wasVisible = false;
    new MutationObserver(function () {
      var visible = !results.classList.contains('d-none');
      if (visible && !wasVisible) onResults();
      wasVisible = visible;
    }).observe(results, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(function () {
      if (!initPanel.classList.contains('d-none')) expand();
    }).observe(initPanel, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
