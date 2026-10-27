/* ==================================================================
   MESURE D'AUDIENCE — ANONYME, SANS COOKIE
   ------------------------------------------------------------------
   Ce script dit au serveur du site (api/stat.php) quelle page vient
   d'être ouverte, combien de temps on y est resté, et quelques gestes
   qui montrent ce que les visiteurs cherchent : un mot tapé dans la
   recherche des actualités, la classe dont on ouvre l'emploi du temps,
   un document ouvert, un numéro touché pour appeler, une bannière
   agrandie, une rubrique réellement lue. Le tableau de bord de
   l'administrateur (statistiques.html) en fait des chiffres, un
   rapport et des pistes d'amélioration.

   Ce qui n'est JAMAIS envoyé : aucun texte saisi dans un formulaire
   (contact, paiement, connexion), aucun nom, aucune adresse IP (le
   serveur ne la garde pas non plus), aucun cookie, aucun identifiant
   conservé dans le navigateur. Ce qui est envoyé : la page, d'où l'on
   vient (le nom du site seulement), la largeur de l'écran, la langue,
   le temps passé, la profondeur de lecture, et les gestes listés plus
   haut.

   Le script se tait dans quatre cas :
     • hors du site officiel (le miroir GitHub, un essai en local) ;
     • quand le visiteur demande à ne pas être suivi (« Ne pas me suivre »
       du navigateur, Global Privacy Control) ;
     • quand il a choisi « Ne pas me compter » (en bas de chaque page, ou
       dans le tableau de bord de l'administrateur) ;
     • dans un navigateur piloté par un programme (essais automatiques).

   Il ne gêne jamais le site : chaque message part en arrière-plan, sans
   attendre de réponse, et la moindre erreur est avalée.
   ================================================================== */
(function mesureAudience(){
  'use strict';

  var COLLECTE = 'api/stat.php';
  var HOTES = { 'isca-adjame.com': 1, 'www.isca-adjame.com': 1 };

  function lire(cle){ try { return window.localStorage.getItem(cle); } catch(e){ return null; } }
  function ecrire(cle, valeur){ try { window.localStorage.setItem(cle, valeur); } catch(e){} }

  /* ---------- « Ne pas me compter », en bas de chaque page ----------
     Placé AVANT les cas où le script se tait : le lien doit marcher
     pour celui qui veut se faire recompter. */
  (function lienDeRefus(){
    var a = document.querySelector('[data-stat-refus]');
    if(!a) return;
    function afficher(){ a.textContent = lire('isca_stat_exclu') === '1' ? 'Me compter à nouveau' : 'Ne pas me compter'; }
    a.addEventListener('click', function(e){
      e.preventDefault();
      ecrire('isca_stat_exclu', lire('isca_stat_exclu') === '1' ? '0' : '1');
      afficher();
    });
    afficher();
  })();

  var essai = lire('isca_stat_test') === '1';           /* essais locaux : on mesure quand même */
  if(!HOTES[location.hostname] && !essai) return;
  if(lire('isca_stat_exclu') === '1') return;
  var nav = window.navigator || {};
  if(nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.msDoNotTrack === '1' || nav.globalPrivacyControl === true) return;
  if(!essai && (nav.webdriver === true || /HeadlessChrome/.test(nav.userAgent || ''))) return;

  /* ---------- Ce que l'on sait de la page ---------- */
  function pageDe(chemin){
    var f = (chemin || '').replace(/\/+$/, '').split('/').pop() || 'index.html';
    return f.replace(/\.html?$/i, '') || 'index';
  }
  var page = pageDe(location.pathname);

  function hasard(n){
    var s = '', i;
    try {
      var t = new Uint8Array(Math.ceil(n / 2));
      window.crypto.getRandomValues(t);
      for(i = 0; i < t.length; i++) s += ('0' + t[i].toString(16)).slice(-2);
    } catch(e){
      for(i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
    }
    return s.slice(0, n);
  }
  var pv = hasard(12);                                    /* identifiant de CETTE ouverture de page, oublié ensuite */

  function hoteDe(url){
    try { return new URL(url).hostname; } catch(e){}
    var m = /^https?:\/\/([^\/?#:]+)/i.exec(url || '');
    return m ? m[1] : '';
  }
  var src = (/[?&](?:src|utm_source)=([a-z0-9_-]{1,24})(?:&|#|$)/i.exec(location.search) || [])[1] || '';

  /* ---------- L'envoi : en arrière-plan, sans attendre ---------- */
  function envoyer(objet){
    var corps = JSON.stringify(objet);
    try {
      if(nav.sendBeacon && nav.sendBeacon(COLLECTE, new Blob([corps], { type: 'text/plain;charset=UTF-8' }))) return;
    } catch(e){}
    try {
      fetch(COLLECTE, { method: 'POST', body: corps, keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } })['catch'](function(){});
    } catch(e){}
  }

  /* Les pages où l'on se connecte à un compte (Paiement, Espace Enseignant) : seule l'OUVERTURE de la page est comptée.
     Aucun geste n'y est annoncé — un titre ou un lien de ces pages pourrait un jour porter un nom ou un montant. */
  var PAGES_SANS_GESTES = { 'paiement': 1, 'espace-enseignant': 1 };

  function geste(categorie, nom, etiquette, valeur){
    if(!nom || PAGES_SANS_GESTES[page]) return;
    var o = { a: 'evt', pv: pv, p: page, k: categorie, n: String(nom).replace(/\s+/g, ' ').trim().slice(0, 120) };
    if(etiquette) o.e = String(etiquette).replace(/\s+/g, ' ').trim().slice(0, 80);
    if(typeof valeur === 'number' && isFinite(valeur)) o.v = Math.max(0, Math.round(valeur));
    envoyer(o);
  }
  window.iscaStat = { geste: geste };                     /* une page peut annoncer un geste de plus */

  /* ---------- La page vue ---------- */
  envoyer({
    a: 'vue', pv: pv, p: page, h: location.hash || '',
    r: document.referrer ? hoteDe(document.referrer) : '',
    s: src, w: window.innerWidth || 0,
    l: (nav.language || nav.userLanguage || '').slice(0, 2).toLowerCase(),
    t: (nav.maxTouchPoints || 0) > 1 ? 1 : 0
  });

  /* ---------- Le temps passé, la profondeur de lecture ---------- */
  var cumul = 0;                                          /* millisecondes à l'écran */
  var depuis = document.visibilityState === 'hidden' ? null : Date.now();
  var profondeur = 0;
  var dernierEnvoi = -1;

  function mesurerProfondeur(){
    var h = Math.max(document.documentElement.scrollHeight || 0, document.body ? document.body.scrollHeight : 0, 1);
    var bas = (window.pageYOffset || document.documentElement.scrollTop || 0) + (window.innerHeight || 0);
    profondeur = Math.max(profondeur, Math.min(100, Math.round(bas / h * 20) * 5));
  }
  var attenteScroll = false;
  window.addEventListener('scroll', function(){
    if(attenteScroll) return;
    attenteScroll = true;
    window.requestAnimationFrame(function(){ attenteScroll = false; mesurerProfondeur(); });
  }, { passive: true });
  window.addEventListener('load', mesurerProfondeur);

  function chargement(){
    try {
      var e = window.performance.getEntriesByType('navigation')[0];
      if(e && e.loadEventEnd > 0) return Math.round(e.loadEventEnd);
      var t = window.performance.timing;
      if(t && t.loadEventEnd > 0) return t.loadEventEnd - t.navigationStart;
    } catch(x){}
    return 0;
  }

  function annoncerLaFin(){
    if(depuis !== null){ cumul += Date.now() - depuis; depuis = Date.now(); }
    mesurerProfondeur();
    var d = Math.round(cumul / 1000);
    if(d === dernierEnvoi) return;                        /* rien de nouveau depuis le dernier message */
    dernierEnvoi = d;
    var o = { a: 'fin', pv: pv, d: d, x: profondeur };
    var c = chargement();
    if(c > 0) o.c = c;
    envoyer(o);
  }
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'hidden'){ annoncerLaFin(); depuis = null; }
    else { depuis = Date.now(); }
  });
  window.addEventListener('pagehide', annoncerLaFin);

  /* ---------- Les gestes ---------- */
  function libelle(el){
    var t = el.getAttribute('data-stat-nom') || el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '';
    return t.replace(/\s+/g, ' ').replace(/[↓→↗]/g, '').trim().slice(0, 80);
  }

  /* D'où, sur la page, vient le clic : dit quelle zone de l'accueil sert vraiment. */
  function zone(el){
    if(el.closest('.subnav')) return 'sous-menu de la page';
    if(el.closest('nav, .navlinks')) return 'menu';
    if(el.closest('footer')) return 'pied de page';
    if(el.closest('.hero-slide, #heroSlider')) return 'carrousel';
    if(el.closest('.avis-zone')) return 'avis du moment';
    if(el.closest('.lucarne, .lucarnes-grid')) return 'informations aux parents';
    if(el.closest('.quick-card, .quick-grid')) return 'raccourcis';
    if(el.closest('.news-card')) return 'actualités';
    return 'contenu';
  }

  function clicLien(a){
    var href = a.getAttribute('href') || '';
    if(/^tel:/i.test(href)){ geste('appel', href.replace(/^tel:/i, ''), libelle(a)); return; }
    if(/^mailto:/i.test(href)){ geste('courriel', href.replace(/^mailto:/i, '').split('?')[0], libelle(a)); return; }
    if(href === '' || href === '#' || /^javascript:/i.test(href)) return;
    var url;
    try { url = new URL(a.href, location.href); } catch(e){ return; }
    if(url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if(/\.pdf$/i.test(url.pathname)){
      var nom = url.pathname.split('/').pop();
      try { nom = decodeURIComponent(nom); } catch(e){}
      geste('telechargement', nom, libelle(a));
      return;
    }
    if(url.host !== location.host){
      var hote = url.hostname.replace(/^www\./, '');
      geste('lien_externe', /(^|\.)(wa\.me|whatsapp\.com)$/.test(hote) ? 'WhatsApp' : hote, libelle(a));
      return;
    }
    var destination = pageDe(url.pathname) + (url.hash || '');
    geste('navigation', zone(a) + ' → ' + destination, libelle(a));
  }

  function titreDe(el){
    var t = el.querySelector('h2, h3, h4');
    return t ? t.textContent : '';
  }

  document.addEventListener('click', function(e){
    var c = e.target;
    if(!c || !c.closest) return;
    var a = c.closest('a[href]');
    if(a) clicLien(a);

    /* une bannière agrandie (carrousel de l'accueil) */
    var ban = c.closest('.media-slide img:not(.sans-zoom), a[data-agrandir]');
    if(ban){
      var diapo = ban.closest('.hero-slide');
      geste('banniere', (diapo && diapo.getAttribute('data-label')) || ban.getAttribute('alt') || 'Bannière');
    }

    /* les photos d'une actualité ouvertes (page Actualités) */
    var vignette = c.closest('.news-card[data-galerie] .thumb');
    if(vignette && !a){
      var carte = vignette.closest('.news-card');
      geste('galerie', carte.getAttribute('data-galerie'), titreDe(carte));
    }

    /* un filtre choisi : catégorie d'actualités, niveau du calendrier des devoirs */
    var pastille = c.closest('.filter-chip');
    if(pastille){
      var texte = pastille.textContent.replace(/\s+/g, ' ').trim();
      if(texte && texte !== 'Toutes' && texte !== 'Tous'){
        geste('filtre', (pastille.closest('.dev-calendrier') ? 'devoirs' : 'actualités') + ' : ' + texte);
      }
    }

    /* l'emploi du temps imprimé ou enregistré en PDF */
    var pdf = c.closest('[onclick*="downloadPdf"]');
    if(pdf) geste('telechargement', 'impression : ' + page, libelle(pdf));

    /* l'emploi du temps d'une classe : on attend que le visiteur ait fini de choisir */
    var choix = c.closest('#cycleGroup .pill, #niveauGroup .pill, #classeGroup .pill');
    if(choix){
      window.clearTimeout(attenteClasse);
      attenteClasse = window.setTimeout(function(){
        var etiquette = document.getElementById('edtClassLabel');
        if(etiquette && etiquette.textContent.trim()) geste('classe', etiquette.textContent);
      }, 1200);
    }
  }, true);
  var attenteClasse = null;

  /* Ce que le visiteur tape lui-même ne doit jamais emporter une coordonnée : adresse électronique et
     longues suites de chiffres (téléphone, numéro d'élève) sont effacées AVANT l'envoi (le serveur
     refait le même nettoyage). */
  function epurer(texte){
    return texte.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, ' ').replace(/(?:\d[ .\-]?){9,}/g, '# ').replace(/\s+/g, ' ').trim();
  }

  /* un mot cherché dans les actualités : compté une fois que la frappe s'arrête */
  (function recherche(){
    var champ = document.querySelector('[data-stat-recherche], #news-q');
    if(!champ) return;
    var minuteur = null, precedent = '';
    champ.addEventListener('input', function(){
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(function(){
        var q = epurer(champ.value || '');
        if(q.length < 3 || q === precedent) return;
        precedent = q;
        var grille = document.querySelector('.news-list-grid');
        geste('recherche', q, null, grille ? grille.querySelectorAll('.news-card:not([hidden])').length : undefined);
      }, 1500);
    });
  })();

  /* les rubriques réellement lues : au moins 3 secondes à l'écran, comptée une fois par page */
  (function rubriques(){
    if(!('IntersectionObserver' in window)) return;
    var lues = {}, minuteurs = {};
    var seuils = [];
    for(var i = 0; i <= 20; i++) seuils.push(i / 20);
    var obs = new IntersectionObserver(function(entrees){
      entrees.forEach(function(en){
        var el = en.target, id = el.id;
        var assez = en.isIntersecting && (en.intersectionRatio >= 0.5 || en.intersectionRect.height >= 0.4 * (window.innerHeight || 1));
        if(assez && !lues[id] && !minuteurs[id]){
          minuteurs[id] = window.setTimeout(function(){
            delete minuteurs[id];
            if(document.visibilityState === 'visible'){
              lues[id] = true;
              geste('section', page + '#' + id, titreDe(el));
            }
          }, 3000);
        } else if(!assez && minuteurs[id]){
          window.clearTimeout(minuteurs[id]);
          delete minuteurs[id];
        }
      });
    }, { threshold: seuils });
    /* chaque avis de la zone d'avis de l'accueil (.avis[id]) compte aussi : on saura combien de visites l'ont lu */
    [].slice.call(document.querySelectorAll('section[id]:not([id^="sec-"]), #devoirs-t1, #carte, .news-card[id], .avis[id]')).forEach(function(el){
      if(el.id) obs.observe(el);
    });
  })();
})();
