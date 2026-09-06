/* ==================================================================
   Carrousel de la page d'accueil
   ================================================================== */
  /* ============ CARROUSEL D'ACCUEIL ============
     Extensible : il lit les .hero-slide présents dans le DOM.
     Ajouter un slide dans le HTML suffit — aucune modification ici. */
  (function(){
    var slidesWrap = document.getElementById('heroSlides');
    if(!slidesWrap) return;

    var slides   = Array.prototype.slice.call(slidesWrap.querySelectorAll('.hero-slide'));
    var dotsWrap = document.getElementById('heroDots');
    var progress = document.getElementById('heroProgress');
    var DUREE    = 8000;   /* durée d'affichage d'un slide, en millisecondes */
    var index    = 0, timer = null, tick = null, debut = 0, enPause = false;
    var reduit   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if(slides.length === 0) return;

    /* --- Puces de navigation, générées d'après le nombre de slides --- */
    slides.forEach(function(slide, i){
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Aller au slide ' + (i+1) + (slide.dataset.label ? ' — ' + slide.dataset.label : ''));
      if(i === 0) b.classList.add('active');
      b.addEventListener('click', function(){ aller(i); relancer(); });
      dotsWrap.appendChild(b);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    /* --- Format unique pour tous les slides ---
       La hauteur est calculée pour que les visuels occupent exactement la
       surface du fond bleu : largeur pleine et hauteur proportionnelle.
       Le texte de la bannière ne doit jamais être coupé : on retient donc la
       plus grande des deux valeurs. Les futurs supports suivent la même règle. */
    /* Hauteur commune fixée à 13 cm (valeur lue dans la variable CSS
       --banniere-h). Le texte de la bannière ne doit jamais être coupé :
       si son contenu dépasse, la hauteur s'étend d'autant. */
    function hauteurReference(){
      var val = getComputedStyle(slidesWrap).getPropertyValue('--banniere-h').trim();
      var probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;height:' + (val || '13cm');
      slidesWrap.appendChild(probe);
      var px = probe.offsetHeight;
      slidesWrap.removeChild(probe);
      return px || 491;
    }
    function ajusterHauteur(){
      /* Sur grand écran toutes les diapositives ont des proportions
         voisines : une hauteur commune, calée sur la diapositive de
         texte, convient.

         Sur téléphone non. Les affiches sont au format 3160 x 800 —
         un bandeau de rapport 4:1 — soit 95px de haut sur une largeur
         de 375. La piste restant figée à la hauteur du texte, il en
         résultait plus de six cents pixels de marine vide autour d'une
         mince bande d'image. La piste suit donc la diapositive
         réellement affichée. */
      /* Sur téléphone, la piste ne reçoit plus de hauteur calculée.
         Mesurer une diapositive pendant son fondu s'est révélé
         structurellement fragile : la valeur lue retardait d'un cran,
         et la différer d'une image ne corrigeait qu'une partie des cas.
         La feuille de style masque désormais les diapositives inactives,
         si bien que la piste épouse naturellement celle qui s'affiche.
         Aucune mesure, aucun décalage possible. */
      if(window.matchMedia('(max-width:900px)').matches){
        slidesWrap.style.height = '';
        return;
      }
      var base = hauteurReference();
      slidesWrap.style.height = base + 'px';
      var contenu = slides[0] ? slides[0].offsetHeight : 0;
      if(contenu > base) slidesWrap.style.height = Math.round(contenu) + 'px';
    }

    /* --- Passage d'une diapositive à l'autre ---
       Fondu enchaîné : la diapositive sortante s'efface pendant que
       l'entrante apparaît. Seule l'opacité varie, aucun déplacement. */
    function aller(i){
      var cible = (i + slides.length) % slides.length;
      if(cible === index) return;
      slides[cible].classList.add('is-active');
      slides[index].classList.remove('is-active');
      index = cible;
      dots.forEach(function(d, n){ d.classList.toggle('active', n === index); });
      ajusterHauteur();
    }

    window.heroNext = function(){ aller(index + 1); relancer(); };
    window.heroPrev = function(){ aller(index - 1); relancer(); };

    /* --- Lecture automatique avec barre de progression --- */
    function relancer(){
      clearTimeout(timer); clearInterval(tick);
      if(reduit || slides.length < 2){ if(progress) progress.style.width = '0'; return; }
      debut = Date.now();
      timer = setTimeout(function(){ aller(index + 1); relancer(); }, DUREE);
      tick = setInterval(function(){
        if(enPause) return;
        var pct = Math.min(100, (Date.now() - debut) / DUREE * 100);
        if(progress) progress.style.width = pct + '%';
      }, 120);
    }

    var slider = document.getElementById('heroSlider');
    slider.addEventListener('mouseenter', function(){
      enPause = true; clearTimeout(timer);
    });
    slider.addEventListener('mouseleave', function(){
      enPause = false; relancer();
    });
    document.addEventListener('visibilitychange', function(){
      if(document.hidden){ clearTimeout(timer); } else { relancer(); }
    });

    /* --- Navigation au clavier --- */
    slider.addEventListener('keydown', function(e){
      if(e.key === 'ArrowRight') window.heroNext();
      if(e.key === 'ArrowLeft')  window.heroPrev();
    });

    /* --- Balayage tactile (mobile) --- */
    var x0 = null;
    slider.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; }, {passive:true});
    slider.addEventListener('touchend', function(e){
      if(x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if(Math.abs(dx) > 45){ dx < 0 ? window.heroNext() : window.heroPrev(); }
      x0 = null;
    }, {passive:true});

    /* --- Agrandissement des visuels --- */
    var lb = document.getElementById('lightbox'), lbImg = document.getElementById('lightboxImg');
    slidesWrap.querySelectorAll('.media-slide img').forEach(function(img){
      img.addEventListener('click', function(){
        lbImg.src = img.src; lbImg.alt = img.alt; lb.classList.add('open');
      });
    });
    window.closeLightbox = function(){ lb.classList.remove('open'); };
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') window.closeLightbox();
    });

    /* --- Recalcul de la hauteur quand la mise en page bouge --- */
    window.addEventListener('resize', ajusterHauteur);
    window.addEventListener('load', ajusterHauteur);
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(ajusterHauteur);
    slidesWrap.querySelectorAll('img').forEach(function(im){
      if(!im.complete) im.addEventListener('load', ajusterHauteur);
    });
    if(window.ResizeObserver){
      new ResizeObserver(ajusterHauteur).observe(slides[0]);
    }

    ajusterHauteur();
    setTimeout(ajusterHauteur, 300);
    relancer();
  })();
  


/* ==================================================================
   BANDEAU D'INFORMATION — LES MESSAGES SE RELAIENT
   ------------------------------------------------------------------
   Chaque message entre par la droite, bat deux fois pour attraper
   l'œil, se pose le temps d'être lu, puis sort par la gauche pendant
   que le suivant entre. Le battement dure 2,1 s ; le message reste
   ensuite immobile plus de quatre secondes.

   Le nombre s'ajuste tout seul : ajouter un <p class="fl-msg"> suffit,
   les pastilles suivent.

   Trois précautions.

   Sans ce script, les messages restent tous affichés, l'un sous
   l'autre : une annonce de la direction ne doit pas dépendre d'un
   JavaScript pour être lue.

   Le survol et le focus suspendent le relais, et la reprise repart du
   temps écoulé — on ne fait pas filer un texte qu'on est en train de
   lire, et on ne le rejoue pas depuis le début.

   Les messages restent tous dans la page, superposés : un lecteur
   d'écran les annonce tous, même si l'œil n'en voit qu'un.
   ================================================================== */
(function bandeauRelais(){
  var bandeau = document.querySelector('.flash-relais');
  if(!bandeau) return;

  /* Une info flash a une fin. Passé la date, le bandeau s'efface de
     lui-même. Le script ne fait que MASQUER : s'il ne s'exécute pas,
     l'annonce reste visible — jamais l'inverse. */
  var jusquAu = bandeau.dataset.jusquAu;
  if(jusquAu){
    var fin = new Date(jusquAu + 'T23:59:59');
    if(!isNaN(fin.getTime()) && Date.now() > fin.getTime()){
      bandeau.hidden = true;
      return;
    }
  }

  var piste = bandeau.querySelector('.fl-piste');
  var messages = [].slice.call(bandeau.querySelectorAll('.fl-msg'));
  var barre = bandeau.querySelector('.fl-points');
  if(!piste || messages.length < 2) return;

  /* Moins de mouvement : pas de relais. Les messages restent tous
     affichés — rien n'est perdu. */
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var DUREE = 6500;    /* 2,1 s de battement, puis plus de quatre secondes de lecture */
  var SORTIE = 560;    /* le temps que le message sortant quitte la piste */
  var rang = 0, minuteur = null, depart = 0, suspendu = false;

  /* La piste prend la hauteur du plus grand message : sur téléphone
     ils se replient sur deux ou trois lignes, et le bandeau ne doit
     pas sauter d'un message à l'autre. */
  function caler(){
    var h = 0;
    messages.forEach(function(m){
      m.style.position = 'static';
      h = Math.max(h, m.offsetHeight);
      m.style.position = '';
    });
    piste.style.height = h + 'px';
  }

  var points = [];
  if(barre){
    messages.forEach(function(_, i){
      var p = document.createElement('i');
      p.title = 'Message ' + (i + 1);
      p.addEventListener('click', function(){ aller(i); relancer(); });
      barre.appendChild(p);
      points.push(p);
    });
  }

  function aller(i){
    var cible = ((i % messages.length) + messages.length) % messages.length;
    if(cible === rang && messages[rang].classList.contains('visible')) return;
    var sortant = messages[rang];
    if(sortant !== messages[cible]){
      sortant.classList.remove('visible');
      sortant.classList.add('sortant');
      setTimeout(function(){ sortant.classList.remove('sortant'); }, SORTIE);
    }
    rang = cible;
    messages[rang].classList.add('visible');
    points.forEach(function(p, i2){ p.classList.toggle('on', i2 === rang); });
  }

  function relancer(){
    clearTimeout(minuteur);
    depart = Date.now();
    minuteur = setTimeout(function(){ aller(rang + 1); relancer(); }, DUREE);
  }
  function suspendre(){
    if(suspendu) return;
    suspendu = true;
    clearTimeout(minuteur);
  }
  function reprendre(){
    if(!suspendu) return;
    suspendu = false;
    /* On repart du temps déjà écoulé, sans rejouer le message. */
    var reste = Math.max(900, DUREE - (Date.now() - depart));
    clearTimeout(minuteur);
    minuteur = setTimeout(function(){ aller(rang + 1); relancer(); }, reste);
  }

  bandeau.addEventListener('mouseenter', suspendre);
  bandeau.addEventListener('mouseleave', reprendre);
  bandeau.addEventListener('focusin', suspendre);
  bandeau.addEventListener('focusout', reprendre);
  document.addEventListener('visibilitychange', function(){
    document.hidden ? suspendre() : reprendre();
  });

  /* Le bandeau passe sous la conduite du script. */
  bandeau.classList.add('en-relais');
  caler();
  messages[0].classList.add('visible');
  points.forEach(function(p, i){ p.classList.toggle('on', i === 0); });
  relancer();

  var t;
  window.addEventListener('resize', function(){
    clearTimeout(t);
    t = setTimeout(caler, 160);
  });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(caler);
})();
