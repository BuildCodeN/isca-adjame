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
          "Tle": ["A1","A2","C","D1","D2"]
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

    // Emplois du temps réels 2026-2027, extraits du document officiel de
    // l'ISCA (Documents/EDT_CLASSE_2026-2027.pdf.docx). 25 classes sur 26 :
    // le document ne fournit aucune grille exploitable pour 5ème 2 et
    // 5ème 3 (un tableau vide sous une légende incomplète, une légende
    // sans tableau en face) — voir la grille non communiquée plutôt que
    // d'inventer un contenu. La Terminale D est désormais scindée en
    // D1 et D2.
    var EDT_DATA = {
      "6ème 1": [
        ["EPS", "TICE", "", "PC", "FRAN"],
        ["EPS", "DEVOIR", "", "PC", "MATH"],
        ["FHR", "ÉTUDE", "", "FRAN", "MATH"],
        ["ANG", "MUSIQUE", "", "MATH", "DEVOIR"],
        ["ANG", "MATH", "", "", "ANG"],
        ["FRAN", "FRAN", "", "SVT", "HIST-GEO"],
        ["HIST-GEO", "FRAN", "", "SVT", "EDHC"],
        ["", "", "", "", ""],
      ],
      "6ème 2": [
        ["MATH", "HIST-GEO", "", "FRAN", "MATH"],
        ["MATH", "DEVOIR", "", "FRAN", "FRAN"],
        ["EPS", "MUSIQUE", "", "MATH", "EDHC"],
        ["EPS", "FRAN", "", "ANG", "DEVOIR"],
        ["HIST-GEO", "FRAN", "", "", "ÉTUDE"],
        ["ANG", "FHR", "", "PC", "SVT"],
        ["TICE", "ANG", "", "PC", "SVT"],
        ["", "", "", "", ""],
      ],
      "6ème 3": [
        ["FRAN", "MATH", "", "MATH", "EPS"],
        ["FRAN", "DEVOIR", "", "MATH", "EPS"],
        ["MATH", "ÉTUDE", "", "ANG", "HIST-GEO"],
        ["SVT", "TICE", "", "FRAN", "DEVOIR"],
        ["SVT", "FRAN", "", "", "EDHC"],
        ["HIST-GEO", "PC", "", "FHR", "FRAN"],
        ["ANG", "PC", "", "MUSIQUE", "ANG"],
        ["", "", "", "", ""],
      ],
      "6ème 4": [
        ["HIST-GEO", "FRAN", "", "ANG", "EPS"],
        ["EDHC", "DEVOIR", "", "HIST-GEO", "EPS"],
        ["ANG", "ÉTUDE", "", "SVT", "FHR"],
        ["FRAN", "MATH", "", "SVT", "DEVOIR"],
        ["FRAN", "MATH", "", "", "MATH"],
        ["PC", "ANG", "", "MATH", "MUSIQUE"],
        ["PC", "TICE", "", "FRAN", "FRAN"],
        ["", "", "", "", ""],
      ],
      "5ème 1": [
        ["ANG", "EDHC", "", "EPS", "PC"],
        ["MATH", "DEVOIR", "", "EPS", "PC"],
        ["MATH", "TICE", "", "HIST-GEO", "ANG"],
        ["FRAN", "FHR", "", "MATH", "DEVOIR"],
        ["FHR", "ANG", "", "", "MATH"],
        ["SVT", "FRAN", "", "MUSIQUE", "HIST-GEO"],
        ["SVT", "FRAN", "", "FRAN", "FRAN"],
        ["", "", "", "", ""],
      ],
      "5ème 4": [
        ["HIST-GEO", "MATH", "", "FRAN", "HIST-GEO"],
        ["FRAN", "DEVOIR", "", "FRAN", "EPS"],
        ["MATH", "FHR", "", "EDHC", "EPS"],
        ["MATH", "PC", "", "ANG", "DEVOIR"],
        ["TICE", "PC", "", "", "MATH"],
        ["ÉTUDE", "FRAN", "", "SVT", "FRAN"],
        ["ANG", "ANG", "", "SVT", "MUSIQUE"],
        ["", "", "", "", ""],
      ],
      "4ème 1": [
        ["PC", "FRAN", "", "ANG", "EDHC"],
        ["PC", "DEVOIR", "", "ANG", "FRAN"],
        ["FRAN", "DEVOIR", "", "FRAN", "MATH"],
        ["FRAN", "ANG", "", "FRAN", "DEVOIR"],
        ["MATH", "HIST-GEO", "", "", "DEVOIR"],
        ["ESP", "SVT", "", "HIST-GEO", "HIST-GEO"],
        ["EPS", "SVT", "", "MATH", "ESP"],
        ["EPS", "MATH", "", "ESP", "TICE"],
      ],
      "4ème 2": [
        ["FRAN", "MATH", "", "EDHC", "FRAN"],
        ["FRAN", "DEVOIR", "", "HIST-GEO", "SVT"],
        ["MATH", "DEVOIR", "", "ESP", "SVT"],
        ["MATH", "FRAN", "", "FRAN", "DEVOIR"],
        ["ESP", "FRAN", "", "", "DEVOIR"],
        ["PC", "TICE", "", "ANG", "ESP"],
        ["PC", "HIST-GEO", "", "ANG", "EPS"],
        ["HIST-GEO", "ANG", "", "MATH", "EPS"],
      ],
      "4ème 3": [
        ["MATH", "EDHC", "", "EPS", "FRAN"],
        ["MATH", "DEVOIR", "", "EPS", "FRAN"],
        ["FRAN", "DEVOIR", "", "PC", "HIST-GEO"],
        ["ANG", "FRAN", "", "PC", "DEVOIR"],
        ["ANG", "FRAN", "", "", "DEVOIR"],
        ["ESP", "ESP", "", "FRAN", "TICE"],
        ["SVT", "MATH", "", "HIST-GEO", "MATH"],
        ["SVT", "HIST-GEO", "", "ANG", "ESP"],
      ],
      "4ème 4": [
        ["EPS", "ANG", "", "FRAN", "MATH"],
        ["EPS", "DEVOIR", "", "FRAN", "MATH"],
        ["SVT", "DEVOIR", "", "PC", "ESP"],
        ["SVT", "ESP", "", "PC", "DEVOIR"],
        ["MATH", "ESP", "", "", "DEVOIR"],
        ["FRAN", "EDHC", "", "FRAN", "FRAN"],
        ["FRAN", "HIST-GEO", "", "ANG", "TICE"],
        ["HIST-GEO", "MATH", "", "HIST-GEO", "ANG"],
      ],
      "3ème 1": [
        ["FRAN", "ESP", "HIST-GEO", "FRAN", "PC"],
        ["FRAN", "DEVOIR", "HIST-GEO", "FRAN", "PC"],
        ["SVT", "DEVOIR", "FRAN", "MATH", "FHR"],
        ["SVT", "MATH", "ESP", "MATH", "DEVOIR"],
        ["ESP", "MATH", "ÉTUDE", "", "DEVOIR"],
        ["HIST-GEO", "EDHC", "", "HIST-GEO", "ANG"],
        ["TICE", "FRAN", "", "EPS", "ANG"],
        ["ÉTUDE", "ANG", "", "EPS", "ACT. VIE SCOLAIRE"],
      ],
      "3ème 2": [
        ["HIST-GEO", "HIST-GEO", "MATH", "PC", "HIST-GEO"],
        ["HIST-GEO", "DEVOIR", "MATH", "PC", "MATH"],
        ["ESP", "DEVOIR", "ESP", "ANG", "MATH"],
        ["FRAN", "SVT", "FRAN", "ANG", "DEVOIR"],
        ["FRAN", "SVT", "FRAN", "", "DEVOIR"],
        ["ANG", "ESP", "", "FRAN", "FHR"],
        ["ÉTUDE", "EDHC", "", "EPS", "ÉTUDE"],
        ["TICE", "FRAN", "", "EPS", ""],
      ],
      "3ème 3": [
        ["FRAN", "FHR", "ANG", "ESP", "FRAN"],
        ["FRAN", "DEVOIR", "ANG", "ESP", "ANG"],
        ["ESP", "DEVOIR", "SVT", "MATH", "MATH"],
        ["MATH", "HIST-GEO", "SVT", "HIST-GEO", "DEVOIR"],
        ["MATH", "HIST-GEO", "ÉTUDE", "", "DEVOIR"],
        ["HIST-GEO", "FRAN", "", "TICE", "PC"],
        ["EPS", "FRAN", "", "FRAN", "PC"],
        ["EPS", "ESP", "", "EDHC", "ACT. VIE SCOLAIRE"],
      ],
      "3ème 4": [
        ["HIST-GEO", "MATH", "EPS", "SVT", "MATH"],
        ["HIST-GEO", "DEVOIR", "EPS", "SVT", "MATH"],
        ["PC", "DEVOIR", "FRAN", "FRAN", "FRAN"],
        ["PC", "HIST-GEO", "FRAN", "FRAN", "DEVOIR"],
        ["FRAN", "ESP", "ÉTUDE", "", "DEVOIR"],
        ["ANG", "TICE", "", "ANG", "ESP"],
        ["ESP", "FHR", "", "ANG", "HIST-GEO"],
        ["MATH", "EDHC", "", "ÉTUDE", "ACT. VIE SCOLAIRE"],
      ],
      "2nde A": [
        ["SVT", "ESP", "ANG", "HIST-GEO", "PC"],
        ["SVT", "DEVOIR", "ANG", "HIST-GEO", "HIST-GEO"],
        ["HIST-GEO", "DEVOIR", "EPS", "MATH", "FRAN"],
        ["PC", "FRAN", "ÉTUDE", "MATH", "DEVOIR"],
        ["PC", "FRAN", "", "", "DEVOIR"],
        ["TICE", "FHR", "", "ESP", "MATH"],
        ["ANG", "PC", "", "ESP", "MATH"],
        ["MATH", "PC", "", "FRAN", "ACT. VIE SCOLAIRE"],
      ],
      "2nde C1": [
        ["PC", "ESP", "", "EPS", "ANG"],
        ["PC", "DEVOIR", "", "EPS", "HIST-GEO"],
        ["MATH", "DEVOIR", "", "HIST-GEO", "PC"],
        ["ANG", "MATH", "", "HIST-GEO", "DEVOIR"],
        ["ANG", "MATH", "", "", "DEVOIR"],
        ["FRAN", "HIST-GEO", "", "ESP", "SVT"],
        ["FRAN", "TICE", "", "ESP", "SVT"],
        ["FHR", "FRAN", "", "FRAN", "ACT. VIE SCOLAIRE"],
      ],
      "2nde C2": [
        ["SVT", "PHILO", "PC", "FRAN", "FHR"],
        ["SVT", "DEVOIR", "PC", "FRAN", "FRAN"],
        ["HIST-GEO", "DEVOIR", "EPS", "ESP", "MATH"],
        ["HIST-GEO", "DEVOIR", "EPS", "ESP", "DEVOIR"],
        ["ANG", "HIST-GEO", "ESP", "", "DEVOIR"],
        ["FRAN", "ANG", "", "PHILO", "ÉTUDE"],
        ["MATH", "ANG", "", "PHILO", "HIST-GEO"],
        ["MATH", "MATH", "", "TICE", "ACT. VIE SCOLAIRE"],
      ],
      "1ère A": [
        ["PC", "HIST-GEO", "EPS", "HIST-GEO", "MATH"],
        ["PC", "DEVOIR", "EPS", "HIST-GEO", "MATH"],
        ["ANG", "DEVOIR", "ANG", "TICE", "PC"],
        ["MATH", "FRAN", "ANG", "FHR", "DEVOIR"],
        ["MATH", "FRAN", "ÉTUDE", "", "DEVOIR"],
        ["HIST-GEO", "MATH", "", "PC", "SVT"],
        ["FRAN", "ESP", "", "PC", "SVT"],
        ["ESP", "ESP", "", "FRAN", "ACT. VIE SCOLAIRE"],
      ],
      "1ère C": [
        ["MATH", "PC", "MATH", "SVT", "HIST-GEO"],
        ["MATH", "DEVOIR", "MATH", "SVT", "HIST-GEO"],
        ["ANG", "DEVOIR", "FRAN", "EPS", "SVT"],
        ["PC", "DEVOIR", "ANG", "EPS", "DEVOIR"],
        ["PC", "PHILO", "ANG", "", "DEVOIR"],
        ["PHILO", "HIST-GEO", "", "TICE", "PC"],
        ["PHILO", "MATH", "", "FRAN", "PC"],
        ["HIST-GEO", "FHR", "", "FRAN", "ACT. VIE SCOLAIRE"],
      ],
      "1ère D": [
        ["MATH", "MATH", "MATH", "SVT", "HIST-GEO"],
        ["MATH", "DEVOIR", "MATH", "SVT", "HIST-GEO"],
        ["ANG", "DEVOIR", "FRAN", "EPS", "SVT"],
        ["PC", "DEVOIR", "ANG", "EPS", "DEVOIR"],
        ["PC", "PHILO", "ANG", "", "DEVOIR"],
        ["PHILO", "HIST-GEO", "", "MATH", "PC"],
        ["PHILO", "PC", "", "FRAN", "PC"],
        ["HIST-GEO", "PC", "", "FRAN", "ACT. VIE SCOLAIRE"],
      ],
      "Tle A1": [
        ["ESP", "ANG", "MATH", "ESP", "ANG"],
        ["PHILO", "DEVOIR", "MATH", "ESP", "ANG"],
        ["PHILO", "DEVOIR", "PHILO", "EPS", "MATH"],
        ["FRAN", "DEVOIR", "PHILO", "EPS", "DEVOIR"],
        ["FRAN", "DEVOIR", "FRAN", "FRAN", "DEVOIR"],
        ["MATH", "HIST-GEO", "", "SVT", "PHILO"],
        ["MATH", "PHILO", "", "SVT", "PHILO"],
        ["HIST-GEO", "PHILO", "", "HIST-GEO", "HIST-GEO"],
      ],
      "Tle A2": [
        ["PC", "ÉTUDE", "SVT", "PC", "SVT"],
        ["PC", "DEVOIR", "SVT", "PC", "SVT"],
        ["FRAN", "DEVOIR", "ANG", "PHILO", "HIST-GEO"],
        ["MATH", "DEVOIR", "", "FRAN", "DEVOIR"],
        ["MATH", "DEVOIR", "PC", "FRAN", "DEVOIR"],
        ["SVT", "HIST-GEO", "", "MATH", "ANG"],
        ["PHILO", "MATH", "", "MATH", "EPS"],
        ["PHILO", "MATH", "", "", "EPS"],
      ],
      "Tle C": [
        ["SVT", "PC", "FRAN", "MATH", "SVT"],
        ["SVT", "DEVOIR", "FRAN", "MATH", "SVT"],
        ["FRAN", "DEVOIR", "PC", "PC", "PHILO"],
        ["PHILO", "DEVOIR", "PC", "PC", "DEVOIR"],
        ["PHILO", "DEVOIR", "SVT", "", "DEVOIR"],
        ["MATH", "ANG", "ANG", "HIST-GEO", "HIST-GEO"],
        ["MATH", "HIST-GEO", "", "EPS", "MATH"],
        ["ANG", "HIST-GEO", "", "EPS", "MATH"],
      ],
      "Tle D1": [
        ["ANG", "FRAN", "PHILO", "PHILO", "PHILO"],
        ["ANG", "DEVOIR", "PHILO", "PHILO", "PHILO"],
        ["HIST-GEO", "DEVOIR", "FRAN", "SVT", "FRAN"],
        ["PHILO", "DEVOIR", "FRAN", "SVT", "DEVOIR"],
        ["PHILO", "DEVOIR", "ANG", "HIST-GEO", "DEVOIR"],
        ["MATH", "MATH", "", "", "MATH"],
        ["MATH", "EPS", "", "ESP", "HIST-GEO"],
        ["ESP", "EPS", "", "ESP", "HIST-GEO"],
      ],
      "Tle D2": [
        ["PC", "ANG", "SVT", "PC", "MATH"],
        ["PC", "DEVOIR", "SVT", "PC", "MATH"],
        ["FRAN", "DEVOIR", "HIST-GEO", "PHILO", "HIST-GEO"],
        ["MATH", "DEVOIR", "MATH", "FRAN", "DEVOIR"],
        ["MATH", "DEVOIR", "MATH", "FRAN", "DEVOIR"],
        ["SVT", "HIST-GEO", "", "MATH", "ANG"],
        ["PHILO", "PC", "", "MATH", "EPS"],
        ["PHILO", "PC", "", "HIST-GEO", "EPS"],
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
  

