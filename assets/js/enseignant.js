/* ==================================================================
   Espace Enseignant
   ================================================================== */
    /* ================= ESPACE ENSEIGNANT =================
       ------------------------------------------------------------------
       COMMENT AJOUTER OU MODIFIER UN ENSEIGNANT
       ------------------------------------------------------------------
       Depuis le passage au back-end (ISCA_2027-backend), les noms,
       mots de passe et emplois du temps ne sont plus dans ce fichier :
       ils vivent dans la base de données, jamais envoyés au navigateur
       d'un visiteur non authentifié. Pour ajouter/modifier un
       enseignant : ouvrir `npm run prisma:studio` dans
       ISCA_2027-backend (interface web locale de la base), ou passer
       par une future page d'administration.
       ------------------------------------------------------------------ */

    /* Horaires communs aux emplois du temps des classes et des professeurs. */
    var HORAIRES_PROF = [
      {label:"1ère H.", time:"07 h 30 – 08 h 20", idx:0},
      {label:"2ème H.", time:"08 h 25 – 09 h 15", idx:1},
      {label:"3ème H.", time:"09 h 20 – 10 h 10", idx:2},
      {type:"break", text:"Récréation"},
      {label:"4ème H.", time:"10 h 30 – 11 h 20", idx:3},
      {label:"5ème H.", time:"11 h 25 – 12 h 15", idx:4},
      {type:"break", text:"Interclasse"},
      {label:"6ème H.", time:"13 h 30 – 14 h 20", idx:5},
      {label:"7ème H.", time:"14 h 25 – 15 h 15", idx:6},
      {label:"8ème H.", time:"15 h 20 – 16 h 10", idx:7}
    ];

    /* ==================================================================
       CORPS ENSEIGNANT — 43 professeurs
       Source : Documents/EDT_APFC_2025-2026.pdf, une fiche par page.
       Les huit créneaux vont de 07h30 à 16h10 ; les lignes de récréation
       et d'interclasse du document ne sont pas reprises.

       Le code d'accès est un numéro d'ordre — deux chiffres de discipline,
       deux chiffres de rang, une lettre :
         Français 10 F · Mathématiques 20 M · Physique-Chimie 30 P
         SVT 40 S · Histoire-Géographie 50 H · Philosophie 55 L
         Anglais 60 A · Espagnol 65 E · Allemand 70 D
         EPS 75 Q · Musique 80 U · Informatique 85 I

       Les coordonnées personnelles présentes dans le PDF (téléphones et
       adresses électroniques) ont été délibérément écartées : elles n'ont
       pas leur place dans une page consultable publiquement.
       ================================================================== */
    /* Les 43 enseignants (nom, mot de passe, matiere, emploi du temps)
     vivent desormais dans la base de donnees du back-end
     (ISCA_2027-backend), jamais dans ce fichier : teacherLogin()
     interroge /api/teacher/login, qui ne renvoie que la fiche de
     l'enseignant authentifie. */

    /* Adresse du back-end (Node/Express + base de données) qui a
       remplacé la vérification en clair dans le navigateur : le nom,
       le mot de passe et l'emploi du temps de chaque enseignant ne
       sont plus jamais envoyés au navigateur d'un visiteur non
       authentifié — seul celui qui vient de se connecter reçoit sa
       propre fiche, via l'API. */

    var profConnecte = null;
    var teacherToken = null;

    /* --- Complétion du champ « nom » et rappel de démonstration --- */
    (function initEspaceEnseignant(){
      /* La liste de complétion déroulait les 43 noms du corps enseignant
         à qui ouvrait la page. Un annuaire du personnel n'a pas à être
         offert par un formulaire de connexion : on la laisse vide. */
      /* Le rappel affichait un nom d'enseignant et son code en clair,
         sur une page consultable par n'importe qui. C'était donner la
         clé avec la serrure. Il ne reste qu'une consigne, sans identifiant. */
      var hint = document.getElementById('demo-hint');
      if(hint){
        hint.innerHTML = 'Votre numéro d’ordre vous a été remis par l’administration. ' +
          'En cas d’oubli, adressez-vous au secrétariat.';
      }
    })();

    /* --- Connexion --- */
    /* La vérification (nom + mot de passe insensibles à la casse et
       aux accents) a lieu côté serveur — voir ISCA_2027-backend. Le
       navigateur ne reçoit jamais que la fiche de l'enseignant qui
       vient de s'authentifier, jamais celle des 42 autres. */
    async function teacherLogin(){
      var nom = (document.getElementById('matricule').value || '').trim();
      var mdp = document.getElementById('password').value || '';
      var err = document.getElementById('login-error');
      var btn = document.querySelector('#login-shell .submit-login');

      err.classList.remove('show');
      if(btn) btn.disabled = true;
      try{
        var r = await fetch(API_BASE + '/api/teacher/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom: nom, motDePasse: mdp })
        });
        var data = await r.json();
        if(!r.ok){
          err.textContent = data.error || "Nom ou mot de passe incorrect.";
          err.classList.add('show');
          return;
        }

        teacherToken = data.token;
        var rMe = await fetch(API_BASE + '/api/teacher/me', {
          headers: { Authorization: 'Bearer ' + teacherToken }
        });
        var moi = await rMe.json();
        if(!rMe.ok){
          err.textContent = "Session expirée, réessayez.";
          err.classList.add('show');
          return;
        }

        profConnecte = moi.nom;
        afficherEspace(moi);
      } catch(e){
        err.textContent = "Connexion au serveur impossible. Réessayez.";
        err.classList.add('show');
      } finally {
        if(btn) btn.disabled = false;
      }
    }

    function initiales(nom){
      var m = nom.trim().split(/\s+/);
      return ((m[0]||'')[0] || '') + ((m[1]||'')[0] || '');
    }

    function afficherEspace(p){
      var nom = p.nom;
      document.getElementById('login-shell').style.display    = 'none';
      document.getElementById('teacher-dashboard').style.display = 'block';
      document.getElementById('as-nom').textContent      = nom;
      document.getElementById('th-nom').textContent      = nom;
      document.getElementById('th-initiales').textContent = initiales(nom).toUpperCase();

      var meta = [];
      if(p.matiere) meta.push(p.matiere);
      meta.push('Année scolaire 2025–2026');
      document.getElementById('th-meta').textContent = meta.join(' · ');

      var note = document.getElementById('prof-note');
      note.textContent = p.principalDe
        ? 'Professeur principal en classe de ' + p.principalDe + '. Les cases indiquent la classe où vous intervenez.'
        : 'Les cases indiquent la classe où vous intervenez.';

      remplirResume(p);
      renderProfTable(p.edt, p.principalDe);
    }

    /* --- Bandeau de synthèse ------------------------------------------
       Ce qu'un enseignant veut savoir avant même de lire sa grille : sa
       charge, ses classes, et s'il est professeur principal. Les valeurs
       sont recalculées depuis la grille, jamais saisies à la main : elles
       ne peuvent donc pas diverger de l'emploi du temps affiché. */
    function remplirResume(p){
      var hote = document.getElementById('th-resume');
      if(!hote) return;
      var heures = 0, classes = {}, jours = {};
      (p.edt || []).forEach(function(ligne, li){
        (ligne || []).forEach(function(v, ji){
          if(!v) return;
          if(v === 'DEVOIR' || v.indexOf('Act.') === 0) return;
          heures++;
          v.split(' / ').forEach(function(c){ classes[c.trim()] = 1; });
          jours[ji] = 1;
        });
      });
      var nbClasses = Object.keys(classes).length;
      var nbJours   = Object.keys(jours).length;

      var cases = [
        { lbl:'Discipline',   val:p.matiere || '—' },
        { lbl:'Professeur principal', val:p.principalDe || 'Non désigné',
          principal: !!p.principalDe },
        { lbl:'Heures par semaine', val:heures + '<small>&nbsp;h</small>' },
        { lbl:'Classes suivies', val:nbClasses + '<small>&nbsp;sur ' + nbJours + ' jour' +
          (nbJours > 1 ? 's' : '') + '</small>' }
      ];
      hote.innerHTML = cases.map(function(c){
        return '<div class="tr-case' + (c.principal ? ' est-principal' : '') + '">' +
               '<span class="tr-lbl">' + c.lbl + '</span>' +
               '<span class="tr-val">' + c.val + '</span></div>';
      }).join('');
      /* le filet or de chaque case se trace en cascade */
      var i = 0;
      hote.querySelectorAll('.tr-case').forEach(function(el){
        el.style.transitionDelay = (i * 90) + 'ms';
        setTimeout(function(){ el.classList.add('seen'); }, 60 + i * 90);
        i++;
      });
    }

    function teacherLogout(){
      profConnecte = null;
      teacherToken = null;
      document.getElementById('teacher-dashboard').style.display = 'none';
      document.getElementById('login-shell').style.display = 'flex';
      document.getElementById('matricule').value = '';
      document.getElementById('password').value = '';
    }

    /* --- Lecture de la grille -----------------------------------------
       Une grille de vingt-cinq cases identiques oblige à lire chaque
       libellé. En séparant le collège du lycée par la couleur, et en
       marquant la classe dont on est professeur principal, le regard
       trie avant de lire. */
    function familleDeCase(v, principale){
      if(v === 'DEVOIR') return 'c-devoir';
      if(v.indexOf('Act.') === 0) return 'c-perso';
      if(principale && v.split(' / ').some(function(c){ return c.trim() === principale; }))
        return 'c-principal';
      /* 6ème à 3ème : collège. 2nde, 1ère, Tle et TC : lycée. */
      return /^[3-6]\s*ème/.test(v) ? 'c-college' : 'c-lycee';
    }

    /* Index de la colonne du jour : lundi = 0 … vendredi = 4.
       Le week-end ne met en avant aucune colonne. */
    function jourAujourdhui(){
      var j = new Date().getDay();      /* 0 = dimanche */
      return (j >= 1 && j <= 5) ? j - 1 : -1;
    }

    /* --- Grille de l'enseignant, dans le style des emplois du temps de classe --- */
    function renderProfTable(edt, classePrincipale){
      var body = document.getElementById('profBody');
      body.innerHTML = '';
      var ja = jourAujourdhui();
      document.querySelectorAll('#profTable thead th').forEach(function(th, k){
        th.classList.toggle('jour-actuel', k - 1 === ja);
      });
      if(!edt){
        var tr = document.createElement('tr');
        var td = document.createElement('td');
        td.colSpan = 6; td.className = 'edt-empty';
        td.style.cssText = 'text-align:center;padding:40px;color:var(--ink-soft);font-style:italic;';
        td.textContent = "Emploi du temps non encore communiqué.";
        tr.appendChild(td); body.appendChild(tr); return;
      }
      HORAIRES_PROF.forEach(function(row){
        var tr = document.createElement('tr');
        if(row.type === 'break'){
          var td = document.createElement('td');
          td.className = 'edt-break'; td.colSpan = 6;
          td.innerHTML = '<div class="brk-row"><span>' + row.text + '</span><i></i><span>' +
                         row.text + '</span><i></i><span>' + row.text + '</span></div>';
          tr.appendChild(td);
        } else {
          var tdTime = document.createElement('td');
          tdTime.className = 'edt-time';
          tdTime.innerHTML = '<b>' + row.label + '</b><span>' + row.time + '</span>';
          tr.appendChild(tdTime);
          var cells = edt[row.idx] || ["","","","",""];
          cells.forEach(function(v, i){
            var td = document.createElement('td');
            td.setAttribute('data-c', i + 1);
            if(i === jourAujourdhui()) td.classList.add('jour-actuel');
            if(v){
              td.className += ' edt-slot ' + familleDeCase(v, classePrincipale);
              td.innerHTML = '<span class="cl">' + v + '</span>';
            } else {
              td.className += ' edt-empty c-vide';
            }
            tr.appendChild(td);
          });
        }
        body.appendChild(tr);
      });
    }

