/* ==================================================================
   Emplois du temps par classe
   ================================================================== */
  (function(){
    var LEVELS = {
      "Premier cycle": {
        cycles: ["6ème","5ème","4ème","3ème"],
        classes: {
          "6ème": ["1","2","3","4"],
          "5ème": ["1","2","3","4"],
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
      {label:"6ème H.", time:"13 h 30 – 14 h 20", idx:5},
      {label:"7ème H.", time:"14 h 25 – 15 h 15", idx:6},
      {label:"8ème H.", time:"15 h 20 – 16 h 10", idx:7},
    ];

    // Emplois du temps réels 2025-2026, extraits du document officiel de l'ISCA
    // signé par le Directeur. 26 classes, de la 6ème à la Terminale.
    var EDT_DATA = {
      "6ème 1": [
        ["EPS", "HIST-GEO", "", "FRAN", "FRAN"],
        ["EPS", "DEVOIR", "", "EDHC", "FRAN"],
        ["FRAN", "SVT", "", "ENTREPRENEURIAT", "ANG"],
        ["PC", "SVT", "", "FHR", "DEVOIR"],
        ["PC", "MATH", "", "", "MUSIQUE"],
        ["FRAN", "ANG", "", "MATH", "MATH"],
        ["HIST-GEO", "ANG", "", "MATH", "TICE"],
        ["", "", "", "", ""],
      ],
      "6ème 2": [
        ["PC", "ANG", "", "FRAN", "MATH"],
        ["PC", "DEVOIR", "", "FRAN", "MATH"],
        ["EPS", "MUSIQUE", "", "MATH", "FRAN"],
        ["EPS", "FRAN", "", "HIST-GEO", "DEVOIR"],
        ["ANG", "FRAN", "", "", "ANG"],
        ["TICE", "MATH", "", "FHR", "SVT"],
        ["ENTREPRENEURIAT", "HIST-GEO", "", "EDHC", "SVT"],
        ["", "", "", "", ""],
      ],
      "6ème 3": [
        ["FRAN", "FRAN", "", "MATH", "EDHC"],
        ["FRAN", "DEVOIR", "", "MATH", "ANG"],
        ["HIST-GEO", "EPS", "", "ANG", "TICE"],
        ["SVT", "EPS", "", "FRAN", "DEVOIR"],
        ["SVT", "MATH", "", "ÉTUDE", "FHR"],
        ["ANG", "PC", "", "MUSIQUE", "FRAN"],
        ["MATH", "PC", "", "ENTREPRENEURIAT", "HIST-GEO"],
        ["", "", "", "", ""],
      ],
      "6ème 4": [
        ["MATH", "MATH", "", "EPS", "ANG"],
        ["MATH", "DEVOIR", "", "EPS", "ANG"],
        ["FRAN", "FRAN", "", "SVT", "FHR"],
        ["FRAN", "FHR", "", "SVT", "DEVOIR"],
        ["HIST-GEO", "ANG", "", "", "TICE"],
        ["PC", "ENTREPRENEURIAT", "", "MATH", "FRAN"],
        ["PC", "EDHC", "", "FRAN", "HIST-GEO"],
        ["", "", "", "", ""],
      ],
      "5ème 1": [
        ["ANG", "MATH", "", "ANG", "PC"],
        ["MATH", "DEVOIR", "", "FRAN", "PC"],
        ["EDHC", "TICE", "", "EPS", "ANG"],
        ["FRAN", "SVT", "", "EPS", "DEVOIR"],
        ["FRAN", "SVT", "", "ÉTUDE", "MATH"],
        ["MUSIQUE", "FRAN", "", "MATH", "HIST-GEO"],
        ["ENTREPRENEURIAT", "FHR", "", "HIST-GEO", "FRAN"],
        ["", "", "", "", ""],
      ],
      "5ème 2": [
        ["FRAN", "FRAN", "", "FRAN", "TICE"],
        ["FRAN", "DEVOIR", "", "ANG", "PC"],
        ["ANG", "EPS", "", "SVT", "PC"],
        ["MATH", "EPS", "", "SVT", "DEVOIR"],
        ["HIST-GEO", "MATH", "", "ACT. DU PERSONNEL", "HIST-GEO"],
        ["EDHC", "FHR", "", "MATH", "MATH"],
        ["MUSIQUE", "FRAN", "", "", "ANG"],
        ["", "", "", "", ""],
      ],
      "5ème 3": [
        ["EPS", "MATH", "", "FHR", "MATH"],
        ["EPS", "DEVOIR", "", "FRAN", "MATH"],
        ["MATH", "ANG", "", "HIST-GEO", "FRAN"],
        ["PC", "ANG", "", "MUSIQUE", "DEVOIR"],
        ["PC", "ENTREPRENEURIAT", "", "ACT. DU PERSONNEL", "EDHC"],
        ["FRAN", "FRAN", "", "SVT", "ANG"],
        ["FRAN", "TICE", "", "SVT", "HIST-GEO"],
        ["", "", "", "", ""],
      ],
      "5ème 4": [
        ["MATH", "EDHC", "", "FRAN", "FHR"],
        ["HIST-GEO", "DEVOIR", "", "FRAN", "MATH"],
        ["EPS", "ANG", "", "SVT", "MATH"],
        ["EPS", "ANG", "", "SVT", "DEVOIR"],
        ["FRAN", "MATH", "", "ACT. DU PERSONNEL", "ENTREPRENEURIAT"],
        ["PC", "FRAN", "", "HIST-GEO", "TICE"],
        ["PC", "FRAN", "", "ANG", "MUSIQUE"],
        ["", "", "", "", ""],
      ],
      "4ème 1": [
        ["FRAN", "TICE", "", "ESP", "FRAN"],
        ["FRAN", "DEVOIR", "", "ESP", "SVT"],
        ["MATH", "DEVOIR", "", "HIST-GEO", "SVT"],
        ["ANG", "HIST-GEO", "", "ANG", "DEVOIR"],
        ["ESP", "HIST-GEO", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["PC", "MATH", "", "EDHC", "ANG"],
        ["PC", "FRAN", "", "MATH", "EPS"],
        ["FRAN", "FRAN", "", "MATH", "EPS"],
      ],
      "4ème 2": [
        ["PC", "TICE", "", "ANG", "MATH"],
        ["PC", "DEVOIR", "", "ANG", "FRAN"],
        ["FRAN", "DEVOIR", "", "FRAN", "FRAN"],
        ["FRAN", "ESP", "", "MATH", "DEVOIR"],
        ["MATH", "EDHC", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO", "SVT", "", "FRAN", "ESP"],
        ["EPS", "SVT", "", "ESP", "HIST-GEO"],
        ["EPS", "MATH", "", "HIST-GEO", "ANG"],
      ],
      "4ème 3": [
        ["EPS", "FRAN", "", "FRAN", "SVT"],
        ["EPS", "DEVOIR", "", "FRAN", "ESP"],
        ["SVT", "DEVOIR", "", "PC", "ESP"],
        ["TICE", "ESP", "", "PC", "DEVOIR"],
        ["MATH", "ANG", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO", "MATH", "", "ANG", "EDHC"],
        ["FRAN", "MATH", "", "HIST-GEO", "MATH"],
        ["FRAN", "FRAN", "", "HIST-GEO", "ANG"],
      ],
      "4ème 4": [
        ["FRAN", "ESP", "", "PC", "FRAN"],
        ["FRAN", "DEVOIR", "", "PC", "HIST-GEO"],
        ["EPS", "DEVOIR", "", "MATH", "HIST-GEO"],
        ["EPS", "FRAN", "", "MATH", "DEVOIR"],
        ["HIST-GEO", "FRAN", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["ESP", "ANG", "", "ESP", "ANG"],
        ["SVT", "ANG", "", "EDHC", "FRAN"],
        ["SVT", "MATH", "", "TICE", "MATH"],
      ],
      "3ème 1": [
        ["MATH", "HIST-GEO", "MATH", "PC", "ESP"],
        ["MATH", "DEVOIR", "MATH", "PC", "ANG"],
        ["ESP", "DEVOIR", "TICE", "FRAN", "ANG"],
        ["ESP", "SVT", "FHR", "FRAN", "DEVOIR"],
        ["FRAN", "SVT", "ÉTUDE", "ACT. DU PERSONNEL", "DEVOIR"],
        ["ANG", "EDHC", "", "HIST-GEO", "FRAN"],
        ["HIST-GEO", "EPS", "", "HIST-GEO", "FRAN"],
        ["FRAN", "EPS", "", "ÉTUDE", "ACT. VIE SCOLAIRE"],
      ],
      "3ème 2": [
        ["FRAN", "ESP", "HIST-GEO", "MATH", "ESP"],
        ["FRAN", "DEVOIR", "HIST-GEO", "MATH", "TICE"],
        ["ÉTUDE", "DEVOIR", "ÉTUDE", "FRAN", "FHR"],
        ["ANG", "MATH", "PC", "FRAN", "DEVOIR"],
        ["ESP", "HIST-GEO", "PC", "ACT. DU PERSONNEL", "DEVOIR"],
        ["MATH", "ANG", "", "SVT", "FRAN"],
        ["EPS", "FRAN", "", "SVT", "ANG"],
        ["EPS", "EDHC", "", "HIST-GEO", "ACT. VIE SCOLAIRE"],
      ],
      "3ème 3": [
        ["HIST-GEO", "FRAN", "PC", "MATH", "FRAN"],
        ["HIST-GEO", "DEVOIR", "PC", "MATH", "SVT"],
        ["TICE", "DEVOIR", "EPS", "ESP", "SVT"],
        ["FHR", "MATH", "EPS", "ESP", "DEVOIR"],
        ["FRAN", "MATH", "ÉTUDE", "ACT. DU PERSONNEL", "DEVOIR"],
        ["FRAN", "HIST-GEO", "", "FRAN", "HIST-GEO"],
        ["ANG", "EDHC", "", "FRAN", "ANG"],
        ["ANG", "ESP", "", "ÉTUDE", "ACT. VIE SCOLAIRE"],
      ],
      "3ème 4": [
        ["ESP", "ANG", "FHR", "HIST-GEO", "FRAN"],
        ["ESP", "DEVOIR", "SVT", "HIST-GEO", "FRAN"],
        ["FRAN", "DEVOIR", "SVT", "ANG", "ÉTUDE"],
        ["MATH", "FRAN", "TICE", "MATH", "DEVOIR"],
        ["ANG", "FRAN", "ÉTUDE", "ACT. DU PERSONNEL", "DEVOIR"],
        ["EDHC", "HIST-GEO", "", "FRAN", "HIST-GEO"],
        ["EPS", "MATH", "", "PC", "ESP"],
        ["EPS", "MATH", "", "PC", "ACT. VIE SCOLAIRE"],
      ],
      "2nde A": [
        ["PC", "ÉTUDE", "", "HIST-GEO", "ANG"],
        ["PC", "DEVOIR", "", "HIST-GEO", "ANG"],
        ["HIST-GEO", "DEVOIR", "", "FRAN", "PC"],
        ["ANG", "MATH", "", "FRAN", "DEVOIR"],
        ["MATH", "MATH", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["FRAN", "TICE", "", "FHR", "SVT"],
        ["ESP", "HIST-GEO", "", "EPS", "SVT"],
        ["ESP", "FRAN", "", "EPS", "ESP"],
      ],
      "2nde C1": [
        ["HIST-GEO", "PC", "PC", "MATH", "MATH"],
        ["HIST-GEO", "DEVOIR", "PC", "TICE", "MATH"],
        ["SVT", "DEVOIR", "ÉTUDE", "PC", "HIST-GEO"],
        ["SVT", "ANG", "ÉTUDE", "PC", "DEVOIR"],
        ["ANG", "ANG", "MATH", "ACT. DU PERSONNEL", "DEVOIR"],
        ["MATH", "FRAN", "", "HIST-GEO", "FRAN"],
        ["ESP / ALL", "EPS", "", "FRAN", "FHR"],
        ["ESP / ALL", "EPS", "", "FRAN", "ESP / ALL"],
      ],
      "2nde C2": [
        ["ANG", "MATH", "EPS", "MATH", "HIST-GEO"],
        ["ANG", "DEVOIR", "EPS", "MATH", "HIST-GEO"],
        ["ESP", "DEVOIR", "FHR", "ESP", "ANG"],
        ["MATH", "FRAN", "PC", "ESP", "DEVOIR"],
        ["MATH", "FRAN", "PC", "ACT. DU PERSONNEL", "DEVOIR"],
        ["PC", "ÉTUDE", "", "PC", "SVT"],
        ["FRAN", "TICE", "", "PC", "SVT"],
        ["FRAN", "HIST-GEO", "", "HIST-GEO", "ACT. VIE SCOLAIRE"],
      ],
      "1ère A": [
        ["PHILO", "ESP", "EPS", "TICE", "PHILO"],
        ["PHILO", "DEVOIR", "EPS", "FRAN", "FRAN"],
        ["ANG", "DEVOIR", "PC", "MATH", "FRAN"],
        ["SVT", "DEVOIR", "PC", "MATH", "DEVOIR"],
        ["SVT", "ANG", "ÉTUDE", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO", "HIST-GEO", "", "ESP", "ANG"],
        ["MATH", "HIST-GEO", "", "ESP", "FHR"],
        ["MATH", "FRAN", "", "HIST-GEO", "ACT. VIE SCOLAIRE"],
      ],
      "1ère C": [
        ["MATH", "MATH", "ANG", "SVT", "HIST-GEO"],
        ["MATH", "DEVOIR", "ANG", "SVT", "HIST-GEO"],
        ["ANG", "DEVOIR", "MATH", "EPS", "ÉTUDE"],
        ["PC", "DEVOIR", "MATH", "EPS", "DEVOIR"],
        ["PC", "PHILO", "FRAN", "ACT. DU PERSONNEL", "DEVOIR"],
        ["PHILO", "PC", "", "FRAN", "PC"],
        ["TICE", "PC", "", "FRAN", "PC"],
        ["HIST-GEO", "HIST-GEO", "", "MATH", "ACT. VIE SCOLAIRE"],
      ],
      "1ère D": [
        ["MATH", "SVT", "ANG", "SVT", "HIST-GEO"],
        ["MATH", "DEVOIR", "ANG", "SVT", "HIST-GEO"],
        ["ANG", "DEVOIR", "MATH", "EPS", "ÉTUDE"],
        ["PC", "DEVOIR", "MATH", "EPS", "DEVOIR"],
        ["PC", "PHILO", "FRAN", "ACT. DU PERSONNEL", "DEVOIR"],
        ["PHILO", "PC", "", "FRAN", "MATH"],
        ["TICE", "PC", "", "FRAN", "FHR"],
        ["HIST-GEO", "HIST-GEO", "", "PC", ""],
      ],
      "Tle A1": [
        ["ESP", "MATH", "PHILO", "EPS", "HIST-GEO"],
        ["ESP", "DEVOIR", "PHILO", "EPS", "HIST-GEO"],
        ["FRAN", "DEVOIR", "HIST-GEO", "PHILO", "MATH"],
        ["FRAN", "DEVOIR", "ANG", "PHILO", "DEVOIR"],
        ["HIST-GEO", "DEVOIR", "ANG", "MATH", "DEVOIR"],
        ["ANG", "FRAN", "", "SVT", "PHILO"],
        ["MATH", "PHILO", "", "SVT", "PHILO"],
        ["MATH", "PHILO", "", "ESP", "FRAN"],
      ],
      "Tle A2": [
        ["ESP", "FRAN", "FRAN", "PHILO", "HIST-GEO"],
        ["ESP", "DEVOIR", "FRAN", "PHILO", "PHILO"],
        ["HIST-GEO", "DEVOIR", "MATH", "HIST-GEO", "PHILO"],
        ["PHILO", "DEVOIR", "PHILO", "HIST-GEO", "DEVOIR"],
        ["PHILO", "DEVOIR", "PHILO", "MATH", "DEVOIR"],
        ["FRAN", "MATH", "", "ANG", "ÉTUDE"],
        ["SVT", "MATH", "", "ANG", "EPS"],
        ["SVT", "ANG", "", "ESP", "EPS"],
      ],
      "Tle C": [
        ["PC", "PHILO", "MATH", "PC", "ANG"],
        ["PC", "DEVOIR", "MATH", "PC", "SVT"],
        ["FRAN", "DEVOIR", "EPS", "FRAN", "SVT"],
        ["MATH", "DEVOIR", "EPS", "FRAN", "DEVOIR"],
        ["MATH", "DEVOIR", "HIST-GEO", "ANG", "DEVOIR"],
        ["SVT", "HIST-GEO", "", "HIST-GEO", "HIST-GEO"],
        ["PHILO", "PC", "", "MATH", "MATH"],
        ["PHILO", "PC", "", "MATH", "MATH"],
      ],
      "Tle D": [
        ["PC", "PHILO", "MATH", "PC", "ANG"],
        ["PC", "DEVOIR", "MATH", "PC", "SVT"],
        ["FRAN", "DEVOIR", "EPS", "FRAN", "SVT"],
        ["MATH", "DEVOIR", "EPS", "FRAN", "DEVOIR"],
        ["MATH", "DEVOIR", "HIST-GEO", "ANG", "DEVOIR"],
        ["SVT", "HIST-GEO", "", "HIST-GEO", "HIST-GEO"],
        ["PHILO", "SVT", "", "MATH", "ÉTUDE"],
        ["PHILO", "SVT", "", "MATH", "PC"],
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
  

