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

