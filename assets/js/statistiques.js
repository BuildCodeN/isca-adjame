/* ==================================================================
   TABLEAU DE BORD DE FRÉQUENTATION (statistiques.html)
   ------------------------------------------------------------------
   Page réservée à l'administrateur. On y entre avec une clé (fichier
   « acces-statistiques », voir outils/preparer-statistiques.py) ; le
   serveur répond par un jeton de 8 heures (ou de 30 jours si l'on coche
   « rester connecté »), envoyé ensuite à chaque demande dans l'en-tête
   X-Jeton-Stat. Tous les chiffres viennent de api/stat-resume.php : ce
   fichier ne calcule rien, il les met en page — chiffres clés, courbes,
   informations recherchées, pages, constats et pistes d'amélioration —
   et prépare le rapport (impression / PDF), le résumé à copier (WhatsApp)
   et les exports CSV.
   ================================================================== */
(function tableauDeBord(){
  'use strict';

  var CLE_JETON = 'isca_stat_jeton';
  var $ = function(id){ return document.getElementById(id); };
  var jeton = null;
  var debutMesure = null;           /* première date mesurée, retenue pour « Depuis le début » */
  var donnees = null;               /* le dernier résumé reçu */
  var mode = '30';                  /* période choisie */
  var imprimeSous = null;

  var NOMS_PAGES = {
    'index': 'Accueil', 'etablissement': "L'Établissement", 'scolarite': 'Scolarité', 'vie-scolaire': 'Vie scolaire',
    'admissions': 'Admissions', 'paiement': 'Paiement', 'actualites': 'Actualités', 'contact': 'Contact',
    'espace-enseignant': 'Espace Enseignant', 'autre': 'Autres adresses'
  };
  var NOMS_ORIGINES = {
    'direct': 'Accès direct (adresse, favori, lien reçu par message)', 'recherche': 'Moteurs de recherche', 'facebook': 'Facebook',
    'whatsapp': 'WhatsApp (via le site web)', 'reseau': 'Autres réseaux sociaux', 'site': "D'autres sites", 'campagne': 'Liens suivis (?src=)',
    'interne': 'Navigation interne'
  };
  var NOMS_APPAREILS = { 'mobile': 'Téléphone', 'ordinateur': 'Ordinateur', 'tablette': 'Tablette' };
  var JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  /* ---------------------------------------------------------- outils d'affichage */
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Le séparateur de milliers français est une espace fine insécable (U+202F), absente de plusieurs polices : on la remplace par l'insécable ordinaire. */
  function nb(n){ return (Number(n) || 0).toLocaleString('fr-FR').replace(/\u202f/g, '\u00A0'); }
  function dec(n, d){ return (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/\u202f/g, '\u00A0'); }
  function pct(x, d){ return x == null ? '—' : dec(x, d || 0) + ' %'; }
  function duree(s){
    if(s == null) return '—';
    if(s < 60) return s + ' s';
    var m = Math.floor(s / 60), r = s % 60;
    return m + ' min' + (r ? ' ' + (r < 10 ? '0' : '') + r + ' s' : '');
  }
  function dateLongue(iso){
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  function dateMoyenne(iso){
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  function dateCourte(iso){ return iso.slice(8, 10) + '/' + iso.slice(5, 7); }
  function nomPage(p){ return NOMS_PAGES[p] || p; }
  function periodeEnClair(p){
    return p.du === p.au ? 'le ' + dateMoyenne(p.du) : 'du ' + dateMoyenne(p.du) + ' au ' + dateMoyenne(p.au);
  }
  function variation(actuel, precedent, inverse){
    if(precedent == null || precedent < 5) return '';
    var v = (actuel - precedent) / precedent * 100;
    if(Math.abs(v) < 0.5) return '<span class="st-var stable">= stable</span>';
    var bon = inverse ? v < 0 : v > 0;
    return '<span class="st-var ' + (bon ? 'bien' : 'moins') + '">' + (v > 0 ? '▲ +' : '▼ −') + Math.abs(Math.round(v)) + ' %</span>';
  }
  /* Le haut de l'échelle d'un graphique : quatre graduations rondes (1, 1,5, 2, 2,5, 3, 4, 5, 6 ou 8 fois une
     puissance de 10) dont la dernière contient la valeur. */
  function plusGrand(valeur){
    var brut = Math.max(valeur, 1) / 4;
    if(brut <= 10) return Math.ceil(brut) * 4;
    var p = Math.pow(10, Math.floor(Math.log(brut) / Math.LN10)), f = brut / p, pas = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for(var i = 0; i < pas.length; i++){ if(f <= pas[i] + 1e-9) return pas[i] * p * 4; }
    return 10 * p * 4;
  }

  /* ---------------------------------------------------------- jeton et réseau */
  function lireJeton(){
    var brut = null;
    try { brut = window.sessionStorage.getItem(CLE_JETON) || window.localStorage.getItem(CLE_JETON); } catch(e){}
    if(!brut) return null;
    var m = /^v1\.(\d+)\./.exec(brut);
    return m && Number(m[1]) * 1000 > Date.now() ? brut : null;
  }
  function garderJeton(valeur, longue){
    try {
      window.sessionStorage.removeItem(CLE_JETON);
      window.localStorage.removeItem(CLE_JETON);
      (longue ? window.localStorage : window.sessionStorage).setItem(CLE_JETON, valeur);
    } catch(e){}
  }
  function oublierJeton(){
    jeton = null;
    try { window.sessionStorage.removeItem(CLE_JETON); window.localStorage.removeItem(CLE_JETON); } catch(e){}
  }

  function appeler(chemin, options){
    options = options || {};
    var h = { 'Accept': options.csv ? 'text/csv' : 'application/json' };
    if(jeton) h['X-Jeton-Stat'] = jeton;
    if(options.corps) h['Content-Type'] = 'application/json';
    return window.fetch(chemin, {
      method: options.corps ? 'POST' : 'GET', headers: h, cache: 'no-store',
      body: options.corps ? JSON.stringify(options.corps) : undefined
    }).then(function(r){
      return (options.csv && r.ok ? r.blob() : r.text()).then(function(t){
        if(r.ok) return t;
        var j = null;
        try { j = JSON.parse(t); } catch(e){}
        var err = new Error((j && j.erreur) || 'Erreur ' + r.status);
        err.statut = r.status;
        throw err;
      });
    });
  }

  /* ---------------------------------------------------------- connexion */
  function montrerConnexion(message){
    $('st-appli').hidden = true;
    $('st-connexion').hidden = false;
    var e = $('st-erreur');
    e.textContent = message || '';
    e.classList.toggle('show', !!message);
  }
  function montrerTableau(){
    $('st-connexion').hidden = true;
    $('st-appli').hidden = false;
  }

  $('st-voir').addEventListener('change', function(){ $('st-cle').type = this.checked ? 'text' : 'password'; });
  $('st-form').addEventListener('submit', function(e){
    e.preventDefault();
    var cle = $('st-cle').value.trim();
    if(!cle){ montrerConnexion('Tapez la clé du fichier « acces-statistiques ».'); return; }
    var bouton = $('st-ouvrir');
    bouton.disabled = true;
    var longue = $('st-longue').checked;
    appeler('api/stat-connexion.php', { corps: { cle: cle, longue: longue } }).then(function(t){
      var r = JSON.parse(t);
      jeton = r.jeton;
      garderJeton(jeton, longue);
      $('st-cle').value = '';
      montrerConnexion('');
      demarrer();
    })['catch'](function(err){
      montrerConnexion(err.message || 'Connexion impossible.');
    }).then(function(){ bouton.disabled = false; });
  });

  function deconnecter(message){
    oublierJeton();
    donnees = null;
    montrerConnexion(message || '');
  }
  $('st-sortir').addEventListener('click', function(){ deconnecter(''); });

  /* ---------------------------------------------------------- périodes */
  function iso(d){ return d.toISOString().slice(0, 10); }
  function periodeDe(m){
    var maintenant = new Date();
    var au = iso(maintenant);
    var du;
    function moins(n){ return iso(new Date(maintenant.getTime() - n * 86400000)); }
    var y = maintenant.getUTCFullYear(), mo = maintenant.getUTCMonth();
    if(m === '7'){ du = moins(6); }
    else if(m === '30'){ du = moins(29); }
    else if(m === 'semaine'){
      var dow = (maintenant.getUTCDay() + 6) % 7;                       /* 0 = lundi */
      var lundi = Date.UTC(y, mo, maintenant.getUTCDate() - dow - 7);
      du = iso(new Date(lundi)); au = iso(new Date(lundi + 6 * 86400000));
    }
    else if(m === 'mois'){ du = au.slice(0, 8) + '01'; }
    else if(m === 'moisdernier'){ du = iso(new Date(Date.UTC(y, mo - 1, 1))); au = iso(new Date(Date.UTC(y, mo, 0))); }
    else { du = debutMesure || moins(799); }                             /* « tout » : depuis la première mesure */
    return { du: du, au: au };
  }

  function charger(du, au){
    $('st-etat').textContent = 'Calcul en cours…';
    return appeler('api/stat-resume.php?du=' + encodeURIComponent(du) + '&au=' + encodeURIComponent(au)).then(function(t){
      donnees = JSON.parse(t);
      if(donnees.mesureDepuis) debutMesure = donnees.mesureDepuis;
      afficher();
    })['catch'](function(err){
      if(err.statut === 401){ deconnecter('Session expirée. Tapez de nouveau la clé.'); return; }
      $('st-etat').textContent = 'Impossible de charger les chiffres : ' + (err.message || 'erreur');
    });
  }
  function choisirPeriode(m){
    mode = m;
    [].slice.call(document.querySelectorAll('.st-periodes .pill')).forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-p') === m);
    });
    var p = periodeDe(m);
    $('st-du').value = p.du; $('st-au').value = p.au;
    return charger(p.du, p.au);
  }
  [].slice.call(document.querySelectorAll('.st-periodes .pill')).forEach(function(b){
    b.addEventListener('click', function(){ choisirPeriode(b.getAttribute('data-p')); });
  });
  $('st-dates').addEventListener('submit', function(e){
    e.preventDefault();
    mode = 'perso';
    [].slice.call(document.querySelectorAll('.st-periodes .pill')).forEach(function(b){ b.classList.remove('active'); });
    charger($('st-du').value, $('st-au').value);
  });

  /* ---------------------------------------------------------- composants */
  function listeBarres(items, options){
    options = options || {};
    if(!items || !items.length) return '<p class="st-vide">Rien encore sur cette période.</p>';
    var max = Math.max.apply(null, items.map(function(i){ return i.n; })) || 1;
    var total = options.total || items.reduce(function(s, i){ return s + i.n; }, 0);
    return '<ul class="st-barres">' + items.slice(0, options.max || 8).map(function(i){
      return '<li' + (i.alerte ? ' class="alerte"' : '') + '>'
        + '<span class="st-b-lib" title="' + esc(i.titre || i.libelle) + '">' + esc(i.libelle) + (i.sous ? '<small>' + esc(i.sous) + '</small>' : '') + '</span>'
        + '<span class="st-b-n">' + nb(i.n) + (options.pourcent ? ' <small>' + pct(i.n / total * 100) + '</small>' : '') + '</span>'
        + '<span class="st-b-piste" aria-hidden="true"><span style="width:' + Math.max(2, i.n / max * 100).toFixed(1) + '%"></span></span></li>';
    }).join('') + '</ul>';
  }

  function carte(titre, corps, note, large){
    return '<div class="st-carte' + (large ? ' st-large' : '') + '"><h3>' + esc(titre) + '</h3>' + corps + (note ? '<p class="st-note">' + note + '</p>' : '') + '</div>';
  }

  /* L'évolution : barres = visites, courbe = pages vues (regroupées par semaine au-delà de 120 jours). */
  function graphiqueJours(jours){
    var points = jours.map(function(j){ return { d: j.jour, visites: j.visites, vues: j.vues, visiteurs: j.visiteurs, etiquette: dateLongue(j.jour) }; });
    if(points.length > 120){
      var semaines = [], cle = null, cur = null;
      points.forEach(function(p){
        var dt = new Date(p.d + 'T12:00:00Z');
        var lundi = new Date(dt.getTime() - ((dt.getUTCDay() + 6) % 7) * 86400000);
        var k = iso(lundi);
        if(k !== cle){ cle = k; cur = { d: k, visites: 0, vues: 0, visiteurs: 0, etiquette: 'Semaine du ' + dateMoyenne(k) }; semaines.push(cur); }
        cur.visites += p.visites; cur.vues += p.vues; cur.visiteurs += p.visiteurs;
      });
      points = semaines;
    }
    /* La largeur du dessin est celle de la carte : les écritures gardent leur taille réelle, même sur un téléphone. */
    var W = Math.max(300, Math.min(900, Math.round($('st-evolution').clientWidth || 900))), H = W < 520 ? 210 : 250;
    var g = W < 520 ? 34 : 44, d = 10, h = 28, b = H - h, u = W - g - d;
    var max = plusGrand(Math.max.apply(null, points.map(function(p){ return Math.max(p.vues, p.visites); })) || 1);
    var pas = u / points.length, lb = Math.max(1, pas * 0.62);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Visites et pages vues par ' + (points.length < jours.length ? 'semaine' : 'jour') + '" preserveAspectRatio="xMidYMid meet">';
    for(var i = 0; i <= 4; i++){
      var y = d + (b - d) * i / 4;
      svg += '<line x1="' + g + '" x2="' + (W - d) + '" y1="' + y + '" y2="' + y + '" class="st-grille-h"/>'
           + '<text x="' + (g - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="st-axe">' + nb(Math.round(max * (4 - i) / 4)) + '</text>';
    }
    var ligne = [];
    points.forEach(function(p, k){
      var x = g + k * pas + (pas - lb) / 2, hv = (b - d) * p.visites / max, cx = x + lb / 2;
      svg += '<g><title>' + esc(p.etiquette + ' : ' + nb(p.visites) + ' visite' + (p.visites > 1 ? 's' : '') + ', ' + nb(p.vues) + ' pages vues') + '</title>'
           + '<rect x="' + x.toFixed(1) + '" y="' + (b - hv).toFixed(1) + '" width="' + lb.toFixed(1) + '" height="' + Math.max(0, hv).toFixed(1) + '" class="st-barre-v" rx="1"/>'
           + '<rect x="' + (g + k * pas).toFixed(1) + '" y="' + d + '" width="' + pas.toFixed(1) + '" height="' + (b - d) + '" fill="transparent"/></g>';
      ligne.push(cx.toFixed(1) + ',' + (b - (b - d) * p.vues / max).toFixed(1));
      var cadence = Math.max(1, Math.ceil(points.length / (W < 520 ? 5 : 10)));
      if(k % cadence === 0) svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle" class="st-axe">' + dateCourte(p.d) + '</text>';
    });
    svg += '<polyline points="' + ligne.join(' ') + '" class="st-courbe"/></svg>';
    return svg + '<p class="st-legende"><span class="l-barre"></span> Visites <span class="l-ligne"></span> Pages vues</p>';
  }

  /* Barres simples. « axe » : l'étiquette sous chaque barre (une sur « cadence » est écrite) ;
     « bulles » : le texte complet qui s'affiche au survol. */
  function graphiqueBarres(valeurs, axe, bulles, libelleInfo, cadence){
    var W = 380, H = 160, g = 6, h = 24, b = H - h, max = Math.max.apply(null, valeurs) || 1;
    var pas = (W - 2 * g) / valeurs.length, lb = pas * 0.7, top = valeurs.indexOf(max);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(libelleInfo) + '" preserveAspectRatio="xMidYMid meet">';
    valeurs.forEach(function(v, k){
      var hv = (b - 14) * v / max, x = g + k * pas + (pas - lb) / 2;
      svg += '<g><title>' + esc(bulles[k] + ' : ' + nb(v)) + '</title><rect x="' + x.toFixed(1) + '" y="' + (b - hv).toFixed(1) + '" width="' + lb.toFixed(1) + '" height="' + Math.max(0, hv).toFixed(1)
           + '" class="st-barre-v' + (k === top && v > 0 ? ' pic' : '') + '" rx="1"/></g>';
      if(k % cadence === 0) svg += '<text x="' + (x + lb / 2).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle" class="st-axe gros">' + esc(axe[k]) + '</text>';
    });
    return svg + '</svg>';
  }

  /* ---------------------------------------------------------- affichage complet */
  function afficher(){
    var d = donnees, k = d.kpi, p = d.precedent;
    $('st-etat').textContent = d.vuesEnregistrees
      ? 'Mesure active depuis le ' + dateMoyenne(d.mesureDepuis) + ' · dernière visite enregistrée le ' + dateMoyenne(d.derniereMesure) + ' · ' + nb(d.vuesEnregistrees) + ' pages vues enregistrées au total.'
      : "Aucune visite enregistrée pour l'instant : les chiffres apparaîtront dès que des visiteurs ouvriront le site.";
    $('st-er-periode').textContent = 'Période : ' + periodeEnClair(d.periode) + ' (' + d.periode.jours + ' jour' + (d.periode.jours > 1 ? 's' : '') + ') · comparée aux ' + d.periode.jours + ' jours précédents';
    var genere = d.genereLe.replace(' UTC', '').split(' ');
    $('st-generation').textContent = 'Rapport établi le ' + dateMoyenne(genere[0]) + ' à ' + genere[1].replace(':', ' h ') + ' (heure d\'Abidjan).';

    /* chiffres clés */
    var kpis = [
      ['Visiteurs', nb(k.visiteurs), variation(k.visiteurs, p.visiteurs), 'Personnes différentes, comptées jour par jour'],
      ['Visites', nb(k.visites), variation(k.visites, p.visites), 'Un passage sur le site, de la première à la dernière page'],
      ['Pages vues', nb(k.vues), variation(k.vues, p.vues), 'Nombre total de pages ouvertes'],
      ['Pages par visite', k.pagesParVisite == null ? '—' : dec(k.pagesParVisite, 1), variation(k.pagesParVisite, p.pagesParVisite), 'Plus c\'est élevé, plus on explore'],
      ['Temps par visite', duree(k.dureeVisiteS), variation(k.dureeVisiteS, p.dureeVisiteS), 'Mesuré sur une partie des visites'],
      ['Visites d\'une seule page', pct(k.tauxRebond), variation(k.tauxRebond, p.tauxRebond, true), 'Parties sans ouvrir une 2ᵉ page']
    ];
    $('st-kpis').innerHTML = kpis.map(function(c){
      return '<div class="st-kpi"><div class="st-kpi-nom">' + esc(c[0]) + '</div><div class="st-kpi-val">' + c[1] + '</div><div class="st-kpi-var">' + (c[2] || '&nbsp;') + '</div><div class="st-kpi-aide">' + esc(c[3]) + '</div></div>';
    }).join('');
    $('st-evolution').innerHTML = k.vues ? graphiqueJours(d.jours) : '<p class="st-vide">Aucune visite sur cette période.</p>';

    afficherGestes(d);
    afficherPages(d);
    afficherPistes(d);
    afficherPublic(d);
    afficherEnseignants(d);
    majLien();
  }

  function afficherGestes(d){
    var g = d.gestes || {};
    function items(cat, transformer){ return ((g[cat] || {}).liste || []).map(transformer); }
    var cartes = [];

    cartes.push(carte('Mots cherchés dans les actualités',
      listeBarres(items('recherche', function(l){
        return { libelle: l.nom, n: l.n, sous: l.sansResultat ? 'aucun résultat (' + l.sansResultat + ')' : (l.valeurMoy != null ? dec(l.valeurMoy, 1) + ' résultat(s) en moyenne' : ''), alerte: l.sansResultat > 0 };
      })), 'En rouge : des mots cherchés sans rien trouver — des informations que les familles attendent.'));

    cartes.push(carte('Emplois du temps consultés (par classe)',
      listeBarres(items('classe', function(l){ return { libelle: l.nom, n: l.n }; }), { max: 10 })));

    cartes.push(carte('Rubriques réellement lues',
      listeBarres(items('section', function(l){
        var page = l.nom.split('#')[0];
        return { libelle: (l.etiquette || l.nom.split('#')[1] || l.nom), sous: nomPage(page), titre: l.nom, n: l.n };
      }), { max: 10 }), 'Une rubrique compte quand elle reste au moins 3 secondes à l\'écran.'));

    cartes.push(carte('Documents ouverts',
      listeBarres(items('telechargement', function(l){ return { libelle: l.etiquette || l.nom, sous: l.etiquette ? l.nom : '', titre: l.nom, n: l.n }; }))));

    var appels = items('appel', function(l){ return { libelle: l.etiquette ? l.etiquette + ' — ' + l.nom : l.nom, n: l.n, titre: l.nom }; });
    var courriels = items('courriel', function(l){ return { libelle: l.nom, n: l.n }; });
    cartes.push(carte('Appels et courriels', '<h4 class="st-mini">Numéros touchés pour appeler</h4>' + listeBarres(appels, { max: 5 })
      + (courriels.length ? '<h4 class="st-mini">Adresses touchées pour écrire</h4>' + listeBarres(courriels, { max: 4 }) : '')));

    cartes.push(carte('Bannières agrandies (carrousel de l\'accueil)',
      listeBarres(items('banniere', function(l){ return { libelle: l.nom, n: l.n }; }))));

    if((g.galerie || {}).liste){
      cartes.push(carte('Actualités dont on ouvre les photos',
        listeBarres(items('galerie', function(l){ return { libelle: l.etiquette || l.nom, n: l.n, titre: l.nom }; }))));
    }
    if((g.navigation || {}).liste){
      cartes.push(carte('Où l\'on clique',
        listeBarres(items('navigation', function(l){ return { libelle: l.etiquette || l.nom.split(' → ')[1] || l.nom, sous: l.nom, n: l.n }; }), { max: 10 }),
        'Chaque ligne : le lien cliqué, et d\'où (menu, carrousel, raccourcis de l\'accueil, pied de page…).'));
    }
    if((g.filtre || {}).liste){
      cartes.push(carte('Filtres choisis', listeBarres(items('filtre', function(l){ return { libelle: l.nom, n: l.n }; }), { max: 10 })));
    }
    if((g.lien_externe || {}).liste){
      cartes.push(carte('Liens vers l\'extérieur', listeBarres(items('lien_externe', function(l){ return { libelle: l.nom, n: l.n }; }))));
    }
    $('st-gestes').innerHTML = cartes.join('');
  }

  function afficherPages(d){
    var total = d.kpi.vues || 1;
    if(!d.pages.length){ $('st-tableau-pages').innerHTML = '<p class="st-vide">Aucune page vue sur cette période.</p>'; return; }
    $('st-tableau-pages').innerHTML = '<table class="st-tableau"><caption class="sr-only">Pages consultées sur la période</caption><thead><tr>'
      + '<th scope="col">Page</th><th scope="col">Pages vues</th><th scope="col">Part</th><th scope="col">Évolution</th><th scope="col">Visiteurs</th>'
      + '<th scope="col">Temps passé</th><th scope="col">Lecture</th><th scope="col">Arrivées</th><th scope="col">Une seule page</th><th scope="col">Sorties</th></tr></thead><tbody>'
      + d.pages.map(function(p){
        return '<tr><th scope="row">' + esc(p.nom) + '</th><td>' + nb(p.vues) + '</td><td>' + pct(p.vues / total * 100) + '</td><td>' + (variation(p.vues, p.vuesPrecedentes) || '—') + '</td><td>' + nb(p.visiteurs) + '</td>'
          + '<td>' + duree(p.dureeS) + '</td><td>' + (p.defilement == null ? '—' : p.defilement + ' %') + '</td><td>' + nb(p.entrees) + '</td>'
          + '<td>' + (p.entrees ? pct(p.rebonds / p.entrees * 100) : '—') + '</td><td>' + nb(p.sorties) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function afficherPistes(d){
    var icones = { bon: '✔', attention: '!', info: 'i' };
    $('st-constats').innerHTML = d.constats.map(function(c){
      return '<div class="st-constat ' + esc(c.niveau) + '"><span class="st-ico" aria-hidden="true">' + (icones[c.niveau] || 'i') + '</span><div><h4>' + esc(c.titre) + '</h4><p>' + esc(c.texte) + '</p></div></div>';
    }).join('') || '<p class="st-vide">Rien à signaler.</p>';
    var urgence = { 1: 'À faire en priorité', 2: 'Utile', 3: 'À l\'occasion' };
    $('st-propositions').innerHTML = d.pistes.map(function(p, i){
      return '<div class="st-piste p' + p.priorite + '"><div class="st-piste-tete"><span class="st-num">' + (i + 1) + '</span><h4>' + esc(p.titre) + '</h4><span class="st-urgence">' + urgence[p.priorite] + '</span></div>'
        + '<p><b>Pourquoi.</b> ' + esc(p.pourquoi) + '</p><p><b>Que faire.</b> ' + esc(p.action) + '</p></div>';
    }).join('') || '<p class="st-vide">Aucune piste pour le moment : les chiffres ne montrent pas de point faible précis.</p>';
  }

  function afficherPublic(d){
    var cartes = [];
    cartes.push(carte('Heure de la journée (pages vues)', graphiqueBarres(d.heures, d.heures.map(function(v, h){ return h + ' h'; }), d.heures.map(function(v, h){ return 'Entre ' + h + ' h et ' + ((h + 1) % 24) + ' h'; }), 'Pages vues par heure de la journée', 3),
      'Heure d\'Abidjan. Le pic est en couleur vive.'));
    cartes.push(carte('Jour de la semaine (pages vues)', graphiqueBarres(d.semaine, JOURS_SEMAINE.map(function(j){ return j.slice(0, 3); }), JOURS_SEMAINE, 'Pages vues par jour de la semaine', 1)));
    cartes.push(carte('D\'où arrivent les visites',
      listeBarres(d.origines.filter(function(o){ return o.k !== 'interne'; }).map(function(o){ return { libelle: NOMS_ORIGINES[o.k] || o.k, n: o.n }; }), { pourcent: true }),
      'Un lien ouvert depuis WhatsApp ou un SMS compte en « accès direct » : ces applications ne transmettent pas leur nom. Pour le savoir, utilisez un lien suivi (Outils).'));
    if(d.sitesOrigine && d.sitesOrigine.length){
      cartes.push(carte('Sites et liens d\'origine', listeBarres(d.sitesOrigine.map(function(o){ return { libelle: o.k, n: o.n }; }), { max: 8 })));
    }
    cartes.push(carte('Appareils', listeBarres(d.appareils.map(function(o){ return { libelle: NOMS_APPAREILS[o.k] || o.k, n: o.n }; }), { pourcent: true })));
    cartes.push(carte('Navigateurs', listeBarres(d.navigateurs.map(function(o){ return { libelle: o.k, n: o.n }; }), { pourcent: true, max: 7 })));
    cartes.push(carte('Systèmes', listeBarres(d.systemes.map(function(o){ return { libelle: o.k, n: o.n }; }), { pourcent: true, max: 6 })));
    var lignes = ['mobile', 'tablette', 'ordinateur'].filter(function(a){ return d.chargement[a] && d.chargement[a].mesures; }).map(function(a){
      var c = d.chargement[a];
      return '<tr><th scope="row">' + NOMS_APPAREILS[a] + '</th><td>' + nb(c.mesures) + '</td><td>' + dec(c.mediane / 1000, 1) + ' s</td><td class="' + (c.p75 > 4000 ? 'lent' : '') + '">' + dec(c.p75 / 1000, 1) + ' s</td></tr>';
    }).join('');
    cartes.push(carte('Vitesse d\'ouverture des pages',
      lignes ? '<table class="st-tableau st-petit"><thead><tr><th scope="col">Appareil</th><th scope="col">Mesures</th><th scope="col">La moitié des pages en moins de</th><th scope="col">Trois quarts en moins de</th></tr></thead><tbody>' + lignes + '</tbody></table>'
             : '<p class="st-vide">Pas encore de mesure.</p>', 'Au-delà de 4 secondes, beaucoup de visiteurs renoncent.'));
    $('st-public-grille').innerHTML = cartes.join('');
  }

  function afficherEnseignants(d){
    var total = 0, maxApp = 0;
    d.enseignants.forEach(function(j){ total += j.connexions; maxApp = Math.max(maxApp, j.appareils); });
    var p = (d.pages.filter(function(x){ return x.page === 'espace-enseignant'; })[0]) || { vues: 0, visiteurs: 0 };
    var corps = '<div class="st-ens-chiffres"><div><b>' + nb(total) + '</b><span>connexion' + (total > 1 ? 's' : '') + ' réussie' + (total > 1 ? 's' : '') + '</span></div>'
      + '<div><b>' + nb(maxApp) + '</b><span>appareils différents au plus, en un jour</span></div>'
      + '<div><b>' + nb(p.vues) + '</b><span>ouverture' + (p.vues > 1 ? 's' : '') + ' de la page de connexion</span></div></div>';
    if(total && d.enseignants.length > 1){
      corps += graphiqueBarres(d.enseignants.map(function(j){ return j.connexions; }), d.enseignants.map(function(j){ return dateCourte(j.jour); }), d.enseignants.map(function(j){ return dateLongue(j.jour); }), 'Connexions des enseignants par jour', Math.max(1, Math.ceil(d.enseignants.length / 8)));
    }
    corps += '<p class="st-note">Aucun nom n\'est enregistré : on compte seulement des connexions, jamais qui se connecte. L\'établissement compte 43 enseignants.</p>';
    $('st-enseignants').innerHTML = '<h3>Connexions des enseignants</h3>' + corps;
  }

  /* ---------------------------------------------------------- lien suivi */
  function majLien(){
    var page = $('st-lien-page').value, src = $('st-lien-src').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    var morceaux = page.split('#');
    var url = 'https://isca-adjame.com/' + morceaux[0] + (src ? '?src=' + src : '') + (morceaux[1] ? '#' + morceaux[1] : '');
    $('st-lien-url').textContent = url;
  }
  $('st-lien-page').addEventListener('change', majLien);
  $('st-lien-src').addEventListener('input', majLien);
  function copier(texte, bouton, avant){
    function fait(){ if(bouton){ var t = bouton.textContent; bouton.textContent = avant || 'Copié ✔'; window.setTimeout(function(){ bouton.textContent = t; }, 1600); } }
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(texte).then(fait, function(){ prompt('Copiez ce texte :', texte); }); return; }
    var z = document.createElement('textarea'); z.value = texte; document.body.appendChild(z); z.select();
    try { document.execCommand('copy'); fait(); } catch(e){ prompt('Copiez ce texte :', texte); }
    document.body.removeChild(z);
  }
  $('st-lien-copier').addEventListener('click', function(){ copier($('st-lien-url').textContent, this); });

  /* ---------------------------------------------------------- mes visites */
  (function exclusion(){
    var c = $('st-exclure');
    try { c.checked = window.localStorage.getItem('isca_stat_exclu') === '1'; } catch(e){}
    c.addEventListener('change', function(){ try { window.localStorage.setItem('isca_stat_exclu', c.checked ? '1' : '0'); } catch(e){} });
  })();

  /* ---------------------------------------------------------- résumé à copier (WhatsApp) */
  function resume(){
    var d = donnees, k = d.kpi, p = d.precedent, lignes = [];
    function v(a, b){ var t = variation(a, b).replace(/<[^>]+>/g, ''); return t ? ' (' + t.replace('▲ ', '').replace('▼ ', '') + ' par rapport aux ' + d.periode.jours + ' jours précédents)' : ''; }
    lignes.push('ISCA — Fréquentation du site');
    lignes.push('Période : ' + periodeEnClair(d.periode));
    lignes.push('');
    lignes.push('• ' + nb(k.visiteurs) + ' visiteurs, ' + nb(k.visites) + ' visites' + v(k.visites, p.visites) + ', ' + nb(k.vues) + ' pages vues');
    var mob = d.appareils.filter(function(a){ return a.k === 'mobile'; })[0], totalApp = d.appareils.reduce(function(s, a){ return s + a.n; }, 0);
    if(mob && totalApp) lignes.push('• ' + pct(mob.n / totalApp * 100) + ' des visites depuis un téléphone');
    if(d.pages.length) lignes.push('• Pages les plus vues : ' + d.pages.slice(0, 3).map(function(x){ return x.nom + ' (' + nb(x.vues) + ')'; }).join(', '));
    var g = d.gestes || {};
    function top(cat, n){ return ((g[cat] || {}).liste || []).slice(0, n).map(function(l){ return (l.etiquette && cat !== 'classe' ? l.etiquette : l.nom) + ' (' + l.n + ')'; }).join(', '); }
    if(top('recherche', 3)) lignes.push('• Mots les plus cherchés : ' + top('recherche', 3));
    if(top('classe', 3)) lignes.push('• Emplois du temps les plus ouverts : ' + top('classe', 3));
    if(top('telechargement', 2)) lignes.push('• Documents les plus ouverts : ' + top('telechargement', 2));
    if((g.appel || {}).total) lignes.push('• ' + g.appel.total + ' appel(s) déclenché(s) depuis le site');
    if(d.pistes.length){
      lignes.push('');
      lignes.push('À améliorer :');
      d.pistes.slice(0, 3).forEach(function(x, i){ lignes.push((i + 1) + '. ' + x.titre); });
    }
    return lignes.join('\n');
  }
  $('st-copier').addEventListener('click', function(){ if(donnees) copier(resume(), this); });

  /* ---------------------------------------------------------- rapport imprimé */
  $('st-imprimer').addEventListener('click', function(){
    if(!donnees) return;
    imprimeSous = document.title;
    document.title = 'Rapport de fréquentation ISCA — ' + donnees.periode.du + ' au ' + donnees.periode.au;
    window.print();
  });
  window.addEventListener('afterprint', function(){ if(imprimeSous){ document.title = imprimeSous; imprimeSous = null; } });

  /* ---------------------------------------------------------- exports CSV */
  [].slice.call(document.querySelectorAll('[data-export]')).forEach(function(b){
    b.addEventListener('click', function(){
      if(!donnees) return;
      var type = b.getAttribute('data-export');
      appeler('api/stat-export.php?type=' + type + '&du=' + donnees.periode.du + '&au=' + donnees.periode.au, { csv: true }).then(function(blob){
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'frequentation-' + type + '-' + donnees.periode.du + '_' + donnees.periode.au + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        window.setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
        b.closest('details').open = false;
      })['catch'](function(err){
        if(err.statut === 401) deconnecter('Session expirée. Tapez de nouveau la clé.');
        else $('st-etat').textContent = 'Export impossible : ' + err.message;
      });
    });
  });

  /* ---------------------------------------------------------- démarrage */
  function demarrer(){
    montrerTableau();
    choisirPeriode(mode === 'perso' ? '30' : mode);
  }
  /* Si la largeur change (téléphone qu'on tourne), la courbe est redessinée à la bonne taille. */
  var largeurCourbe = 0, attenteTaille = null;
  window.addEventListener('resize', function(){
    window.clearTimeout(attenteTaille);
    attenteTaille = window.setTimeout(function(){
      var l = $('st-evolution').clientWidth;
      if(donnees && donnees.kpi.vues && Math.abs(l - largeurCourbe) > 40){
        largeurCourbe = l;
        $('st-evolution').innerHTML = graphiqueJours(donnees.jours);
      }
    }, 250);
  });

  jeton = lireJeton();
  if(jeton) demarrer(); else montrerConnexion('');
  window.iscaStatTableau = { periode: choisirPeriode };       /* utile aux essais automatiques */
})();
