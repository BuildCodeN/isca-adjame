/* ==================================================================
   NAVIGATION ENTRE RUBRIQUES
   ------------------------------------------------------------------
   Le site etait auparavant une seule page qui montrait tour a tour ses
   rubriques ; go() se contentait alors de deplacer une classe. Chaque
   rubrique ayant desormais son fichier, go() conduit a la page voulue.
   Elle est conservee sous ce nom parce que d'anciens gabarits et les
   liens internes l'appellent encore ; le second argument reste une
   ancre a l'interieur de la page d'arrivee.
   ================================================================== */
var PAGES_ISCA = {
  "accueil": "index.html",
  "etablissement": "etablissement.html",
  "scolarite": "scolarite.html",
  "vie-scolaire": "vie-scolaire.html",
  "admissions": "admissions.html",
  "paiement": "paiement.html",
  "actualites": "actualites.html",
  "contact": "contact.html",
  "enseignant": "espace-enseignant.html"
};

function go(cle, ancre){
  var cible = PAGES_ISCA[cle];
  if(!cible) return;                       /* cle inconnue : on ne fait rien */
  var ici = location.pathname.split('/').pop() || 'index.html';
  if(cible === ici){                       /* deja sur place : simple defilement */
    if(ancre){
      var el = document.getElementById(ancre);
      if(el){ el.scrollIntoView({behavior:'smooth', block:'start'}); return; }
    }
    window.scrollTo({top:0, behavior:'smooth'});
    return;
  }
  location.href = cible + (ancre ? '#' + ancre : '');
}

/* Reference gardee de cote : les blocs herites de la page unique
   enveloppent go() plusieurs fois de suite, et la derniere ligne de ce
   fichier lui rend cette version-ci. */
var _navigation = go;

/* Impression du document affiche (recus, emplois du temps). */
function downloadPdf(){ window.print(); }

/* ==================================================================
   ADRESSE DU BACK-END
   ------------------------------------------------------------------
   Cette adresse vit ici, et non dans le fichier d'une rubrique, parce
   que deux espaces s'y connectent : l'Espace Enseignant et l'acces
   parent de la page Paiement. Or chaque page ne charge que son propre
   fichier de rubrique — les deux ne se voient jamais.

   DEUX SITUATIONS.

   En developpement, le back-end ecoute sur le port 4000 de la meme
   machine. On deduit l'hote de la page : depuis l'ordinateur de
   travail cela reste localhost ; depuis un telephone sur le meme
   Wi-Fi (192.168.x.x) cela pointe vers la meme machine, sans reglage.

   EN LIGNE, ON N'APPELLE PAS « http:// » DEPUIS UNE PAGE « https:// ».
   Le navigateur refuse purement et simplement la requete — c'est le
   blocage du contenu mixte — et l'Espace Enseignant comme l'acces
   parent cesseraient de fonctionner, sans message d'erreur visible
   pour le visiteur. On appelle donc le meme domaine, dans le meme
   protocole, et c'est l'hebergeur qui renvoie « /api » vers le
   back-end (mandataire inverse). Voir la marche a suivre dans
   LISEZ-MOI.md, section « Mise en ligne sur Hostinger ».
   ================================================================== */
var API_BASE = (function(){
  var h = window.location.hostname;
  var enLocal = h === 'localhost' || h === '127.0.0.1'
             || /^192\.168\./.test(h) || /^10\./.test(h)
             || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  return enLocal ? 'http://' + h + ':4000' : window.location.origin;
})();

/* ==================================================================
   Revelation progressive au defilement
   ================================================================== */
  document.querySelectorAll('.subnav a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(){
      var group = a.closest('.subnav');
      group.querySelectorAll('a').forEach(function(x){ x.classList.remove('active'); });
      a.classList.add('active');
    });
  });

  /* ---------- Révélation progressive au défilement ---------- */
  var REVEAL_SELECTOR = [
    '.section-head', '.quick-card', '.lucarne', '.pillar', '.jeu-card',
    '.doc-card', '.test-card', '.news-card', '.activite-card', '.exam-card',
    '.sol-step', '.eval-block', '.info-card', '.timeline-item', '.acc-item',
    '.cycle-card', '.pay-method', '.hist-row', '.ech-table', '.mentions-table',
    '.interclasses', '.prep-callout', '.tests-band', '.class-chips', '.contact-form',
    '.t-row', '.bar-row', '.cal-step', '.tc-step', '.infra-card', '.pay-objet'
  ].join(',');

  /* Régime d'entrée par nature de contenu — voir §4 de la feuille de style.
     Un tableau de chiffres, un titre et une carte n'entrent pas pareil. */
  var REGIMES = [
    ['titre',   '.section-head'],
    ['filet',   '.t-row,.bar-row,.ech-table,.mentions-table,.timeline-item,.cal-step,.tc-step'],
    ['lecture', '.acc-item,.prep-callout,.eval-block,.contact-form,.interclasses']
  ];
  function regimeDe(el){
    for(var i = 0; i < REGIMES.length; i++){
      if(el.matches(REGIMES[i][1])) return REGIMES[i][0];
    }
    return 'carte';
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  || typeof IntersectionObserver === 'undefined';

  var observer = reduceMotion ? null : new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('seen');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  function primeReveals(section){
    if(!section || reduceMotion) return;
    section.querySelectorAll(REVEAL_SELECTOR).forEach(function(el){
      el.classList.add('reveal');
      el.classList.remove('seen');
      /* décalage en cascade entre éléments voisins d'un même conteneur */
      var siblings = Array.prototype.filter.call(el.parentNode.children, function(n){
        return n.classList && n.classList.contains('reveal');
      });
      var idx = siblings.indexOf(el);
      el.setAttribute('data-r', regimeDe(el));
      /* Cascade plus serrée quand les voisins sont nombreux : une grille
         de six cartes ne doit pas mettre une demi-seconde à se remplir. */
      var pas = siblings.length > 4 ? 95 : 130;
      el.style.setProperty('--d', (idx > 0 ? Math.min(idx, 5) * pas : 0) + 'ms');
      observer.observe(el);
    });
  }

  var _go = go;
  go = function(key, anchor){
    _go(key, anchor);
    var section = document.getElementById('sec-' + key);
    if(observer && section){
      section.querySelectorAll('.reveal').forEach(function(el){ observer.unobserve(el); });
      primeReveals(section);
    }
  };

  /* ==================================================================
     COMPTAGE DES CHIFFRES DE RÉSULTATS
     ------------------------------------------------------------------
     Les taux de réussite au BEPC et au Baccalauréat sont ce que
     l'établissement met en avant : ils méritent mieux qu'un affichage
     figé. Le nombre monte en même temps que sa barre, sur la même
     courbe, et s'arrête net sur la valeur exacte.
     La chasse est fixée en CSS (tabular-nums) : sans cela la mise en
     page tremblerait à chaque changement de chiffre.
     ================================================================== */
  (function compteurs(){
    var SEL = '.rc-pct, .bar-pct';
    if(reduceMotion){ return; }

    /* « 96,10% » -> {valeur:96.1, decimales:2, suffixe:'%'} */
    function analyser(txt){
      var m = /^([^0-9]*)([0-9]+(?:[.,][0-9]+)?)(.*)$/.exec(txt.trim());
      if(!m) return null;
      var brut = m[2].replace(',', '.');
      var pt   = m[2].indexOf(',') >= 0 ? m[2].indexOf(',') : m[2].indexOf('.');
      return {
        prefixe   : m[1],
        valeur    : parseFloat(brut),
        decimales : pt < 0 ? 0 : m[2].length - pt - 1,
        suffixe   : m[3]
      };
    }

    function formater(n, d){
      return n.toFixed(d).replace('.', ',');
    }

    function compter(el){
      var info = analyser(el.getAttribute('data-final') || el.textContent);
      if(!info) return;
      var debut = null;
      var duree = 1150;   /* --t-compte */
      var delai = 140;    /* aligné sur le départ de la barre */

      function pas(ts){
        if(debut === null) debut = ts;
        var t = (ts - debut - delai) / duree;
        if(t < 0){ requestAnimationFrame(pas); return; }
        if(t > 1) t = 1;
        /* décélération proche de --e-filet : vif au départ, fin longue */
        var e = 1 - Math.pow(1 - t, 4);
        el.textContent = info.prefixe + formater(info.valeur * e, info.decimales) + info.suffixe;
        if(t < 1) requestAnimationFrame(pas);
        else el.textContent = info.prefixe + formater(info.valeur, info.decimales) + info.suffixe;
      }
      requestAnimationFrame(pas);
    }

    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        obs.unobserve(e.target);
        compter(e.target);
      });
    }, { threshold: 0.5 });

    function primerCompteurs(section){
      if(!section) return;
      section.querySelectorAll(SEL).forEach(function(el){
        if(!el.hasAttribute('data-final')){
          el.setAttribute('data-final', el.textContent.trim());
        }
        obs.unobserve(el);
        el.textContent = el.getAttribute('data-final').replace(/[0-9]/g, '0');
        obs.observe(el);
      });
    }

    var _goC = go;
    go = function(key, anchor){
      _goC(key, anchor);
      primerCompteurs(document.getElementById('sec-' + key));
    };
    primerCompteurs(document.querySelector('.page-section.active'));
  })();

/* ==================================================================
   Tiroir de navigation (mobile)
   ================================================================== */
  /* ==================================================================
     TIROIR DE NAVIGATION — comportement
     ------------------------------------------------------------------
     Les liens ne sont pas dupliqués : les mêmes noeuds sont déplacés
     dans le tiroir en dessous de 900px et remis dans la barre au-dessus.
     Dupliquer aurait doublé les liens pour les lecteurs d'écran et
     dédoublé les gestionnaires data-nav.
     ================================================================== */
  (function tiroirNav(){
    var barre = document.querySelector('nav');
    var liens = document.querySelector('.navlinks');
    var conn  = document.querySelector('nav > .btn-connexion');
    if(!barre || !liens) return;

    var petit = window.matchMedia('(max-width:900px)');

    /* --- bouton d'ouverture --- */
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nav-toggle';
    bouton.setAttribute('aria-label', 'Ouvrir le menu de navigation');
    bouton.setAttribute('aria-expanded', 'false');
    bouton.setAttribute('aria-controls', 'nav-tiroir');
    bouton.innerHTML = '<span class="barre" aria-hidden="true"></span>';
    barre.appendChild(bouton);

    var voile = document.createElement('div');
    voile.className = 'nav-voile';
    document.body.appendChild(voile);

    var tiroir = document.createElement('aside');
    tiroir.className = 'nav-tiroir';
    tiroir.id = 'nav-tiroir';
    tiroir.setAttribute('role', 'dialog');
    tiroir.setAttribute('aria-modal', 'true');
    tiroir.setAttribute('aria-label', 'Navigation principale');
    tiroir.innerHTML =
      '<div class="tiroir-tete">' +
        '<span class="tt-nom">Institut Sacré Cœur d\'Adjamé</span>' +
        '<button type="button" class="tiroir-fermer" aria-label="Fermer le menu">✕</button>' +
      '</div>' +
      '<div class="tiroir-pied">' +
        '27 20 37 10-20<br>07 08 99 54 04<br>' +
        '<a href="mailto:collegeisca@gmail.com">collegeisca@gmail.com</a>' +
      '</div>';
    document.body.appendChild(tiroir);

    var tete = tiroir.querySelector('.tiroir-tete');
    var pied = tiroir.querySelector('.tiroir-pied');
    var fermerBtn = tiroir.querySelector('.tiroir-fermer');
    var ancre = document.createComment('emplacement navlinks');
    var ancreConn = document.createComment('emplacement connexion');
    liens.parentNode.insertBefore(ancre, liens);
    if(conn) conn.parentNode.insertBefore(ancreConn, conn);

    var dansTiroir = false;
    function placer(){
      if(petit.matches && !dansTiroir){
        tete.insertAdjacentElement('afterend', liens);
        if(conn) pied.insertAdjacentElement('beforebegin', conn);
        [].forEach.call(liens.children, function(a, i){
          a.style.setProperty('--dl', (60 + i * 38) + 'ms');
        });
        dansTiroir = true;
      } else if(!petit.matches && dansTiroir){
        ancre.parentNode.insertBefore(liens, ancre);
        if(conn) ancreConn.parentNode.insertBefore(conn, ancreConn);
        fermer(true);
        dansTiroir = false;
      }
    }

    /* --- ouverture / fermeture --- */
    function ouvrir(){
      document.body.classList.add('tiroir-ouvert');
      document.body.style.overflow = 'hidden';     /* verrou de défilement */
      bouton.setAttribute('aria-expanded', 'true');
      bouton.setAttribute('aria-label', 'Fermer le menu de navigation');
      setTimeout(function(){ fermerBtn.focus(); }, 60);
    }

    function fermer(sansFocus){
      if(!document.body.classList.contains('tiroir-ouvert')) return;
      document.body.classList.remove('tiroir-ouvert');
      document.body.style.overflow = '';
      bouton.setAttribute('aria-expanded', 'false');
      bouton.setAttribute('aria-label', 'Ouvrir le menu de navigation');
      /* Le focus revient toujours au bouton qui a ouvert le tiroir.
         Mémoriser document.activeElement à l'ouverture était fragile :
         si l'ouverture vient d'ailleurs que d'un clic direct sur le
         bouton, le focus repartait sur <body> et l'utilisateur au
         clavier se retrouvait en haut du document. */
      if(!sansFocus) bouton.focus();
    }

    bouton.addEventListener('click', function(){
      document.body.classList.contains('tiroir-ouvert') ? fermer() : ouvrir();
    });
    fermerBtn.addEventListener('click', function(){ fermer(); });
    voile.addEventListener('click', function(){ fermer(); });

    /* Toute navigation referme le tiroir : on ne laisse jamais
       l'utilisateur devant un menu ouvert sur une page déjà changée. */
    tiroir.addEventListener('click', function(e){
      if(e.target.closest('a[data-nav], .btn-connexion')) fermer(true);
    });

    document.addEventListener('keydown', function(e){
      if(!document.body.classList.contains('tiroir-ouvert')) return;
      if(e.key === 'Escape'){ fermer(); return; }
      if(e.key !== 'Tab') return;
      /* Piège de focus : sans lui, la tabulation repart derrière le
         voile, sur des liens que l'utilisateur ne voit plus. */
      var cibles = tiroir.querySelectorAll('a[href],button:not([disabled])');
      if(!cibles.length) return;
      var premier = cibles[0], dernier = cibles[cibles.length - 1];
      if(e.shiftKey && document.activeElement === premier){
        e.preventDefault(); dernier.focus();
      } else if(!e.shiftKey && document.activeElement === dernier){
        e.preventDefault(); premier.focus();
      }
    });

    if(petit.addEventListener) petit.addEventListener('change', placer);
    else if(petit.addListener) petit.addListener(placer);
    placer();
  })();

/* ==================================================================
   Curseur editorial
   ================================================================== */
  /* ==================================================================
     CURSEUR ÉDITORIAL + ATTRACTION DES DEUX CTA DU HERO
     ------------------------------------------------------------------
     Le curseur n'est monté que si l'appareil a une souris et un
     pointeur fin, et si l'utilisateur n'a pas demandé moins de
     mouvement. Si l'une de ces conditions manque, la classe n'est
     jamais posée et le curseur système reste seul maître.
     ================================================================== */
  (function curseurEditorial(){
    var fin  = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!fin || calm) return;

    var racine = document.documentElement;
    var lueur  = document.createElement('div');
    var anneau = document.createElement('div');
    var point  = document.createElement('div');
    lueur.className  = 'curseur-lueur';
    anneau.className = 'curseur';
    point.className  = 'curseur-point';
    [lueur, anneau, point].forEach(function(el){
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    });
    racine.classList.add('a-curseur');

    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;  /* pointeur */
    var ax = cx, ay = cy;                                          /* anneau  */
    var lx = cx, ly = cy;                                          /* lueur   */
    var actif = false;

    document.addEventListener('mousemove', function(e){
      cx = e.clientX; cy = e.clientY;
      if(!actif){ ax = lx = cx; ay = ly = cy; actif = true; }
      point.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
    }, {passive:true});

    /* L'anneau rejoint le pointeur par interpolation : c'est ce léger
       retard, et lui seul, qui donne au curseur une présence physique.
       0.19 = souple sans donner l'impression d'une latence. */
    (function boucle(){
      /* Trois coefficients, trois retards. La lueur traîne franchement
         (0.085) : c'est elle qui donne l'impression d'une source
         lumineuse que la main entraîne, et non d'un simple calque. */
      ax += (cx - ax) * 0.19;
      ay += (cy - ay) * 0.19;
      lx += (cx - lx) * 0.085;
      ly += (cy - ly) * 0.085;
      anneau.style.transform = 'translate(' + ax + 'px,' + ay + 'px)';
      lueur.style.transform  = 'translate(' + lx + 'px,' + ly + 'px)';
      requestAnimationFrame(boucle);
    })();

    var SEL_LIEN   = 'a,button,summary,[role="button"],.pay-objet,.quick-card,' +
                     '.lucarne,.news-card,.doc-card,.pill,.filter-chip,.page-btn';
    var SEL_CHAMP  = 'input,textarea,select';
    var SEL_AFFICHE= '.media-slide img';

    document.addEventListener('mouseover', function(e){
      var c = racine.classList;
      c.toggle('sur-affiche', !!e.target.closest(SEL_AFFICHE));
      c.toggle('sur-champ',   !!e.target.closest(SEL_CHAMP));
      c.toggle('sur-lien',    !!e.target.closest(SEL_LIEN) &&
                              !e.target.closest(SEL_AFFICHE) &&
                              !e.target.closest(SEL_CHAMP));
    });

    document.addEventListener('mousedown', function(){ racine.classList.add('presse'); });
    document.addEventListener('mouseup',   function(){ racine.classList.remove('presse'); });
    document.addEventListener('mouseleave',function(){ racine.classList.add('hors-cadre'); });
    document.addEventListener('mouseenter',function(){ racine.classList.remove('hors-cadre'); });

    /* ---- Les CTA du hero ne se déplacent plus --------------------
       L'attraction magnétique a été retirée à la demande : les deux
       boutons restent strictement immobiles au survol. Leur réaction
       passe désormais uniquement par la lumière — reflet sur l'or,
       remplissage par le bas sur le bouton bordé — et par l'enfoncement
       au clic, qui reste géré par la feuille de style. */
  })();

/* ==================================================================
   Bandeaux : courbes flottantes et titre lettre a lettre
   ================================================================== */
  /* ==================================================================
     BANDEAUX — courbes flottantes + titre lettre à lettre
     ------------------------------------------------------------------
     Équivalent natif du composant React « BackgroundPaths ». La
     construction est paresseuse : le SVG d'un bandeau n'est fabriqué
     qu'au moment où sa rubrique devient visible. Sans cela, les huit
     bandeaux additionneraient près de 400 chemins dans le document dès
     le premier chargement, pour n'en montrer qu'un seul.
     ================================================================== */
  (function bandeaux(){
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var COURBES = 22;   /* par sens */

    /* Géométrie reprise telle quelle du composant d'origine. */
    function trace(i, sens){
      var a = 380 - i * 5 * sens, b = 189 + i * 6;
      var c = 312 - i * 5 * sens, d = 216 - i * 6;
      var e = 152 - i * 5 * sens, f = 343 - i * 6;
      var g = 616 - i * 5 * sens, h = 470 - i * 6;
      var j = 684 - i * 5 * sens, k = 875 - i * 6;
      return 'M-' + a + ' -' + b + 'C-' + a + ' -' + b + ' -' + c + ' ' + d +
             ' ' + e + ' ' + f + 'C' + g + ' ' + h + ' ' + j + ' ' + k +
             ' ' + j + ' ' + k;
    }

    function couche(hote){
      if(hote.querySelector('.hero-paths')) return;
      var NS = 'http://www.w3.org/2000/svg';
      var boite = document.createElement('div');
      boite.className = 'hero-paths';
      boite.setAttribute('aria-hidden', 'true');

      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 696 316');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      svg.setAttribute('fill', 'none');

      [1, -1].forEach(function(sens){
        for(var i = 0; i < COURBES; i++){
          var p = document.createElementNS(NS, 'path');
          p.setAttribute('d', trace(i, sens));
          p.setAttribute('pathLength', '1');   /* normalise : dasharray en 0→1 */
          p.setAttribute('stroke', i % 3 === 0 ? 'var(--gold-soft)' : 'var(--gold)');
          p.setAttribute('stroke-width', (0.5 + i * 0.03).toFixed(2));
          p.setAttribute('stroke-opacity', (0.05 + i * 0.011).toFixed(3));
          p.style.setProperty('--dur', (30 + (i % 7) * 2.4).toFixed(1) + 's');
          p.style.setProperty('--lag', (-(i * 1.7)).toFixed(1) + 's');
          svg.appendChild(p);
        }
      });

      boite.appendChild(svg);
      hote.insertBefore(boite, hote.firstChild);
      requestAnimationFrame(function(){ boite.classList.add('visible'); });
    }

    /* --- Titre composé mot à mot ---------------------------------------
       Le texte est éclaté en <span>, ce qui le rendrait bavard aux
       lecteurs d'écran (un fragment annoncé par élément). On pose donc
       le titre complet en aria-label et on masque l'habillage.

       Le pas de la cascade n'est pas fixe. À 95ms le mot, « Un
       établissement catholique enraciné dans ses valeurs depuis 1961 »
       mettrait 760ms à se composer — le chapeau serait déjà là. Le total
       est donc plafonné à 520ms et le pas se resserre d'autant que le
       titre est long : « Contact » et le titre de L'Établissement se
       posent dans le même temps. */
    function composer(h1){
      if(!h1 || h1.dataset.compose === '1') return;
      var texte = h1.textContent.trim().replace(/\s+/g, ' ');
      h1.dataset.compose = '1';
      h1.setAttribute('aria-label', texte);

      var mots = texte.split(' ');
      var pas  = Math.min(95, Math.round(520 / Math.max(1, mots.length - 1)));

      var enveloppe = document.createElement('span');
      enveloppe.setAttribute('aria-hidden', 'true');

      mots.forEach(function(mot, i){
        var masque = document.createElement('span');
        masque.className = 'mot';
        var interieur = document.createElement('span');
        interieur.className = 'mot-i';
        interieur.textContent = mot;
        interieur.style.setProperty('--d', (140 + i * pas) + 'ms');
        masque.appendChild(interieur);
        enveloppe.appendChild(masque);
        if(i < mots.length - 1) enveloppe.appendChild(document.createTextNode(' '));
      });

      h1.textContent = '';
      h1.appendChild(enveloppe);
    }

    function rejouer(h1){
      if(!h1) return;
      h1.querySelectorAll('.mot-i').forEach(function(m){
        m.style.animation = 'none';
        void m.offsetWidth;          /* force le recalcul */
        m.style.animation = '';
      });
    }

    /* Six bandeaux sur huit portent une photographie de l'établissement.
       Y superposer 44 courbes dorées salirait l'image : la photo porte
       déjà tout le poids visuel. Les courbes ne servent donc que sur les
       deux bandeaux sans visuel — Actualités et Espace Enseignant — où
       elles remplacent un aplat marine autrement vide. */
    function aUnePhoto(el){
      return (getComputedStyle(el).backgroundImage || '').indexOf('url(') !== -1;
    }

    function equiper(cle){
      var sec = document.getElementById('sec-' + cle);
      if(!sec) return;
      var hero = sec.querySelector('.page-hero');
      if(!hero) return;
      if(!calm && !aUnePhoto(hero)) couche(hero);
      var h1 = hero.querySelector('h1');
      if(calm || !h1) return;
      if(h1.dataset.compose === '1') rejouer(h1); else composer(h1);
    }

    var _goB = go;
    go = function(cle, ancre){
      _goB(cle, ancre);
      equiper(cle);
    };
    /* La rubrique déjà ouverte au chargement */
    var actif = document.querySelector('.page-section.active');
    if(actif) equiper(actif.dataset.key);
  })();

/* ==================================================================
   Bordure pulsee (WebGL) — RETIREE
   ------------------------------------------------------------------
   Un canvas WebGL faisait circuler une lueur le long des bordures de
   trois bandeaux (etablissement, vie scolaire, paiement). Retire a la
   demande : sur des bandeaux qui portent desormais de vraies
   photographies, cette lueur se lisait comme un defaut d'affichage
   plutot que comme une intention.

   Avec elle disparaissent 260 lignes de shader et un contexte WebGL
   par bandeau — autant de batterie rendue aux telephones.

   Pour la retablir : ce bloc est dans l'historique, au commit qui
   porte « Les bandeaux perdent la lueur de leurs bordures ».
   ================================================================== */

/* ==================================================================
   Revelations bidirectionnelles et compteurs
   ================================================================== */
  /* ==================================================================
     RÉVÉLATIONS BIDIRECTIONNELLES + COMPTEURS DE STATISTIQUES
     ------------------------------------------------------------------
     Jusqu'ici un conteneur n'entrait qu'une fois : l'observateur le
     relâchait dès la première apparition. En remontant, la page était
     figée. Désormais chaque bloc se rejoue, et surtout il entre depuis
     le côté d'où vient le regard — par le bas quand on descend, par le
     haut quand on remonte. C'est ce détail qui distingue une animation
     de défilement travaillée d'un simple fondu : le mouvement suit la
     lecture au lieu de la contredire.
     Le réarmement n'a lieu que lorsque le bloc a *entièrement* quitté
     le cadre. Sans cette condition, un bloc à cheval sur le bord
     clignoterait à chaque cran de molette.
     ================================================================== */
  (function defilementBidirectionnel(){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var sens = 'bas';           /* direction courante du regard */
    var dernier = window.scrollY;

    window.addEventListener('scroll', function(){
      var y = window.scrollY;
      if(Math.abs(y - dernier) < 4) return;    /* seuil anti-frémissement */
      sens = y > dernier ? 'bas' : 'haut';
      document.documentElement.dataset.sens = sens;
      dernier = y;
    }, {passive:true});

    /* --- conteneurs ---------------------------------------------- */
    var obs = new IntersectionObserver(function(entrees){
      entrees.forEach(function(e){
        var el = e.target;
        if(e.isIntersecting){
          el.dataset.venu = sens;        /* fige le sens au moment d'entrer */
          el.classList.add('seen');
        } else if(e.intersectionRatio === 0){
          /* Sorti pour de bon : on réarme pour le prochain passage. */
          el.classList.remove('seen');
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: [0, 0.08] });

    /* On reprend la main sur l'observateur d'origine, qui relâchait
       chaque élément après sa première apparition. */
    function armer(section){
      if(!section) return;
      section.querySelectorAll('.reveal').forEach(function(el){
        obs.observe(el);
      });
    }

    var _goD = go;
    go = function(cle, ancre){
      _goD(cle, ancre);
      armer(document.getElementById('sec-' + cle));
    };
    armer(document.querySelector('.page-section.active'));

    /* ==================================================================
       COMPTEURS DE STATISTIQUES
       Les quatre chiffres de l'équipe pédagogique (30, 28, 65, 1961)
       montent à l'entrée dans le cadre.
       Cas particulier assumé : 1961 est une année, pas une quantité.
       La faire défiler depuis zéro donnerait un compteur kilométrique
       qui n'a aucun sens. Elle part donc de 1900 — le nombre se pose
       sur sa décennie au lieu de traverser deux millénaires.
       ================================================================== */
    function compteStat(el){
      var cible = parseInt(el.dataset.cible || el.textContent.replace(/\D/g, ''), 10);
      if(!isFinite(cible)) return;
      if(!el.dataset.cible) el.dataset.cible = cible;

      var annee  = cible >= 1800 && cible <= 2100;
      var depart = annee ? 1900 : 0;
      var duree  = annee ? 1500 : 1250;
      var t0 = null;

      function pas(ts){
        if(t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / duree);
        var e = 1 - Math.pow(1 - t, 4);        /* même décélération que les barres */
        el.textContent = Math.round(depart + (cible - depart) * e);
        if(t < 1) requestAnimationFrame(pas);
        else el.textContent = cible;
      }
      requestAnimationFrame(pas);
    }

    var obsStat = new IntersectionObserver(function(entrees){
      entrees.forEach(function(e){
        var el = e.target;
        if(e.isIntersecting && el.dataset.encours !== '1'){
          el.dataset.encours = '1';
          compteStat(el);
        } else if(e.intersectionRatio === 0){
          el.dataset.encours = '';          /* rejouable au prochain passage */
        }
      });
    }, { threshold: [0, 0.6] });

    function armerStats(section){
      if(!section) return;
      section.querySelectorAll('.stat .num, .stats-row .num').forEach(function(el){
        if(!/^\s*\d[\d\s.,]*\s*$/.test(el.textContent)) return;   /* que du chiffre */
        obsStat.observe(el);
      });
    }
    var _goS = go;
    go = function(cle, ancre){
      _goS(cle, ancre);
      armerStats(document.getElementById('sec-' + cle));
    };
    armerStats(document.querySelector('.page-section.active'));
  })();

/* ==================================================================
   Mention de defilement des tableaux
   ================================================================== */
  /* ==================================================================
     MENTION DE DÉFILEMENT DES TABLEAUX
     ------------------------------------------------------------------
     Un emploi du temps de cinq jours ne se replie pas : il défile
     horizontalement. Le dégradé au bord droit le suggère, mais rien ne
     le dit. Sur mobile, un tableau coupé net passe pour un défaut
     d'affichage — beaucoup d'utilisateurs n'essaient jamais de faire
     glisser. La mention n'apparaît que si le tableau déborde réellement,
     et disparaît dès qu'il tient dans le cadre.
     ================================================================== */
  (function mentionDefilement(){
    var FLECHE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M5 12h14M13 6l6 6-6 6"/></svg>';

    function poser(cadre){
      if(!cadre) return;
      var deborde = cadre.scrollWidth > cadre.clientWidth + 4;
      var m = cadre.previousElementSibling;
      var existe = m && m.classList && m.classList.contains('table-hint');
      if(deborde && !existe){
        var p = document.createElement('p');
        p.className = 'table-hint';
        p.innerHTML = FLECHE + ' Faites glisser le tableau vers la gauche pour voir la fin de la semaine.';
        cadre.parentNode.insertBefore(p, cadre);
      } else if(!deborde && existe){
        m.remove();
      }
    }

    function balayer(){
      document.querySelectorAll('.edt-frame, .ech-table-wrap, .table-wrap').forEach(poser);
    }

    var _goT = go;
    go = function(cle, ancre){ _goT(cle, ancre); setTimeout(balayer, 60); };
    window.addEventListener('resize', function(){ setTimeout(balayer, 120); });
    setTimeout(balayer, 200);
  })();

/* ==================================================================
   Enveloppe de defilement des tableaux
   ================================================================== */
  /* ==================================================================
     ENVELOPPE DE DÉFILEMENT DES TABLEAUX
     ------------------------------------------------------------------
     Le tableau des évaluations mesurait 469px dans un conteneur en
     overflow visible, sur un écran de 375 : il était rogné, sans que
     rien ne l'indique. Plutôt que de traiter ce cas isolément, tout
     tableau plus large que son conteneur reçoit une enveloppe qui
     défile. Les futurs tableaux en bénéficieront sans intervention.

     L'enveloppe n'est posée qu'une fois et n'est jamais retirée : la
     déplacer au gré des redimensionnements ferait sauter la mise en
     page sous les doigts.
     ================================================================== */
  (function envelopperTableaux(){
    function envelopper(t){
      var p = t.parentNode;
      if(p && p.classList && p.classList.contains('table-wrap')) return p;
      /* Certains tableaux ont déjà un parent qui défile — .frais-table
         par exemple. Créer une seconde enveloppe imbriquerait deux
         zones de défilement, ce qui rend le geste imprévisible : on se
         contente alors de marquer le parent existant pour qu'il reçoive
         le fondu et la mention. */
      if(p && p.nodeType === 1 && getComputedStyle(p).overflowX === 'auto'){
        p.classList.add('table-wrap');
        return p;
      }
      var w = document.createElement('div');
      w.className = 'table-wrap';
      p.insertBefore(w, t);
      w.appendChild(t);
      return w;
    }
    function balayer(){
      document.querySelectorAll('table').forEach(function(t){
        if(t.closest('.edt-frame')) return;          /* déjà pourvu */
        var p = t.parentNode;
        var large = t.scrollWidth > (p.clientWidth || t.clientWidth) + 4;
        if(large || t.classList.contains('eval-table')
                 || t.classList.contains('mentions-table')
                 || t.classList.contains('frais-table')
                 || t.classList.contains('ech-table')) envelopper(t);
      });
    }
    var _goW = go;
    go = function(c, a){ _goW(c, a); setTimeout(balayer, 40); };
    setTimeout(balayer, 150);
    window.addEventListener('resize', function(){ setTimeout(balayer, 150); });
  })();

/* ==================================================================
   RETOUR DE go() A SON SEUL ROLE
   ------------------------------------------------------------------
   Du temps ou une seule page portait les neuf rubriques, chaque bloc
   ci-dessus enveloppait go() pour se rebrancher au moment ou l'on
   passait d'une rubrique a l'autre : reveler les nouveaux blocs,
   reamorcer les compteurs, replacer les mentions de defilement.
   Ces greffes se sont empilees — huit au total.

   Chaque rubrique ayant desormais son fichier, changer de rubrique
   veut dire charger une page : tous ces blocs s'amorcent d'eux-memes
   au chargement, sur la section que la page affiche. Les greffes
   n'ont donc plus d'objet, et travailleraient dans une page qui est
   deja en train de partir. On rend ici a go() son unique role.
   ================================================================== */
go = _navigation;

/* ==================================================================
   OÙ SONT LES PHOTOGRAPHIES
   ------------------------------------------------------------------
   Elles sont rangées par catégorie d'actualité, sous
   « assets/images/Galeries_Photos/ ». Une carte qui ne dit rien est
   réputée relever des Événements ; pour une galerie rangée ailleurs,
   lui donner data-dossier (par exemple data-dossier="Vie scolaire").

   Les noms de dossiers portent espaces et accents : ils sont donc
   encodés pour l'adresse (l'espace devient %20, le « è » %C3%A8).
   C'est encodeURIComponent qui s'en charge — ne pas écrire l'adresse
   à la main.
   ================================================================== */
function dossierPhotos(carte){
  var d = (carte.dataset.dossier || 'Evènements').trim();
  return 'assets/images/Galeries_Photos/' + encodeURIComponent(d) + '/';
}

/* ==================================================================
   DÉFILEMENT DES VIGNETTES — UNE SEULE HORLOGE POUR TOUTES
   ------------------------------------------------------------------
   Ce bloc vit ici, dans le fichier commun, parce que DEUX pages s'en
   servent : la rubrique Actualités et le volet « Actualités récentes »
   de l'accueil. Une seule écriture, donc un seul comportement — deux
   copies auraient fini par diverger.

   Les activités illustrées changent de photographie au même instant.
   Une seule horloge bat pour l'ensemble des cartes : à chaque
   battement, chacune passe au cliché suivant. Les séries n'ont pas la
   même longueur, si bien qu'elles ne se rebouclent pas ensemble ; mais
   les transitions, elles, tombent toujours au même moment.

   Le visiteur peut reprendre la main sur une carte : flèches à la
   souris, pastilles, balayage au doigt, flèches du clavier. La carte
   se fige alors le temps qu'il la regarde, puis rejoint la cadence
   commune à l'endroit où il l'a laissée.

   Trois principes tenus ici. Le défilement ne conditionne jamais
   l'affichage : la première photographie est dans la page et se voit
   même si ce script ne s'exécute pas. Les suivantes sont montées après
   le premier affichage — l'accueil y gagne un demi-mégaoctet de plus
   qu'avant, ce qui est le prix du procédé. Et rien n'est peint pour une
   carte qu'on ne regarde pas, mais son rang avance quand même, pour
   qu'elle revienne en phase avec les autres.
   ================================================================== */
(function defilementVignettes(){
  var DUREE = 4200;    /* temps d'affichage d'une photographie */
  var REPIT = 12000;   /* après une action du visiteur, on lui laisse la main */

  var vignettes = [].slice.call(
    document.querySelectorAll('.news-card[data-galerie] .thumb.diapo'));
  if(!vignettes.length) return;

  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var horloge = null;
  var diapos = [];
  var temps = 0;   /* nombre de battements depuis le chargement */

  vignettes.forEach(function(vignette){
    var carte = vignette.closest('.news-card');
    var cle = carte.dataset.galerie;
    var nb = parseInt(carte.dataset.photos, 10) || 1;
    var legendes = (carte.dataset.legendes || '').split('|').map(function(s){ return s.trim(); });
    if(nb < 2) return;                     /* une seule photo : rien à parcourir */

    var premiere = vignette.querySelector('img');
    if(!premiere) return;

    var images = [premiere], points = [];
    var rang = 0, prete = false;
    var survole = false, repit = null, enVue = true, balaye = false;
    var titre = (carte.querySelector('h3') || {}).textContent || '';

    function afficher(){
      /* Le rang avance ; l'affichage, lui, ne saute pas sur une image
         qui n'est pas encore arrivee. On tient la precedente, et le
         « load » de la retardataire rappellera cette fonction. */
      var montre = rang;
      if(images[montre] && !images[montre].complete){
        var dejaLa = images.findIndex ? images.findIndex(function(im){
          return im.classList.contains('visible');
        }) : -1;
        if(dejaLa !== -1) montre = dejaLa;
      }
      images.forEach(function(im, i){ im.classList.toggle('visible', i === montre); });
      points.forEach(function(p, i){ p.classList.toggle('on', i === rang); });
      /* L'agrandissement lit ce rang pour s'ouvrir sur la photographie
         que l'on est en train de regarder. */
      vignette.dataset.rang = rang;
      /* L'intitulé n'a de sens que là où la vignette est elle-même un
         bouton — dans la rubrique Actualités. Sur l'accueil, c'est la
         carte entière qui est un lien : lui annoncer des flèches qu'elle
         n'a pas au clavier tromperait le visiteur. */
      if(vignette.getAttribute('role') === 'button'){
        vignette.setAttribute('aria-label',
          'Voir les photographies : ' + titre + ' — ' + (rang + 1) + ' sur ' + nb
          + '. Flèches gauche et droite pour les parcourir.');
      }
    }

    function mainDuVisiteur(){
      clearTimeout(repit);
      repit = setTimeout(function(){ repit = null; }, REPIT);
    }
    function figee(){ return survole || repit !== null; }

    function aller(cible){
      rang = ((cible % nb) + nb) % nb;
      afficher();
      mainDuVisiteur();
    }

    function commande(sens, pas, signe, intitule){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'diapo-cmd diapo-' + sens;
      b.tabIndex = -1;
      b.setAttribute('aria-hidden', 'true');
      b.title = intitule;
      b.textContent = signe;
      b.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();      /* parcourir n'agrandit pas, et ne suit pas le lien */
        aller(rang + pas);
      });
      vignette.appendChild(b);
    }

    /* ---------- Préparation, à l'approche de la carte ----------
       Les autres photographies ne sont pas dans la page servie, et ne
       sont demandées qu'ici. On règle le rang sur le nombre de
       battements déjà écoulés : la carte entre ainsi en phase avec les
       autres, sans rattrapage visible. */
    function preparer(){
      if(prete) return;
      prete = true;

      var suite = document.createDocumentFragment();
      for(var n = 2; n <= nb; n++){
        var img = document.createElement('img');
        var base = dossierPhotos(carte) + 'actu-' + cle + '-v' + n;
        /* Deux tailles, comme sur la vignette deja dans la page : le
           cadre d'une carte fait environ 380px de large, si bien qu'un
           ecran a un point par pixel — la plupart des ordinateurs —
           n'a que faire des 760. Le navigateur choisit seul. */
        /* L'ORDRE COMPTE. Poser « src » en premier lance aussitot le
           telechargement de la grande taille ; « srcset » arrivant
           ensuite, le navigateur choisissait la petite et la
           telechargeait a son tour — les deux, donc. On decrit d'abord
           le choix, on ne donne « src » qu'ensuite, comme recours pour
           les navigateurs qui ignorent srcset. */
        img.srcset = base + '-480.jpg 480w, ' + base + '.jpg 760w';
        img.sizes = '(max-width:1000px) 100vw, 380px';
        img.src = base + '.jpg';
        img.alt = legendes[n - 1] || '';
        /* Le navigateur les prend a l'approche du cadre, pas au
           chargement de la page : sur l'accueil, le volet est loin sous
           la ligne de flottaison, et ces cliches pesent un demi-
           megaoctet sur telephone. C'est lui qui decide du moment — pas
           un observateur maison, dont j'ai deja constate qu'il ne se
           declenche pas partout. */
        img.loading = 'lazy';
        /* Si une photographie n'est pas encore la quand son tour vient,
           on garde la precedente et l'on repasse des qu'elle arrive :
           jamais de cadre vide. */
        img.addEventListener('load', function(){ afficher(); });
        suite.appendChild(img);
        images.push(img);
      }
      images[0].classList.add('visible');
      premiere.parentNode.insertBefore(suite, premiere.nextSibling);
      vignette.classList.add('en-cours');

      /* Les commandes sont des repères pour la souris et le doigt. La
         vignette peut être elle-même un bouton, ou tenir dans un lien :
         dans les deux cas un élément actionnable ne peut pas en contenir
         d'autres. Elles restent donc hors du parcours de tabulation. */
      commande('prec', -1, '‹', 'Photographie précédente');
      commande('suiv',  1, '›', 'Photographie suivante');

      var barre = document.createElement('span');
      barre.className = 'diapo-points';
      barre.setAttribute('aria-hidden', 'true');
      for(var k = 0; k < nb; k++){
        (function(cible){
          var p = document.createElement('i');
          p.addEventListener('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            aller(cible);
          });
          barre.appendChild(p);
          points.push(p);
        })(k);
      }
      vignette.appendChild(barre);

      rang = temps % nb;
      afficher();
      diapos.push({
        /* Le rang avance même hors de l'écran : la carte reste en phase
           avec les autres, elle se contente de ne rien peindre. */
        battre: function(){
          if(figee()) return;
          rang = (rang + 1) % nb;
          if(enVue) afficher();
        }
      });
    }

    /* ---------- Clavier ----------
       Là où la vignette est un bouton, Entrée et Espace ouvrent
       l'agrandissement ; les flèches parcourent la série sur place. */
    vignette.addEventListener('keydown', function(e){
      if(!prete) return;
      if(e.key === 'ArrowLeft'){ e.preventDefault(); aller(rang - 1); }
      if(e.key === 'ArrowRight'){ e.preventDefault(); aller(rang + 1); }
    });

    /* ---------- Doigt ----------
       Un balayage horizontal fait défiler. On ne détourne pas un
       défilement vertical de la page, et un balayage n'ouvre pas
       l'agrandissement et ne suit pas le lien : le clic que le
       navigateur fabrique après le geste est intercepté avant
       d'atteindre la carte. */
    var x0 = null, y0 = null;
    vignette.addEventListener('touchstart', function(e){
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    vignette.addEventListener('touchend', function(e){
      if(x0 === null || !prete) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if(Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
      balaye = true;
      setTimeout(function(){ balaye = false; }, 400);
      aller(rang + (dx < 0 ? 1 : -1));
    }, { passive: true });
    carte.addEventListener('click', function(e){
      if(!balaye) return;
      balaye = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    /* ---------- Survol ----------
       L'écoute porte sur la carte entière, et non sur la seule
       vignette, parce que c'est la carte entière qui fait apparaître les
       commandes. Les deux signaux doivent coïncider : sinon, survoler le
       titre montrerait des flèches sur une vignette qui continue de
       défiler. */
    carte.addEventListener('mouseenter', function(){ survole = true; });
    carte.addEventListener('mouseleave', function(){ survole = false; });
    vignette.addEventListener('focusin', function(){ survole = true; });
    vignette.addEventListener('focusout', function(){ survole = false; });

    /* ---------- Hors de l'écran ----------
       L'observateur ne sert qu'à suspendre la peinture quand la carte
       s'éloigne, et il ne peut qu'infirmer : s'il ne se déclenche
       jamais, la carte est réputée visible et continue de s'afficher.

       Il a d'abord servi aussi à retarder le montage des photographies,
       pour épargner un demi-mégaoctet à l'accueil. C'est abandonné :
       l'observateur ne se déclenche pas partout, et une carte pouvait
       rester quatre secondes sans ses commandes. Une économie ne doit
       jamais conditionner l'affichage — les photographies sont donc
       montées tout de suite, comme dans la rubrique Actualités. */
    preparer();
    if(window.IntersectionObserver){
      new IntersectionObserver(function(entrees){
        entrees.forEach(function(en){
          var avant = enVue;
          enVue = en.isIntersecting;
          if(enVue && !avant) afficher();
        });
      }, { threshold: 0.15 }).observe(vignette);
    }
  });

  function battre(){
    temps++;
    diapos.forEach(function(d){ d.battre(); });
  }
  function lancer(){
    if(calme || horloge) return;
    horloge = setInterval(battre, DUREE);
  }
  function suspendre(){
    if(horloge){ clearInterval(horloge); horloge = null; }
  }
  document.addEventListener('visibilitychange', function(){
    document.hidden ? suspendre() : lancer();
  });
  lancer();
})();
