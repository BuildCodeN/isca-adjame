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
    montrer(0);
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
