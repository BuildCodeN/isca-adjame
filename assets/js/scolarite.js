/* ==================================================================
   Emplois du temps par classe
   ================================================================== */
  (function(){
    var LEVELS = {
      "Premier cycle": {
        cycles: ["6ème","5ème","4ème","3ème"],
        classes: {
          "6ème": ["1","2","3","4"],
          "5ème": ["1","2","3"],
          "4ème": ["1","2","3","4"],
          "3ème": ["1","2","3","4"]
        }
      },
      "Second cycle": {
        cycles: ["2nde","1ère","Tle"],
        classes: {
          "2nde": ["A","C1","C2"],
          "1ère": ["A","C","D"],
          "Tle": ["A1","A2","C","D"]
        }
      }
    };

    // Grille horaire commune (heures et bandes récréation/interclasse)
    var TIME_ROWS = [
      {label:"1ère H.", time:"07 h 30 – 08 h 20", idx:0},
      {label:"2ème H.", time:"08 h 25 – 09 h 15", idx:1},
      {label:"3ème H.", time:"09 h 20 – 10 h 10", idx:2},
      {type:"break", text:"Récréation"},
      {label:"4ème H.", time:"10 h 30 – 11 h 20", idx:3},
      {label:"5ème H.", time:"11 h 25 – 12 h 15", idx:4},
      {type:"break", text:"Interclasse"},
      // Numérotation reprise telle quelle du document 2026-2027 : la
      // 6ème heure n'y figure pas, la numérotation reprend à 7.
      {label:"7ème H.", time:"13 h 30 – 14 h 20", idx:5},
      {label:"8ème H.", time:"14 h 25 – 15 h 15", idx:6},
      {label:"9ème H.", time:"15 h 20 – 16 h 10", idx:7},
    ];

    // Emplois du temps 2026-2027, extraits du document officiel de l'ISCA
    // (Documents/EDT_CLASSE_2026-2027.pdf) : 25 classes. Les abréviations du
    // document sont ramenées au vocabulaire du site (FR en FRAN, MATHS en
    // MATH, HG en HIST-GEO, MUS en MUSIQUE, ACT. PERS. en ACT. DU PERSONNEL…).
    // Deux graphies isolées sont rapprochées de leur matière : « INFO » (6ème 2)
    // devient TICE, et « ST » (4ème 3, lundi 4ème H., qui suit un SVT) devient
    // SVT. Cette année il n'y a pas de 5ème 4, et les anciennes Terminales D1
    // et D2 ont été fusionnées en une seule Terminale D : la liste des classes
    // ci-dessus suit cette structure. Si une classe du sélecteur n'avait pas
    // de grille, la page l'annoncerait comme non communiquée plutôt que d'en
    // inventer une.
    var EDT_DATA = {
      "6ème 1": [
        ["EPS", "TICE", "", "PC", "FRAN"],
        ["EPS", "DEVOIR", "", "PC", "MATH"],
        ["FHR", "MATH", "", "MATH", "MATH"],
        ["ANG", "MUSIQUE", "", "FRAN", "DEVOIR"],
        ["ANG", "ÉTUDE", "", "ACT. DU PERSONNEL", "ANG"],
        ["FRAN", "FRAN", "", "SVT", "HIST-GEO"],
        ["HIST-GEO", "FRAN", "", "SVT", "EDHC"],
        ["", "", "", "", ""],
      ],
      "6ème 2": [
        ["MATH", "MUSIQUE", "", "FRAN", "SVT"],
        ["MATH", "DEVOIR", "", "FRAN", "SVT"],
        ["EPS", "", "", "ANG", "EDHC"],
        ["EPS", "FRAN", "", "MATH", "DEVOIR"],
        ["HIST-GEO", "FRAN", "", "ACT. DU PERSONNEL", "FHR"],
        ["ANG", "ANG", "", "PC", "FRAN"],
        ["TICE", "HIST-GEO", "", "PC", "MATH"],
        ["", "", "", "", ""],
      ],
      "6ème 3": [
        ["FRAN", "MATH", "", "MATH", "EPS"],
        ["FRAN", "DEVOIR", "", "MATH", "EPS"],
        ["MATH", "MUSIQUE", "", "FRAN", "HIST-GEO"],
        ["SVT", "HIST-GEO", "", "ANG", "DEVOIR"],
        ["SVT", "FRAN", "", "ACT. DU PERSONNEL", "EDHC"],
        ["ÉTUDE", "PC", "", "FHR", "FRAN"],
        ["ANG", "PC", "", "TICE", "ANG"],
        ["", "", "", "", ""],
      ],
      "6ème 4": [
        ["HIST-GEO", "FRAN", "", "ANG", "EPS"],
        ["EDHC", "DEVOIR", "", "ANG", "EPS"],
        ["ANG", "ÉTUDE", "", "SVT", "FHR"],
        ["FRAN", "MATH", "", "SVT", "DEVOIR"],
        ["FRAN", "MATH", "", "ACT. DU PERSONNEL", "HIST-GEO"],
        ["PC", "MUSIQUE", "", "MATH", "MATH"],
        ["PC", "TICE", "", "FRAN", "FRAN"],
        ["", "", "", "", ""],
      ],
      "5ème 1": [
        ["ANG", "EDHC", "", "EPS", "PC"],
        ["MATH", "DEVOIR", "", "EPS", "PC"],
        ["MATH", "FHR", "", "HIST-GEO", "ANG"],
        ["FRAN", "FHR", "", "MATH", "DEVOIR"],
        ["ÉTUDE", "ANG", "", "ACT. DU PERSONNEL", "MATH"],
        ["SVT", "FRAN", "", "MUSIQUE", "HIST-GEO"],
        ["SVT", "FRAN", "", "FRAN", "FRAN"],
        ["", "", "", "", ""],
      ],
      "5ème 2": [
        ["FRAN", "FRAN", "", "FRAN", "ANG"],
        ["FRAN", "DEVOIR", "", "FRAN", "ANG"],
        ["ANG", "EPS", "", "SVT", "MATH"],
        ["FHR", "EPS", "", "SVT", "DEVOIR"],
        ["EDHC", "TICE", "", "", "MUSIQUE"],
        ["MATH", "MATH", "", "PC", ""],
        ["MATH", "HIST-GEO", "", "PC", "HIST-GEO"],
        ["", "", "", "", ""],
      ],
      "5ème 3": [
        ["EDHC", "MATH", "", "SVT", "HIST-GEO"],
        ["HIST-GEO", "DEVOIR", "", "SVT", "EPS"],
        ["MATH", "FRAN", "", "ANG", "EPS"],
        ["MATH", "PC", "", "ANG", "DEVOIR"],
        ["ANG", "PC", "", "", "MATH"],
        ["TICE", "", "", "FRAN", "MUSIQUE"],
        ["FRAN", "FHR", "", "FRAN", "FRAN"],
        ["", "", "", "", ""],
      ],
      "4ème 1": [
        ["FRAN", "ANG", "", "TICE", "FRAN"],
        ["FRAN", "DEVOIR", "", "FRAN", "SVT"],
        ["ESP", "DEVOIR", "", "EDHC", "SVT"],
        ["HIST-GEO", "MATH", "", "ESP", "DEVOIR"],
        ["HIST-GEO", "MATH", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["PC", "ESP", "", "ANG", "MATH"],
        ["PC", "FRAN", "", "ANG", "EPS"],
        ["MATH", "FRAN", "", "HIST-GEO", "EPS"],
      ],
      "4ème 2": [
        ["PC", "FRAN", "", "ANG", "TICE"],
        ["PC", "DEVOIR", "", "ANG", "ESP"],
        ["EPS", "DEVOIR", "", "ESP", "FRAN"],
        ["EPS", "ANG", "", "FRAN", "DEVOIR"],
        ["ESP", "HIST-GEO", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["MATH", "FRAN", "", "HIST-GEO", "HIST-GEO"],
        ["FRAN", "SVT", "", "MATH", "MATH"],
        ["FRAN", "SVT", "", "MATH", "EDHC"],
      ],
      "4ème 3": [
        ["EPS", "ANG", "", "FRAN", "MATH"],
        ["EPS", "DEVOIR", "", "FRAN", "MATH"],
        ["SVT", "DEVOIR", "", "PC", "ESP"],
        ["SVT", "ESP", "", "PC", "DEVOIR"],
        ["MATH", "ESP", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["FRAN", "EDHC", "", "ANG", "FRAN"],
        ["FRAN", "HIST-GEO", "", "HIST-GEO", "TICE"],
        ["HIST-GEO", "MATH", "", "FRAN", "ANG"],
      ],
      "4ème 4": [
        ["ANG", "EDHC", "", "PC", "FRAN"],
        ["ANG", "DEVOIR", "", "PC", "FRAN"],
        ["FRAN", "DEVOIR", "", "FRAN", "HIST-GEO"],
        ["MATH", "SVT", "", "FRAN", "DEVOIR"],
        ["MATH", "SVT", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["ESP", "FRAN", "", "ANG", "TICE"],
        ["EPS", "MATH", "", "MATH", "ESP"],
        ["EPS", "HIST-GEO", "", "HIST-GEO", "ESP"],
      ],
      "3ème 1": [
        ["HIST-GEO", "HIST-GEO", "MATH", "ANG", "HIST-GEO"],
        ["HIST-GEO", "DEVOIR", "MATH", "ANG", "MATH"],
        ["ESP", "DEVOIR", "ESP", "FRAN", "MATH"],
        ["FRAN", "SVT", "FRAN", "ÉTUDE", "DEVOIR"],
        ["FRAN", "SVT", "FRAN", "", "DEVOIR"],
        ["PC", "ESP", "", "FHR", "ANG"],
        ["PC", "EDHC", "", "EPS", "ÉTUDE"],
        ["TICE", "FRAN", "", "EPS", ""],
      ],
      "3ème 2": [
        ["FRAN", "ESP", "HIST-GEO", "FRAN", "PC"],
        ["FRAN", "DEVOIR", "HIST-GEO", "FRAN", "PC"],
        ["SVT", "DEVOIR", "FRAN", "ANG", "ÉTUDE"],
        ["SVT", "MATH", "MATH", "ANG", "DEVOIR"],
        ["ESP", "MATH", "MATH", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO", "FRAN", "", "ESP", "EDHC"],
        ["TICE", "EPS", "", "HIST-GEO", "ANG"],
        ["FHR", "EPS", "", "", "ACT. VIE SCOLAIRE"],
      ],
      "3ème 3": [
        ["HIST-GEO", "MATH", "EPS", "ANG", "MATH"],
        ["HIST-GEO", "DEVOIR", "EPS", "ANG", "MATH"],
        ["PC", "DEVOIR", "ÉTUDE", "FRAN", "FRAN"],
        ["PC", "HIST-GEO", "FRAN", "FRAN", "DEVOIR"],
        ["FRAN", "ESP", "FRAN", "ACT. DU PERSONNEL", "DEVOIR"],
        ["ANG", "TICE", "", "SVT", "ESP"],
        ["MATH", "FHR", "", "SVT", "HIST-GEO"],
        ["ESP", "EDHC", "", "ÉTUDE", "ACT. VIE SCOLAIRE"],
      ],
      "3ème 4": [
        ["FRAN", "FRAN", "ANG", "ESP", "ÉTUDE"],
        ["FRAN", "DEVOIR", "ANG", "ESP", "ANG"],
        ["ESP", "DEVOIR", "ÉTUDE", "MATH", "MATH"],
        ["MATH", "HIST-GEO", "SVT", "HIST-GEO", "DEVOIR"],
        ["MATH", "HIST-GEO", "SVT", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO", "FHR", "", "TICE", "PC"],
        ["EPS", "FRAN", "", "FRAN", "PC"],
        ["EPS", "FRAN", "", "EDHC", "ACT. VIE SCOLAIRE"],
      ],
      "2nde A": [
        ["PC", "ESP", "", "EPS", "ANG"],
        ["PC", "DEVOIR", "", "EPS", "HIST-GEO"],
        ["MATH", "DEVOIR", "", "HIST-GEO", "PC"],
        ["ANG", "MATH", "", "HIST-GEO", "DEVOIR"],
        ["ANG", "MATH", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["FRAN", "HIST-GEO", "", "FRAN", "SVT"],
        ["FRAN", "TICE", "", "ESP", "SVT"],
        ["FHR", "FRAN", "", "ESP", "ACT. VIE SCOLAIRE"],
      ],
      "2nde C1": [
        ["SVT", "ESP", "ANG", "HIST-GEO", "PC"],
        ["SVT", "DEVOIR", "ANG", "HIST-GEO", "PC"],
        ["HIST-GEO", "DEVOIR", "EPS", "MATH", "FRAN"],
        ["PC", "FRAN", "EPS", "MATH", "DEVOIR"],
        ["PC", "FRAN", "ÉTUDE", "ACT. DU PERSONNEL", "DEVOIR"],
        ["TICE", "HIST-GEO", "", "FRAN", "MATH"],
        ["FHR", "PC", "", "ESP", "MATH"],
        ["MATH", "ANG", "", "ESP", "ACT. VIE SCOLAIRE"],
      ],
      "2nde C2": [
        ["PC", "HIST-GEO", "EPS", "HIST-GEO", "MATH"],
        ["PC", "DEVOIR", "EPS", "HIST-GEO", "MATH"],
        ["HIST-GEO", "DEVOIR", "ÉTUDE", "PC", "PC"],
        ["MATH", "FRAN", "ANG", "PC", "DEVOIR"],
        ["MATH", "FRAN", "ANG", "", "DEVOIR"],
        ["FHR", "MATH", "", "ESP", "SVT"],
        ["ESP", "ANG", "", "TICE", "SVT"],
        ["FRAN", "ESP", "", "FRAN", "ACT. VIE SCOLAIRE"],
      ],
      "1ère A": [
        ["SVT", "HIST-GEO", "FRAN", "PHILO", "FHR"],
        ["SVT", "DEVOIR", "FRAN", "PHILO", "FRAN"],
        ["HIST-GEO", "DEVOIR", "EPS", "ESP", "MATH"],
        ["HIST-GEO", "DEVOIR", "EPS", "ESP", "DEVOIR"],
        ["TICE", "PHILO", "ESP", "ACT. DU PERSONNEL", "DEVOIR"],
        ["FRAN", "ANG", "", "ANG", "ÉTUDE"],
        ["MATH", "ANG", "", "PC", "HIST-GEO"],
        ["MATH", "MATH", "", "PC", "ACT. VIE SCOLAIRE"],
      ],
      "1ère C": [
        ["MATH", "MATH", "MATH", "SVT", "HIST-GEO"],
        ["MATH", "DEVOIR", "MATH", "SVT", "HIST-GEO"],
        ["ANG", "DEVOIR", "FHR", "EPS", "SVT"],
        ["PC", "DEVOIR", "ANG", "EPS", "DEVOIR"],
        ["PC", "HIST-GEO", "ANG", "", "DEVOIR"],
        ["HIST-GEO", "FRAN", "", "PHILO", "PC"],
        ["FRAN", "PC", "", "PHILO", "PC"],
        ["FRAN", "PC", "", "MATH", "ACT. VIE SCOLAIRE"],
      ],
      "1ère D": [
        ["MATH", "PC", "MATH", "SVT", "HIST-GEO"],
        ["MATH", "DEVOIR", "MATH", "SVT", "HIST-GEO"],
        ["ANG", "DEVOIR", "FHR", "EPS", "SVT"],
        ["PC", "DEVOIR", "ANG", "EPS", "DEVOIR"],
        ["PC", "HIST-GEO", "ANG", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO", "FRAN", "", "PHILO", "PC"],
        ["FRAN", "MATH", "", "PHILO", "PC"],
        ["FRAN", "", "", "TICE", "ACT. VIE SCOLAIRE"],
      ],
      "Tle A1": [
        ["ESP", "HIST-GEO", "MATH", "ESP", "ANG"],
        ["PHILO", "DEVOIR", "MATH", "ESP", "ANG"],
        ["PHILO", "DEVOIR", "PHILO", "FRAN", "MATH"],
        ["FRAN", "DEVOIR", "PHILO", "PHILO", "DEVOIR"],
        ["FRAN", "DEVOIR", "FRAN", "PHILO", "DEVOIR"],
        ["MATH", "ANG", "", "HIST-GEO", "SVT"],
        ["MATH", "PHILO", "", "EPS", "SVT"],
        ["HIST-GEO", "PHILO", "", "EPS", "HIST-GEO"],
      ],
      "Tle A2": [
        ["ESP", "FRAN", "FRAN", "ESP", "PHILO"],
        ["PHILO", "DEVOIR", "FRAN", "ESP", "PHILO"],
        ["PHILO", "DEVOIR", "ÉTUDE", "ANG", "HIST-GEO"],
        ["HIST-GEO", "DEVOIR", "PHILO", "ANG", "DEVOIR"],
        ["HIST-GEO", "DEVOIR", "PHILO", "HIST-GEO", "DEVOIR"],
        ["FRAN", "MATH", "", "MATH", "MATH"],
        ["SVT", "MATH", "", "PHILO", "EPS"],
        ["SVT", "ANG", "", "PHILO", "EPS"],
      ],
      "Tle C": [
        ["PC", "ANG", "SVT", "PC", "MATH"],
        ["PC", "DEVOIR", "SVT", "PC", "MATH"],
        ["FRAN", "DEVOIR", "HIST-GEO", "PHILO", "HIST-GEO"],
        ["MATH", "DEVOIR", "MATH", "FRAN", "DEVOIR"],
        ["MATH", "DEVOIR", "MATH", "FRAN", "DEVOIR"],
        ["SVT", "MATH", "", "HIST-GEO", "ANG"],
        ["PHILO", "PC", "", "MATH", "EPS"],
        ["PHILO", "PC", "", "MATH", "EPS"],
      ],
      "Tle D": [
        ["PC", "ANG", "SVT", "PC", "SVT"],
        ["PC", "DEVOIR", "SVT", "PC", "SVT"],
        ["FRAN", "DEVOIR", "HIST-GEO", "PHILO", "HIST-GEO"],
        ["MATH", "DEVOIR", "PC", "FRAN", "DEVOIR"],
        ["MATH", "DEVOIR", "ÉTUDE", "FRAN", "DEVOIR"],
        ["SVT", "HIST-GEO", "", "HIST-GEO", "ANG"],
        ["PHILO", "MATH", "", "MATH", "EPS"],
        ["PHILO", "MATH", "", "MATH", "EPS"],
      ],
    };

    // Regroupement des matières par famille, pour le code couleur de la grille
    var FAMILLES = {
      sciences: ["MATH","PC","SVT","TICE"],
      lettres:  ["FRAN","ANG","ESP","ESP / ALL","PHILO"],
      humaines: ["HIST-GEO","EDHC","ENTREPRENEURIAT"],
      vie:      ["EPS","MUSIQUE","FHR","ÉTUDE","ACT. DU PERSONNEL","ACT. VIE SCOLAIRE"],
      devoir:   ["DEVOIR"]
    };
    function familleOf(subj){
      for (var f in FAMILLES){
        if (FAMILLES[f].indexOf(subj) !== -1) return f;
      }
      return "humaines";
    }

    // --- État courant du sélecteur ---
    var state = { cycle:"Premier cycle", niveau:"6ème", classe:"1" };

    function pill(txt, actif, onClick){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill' + (actif ? ' active' : '');
      b.textContent = txt;
      b.addEventListener('click', onClick);
      return b;
    }

    function renderCycles(){
      var el = document.getElementById('cycleGroup');
      el.innerHTML = '';
      Object.keys(LEVELS).forEach(function(cy){
        el.appendChild(pill(cy, cy === state.cycle, function(){
          state.cycle  = cy;
          state.niveau = LEVELS[cy].cycles[0];
          state.classe = LEVELS[cy].classes[state.niveau][0];
          renderAll();
        }));
      });
    }

    function renderNiveaux(){
      var el = document.getElementById('niveauGroup');
      el.innerHTML = '';
      LEVELS[state.cycle].cycles.forEach(function(n){
        el.appendChild(pill(n, n === state.niveau, function(){
          state.niveau = n;
          state.classe = LEVELS[state.cycle].classes[n][0];
          renderNiveaux();     // redessine pour refléter la sélection
          renderClasses();
          updateLabel();
        }));
      });
    }

    function renderClasses(){
      var el = document.getElementById('classeGroup');
      el.innerHTML = '';
      LEVELS[state.cycle].classes[state.niveau].forEach(function(cl){
        el.appendChild(pill(cl, cl === state.classe, function(){
          state.classe = cl;
          renderClasses();
          updateLabel();
        }));
      });
    }

    function nomClasse(){
      return state.niveau + ' ' + state.classe;
    }

    function updateLabel(){
      var nom = nomClasse();
      document.getElementById('edtClassLabel').textContent = nom;
      renderTable(EDT_DATA[nom]);
    }

    // --- Construction de la grille horaire ---
    function renderTable(data){
      var body = document.getElementById('edtBody');
      body.innerHTML = '';
      if(!data){
        var tr = document.createElement('tr');
        var td = document.createElement('td');
        td.colSpan = 6; td.className = 'edt-empty';
        td.style.cssText = 'text-align:center;padding:40px;color:var(--ink-soft);font-style:italic;';
        td.textContent = "Emploi du temps non encore communiqué pour cette classe.";
        tr.appendChild(td); body.appendChild(tr);
        return;
      }
      TIME_ROWS.forEach(function(row){
        var tr = document.createElement('tr');
        if(row.type === 'break'){
          var td = document.createElement('td');
          td.className = 'edt-break'; td.colSpan = 6;
          td.innerHTML = '<div class="brk-row">' +
            '<span>' + row.text + '</span><i></i>' +
            '<span>' + row.text + '</span><i></i>' +
            '<span>' + row.text + '</span></div>';
          tr.appendChild(td);
        } else {
          var tdTime = document.createElement('td');
          tdTime.className = 'edt-time';
          tdTime.innerHTML = '<b>' + row.label + '</b><span>' + row.time + '</span>';
          tr.appendChild(tdTime);
          var cells = data[row.idx] || ["","","","",""];
          cells.forEach(function(subj, i){
            var td = document.createElement('td');
            td.setAttribute('data-c', i + 1);
            if(subj){
              td.className = 'edt-slot';
              td.setAttribute('data-fam', familleOf(subj));
              td.innerHTML = '<span class="subj">' + subj + '</span>';
            } else {
              /* Même traitement que la vue enseignant : un tiret plutôt
                 qu'un rectangle vide, pour qu'une case sans cours se lise
                 comme une information (« rien ce créneau ») et non comme
                 un défaut d'affichage. */
              td.className = 'edt-empty c-vide';
            }
            tr.appendChild(td);
          });
        }
        body.appendChild(tr);
      });
    }

    // Mise en évidence de la colonne survolée
    (function(){
      var table = document.getElementById('edtTable');
      table.addEventListener('mouseover', function(e){
        var cell = e.target.closest('td[data-c], th[data-c]');
        table.setAttribute('data-col', cell ? cell.getAttribute('data-c') : '');
      });
      table.addEventListener('mouseleave', function(){
        table.removeAttribute('data-col');
      });
    })();

    function renderAll(){
      renderCycles();
      renderNiveaux();
      renderClasses();
      updateLabel();
    }

    renderAll();
  })();
  

