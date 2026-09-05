/* ==================================================================
   Filtres et recherche des actualites
   ================================================================== */
  /* ==================================================================
     FILTRES ET RECHERCHE DES ACTUALITÉS
     ------------------------------------------------------------------
     Les pastilles de filtre, la boîte de recherche et la pagination
     étaient de simples <span> sans le moindre gestionnaire : des
     contrôles qui avaient l'air actionnables et ne faisaient rien, ni à
     la souris ni au clavier. Les deux premiers sont ici câblés pour de
     bon ; la pagination reste à traiter côté contenu (voir le rapport).
     ================================================================== */
  (function filtresActualites(){
    var chips  = [].slice.call(document.querySelectorAll('.filters-section .filter-chip'));
    var champ  = document.getElementById('news-q');
    var grille = document.querySelector('.news-list-grid');
    if(!chips.length || !grille) return;

    var cartes = [].slice.call(grille.querySelectorAll('.news-card'));
    var categorie = 'Toutes';

    /* Zone d'annonce pour les lecteurs d'écran : sans elle, un
       utilisateur non voyant filtre sans jamais savoir ce qu'il obtient. */
    var annonce = document.createElement('p');
    annonce.className = 'sr-only';
    annonce.setAttribute('aria-live', 'polite');
    grille.parentNode.insertBefore(annonce, grille);

    /* État vide : la catégorie « Résultats » ne correspond aujourd'hui à
       aucune actualité. Sans message, la grille se vide sans explication. */
    var vide = document.createElement('p');
    vide.className = 'news-vide';
    vide.hidden = true;
    vide.textContent = 'Aucune actualité ne correspond à cette recherche.';
    grille.parentNode.insertBefore(vide, grille.nextSibling);

    function sansAccent(s){
      return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
    }

    function appliquer(){
      var q = sansAccent((champ ? champ.value : '').trim().toLowerCase());
      var n = 0;
      cartes.forEach(function(c){
        var cat = (c.querySelector('.ncat') || {}).textContent || '';
        var okCat = categorie === 'Toutes' || cat.trim() === categorie;
        var okTxt = !q || sansAccent(c.textContent.toLowerCase()).indexOf(q) !== -1;
        var montre = okCat && okTxt;
        c.hidden = !montre;
        if(montre) n++;
      });
      vide.hidden = n > 0;
      annonce.textContent = n === 0
        ? 'Aucune actualité trouvée.'
        : n + (n > 1 ? ' actualités affichées.' : ' actualité affichée.');
    }

    chips.forEach(function(chip){
      chip.addEventListener('click', function(){
        chips.forEach(function(c){
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
        categorie = chip.textContent.trim();
        appliquer();
      });
    });

    if(champ){
      var t;
      champ.addEventListener('input', function(){
        clearTimeout(t);
        t = setTimeout(appliquer, 160);   /* on ne filtre pas à chaque frappe */
      });
    }
  })();


/* ==================================================================
   GALERIE DES ACTIVITÉS
   ------------------------------------------------------------------
   Chaque carte illustrée déclare sa galerie : data-galerie porte la
   clé des fichiers, data-photos leur nombre, data-legendes les
   légendes séparées par une barre verticale.

   Les photographies en pleine taille ne sont pas dans la page : elles
   ne sont demandées qu'au moment où on les regarde. Une carte qui
   n'est jamais ouverte ne coûte donc que sa vignette.
   ================================================================== */
(function galerieActivites(){
  var boite = document.getElementById('lightbox');
  var img = document.getElementById('lightboxImg');
  var legende = document.getElementById('lb-legende');
  var prec = document.getElementById('lb-prec');
  var suiv = document.getElementById('lb-suiv');
  var fermer = document.getElementById('lb-fermer');
  if(!boite || !img) return;

  var cartes = [].slice.call(document.querySelectorAll('.news-card[data-galerie]'));
  if(!cartes.length) return;

  var serie = [], rang = 0, declencheur = null;

  function montrer(i){
    if(!serie.length) return;
    rang = (i + serie.length) % serie.length;   /* la série boucle */
    img.src = serie[rang].src;
    img.alt = serie[rang].legende;
    legende.textContent = serie.length > 1
      ? serie[rang].legende + '  (' + (rang + 1) + ' sur ' + serie.length + ')'
      : serie[rang].legende;
    var plusieurs = serie.length > 1;
    prec.hidden = !plusieurs;
    suiv.hidden = !plusieurs;
  }

  function ouvrir(carte){
    var cle = carte.dataset.galerie;
    var nb = parseInt(carte.dataset.photos, 10) || 1;
    var legendes = (carte.dataset.legendes || '').split('|').map(function(s){ return s.trim(); });
    serie = [];
    for(var n = 1; n <= nb; n++){
      serie.push({
        src: 'assets/images/actu-' + cle + '-' + n + '.jpg',
        legende: legendes[n - 1] || (carte.querySelector('h3') || {}).textContent || ''
      });
    }
    declencheur = carte.querySelector('.thumb img') || carte;
    /* On ouvre sur la photographie que la vignette affiche a cet
       instant, et non sur la premiere : le visiteur qui a parcouru la
       serie jusqu'au quatrieme cliche veut l'agrandir, celui-la. Le
       rang est pose sur la vignette par le defilement, plus bas ; sans
       defilement il n'existe pas, et l'on part de la premiere. */
    var vignette = carte.querySelector('.thumb');
    montrer(parseInt(vignette && vignette.dataset.rang, 10) || 0);
    boite.classList.add('open');
    fermer.focus();
  }

  function refermer(){
    boite.classList.remove('open');
    img.removeAttribute('src');     /* on ne garde pas l'image en mémoire */
    if(declencheur && declencheur.focus) declencheur.focus();
  }

  cartes.forEach(function(carte){
    var vignette = carte.querySelector('.thumb');
    if(!vignette) return;
    vignette.style.cursor = 'zoom-in';
    vignette.addEventListener('click', function(){ ouvrir(carte); });
    /* Au clavier : la vignette devient atteignable et s'ouvre sur Entrée. */
    vignette.setAttribute('tabindex', '0');
    vignette.setAttribute('role', 'button');
    vignette.setAttribute('aria-label',
      'Voir les photographies : ' + ((carte.querySelector('h3') || {}).textContent || ''));
    vignette.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(carte); }
    });
  });

  prec.addEventListener('click', function(e){ e.stopPropagation(); montrer(rang - 1); });
  suiv.addEventListener('click', function(e){ e.stopPropagation(); montrer(rang + 1); });
  fermer.addEventListener('click', refermer);
  boite.addEventListener('click', function(e){
    /* Un clic à côté de la photographie referme ; sur la photo, non. */
    if(e.target === boite) refermer();
  });
  document.addEventListener('keydown', function(e){
    if(!boite.classList.contains('open')) return;
    if(e.key === 'Escape') refermer();
    if(e.key === 'ArrowLeft') montrer(rang - 1);
    if(e.key === 'ArrowRight') montrer(rang + 1);
  });
})();

/* ==================================================================
   DÉFILEMENT DES VIGNETTES — UNE SEULE HORLOGE POUR TOUTES
   ------------------------------------------------------------------
   Les activités illustrées changent de photographie au même instant.
   Une seule horloge bat pour l'ensemble des cartes : à chaque
   battement, chacune passe au cliché suivant. Au chargement elles
   montrent donc toutes leur première photographie, au battement
   suivant leur deuxième, et ainsi de suite. Les séries n'ont pas la
   même longueur — cinq, trois, deux — si bien qu'elles ne se
   rebouclent pas ensemble ; mais les transitions, elles, tombent
   toujours au même moment.

   Le visiteur peut reprendre la main sur une carte : flèches à la
   souris, pastilles, balayage au doigt, flèches du clavier. La carte
   se fige alors le temps qu'il la regarde, puis rejoint la cadence
   commune à l'endroit où il l'a laissée.

   Deux principes tenus ici. Le défilement ne conditionne jamais
   l'affichage : la première photographie est dans la page et se voit
   même si ce script ne s'exécute pas. Et rien n'est peint pour une
   carte qu'on ne regarde pas — mais son rang avance quand même, pour
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

  vignettes.forEach(function(vignette){
    var carte = vignette.closest('.news-card');
    var cle = carte.dataset.galerie;
    var nb = parseInt(carte.dataset.photos, 10) || 1;
    var legendes = (carte.dataset.legendes || '').split('|').map(function(s){ return s.trim(); });
    if(nb < 2) return;                     /* une seule photo : rien à parcourir */

    var premiere = vignette.querySelector('img');
    if(!premiere) return;

    var images = [premiere], points = [];
    var rang = 0;
    var survole = false, repit = null, enVue = true, balaye = false;
    var titre = (carte.querySelector('h3') || {}).textContent || '';

    /* ---------- Les autres photographies ----------
       Elles ne sont pas dans la page servie : la carte n'en coûte
       d'abord qu'une. On les ajoute à la suite de la première, dans
       l'ordre, pour que la superposition reste prévisible pendant le
       fondu — la photographie qui arrive passe au-dessus. */
    var suite = document.createDocumentFragment();
    for(var n = 2; n <= nb; n++){
      var img = document.createElement('img');
      img.src = 'assets/images/actu-' + cle + '-v' + n + '.jpg';
      img.alt = legendes[n - 1] || '';
      suite.appendChild(img);
      images.push(img);
    }
    images[0].classList.add('visible');
    premiere.parentNode.insertBefore(suite, premiere.nextSibling);
    /* Le cadre passe sous la conduite du script : c'est désormais
       « visible » qui désigne la photographie que l'on voit. */
    vignette.classList.add('en-cours');

    /* ---------- Commandes de parcours ----------
       Ce sont des repères pour la souris et le doigt. La vignette est
       elle-même un bouton — elle ouvre l'agrandissement — et un bouton
       ne peut pas en contenir d'autres : ces commandes restent donc
       hors du parcours de tabulation. Le clavier a son équivalent,
       annoncé dans l'intitulé de la vignette : les flèches gauche et
       droite quand elle a le focus. */
    function afficher(){
      images.forEach(function(im, i){ im.classList.toggle('visible', i === rang); });
      points.forEach(function(p, i){ p.classList.toggle('on', i === rang); });
      /* L'agrandissement lit ce rang pour s'ouvrir sur la photographie
         que l'on est en train de regarder. */
      vignette.dataset.rang = rang;
      vignette.setAttribute('aria-label',
        'Voir les photographies : ' + titre + ' — ' + (rang + 1) + ' sur ' + nb
        + '. Flèches gauche et droite pour les parcourir.');
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
        e.stopPropagation();               /* parcourir n'agrandit pas */
        aller(rang + pas);
      });
      vignette.appendChild(b);
    }
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

    /* ---------- Clavier ----------
       Entrée et Espace ouvrent déjà l'agrandissement (voir plus haut) ;
       les flèches parcourent la série sur place. */
    vignette.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft'){ e.preventDefault(); aller(rang - 1); }
      if(e.key === 'ArrowRight'){ e.preventDefault(); aller(rang + 1); }
    });

    /* ---------- Doigt ----------
       Un balayage horizontal fait défiler. On ne détourne pas un
       défilement vertical de la page, et un balayage n'ouvre pas
       l'agrandissement : le clic que le navigateur fabrique après le
       geste est intercepté avant d'atteindre la vignette. */
    var x0 = null, y0 = null;
    vignette.addEventListener('touchstart', function(e){
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    vignette.addEventListener('touchend', function(e){
      if(x0 === null) return;
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
      e.stopPropagation();
    }, true);

    /* ---------- Survol ----------
       Sous le curseur, la photographie ne file pas : on regarde ce
       qu'on a choisi de regarder.

       L'écoute porte sur la carte entière, et non sur la seule
       vignette, parce que c'est la carte entière qui fait apparaître
       les commandes (« .news-card:hover » dans la feuille de style).
       Les deux signaux doivent coïncider : sinon, survoler le titre
       montrerait des flèches sur une vignette qui continue de défiler. */
    carte.addEventListener('mouseenter', function(){ survole = true; });
    carte.addEventListener('mouseleave', function(){ survole = false; });
    vignette.addEventListener('focusin', function(){ survole = true; });
    vignette.addEventListener('focusout', function(){ survole = false; });

    /* ---------- Hors de l'écran ----------
       L'observateur ne peut qu'infirmer : s'il ne se déclenche jamais,
       la carte est réputée visible et continue de s'afficher. */
    if(window.IntersectionObserver){
      new IntersectionObserver(function(entrees){
        entrees.forEach(function(en){
          var avant = enVue;
          enVue = en.isIntersecting;
          if(enVue && !avant) afficher();   /* elle revient : elle se remet à jour */
        });
      }, { threshold: 0.15 }).observe(vignette);
    }

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
  });

  if(!diapos.length) return;

  function battre(){ diapos.forEach(function(d){ d.battre(); }); }

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
