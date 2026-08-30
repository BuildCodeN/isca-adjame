/* ==================================================================
   Carte a tuiles OpenStreetMap (repli autonome)
   ================================================================== */
  /* ================= CARTE INTERACTIVE DE L'ÉTABLISSEMENT =================
     Carte à tuiles écrite sans bibliothèque : les tuiles OpenStreetMap sont
     de simples images assemblées dans la page. Aucune iframe, aucun script
     externe, aucune clé d'API — elle s'affiche donc partout, y compris dans
     les aperçus qui bloquent les cadres et les CDN.
     Déplacement à la souris ou au doigt, zoom par boutons ou double-clic. */
  (function(){
    /* Coordonnées relevées sur la fiche Google Maps de l'établissement.
       Les précédentes (5.360334, -4.025671) tombaient 133 m plus au nord :
       le repère se posait de l'autre côté du pâté de maisons. */
    var LAT = 5.3591475, LNG = -4.025512;   // Institut Sacré Cœur d'Adjamé
    var ZOOM_MIN = 12, ZOOM_MAX = 19, TUILE = 256;

    var frame  = document.getElementById('mapFrame');
    var canvas = document.getElementById('mapCanvas');
    var layer  = document.getElementById('mapLayer');
    var marker = document.getElementById('mapMarker');
    if(!frame || !canvas || !layer) return;

    var zoom = 17;
    var centre = { x: 0, y: 0 };   // position du centre en pixels monde
    var origine = { x: 0, y: 0 };  // coin haut-gauche de la zone visible
    var chargee = false, echouee = false;

    /* --- Conversion coordonnées géographiques → pixels monde --- */
    function versPixels(lat, lng, z){
      var n = TUILE * Math.pow(2, z);
      var x = (lng + 180) / 360 * n;
      var s = Math.sin(lat * Math.PI / 180);
      var y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
      return { x: x, y: y };
    }

    function echec(){
      if(chargee) return;
      echouee = true;
      frame.classList.add('failed');
    }

    /* --- Dessin des tuiles couvrant la zone visible --- */
    function dessiner(){
      var W = canvas.clientWidth, H = canvas.clientHeight;
      if(!W || !H) return;

      origine.x = centre.x - W / 2;
      origine.y = centre.y - H / 2;

      var nbTuiles = Math.pow(2, zoom);
      var xDebut = Math.floor(origine.x / TUILE), xFin = Math.floor((origine.x + W) / TUILE);
      var yDebut = Math.floor(origine.y / TUILE), yFin = Math.floor((origine.y + H) / TUILE);

      var garder = {};
      for(var tx = xDebut; tx <= xFin; tx++){
        for(var ty = yDebut; ty <= yFin; ty++){
          if(ty < 0 || ty >= nbTuiles) continue;
          var wx = ((tx % nbTuiles) + nbTuiles) % nbTuiles;   // le monde boucle en longitude
          var cle = zoom + '/' + wx + '/' + ty + '/' + tx;
          garder[cle] = true;
          if(layer.querySelector('[data-cle="' + cle + '"]')) continue;

          var img = document.createElement('img');
          img.setAttribute('data-cle', cle);
          img.alt = '';
          img.loading = 'eager';
          img.style.left = (tx * TUILE - origine.x) + 'px';
          img.style.top  = (ty * TUILE - origine.y) + 'px';
          img.addEventListener('load', function(){
            if(!chargee){ chargee = true; frame.classList.remove('failed'); frame.classList.add('loaded'); }
          });
          img.addEventListener('error', function(){ this.style.visibility = 'hidden'; });
          img.src = 'https://tile.openstreetmap.org/' + zoom + '/' + wx + '/' + ty + '.png';
          layer.appendChild(img);
        }
      }
      /* retrait des tuiles sorties du champ */
      Array.prototype.slice.call(layer.children).forEach(function(im){
        var k = im.getAttribute('data-cle');
        if(!garder[k]) layer.removeChild(im);
        else {
          var parts = k.split('/');
          im.style.left = (parseInt(parts[3], 10) * TUILE - origine.x) + 'px';
          im.style.top  = (parseInt(parts[2], 10) * TUILE - origine.y) + 'px';
        }
      });
      placerMarqueur();
    }

    function placerMarqueur(){
      if(!marker) return;
      var pos = versPixels(LAT, LNG, zoom);
      marker.style.left = (pos.x - origine.x) + 'px';
      marker.style.top  = (pos.y - origine.y) + 'px';
    }

    function recentrer(){
      centre = versPixels(LAT, LNG, zoom);
      layer.innerHTML = '';
      dessiner();
    }

    /* --- Zoom --- */
    function changerZoom(delta){
      var nz = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
      if(nz === zoom) return;
      var facteur = Math.pow(2, nz - zoom);
      centre = { x: centre.x * facteur, y: centre.y * facteur };
      zoom = nz;
      layer.innerHTML = '';
      dessiner();
      document.getElementById('zoomIn').disabled  = (zoom >= ZOOM_MAX);
      document.getElementById('zoomOut').disabled = (zoom <= ZOOM_MIN);
    }
    document.getElementById('zoomIn').addEventListener('click', function(){ changerZoom(1); });
    document.getElementById('zoomOut').addEventListener('click', function(){ changerZoom(-1); });
    canvas.addEventListener('dblclick', function(){ changerZoom(1); });

    /* --- Déplacement à la souris et au doigt --- */
    var tire = false, departX = 0, departY = 0, centreDepart = null;
    function debutTirage(px, py){
      tire = true; departX = px; departY = py;
      centreDepart = { x: centre.x, y: centre.y };
      canvas.classList.add('dragging');
    }
    function tirage(px, py){
      if(!tire) return;
      centre.x = centreDepart.x - (px - departX);
      centre.y = centreDepart.y - (py - departY);
      dessiner();
    }
    function finTirage(){ tire = false; canvas.classList.remove('dragging'); }

    canvas.addEventListener('mousedown', function(e){ e.preventDefault(); debutTirage(e.clientX, e.clientY); });
    window.addEventListener('mousemove', function(e){ tirage(e.clientX, e.clientY); });
    window.addEventListener('mouseup', finTirage);
    canvas.addEventListener('touchstart', function(e){
      if(e.touches.length === 1) debutTirage(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    /* La carte n'annule le geste QUE si un déplacement est réellement
       engagé et que le doigt s'écarte franchement de son point de départ.
       L'ancienne version annulait tout glissement à un doigt : quand un
       visiteur faisait simplement défiler la page et que son doigt
       passait sur la carte, celle-ci tentait d'interrompre le
       défilement. Le navigateur refusait — d'où les avertissements
       « touchmove non annulable » — et sur certains téléphones la page
       se bloquait sous le doigt.
       Le seuil de 8px laisse passer le défilement vertical ordinaire ;
       au-delà, l'intention de déplacer la carte ne fait plus de doute. */
    canvas.addEventListener('touchmove', function(e){
      if(!tire || e.touches.length !== 1) return;
      var t = e.touches[0];
      if(Math.abs(t.clientX - departX) < 8 && Math.abs(t.clientY - departY) < 8) return;
      if(e.cancelable) e.preventDefault();
      tirage(t.clientX, t.clientY);
    }, { passive: false });
    canvas.addEventListener('touchend', finTirage);

    /* --- Recalcul quand la rubrique Contact devient visible --- */
    function rafraichir(){ setTimeout(function(){ if(canvas.clientWidth) dessiner(); }, 200); }
    window.addEventListener('resize', rafraichir);
    document.querySelectorAll('[data-nav="contact"]').forEach(function(el){
      el.addEventListener('click', rafraichir);
    });
    if(window.MutationObserver){
      var sec = document.getElementById('sec-contact');
      if(sec) new MutationObserver(rafraichir).observe(sec, { attributes: true, attributeFilter: ['class'] });
    }

    recentrer();
    setTimeout(function(){ if(!canvas.clientWidth) recentrer(); }, 400);
    setTimeout(echec, 7000);   // message de repli si aucune tuile n'arrive
  })();

/* ==================================================================
   Carte Google : pose differee et bascule
   ================================================================== */
  /* ================= CARTE GOOGLE — POSE DIFFÉRÉE ET REPLI =================
     Deux cartes cohabitent dans la rubrique Contact : le cadre Google, qui
     montre la fiche « ISCA » telle que Google la tient à jour, et la carte
     à tuiles OpenStreetMap, qui ne dépend de personne. Une seule s'affiche.

     Le cadre n'est posé qu'à la première ouverture de la rubrique Contact.
     L'écrire en dur dans la page ferait appeler Google à chaque visite du
     site, y compris par les visiteurs qui ne verront jamais cette page.

     La bascule ne peut pas s'appuyer sur l'événement « load » seul : un
     cadre bloqué par une politique de sécurité en émet un quand même, pour
     sa page d'erreur. On mesure donc si le cadre a réellement pris de la
     hauteur, et on laisse un délai franc au réseau avant de renoncer.
     ========================================================================= */
  (function carteGoogle(){
    var boite = document.getElementById('mapGoogle');
    var cadre = boite && boite.querySelector('iframe');
    var tuiles = document.getElementById('mapFrame');
    if(!boite || !cadre || !tuiles) return;

    var pose = false;

    function replier(){                 /* Google renonce : les tuiles reprennent la main */
      boite.hidden = true;
      tuiles.hidden = false;
    }
    function verifier(){
      /* Un cadre vide garde la hauteur que le CSS lui donne : on ne peut pas
         le mesurer de l'extérieur. Le seul signe exploitable en cross-origin
         est l'absence d'événement « load ». */
      if(!cadre.dataset.charge) replier();
    }

    function poser(){
      if(pose) return;
      pose = true;
      cadre.addEventListener('load', function(){
        cadre.dataset.charge = '1';
        tuiles.hidden = true;           /* le cadre a répondu : on range les tuiles */
      });
      cadre.addEventListener('error', replier);
      boite.hidden = false;
      cadre.src = cadre.dataset.src;
      setTimeout(verifier, 8000);
    }

    /* La rubrique est-elle déjà ouverte, ou le devient-elle ? */
    var sec = document.getElementById('sec-contact');
    if(!sec) return;
    if(sec.classList.contains('active')) poser();
    document.querySelectorAll('[data-nav="contact"]').forEach(function(el){
      el.addEventListener('click', poser);
    });
    if(window.MutationObserver){
      new MutationObserver(function(){
        if(sec.classList.contains('active')) poser();
      }).observe(sec, { attributes: true, attributeFilter: ['class'] });
    }
  })();

