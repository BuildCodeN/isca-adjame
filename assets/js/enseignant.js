/* ==================================================================
   Espace Enseignant
   ================================================================== */
    /* ================= ESPACE ENSEIGNANT =================
       ------------------------------------------------------------------
       COMMENT AJOUTER OU MODIFIER UN ENSEIGNANT
       ------------------------------------------------------------------
       Les noms, mots de passe et emplois du temps ne sont pas dans ce
       fichier : ils vivent dans la base MySQL de l'hébergement, jamais
       envoyés au navigateur d'un visiteur non connecté. Pour les mettre
       à jour : python outils/preparer-acces-enseignants.py --edt (nouveaux
       emplois du temps, nouveaux enseignants) ou --reinitialiser ISCA-012
       (mot de passe perdu ou divulgué) ; l'outil écrit un fichier SQL à
       importer dans phpMyAdmin (hPanel > Bases de données). Le détail est
       dans backend/LISEZ-MOI-ESPACE-ENSEIGNANT.md.
       ------------------------------------------------------------------ */

    /* Horaires communs aux emplois du temps des classes et des professeurs. */
    var HORAIRES_PROF = [
      {label:"1ère H.", time:"07 h 30 – 08 h 20", idx:0},
      {label:"2ème H.", time:"08 h 25 – 09 h 15", idx:1},
      {label:"3ème H.", time:"09 h 20 – 10 h 10", idx:2},
      {type:"break", text:"Récréation"},
      {label:"4ème H.", time:"10 h 30 – 11 h 20", idx:3},
      {label:"5ème H.", time:"11 h 25 – 12 h 15", idx:4},
      {type:"break", text:"Pause déjeuner"},
      /* Huit heures de cours consécutives (1ère à 8ème), comme dans les
         emplois du temps de classe de scolarite.js : la pause déjeuner n'est
         pas une heure. L'application qui édite les PDF compte cette pause
         comme 6ème heure et imprime 7, 8, 9 ; le site ne reprend pas ce saut. */
      {label:"6ème H.", time:"13 h 30 – 14 h 20", idx:5},
      {label:"7ème H.", time:"14 h 25 – 15 h 15", idx:6},
      {label:"8ème H.", time:"15 h 20 – 16 h 10", idx:7}
    ];

    /* ==================================================================
       CORPS ENSEIGNANT — 43 professeurs
       Source 2026-2027 : Documents/EDT_Enseignants_OK.pdf, une fiche par
       enseignant (la liste de 2025-2026 venait de EDT_APFC_2025-2026.pdf).
       Les huit créneaux vont de 07h30 à 16h10 ; les lignes de récréation
       et de pause déjeuner du document ne sont pas reprises. Le matricule
       que porte l'en-tête de certains enseignants n'est pas repris non plus.

       Connexion par mot de passe seul : l'enseignant tape le code de 8
       caractères imprimé sur sa fiche, sans identifiant ; valable toute
       l'année, jamais deux fois le même (le serveur retrouve le compte à
       partir du mot de passe). « ISCA-001 » à « ISCA-043 » ne sont que des
       repères de l'administration.

       Les coordonnées personnelles présentes dans les PDF (téléphones,
       adresses électroniques, matricules) ont été délibérément écartées :
       elles n'ont pas leur place dans une page consultable publiquement.
       ================================================================== */

    /* L'API de l'Espace Enseignant, ce sont les scripts PHP du dossier
       /api du site (hébergement Hostinger Business), qui interrogent la
       base MySQL de l'hébergement. Aucune adresse à régler : où que la
       page soit servie, l'API est à côté d'elle. Seul l'enseignant qui
       vient de se connecter reçoit sa propre fiche ; jamais la liste du
       personnel, jamais un mot de passe. */
    var API_ENSEIGNANT = window.location.origin + '/api';
    var MSG_INDISPONIBLE = 'Le service de connexion n’est pas disponible pour le moment. Réessayez plus tard.';

    var profConnecte = null;      /* la fiche de l'enseignant connecté */
    var teacherToken = null;      /* jeton de connexion : en mémoire seulement, jamais enregistré dans le navigateur */

    (function initEspaceEnseignant(){
      /* Aucune liste de noms, aucun exemple de mot de passe sur une page
         consultable par n'importe qui : seulement la consigne. */
      var hint = document.getElementById('demo-hint');
      if(hint){
        hint.innerHTML = 'Votre mot de passe est <b>le code de la fiche personnelle</b> remise par l’administration. ' +
          'Majuscules ou minuscules, avec ou sans tiret : peu importe.';
      }
      /* Case « Afficher le mot de passe » : on tape un code de 8 caractères lu sur du papier, une faute est vite faite. */
      var voir = document.getElementById('show-pw');
      var champ = document.getElementById('password');
      if(voir && champ){
        voir.addEventListener('change', function(){ champ.type = voir.checked ? 'text' : 'password'; });
      }
    })();

    /* Texte venu du serveur, inséré dans du HTML : on neutralise les balises. */
    function esc(s){
      return String(s).replace(/[&<>"']/g, function(c){
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function montrerErreur(id, texte){
      var e = document.getElementById(id);
      e.textContent = texte;
      e.classList.add('show');
    }
    function masquerErreur(id){
      document.getElementById(id).classList.remove('show');
    }

    /* Appel de l'API : renvoie { ok, statut, donnees } sans jamais lever d'erreur
       sur une réponse qui n'est pas du JSON (page d'erreur de l'hébergeur). */
    async function appelerApi(chemin, options){
      var r = await fetch(API_ENSEIGNANT + '/' + chemin, options);
      var donnees = null;
      try { donnees = await r.json(); } catch(e){ donnees = null; }
      return { ok: r.ok, statut: r.status, donnees: donnees || {} };
    }
    function enJson(corps, jeton){
      var h = { 'Content-Type': 'application/json' };
      if(jeton) h['X-Jeton'] = jeton;
      return { method: 'POST', headers: h, body: JSON.stringify(corps) };
    }

    /* --- Connexion --- */
    /* Le mot de passe de la fiche (toléré en minuscules, avec ou sans tiret)
       est tout ce que l'enseignant tape : le serveur retrouve son compte à
       partir de lui, refuse après trente essais ratés depuis la même adresse
       en quinze minutes, et répond toujours le même message à un mot de passe
       faux. Le navigateur reçoit un jeton, puis la seule fiche de l'enseignant
       connecté. */
    async function teacherLogin(){
      var champ = document.getElementById('password');
      var motDePasse = (champ.value || '').trim();
      var btn = document.querySelector('#login-shell .submit-login');

      masquerErreur('login-error');
      if(!motDePasse){
        montrerErreur('login-error', 'Saisissez votre mot de passe.');
        return;
      }
      if(btn) btn.disabled = true;
      try{
        var c = await appelerApi('enseignant-connexion.php', enJson({ motDePasse: motDePasse }));
        if(!c.ok){
          montrerErreur('login-error', c.donnees.erreur || MSG_INDISPONIBLE);
          return;
        }
        teacherToken = c.donnees.jeton;
        var m = await appelerApi('enseignant-moi.php', { headers: { 'X-Jeton': teacherToken } });
        if(!m.ok){
          teacherToken = null;
          montrerErreur('login-error', m.donnees.erreur || MSG_INDISPONIBLE);
          return;
        }
        profConnecte = m.donnees;
        champ.value = '';
        afficherEspace(m.donnees);
      } catch(e){
        montrerErreur('login-error', 'Connexion au serveur impossible. Réessayez.');
      } finally {
        if(btn) btn.disabled = false;
      }
    }

    function afficherConnexion(message){
      var voir = document.getElementById('show-pw');
      var champ = document.getElementById('password');
      document.getElementById('teacher-dashboard').style.display = 'none';
      document.getElementById('login-shell').style.display = 'flex';
      champ.value = '';
      champ.type = 'password';              /* le mot de passe ne reste jamais affiché d'une connexion à l'autre */
      if(voir) voir.checked = false;
      masquerErreur('login-error');
      if(message) montrerErreur('login-error', message);
    }

    /* Session fermée par le serveur (huit heures écoulées) : retour à
       l'écran de connexion. */
    function sessionExpiree(){
      teacherToken = null; profConnecte = null;
      afficherConnexion('Votre session a expiré. Reconnectez-vous.');
    }

    /* Entrée valide le formulaire */
    document.addEventListener('keydown', function(e){
      if(e.key !== 'Enter') return;
      if(e.target && e.target.id === 'password') teacherLogin();
    });

    function initiales(nom){
      var m = nom.trim().split(/\s+/);
      return ((m[0]||'')[0] || '') + ((m[1]||'')[0] || '');
    }

    function afficherEspace(p){
      var nom = p.nom;
      var affiche = (p.civilite ? p.civilite + ' ' : '') + nom;
      document.getElementById('login-shell').style.display    = 'none';
      document.getElementById('teacher-dashboard').style.display = 'block';
      document.getElementById('as-nom').textContent      = affiche;
      document.getElementById('th-nom').textContent      = affiche;
      document.getElementById('th-initiales').textContent = initiales(nom).toUpperCase();

      var meta = [];
      if(p.matiere) meta.push(p.matiere);
      meta.push('Année scolaire ' + (p.annee ? String(p.annee).replace('-', '–') : '2026–2027'));
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
          /* « 6ème 1 - FHR » : la classe est 6ème 1, FHR dit seulement ce qu'on y enseigne */
          v.split(' / ').forEach(function(c){ classes[c.replace(/ - (FHR|EDHC)$/, '').trim()] = 1; });
          jours[ji] = 1;
        });
      });
      var nbClasses = Object.keys(classes).length;
      var nbJours   = Object.keys(jours).length;

      var cases = [
        { lbl:'Discipline',   val:esc(p.matiere || '—') },
        { lbl:'Professeur principal', val:esc(p.principalDe || 'Non désigné'),
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
      var jeton = teacherToken;
      profConnecte = null;
      teacherToken = null;
      /* le serveur ferme la connexion ; qu'il réponde ou non, on repart de zéro */
      if(jeton){
        fetch(API_ENSEIGNANT + '/enseignant-deconnexion.php', { method: 'POST', headers: { 'X-Jeton': jeton } })
          .catch(function(){});
      }
      afficherConnexion();
    }

    /* --- Lecture de la grille -----------------------------------------
       Une grille de vingt-cinq cases identiques oblige à lire chaque
       libellé. En séparant le collège du lycée par la couleur, et en
       marquant la classe dont on est professeur principal, le regard
       trie avant de lire. */
    function familleDeCase(v, principale){
      if(v === 'DEVOIR') return 'c-devoir';
      if(v.indexOf('Act.') === 0) return 'c-perso';
      if(principale && v.split(' / ').some(function(c){
           return c.replace(/ - (FHR|EDHC)$/, '').trim() === principale; }))
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
              var sp = document.createElement('span');
              sp.className = 'cl';
              sp.textContent = v;
              td.appendChild(sp);
            } else {
              td.className += ' edt-empty c-vide';
            }
            tr.appendChild(td);
          });
        }
        body.appendChild(tr);
      });
    }

