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
   Deduite du nom d'hote de la page plutot que figee en dur : depuis
   l'ordinateur de travail cela reste localhost ; depuis un telephone
   sur le meme Wi-Fi (192.168.x.x) cela pointe vers la meme machine,
   sans reglage a changer.
   Cette adresse vit ici, et non dans le fichier d'une rubrique, parce
   que deux espaces s'y connectent : l'Espace Enseignant et l'acces
   parent de la page Paiement. Or chaque page ne charge que son propre
   fichier de rubrique — les deux ne se voient jamais.
   ================================================================== */
var API_BASE = 'http://' + window.location.hostname + ':4000';

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
   Bordure pulsee (WebGL)
   ================================================================== */
  /* ==================================================================
     BORDURE PULSÉE — portage WebGL natif
     ------------------------------------------------------------------
     Équivalent du composant React « ShaderBackground » (Paper Shaders,
     Apache-2.0). Le composant d'origine n'a aucune dépendance : c'est un
     canvas WebGL piloté par un useEffect. Le portage est donc mécanique
     — même source GLSL au caractère près, useEffect remplacé par une
     initialisation directe.
     Deux adaptations indispensables :
       1. La palette d'origine est bleu/cyan. Sur une charte marine-or-
          bordeaux, le cyan jurerait. La couleur de fond passe au NOIR et
          le canvas est composé en « screen » : le noir devient
          transparent, seule la bordure lumineuse subsiste au-dessus de
          la photographie du bandeau.
       2. Le rendu s'arrête hors champ, onglet masqué, et en mouvement
          réduit. Trois canvas WebGL qui tournent en permanence
          videraient la batterie d'un téléphone.
     ================================================================== */
  (function bordurePulsee(){
    var CIBLES = ['etablissement', 'vie-scolaire', 'paiement'];

    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var VERT = 'attribute vec2 a_position;\n' +
      'void main() { gl_Position = vec4(a_position, 0.0, 1.0); }';

    var FRAG = [
      "#ifdef GL_FRAGMENT_PRECISION_HIGH",
      "precision highp float;",
      "#else",
      "precision mediump float;",
      "#endif",
      "uniform vec3 u_colors[8];",
      "uniform vec4 u_scene;",
      "uniform vec4 u_shape;",
      "uniform vec4 u_surface;",
      "uniform vec4 u_finish;",
      "uniform vec4 u_transform;",
      "uniform vec4 u_space;",
      "uniform vec4 u_cursor;",
      "#define u_resolution u_scene.xy",
      "#define u_time u_scene.z",
      "#define u_colorCount u_scene.w",
      "#define u_scale u_shape.x",
      "#define u_intensity u_shape.y",
      "#define u_paramA u_shape.z",
      "#define u_warp u_shape.w",
      "#define u_detail u_surface.x",
      "#define u_contrast u_surface.y",
      "#define u_brightness u_surface.z",
      "#define u_saturation u_surface.w",
      "#define u_hue u_finish.x",
      "#define u_vignette u_finish.y",
      "#define u_blur u_finish.z",
      "#define u_grain u_finish.w",
      "#ifdef GL_FRAGMENT_PRECISION_HIGH",
      "#define u_seed u_transform.x",
      "#else",
      "#define u_seed mod(u_transform.x, 31.0)",
      "#endif",
      "#define u_rotate u_transform.y",
      "#define u_drift u_transform.z",
      "#define u_oklab u_transform.w",
      "#define u_offset u_space.xy",
      "#define u_mouse u_space.zw",
      "#define u_cursorPresence u_cursor.x",
      "#define u_cursorEffect u_cursor.y",
      "#define u_cursorStrength u_cursor.z",
      "#define u_cursorRadius u_cursor.w",
      "float hash21(vec2 p) {",
      "#ifndef GL_FRAGMENT_PRECISION_HIGH",
      "  p = mod(p, 31.0);",
      "#endif",
      "  p = fract(p * vec2(234.34, 435.345));",
      "  p += dot(p, p + 34.23);",
      "  return fract(p.x * p.y);",
      "}",
      "float grainHash(vec2 p) {",
      "  vec3 p3 = fract(vec3(p.xyx) * 0.1031);",
      "  p3 += dot(p3, p3.yzx + 33.33);",
      "  return fract((p3.x + p3.y) * p3.z);",
      "}",
      "float noise(vec2 p) {",
      "  vec2 i = floor(p);",
      "  vec2 f = fract(p);",
      "  vec2 u = f * f * (3.0 - 2.0 * f);",
      "  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),",
      "             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);",
      "}",
      "float fbm(vec2 p) {",
      "  float v = 0.0; float a = 0.5;",
      "  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.2); a *= 0.5; }",
      "  return v;",
      "}",
      "vec3 mixColour(vec3 a, vec3 b, float t) { return mix(a, b, t); }",
      "vec3 palette(float x) {",
      "  float n = max(u_colorCount - 1.0, 1.0);",
      "  float f = clamp(x, 0.0, 1.0) * n;",
      "  vec3 col = u_colors[0];",
      "  for (int i = 0; i < 7; i++) {",
      "    if (float(i) < n)",
      "      col = mixColour(col, u_colors[i + 1], smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));",
      "  }",
      "  return col;",
      "}",
      "vec3 shade(vec2 uv, vec2 p, float t) {",
      "  // Le cadre d'origine etait fixe a (0.82, 0.47) : sur un bandeau",
      "  // large, il tombait 35% en retrait des bords lateraux et 25% des",
      "  // bords haut et bas — un rectangle lumineux flottant au milieu de",
      "  // l'image au lieu d'en souligner le pourtour. On le calcule donc",
      "  // a partir de la resolution reelle, ce qui le fait epouser les",
      "  // bords quel que soit le format du bandeau.",
      "  float thickness = mix(0.018, 0.11, u_paramA);",
      "  vec2 demi = 0.5 * u_resolution / min(u_resolution.x, u_resolution.y) * u_scale;",
      "  vec2 box = max(demi - vec2(thickness * 1.25), vec2(0.02));",
      "  vec2 d = abs(p) - box;",
      "  float outside = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);",
      "  float edge = 1.0 - smoothstep(thickness * 0.35, thickness, abs(outside));",
      "  float perimeter = atan(p.y * box.x, p.x * box.y) / 6.2831853 + 0.5;",
      "  float pulse = 0.5 + 0.5 * sin(perimeter * (5.0 + u_intensity * 9.0) - t * 1.8);",
      "  float trail = pow(pulse, mix(7.0, 2.0, u_intensity));",
      "  float innerGlow = exp(-abs(outside) * 24.0) * 0.32;",
      "  return mix(u_colors[0], palette(trail), clamp(edge + innerGlow, 0.0, 1.0));",
      "}",
      "void main() {",
      "  vec2 uv = gl_FragCoord.xy / u_resolution.xy;",
      "  vec2 screenUv = uv;",
      "  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);",
      "  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;",
      "  p *= u_scale;",
      "  if (abs(u_rotate) > 0.0001) { float cr = cos(u_rotate), sr = sin(u_rotate); p = mat2(cr, -sr, sr, cr) * p; }",
      "  p += u_offset;",
      "  if (u_drift > 0.0001) p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));",
      "  if (u_warp > 0.0) p += u_warp * (vec2(fbm(p * u_detail + u_seed), fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);",
      "  vec3 col = shade(uv, p, u_time);",
      "  if (abs(u_contrast - 1.0) > 0.0001) col = (col - 0.5) * u_contrast + 0.5;",
      "  if (abs(u_brightness) > 0.0001) col += u_brightness;",
      "  if (u_vignette > 0.0001) { float vd = length(screenUv - 0.5) * 1.41421356; col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd); }",
      "  if (u_grain > 0.0001) col += (grainHash(gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;",
      "  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);",
      "}"
    ].join('\n');

    var U = {
      colors: [
        [0.000, 0.000, 0.000],
        [0.478, 0.133, 0.192],
        [0.788, 0.635, 0.294],
        [0.894, 0.804, 0.557]
      ],
      colorCount: 4,
      scale: 1.26, intensity: 0.28, paramA: 0.22, warp: 0.0,
      detail: 1.824, contrast: 1.005, brightness: 0.0,
      vignette: 0.0, grain: 0.0,
      seed: 3.0, rotate: 0.0, offsetX: 0.0, offsetY: 0.0, drift: 0.0,
      timeScale: 0.30
    };

    function monter(hote){
      if(hote.querySelector('.hero-shader')) return;
      var cv = document.createElement('canvas');
      cv.className = 'hero-shader';
      cv.setAttribute('aria-hidden', 'true');
      hote.insertBefore(cv, hote.firstChild);

      var gl = cv.getContext('webgl', {antialias:false, alpha:false})
            || cv.getContext('experimental-webgl', {antialias:false, alpha:false});
      if(!gl){ cv.remove(); return; }

      function compiler(type, src){
        var s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
          console.warn('shader', gl.getShaderInfoLog(s)); return null;
        }
        return s;
      }
      var vs = compiler(gl.VERTEX_SHADER, VERT);
      var fs = compiler(gl.FRAGMENT_SHADER, FRAG);
      if(!vs || !fs){ cv.remove(); return; }

      var prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs); gl.deleteShader(fs);
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'a_position');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      function u(n){ return gl.getUniformLocation(prog, n); }
      var plat = [];
      for(var i = 0; i < 8; i++) plat = plat.concat(U.colors[i] || U.colors[U.colors.length-1]);
      gl.uniform3fv(u('u_colors'), new Float32Array(plat));
      gl.uniform4f(u('u_shape'),     U.scale, U.intensity, U.paramA, U.warp);
      gl.uniform4f(u('u_surface'),   U.detail, U.contrast, U.brightness, 1.0);
      gl.uniform4f(u('u_finish'),    0.0, U.vignette, 0.0, U.grain);
      gl.uniform4f(u('u_transform'), U.seed, U.rotate, U.drift, 0.0);
      gl.uniform4f(u('u_cursor'),    0, 0, 0, 0);
      gl.uniform4f(u('u_space'),     U.offsetX, U.offsetY, 0, 0);
      var uScene = u('u_scene');

      var raf = 0, visible = true, dansLeCadre = true;
      var depart = performance.now();

      function dimensionner(){
        var r = cv.getBoundingClientRect();
        if(!r.width || !r.height) return false;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var bw = Math.max(1, Math.round(r.width * dpr));
        var bh = Math.max(1, Math.round(r.height * dpr));
        var ech = Math.min(1, Math.sqrt(2000000 / Math.max(1, bw * bh)));
        var w = Math.max(1, Math.round(bw * ech));
        var h = Math.max(1, Math.round(bh * ech));
        if(cv.width !== w || cv.height !== h){
          cv.width = w; cv.height = h; gl.viewport(0, 0, w, h);
        }
        return true;
      }

      function rendre(now){
        raf = 0;
        if(!visible || !dansLeCadre) return;
        if(!dimensionner()){ demander(); return; }
        gl.uniform4f(uScene, cv.width, cv.height,
                     ((now - depart) / 1000) * U.timeScale, U.colorCount);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        demander();
      }
      function demander(){ if(!raf && visible && dansLeCadre) raf = requestAnimationFrame(rendre); }
      function suspendre(){ if(raf){ cancelAnimationFrame(raf); raf = 0; } }

      new IntersectionObserver(function(e){
        dansLeCadre = e[0] ? e[0].isIntersecting : true;
        if(dansLeCadre) demander(); else suspendre();
      }).observe(cv);

      document.addEventListener('visibilitychange', function(){
        visible = document.visibilityState === 'visible';
        if(visible) demander(); else suspendre();
      });
      window.addEventListener('resize', function(){ dimensionner(); demander(); });
      demander();
    }

    function equiperShader(cle){
      if(CIBLES.indexOf(cle) === -1) return;
      var sec = document.getElementById('sec-' + cle);
      var hero = sec && sec.querySelector('.page-hero');
      if(hero) monter(hero);
    }

    var _goSh = go;
    go = function(cle, ancre){
      _goSh(cle, ancre);
      equiperShader(cle);
    };
    var actif = document.querySelector('.page-section.active');
    if(actif) equiperShader(actif.dataset.key);
  })();

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
