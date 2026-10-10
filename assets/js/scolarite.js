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
      {type:"break", text:"Pause déjeuner"},
      // Huit heures de cours consécutives : la pause déjeuner n'est pas une
      // heure. (L'application qui édite les PDF 2026-2027 la compte comme
      // 6ème heure et imprime 7, 8, 9 ; le site, lui, numérote de 1 à 8.)
      {label:"6ème H.", time:"13 h 30 – 14 h 20", idx:5},
      {label:"7ème H.", time:"14 h 25 – 15 h 15", idx:6},
      {label:"8ème H.", time:"15 h 20 – 16 h 10", idx:7},
    ];

    // Emplois du temps et professeurs principaux 2026-2027, tirés des deux
    // documents officiels de l'ISCA (Documents/EDT_Classes_OK.pdf et
    // Documents/EDT_Enseignants_OK.pdf) par outils/extraire-edt-pdf.py, qui
    // vérifie d'abord que les deux documents se recoupent. Pour mettre à jour :
    // remplacer les PDF puis lancer  python outils/extraire-edt-pdf.py --ecrire
    //
    // Chaque case est « MATIÈRE|Professeur » (un deuxième professeur s'ajoute
    // après un autre « | ») ; une case sans professeur est un simple libellé
    // (DEVOIR, ACT. DU PERSONNEL) ou une chaîne vide. « ESP / ALL » est un
    // créneau de langue vivante 2 : espagnol et allemand ont lieu en même temps,
    // avec deux professeurs. Les abréviations des matières sont celles du site
    // (FRAN, MATH, HIST-GEO, PC…) ; les noms sont repris tels qu'imprimés dans
    // les documents, « Epse » étant écrit « épouse » pour le professeur
    // principal. Cette année il n'y a pas de 5ème 4, et les anciennes
    // Terminales D1 et D2 ont été fusionnées en une seule Terminale D. Si une
    // classe du sélecteur n'avait pas de grille, la page l'annoncerait comme non
    // communiquée plutôt que d'en inventer une.
    // >>> DONNEES GENEREES (genere par outils/extraire-edt-pdf.py : ne pas modifier a la main)
    // Sources : EDT_Classes_OK.pdf et EDT_Enseignants_OK.pdf, edites le 04/10/2026.
    var PROF_PRINCIPAUX = {
      "6ème 1": "M. TOA BI Emmanuel",
      "6ème 2": "M. ISSA Badine",
      "6ème 3": "M. KOUASSI N’Guessan Ezéchiel",
      "6ème 4": "M. KPA Maka Francis",
      "5ème 1": "Mme YAO Amoin R., épouse ZOKOU",
      "5ème 2": "M. GNAGO Parfait",
      "5ème 3": "M. ALLAH N. Cyrille",
      "4ème 1": "M. ATCHEBRO J. Dimitri",
      "4ème 2": "Mme GABO Gisèle",
      "4ème 3": "M. MONDOTE Abiola Serge",
      "4ème 4": "Mme MOBIO Adelaïde",
      "3ème 1": "Mme YAO Adjoua, épouse ESSECOFY",
      "3ème 2": "M. YAYA Soro Aimé",
      "3ème 3": "M. GUIHIE G. Jean Marc",
      "3ème 4": "M. KOUASSI Joël Brice",
      "2nde A": "M. BOCA Cocoa Nestor",
      "2nde C1": "Mme SOM Toulo Odette, épouse HIEN",
      "2nde C2": "M. BALLO Pifouan",
      "1ère A": "M. N’GUESSAN Christian",
      "1ère C": "M. DIGBEU Roland Pascal A.",
      "1ère D": "M. MONNEY Arthur",
      "Tle A1": "Mme ADOU Julie, épouse ATTA",
      "Tle A2": "M. AGNIMEL Esmel B.",
      "Tle C": "M. GRAH Bogui Gelin",
      "Tle D": "M. YAPI Luther Jean Marc"
    };
    var EDT_DATA = {
      "6ème 1": [
        ["EPS|M. ISSA Badine", "TICE|M. AVIH Djèckèh", "", "PC|M. KPA Maka", "FRAN|Frère DION Fabrice"],
        ["EPS|M. ISSA Badine", "DEVOIR", "", "PC|M. KPA Maka", "MATH|M. YAPI Luther"],
        ["FHR|M. KOUADIO Richard", "MATH|M. YAPI Luther", "", "MATH|M. YAPI Luther", "MATH|M. YAPI Luther"],
        ["ANG|M. KOUASSI Ezéchiel", "MUSIQUE|M. ASSI Anin", "", "FRAN|Frère DION Fabrice", "DEVOIR"],
        ["ANG|M. KOUASSI Ezéchiel", "", "", "ACT. DU PERSONNEL", "ANG|M. KOUASSI Ezéchiel"],
        ["FRAN|Frère DION Fabrice", "FRAN|Frère DION Fabrice", "", "SVT|M. TOA BI Emmanuel", "HIST-GEO|M. ATCHEBRO Dimitri"],
        ["HIST-GEO|M. ATCHEBRO Dimitri", "FRAN|Frère DION Fabrice", "", "SVT|M. TOA BI Emmanuel", "EDHC|M. KPA Maka"],
        ["", "", "", "", ""],
      ],
      "6ème 2": [
        ["MATH|M. YAPI Luther", "MUSIQUE|M. ASSI Anin", "", "FRAN|Frère DION Fabrice", "SVT|M. TOA BI Emmanuel"],
        ["MATH|M. YAPI Luther", "DEVOIR", "", "FRAN|Frère DION Fabrice", "SVT|M. TOA BI Emmanuel"],
        ["EPS|M. ISSA Badine", "", "", "ANG|M. KOUASSI Ezéchiel", "EDHC|Mme MOBIO Adelaïde"],
        ["EPS|M. ISSA Badine", "FRAN|Frère DION Fabrice", "", "MATH|M. YAPI Luther", "DEVOIR"],
        ["HIST-GEO|M. N’GUESSAN Christian", "FRAN|Frère DION Fabrice", "", "ACT. DU PERSONNEL", "FHR|M. KOUADIO Richard"],
        ["ANG|M. KOUASSI Ezéchiel", "HIST-GEO|M. N’GUESSAN Christian", "", "PC|M. KPA Maka", "FRAN|Frère DION Fabrice"],
        ["TICE|M. AVIH Djèckèh", "ANG|M. KOUASSI Ezéchiel", "", "PC|M. KPA Maka", "MATH|M. YAPI Luther"],
        ["", "", "", "", ""],
      ],
      "6ème 3": [
        ["FRAN|M. KOUADIO Richard", "MATH|M. YAPI Luther", "", "MATH|M. YAPI Luther", "EPS|M. KOUA L’or"],
        ["FRAN|M. KOUADIO Richard", "DEVOIR", "", "MATH|M. YAPI Luther", "EPS|M. KOUA L’or"],
        ["MATH|M. YAPI Luther", "MUSIQUE|M. ASSI Anin", "", "FRAN|M. KOUADIO Richard", "HIST-GEO|M. N’GUESSAN Christian"],
        ["SVT|M. TOA BI Emmanuel", "HIST-GEO|M. N’GUESSAN Christian", "", "ANG|M. KOUASSI Ezéchiel", "DEVOIR"],
        ["SVT|M. TOA BI Emmanuel", "FRAN|M. KOUADIO Richard", "", "ACT. DU PERSONNEL", "EDHC|Mme MOBIO Adelaïde"],
        ["", "PC|M. KPA Maka", "", "FHR|M. KOUADIO Richard", "FRAN|M. KOUADIO Richard"],
        ["ANG|M. KOUASSI Ezéchiel", "PC|M. KPA Maka", "", "TICE|M. AVIH Djèckèh", "ANG|M. KOUASSI Ezéchiel"],
        ["", "", "", "", ""],
      ],
      "6ème 4": [
        ["HIST-GEO|M. N’GUESSAN Christian", "FRAN|M. KOUADIO Richard", "", "ANG|M. OUATTARA Lacina", "EPS|M. ISSA Badine"],
        ["EDHC|Mme MOBIO Adelaïde", "DEVOIR", "", "ANG|M. OUATTARA Lacina", "EPS|M. ISSA Badine"],
        ["ANG|M. OUATTARA Lacina", "", "", "SVT|M. TOA BI Emmanuel", "FHR|M. KOUADIO Richard"],
        ["FRAN|M. KOUADIO Richard", "MATH|M. YAPI Luther", "", "SVT|M. TOA BI Emmanuel", "DEVOIR"],
        ["FRAN|M. KOUADIO Richard", "MATH|M. YAPI Luther", "", "ACT. DU PERSONNEL", "HIST-GEO|M. N’GUESSAN Christian"],
        ["PC|M. KPA Maka", "MUSIQUE|M. ASSI Anin", "", "MATH|M. YAPI Luther", "MATH|M. YAPI Luther"],
        ["PC|M. KPA Maka", "TICE|M. AVIH Djèckèh", "", "FRAN|M. KOUADIO Richard", "FRAN|M. KOUADIO Richard"],
        ["", "", "", "", ""],
      ],
      "5ème 1": [
        ["ANG|M. KOUASSI Ezéchiel", "EDHC|M. KPA Maka", "", "EPS|M. MAMBO Georges", "PC|M. DJEGNAN Joël"],
        ["MATH|M. GUIHIE Jean", "DEVOIR", "", "EPS|M. MAMBO Georges", "PC|M. DJEGNAN Joël"],
        ["MATH|M. GUIHIE Jean", "FHR|Mme KONAN Viviane", "", "HIST-GEO|M. ALLAH Cyrille", "ANG|M. KOUASSI Ezéchiel"],
        ["FRAN|Mme YAO Amoin", "TICE|M. AVIH Djèckèh", "", "MATH|M. GUIHIE Jean", "DEVOIR"],
        ["", "ANG|M. KOUASSI Ezéchiel", "", "ACT. DU PERSONNEL", "MATH|M. GUIHIE Jean"],
        ["SVT|M. GNAGO Parfait", "FRAN|Mme YAO Amoin", "", "MUSIQUE|M. ASSI Anin", "HIST-GEO|M. ALLAH Cyrille"],
        ["SVT|M. GNAGO Parfait", "FRAN|Mme YAO Amoin", "", "FRAN|Mme YAO Amoin", "FRAN|Mme YAO Amoin"],
        ["", "", "", "", ""],
      ],
      "5ème 2": [
        ["FRAN|Mme YAO Amoin", "FRAN|Mme YAO Amoin", "", "FRAN|Mme YAO Amoin", "ANG|M. KOUASSI Ezéchiel"],
        ["FRAN|Mme YAO Amoin", "DEVOIR", "", "FRAN|Mme YAO Amoin", "ANG|M. KOUASSI Ezéchiel"],
        ["ANG|M. KOUASSI Ezéchiel", "EPS|M. MAMBO Georges", "", "SVT|M. GNAGO Parfait", "MATH|M. MONDOTE Abiola"],
        ["FHR|Mme KONAN Viviane", "EPS|M. MAMBO Georges", "", "SVT|M. GNAGO Parfait", "DEVOIR"],
        ["EDHC|M. KPA Maka", "TICE|M. AVIH Djèckèh", "", "ACT. DU PERSONNEL", "MUSIQUE|M. ASSI Anin"],
        ["MATH|M. MONDOTE Abiola", "MATH|M. MONDOTE Abiola", "", "PC|M. DJEGNAN Joël", ""],
        ["MATH|M. MONDOTE Abiola", "HIST-GEO|M. ALLAH Cyrille", "", "PC|M. DJEGNAN Joël", "HIST-GEO|M. ALLAH Cyrille"],
        ["", "", "", "", ""],
      ],
      "5ème 3": [
        ["EDHC|M. MONNEY Arthur", "MATH|M. MONDOTE Abiola", "", "SVT|M. GNAGO Parfait", "HIST-GEO|M. ALLAH Cyrille"],
        ["HIST-GEO|M. ALLAH Cyrille", "DEVOIR", "", "SVT|M. GNAGO Parfait", "EPS|M. MAMBO Georges"],
        ["MATH|M. MONDOTE Abiola", "FRAN|Frère DION Fabrice", "", "ANG|M. OUATTARA Lacina", "EPS|M. MAMBO Georges"],
        ["MATH|M. MONDOTE Abiola", "PC|M. DJEGNAN Joël", "", "ANG|M. OUATTARA Lacina", "DEVOIR"],
        ["ANG|M. OUATTARA Lacina", "PC|M. DJEGNAN Joël", "", "ACT. DU PERSONNEL", "MATH|M. MONDOTE Abiola"],
        ["TICE|M. GUEGUE Hermann", "", "", "FRAN|Frère DION Fabrice", "MUSIQUE|M. ASSI Anin"],
        ["FRAN|Frère DION Fabrice", "FHR|Mme KONAN Viviane", "", "FRAN|Frère DION Fabrice", "FRAN|Frère DION Fabrice"],
        ["", "", "", "", ""],
      ],
      "4ème 1": [
        ["FRAN|M. N’GUESSAN Modeste", "ANG|M. YAYA Soro", "", "TICE|M. GUEGUE Hermann", "FRAN|M. N’GUESSAN Modeste"],
        ["FRAN|M. N’GUESSAN Modeste", "DEVOIR", "", "FRAN|M. N’GUESSAN Modeste", "SVT|M. GNAGO Parfait"],
        ["ESP|Mme GABO Gisèle", "DEVOIR", "", "EDHC|M. DIGBEU Roland", "SVT|M. GNAGO Parfait"],
        ["HIST-GEO|M. ATCHEBRO Dimitri", "MATH|M. MONDOTE Abiola", "", "ESP|Mme GABO Gisèle", "DEVOIR"],
        ["HIST-GEO|M. ATCHEBRO Dimitri", "MATH|M. MONDOTE Abiola", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["PC|M. DJEGNAN Joël", "ESP|Mme GABO Gisèle", "", "ANG|M. YAYA Soro", "MATH|M. MONDOTE Abiola"],
        ["PC|M. DJEGNAN Joël", "FRAN|M. N’GUESSAN Modeste", "", "ANG|M. YAYA Soro", "EPS|M. KOUA L’or"],
        ["MATH|M. MONDOTE Abiola", "FRAN|M. N’GUESSAN Modeste", "", "HIST-GEO|M. ATCHEBRO Dimitri", "EPS|M. KOUA L’or"],
      ],
      "4ème 2": [
        ["PC|M. DJEGNAN Joël", "FRAN|M. N’GUESSAN Modeste", "", "ANG|M. KOUASSI Ezéchiel", "TICE|M. GUEGUE Hermann"],
        ["PC|M. DJEGNAN Joël", "DEVOIR", "", "ANG|M. KOUASSI Ezéchiel", "ESP|Mme GABO Gisèle"],
        ["EPS|M. KOUA L’or", "DEVOIR", "", "ESP|Mme GABO Gisèle", "FRAN|M. N’GUESSAN Modeste"],
        ["EPS|M. KOUA L’or", "ANG|M. KOUASSI Ezéchiel", "", "FRAN|M. N’GUESSAN Modeste", "DEVOIR"],
        ["ESP|Mme GABO Gisèle", "HIST-GEO|M. BOCA Cocoa", "", "", "DEVOIR"],
        ["MATH|M. GUIHIE Jean", "FRAN|M. N’GUESSAN Modeste", "", "HIST-GEO|M. BOCA Cocoa", "HIST-GEO|M. BOCA Cocoa"],
        ["FRAN|M. N’GUESSAN Modeste", "SVT|M. GNAGO Parfait", "", "MATH|M. GUIHIE Jean", "MATH|M. GUIHIE Jean"],
        ["FRAN|M. N’GUESSAN Modeste", "SVT|M. GNAGO Parfait", "", "MATH|M. GUIHIE Jean", "EDHC|M. DIGBEU Roland"],
      ],
      "4ème 3": [
        ["EPS|M. KOUA L’or", "ANG|M. KOUASSI Ezéchiel", "", "FRAN|Mme SOM Toulo", "MATH|M. MONDOTE Abiola"],
        ["EPS|M. KOUA L’or", "DEVOIR", "", "FRAN|Mme SOM Toulo", "MATH|M. MONDOTE Abiola"],
        ["SVT|M. GNAGO Parfait", "DEVOIR", "", "PC|M. DJEGNAN Joël", "ESP|Mme GABO Gisèle"],
        ["SVT|M. GNAGO Parfait", "ESP|Mme GABO Gisèle", "", "PC|M. DJEGNAN Joël", "DEVOIR"],
        ["MATH|M. MONDOTE Abiola", "ESP|Mme GABO Gisèle", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["FRAN|Mme SOM Toulo", "EDHC|M. BALLO Pifouan", "", "ANG|M. KOUASSI Ezéchiel", "FRAN|Mme SOM Toulo"],
        ["FRAN|Mme SOM Toulo", "HIST-GEO|M. N’GUESSAN Christian", "", "HIST-GEO|M. N’GUESSAN Christian", "TICE|M. GUEGUE Hermann"],
        ["HIST-GEO|M. N’GUESSAN Christian", "MATH|M. MONDOTE Abiola", "", "FRAN|Mme SOM Toulo", "ANG|M. KOUASSI Ezéchiel"],
      ],
      "4ème 4": [
        ["ANG|M. OUATTARA Lacina", "EDHC|M. BALLO Pifouan", "", "PC|M. BALLO Pifouan", "FRAN|Mme SOM Toulo"],
        ["ANG|M. OUATTARA Lacina", "DEVOIR", "", "PC|M. BALLO Pifouan", "FRAN|Mme SOM Toulo"],
        ["FRAN|Mme SOM Toulo", "DEVOIR", "", "FRAN|Mme SOM Toulo", "HIST-GEO|M. BOCA Cocoa"],
        ["MATH|M. ACHI Ohoueu", "SVT|Mme KONAN Viviane", "", "FRAN|Mme SOM Toulo", "DEVOIR"],
        ["MATH|M. ACHI Ohoueu", "SVT|Mme KONAN Viviane", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["ESP|Mme MOBIO Adelaïde", "FRAN|Mme SOM Toulo", "", "ANG|M. OUATTARA Lacina", "TICE|M. GUEGUE Hermann"],
        ["EPS|M. KOUA L’or", "MATH|M. ACHI Ohoueu", "", "MATH|M. ACHI Ohoueu", "ESP|Mme MOBIO Adelaïde"],
        ["EPS|M. KOUA L’or", "HIST-GEO|M. BOCA Cocoa", "", "HIST-GEO|M. BOCA Cocoa", "ESP|Mme MOBIO Adelaïde"],
      ],
      "3ème 1": [
        ["HIST-GEO|M. ATCHEBRO Dimitri", "HIST-GEO|M. ATCHEBRO Dimitri", "MATH|Frère DAZIRIGNON Désiré", "ANG|M. YAYA Soro", "HIST-GEO|M. ATCHEBRO Dimitri"],
        ["HIST-GEO|M. ATCHEBRO Dimitri", "DEVOIR", "MATH|Frère DAZIRIGNON Désiré", "ANG|M. YAYA Soro", "MATH|Frère DAZIRIGNON Désiré"],
        ["ESP|Mme ADOU Julie", "DEVOIR", "ESP|Mme ADOU Julie", "FRAN|Mme YAO Adjoua", "MATH|Frère DAZIRIGNON Désiré"],
        ["FRAN|Mme YAO Adjoua", "SVT|M. KOUASSI Joël", "FRAN|Mme YAO Adjoua", "", "DEVOIR"],
        ["FRAN|Mme YAO Adjoua", "SVT|M. KOUASSI Joël", "FRAN|Mme YAO Adjoua", "ACT. DU PERSONNEL", "DEVOIR"],
        ["PC|M. BALLO Pifouan", "ESP|Mme ADOU Julie", "", "FHR|M. DELY Guy", "ANG|M. YAYA Soro"],
        ["PC|M. BALLO Pifouan", "EDHC|Mme GABO Gisèle", "", "EPS|M. MAMBO Georges", ""],
        ["TICE|M. AVIH Djèckèh", "FRAN|Mme YAO Adjoua", "", "EPS|M. MAMBO Georges", ""],
      ],
      "3ème 2": [
        ["FRAN|Mme YAO Adjoua", "ESP|Mme ADOU Julie", "HIST-GEO|M. ATCHEBRO Dimitri", "FRAN|Mme YAO Adjoua", "PC|M. KPA Maka"],
        ["FRAN|Mme YAO Adjoua", "DEVOIR", "HIST-GEO|M. ATCHEBRO Dimitri", "FRAN|Mme YAO Adjoua", "PC|M. KPA Maka"],
        ["SVT|M. KOUASSI Joël", "DEVOIR", "FRAN|Mme YAO Adjoua", "ANG|M. YAYA Soro", ""],
        ["SVT|M. KOUASSI Joël", "MATH|Frère DAZIRIGNON Désiré", "MATH|Frère DAZIRIGNON Désiré", "ANG|M. YAYA Soro", "DEVOIR"],
        ["ESP|Mme ADOU Julie", "MATH|Frère DAZIRIGNON Désiré", "MATH|Frère DAZIRIGNON Désiré", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO|M. ATCHEBRO Dimitri", "FRAN|Mme YAO Adjoua", "", "ESP|Mme ADOU Julie", "EDHC|Mme GABO Gisèle"],
        ["TICE|M. GUEGUE Hermann", "EPS|M. MAMBO Georges", "", "HIST-GEO|M. ATCHEBRO Dimitri", "ANG|M. YAYA Soro"],
        ["FHR|Frère DION Fabrice", "EPS|M. MAMBO Georges", "", "", ""],
      ],
      "3ème 3": [
        ["HIST-GEO|M. BOCA Cocoa", "MATH|M. GUIHIE Jean", "EPS|M. MAMBO Georges", "ANG|M. AGNIMEL Esmel", "MATH|M. GUIHIE Jean"],
        ["HIST-GEO|M. BOCA Cocoa", "DEVOIR", "EPS|M. MAMBO Georges", "ANG|M. AGNIMEL Esmel", "MATH|M. GUIHIE Jean"],
        ["PC|M. KPA Maka", "DEVOIR", "", "FRAN|Mme YAO Amoin", "FRAN|Mme YAO Amoin"],
        ["PC|M. KPA Maka", "HIST-GEO|M. BOCA Cocoa", "FRAN|Mme YAO Amoin", "FRAN|Mme YAO Amoin", "DEVOIR"],
        ["FRAN|Mme YAO Amoin", "ESP|Mme MOBIO Adelaïde", "FRAN|Mme YAO Amoin", "ACT. DU PERSONNEL", "DEVOIR"],
        ["ANG|M. AGNIMEL Esmel", "TICE|M. AVIH Djèckèh", "", "SVT|M. GNAGO Parfait", "ESP|Mme MOBIO Adelaïde"],
        ["MATH|M. GUIHIE Jean", "", "", "SVT|M. GNAGO Parfait", "HIST-GEO|M. BOCA Cocoa"],
        ["ESP|Mme MOBIO Adelaïde", "EDHC|Mme GABO Gisèle", "", "", ""],
      ],
      "3ème 4": [
        ["FRAN|Mme SOM Toulo", "FRAN|Mme SOM Toulo", "ANG|M. AGNIMEL Esmel", "ESP|Mme MOBIO Adelaïde", ""],
        ["FRAN|Mme SOM Toulo", "DEVOIR", "ANG|M. AGNIMEL Esmel", "ESP|Mme MOBIO Adelaïde", "ANG|M. AGNIMEL Esmel"],
        ["ESP|Mme MOBIO Adelaïde", "DEVOIR", "", "MATH|M. GUIHIE Jean", "MATH|M. GUIHIE Jean"],
        ["MATH|M. GUIHIE Jean", "HIST-GEO|M. ALLAH Cyrille", "SVT|M. KOUASSI Joël", "HIST-GEO|M. ALLAH Cyrille", "DEVOIR"],
        ["MATH|M. GUIHIE Jean", "HIST-GEO|M. ALLAH Cyrille", "SVT|M. KOUASSI Joël", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO|M. ALLAH Cyrille", "FHR|Mme KONAN Viviane", "", "TICE|M. AVIH Djèckèh", "PC|M. BALLO Pifouan"],
        ["EPS|M. ISSA Badine", "FRAN|Mme SOM Toulo", "", "FRAN|Mme SOM Toulo", "PC|M. BALLO Pifouan"],
        ["EPS|M. ISSA Badine", "FRAN|Mme SOM Toulo", "", "EDHC|M. N’GUESSAN Christian", ""],
      ],
      "2nde A": [
        ["PC|M. KPA Maka", "ESP|Mme GABO Gisèle", "", "EPS|M. ISSA Badine", "ANG|M. AGNIMEL Esmel"],
        ["PC|M. KPA Maka", "DEVOIR", "", "EPS|M. ISSA Badine", "HIST-GEO|M. BOCA Cocoa"],
        ["MATH|M. ACHI Ohoueu", "DEVOIR", "", "HIST-GEO|M. BOCA Cocoa", "PC|M. KPA Maka"],
        ["ANG|M. AGNIMEL Esmel", "MATH|M. ACHI Ohoueu", "", "HIST-GEO|M. BOCA Cocoa", "DEVOIR"],
        ["ANG|M. AGNIMEL Esmel", "MATH|M. ACHI Ohoueu", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["FRAN|Mme YAO Amoin", "HIST-GEO|M. BOCA Cocoa", "", "FRAN|Mme YAO Amoin", "SVT|M. GNAGO Parfait"],
        ["FRAN|Mme YAO Amoin", "TICE|M. GUEGUE Hermann", "", "ESP|Mme GABO Gisèle", "SVT|M. GNAGO Parfait"],
        ["FHR|M. DELY Guy", "FRAN|Mme YAO Amoin", "", "ESP|Mme GABO Gisèle", ""],
      ],
      "2nde C1": [
        ["SVT|M. TOA BI Emmanuel", "ESP / ALL|Mme MOBIO Adelaïde|M. YOUAN Bi", "ANG|M. YAYA Soro", "HIST-GEO|M. ALLAH Cyrille", "PC|M. BALLO Pifouan"],
        ["SVT|M. TOA BI Emmanuel", "DEVOIR", "ANG|M. YAYA Soro", "HIST-GEO|M. ALLAH Cyrille", "PC|M. BALLO Pifouan"],
        ["HIST-GEO|M. ALLAH Cyrille", "DEVOIR", "EPS|M. KOUA L’or", "MATH|M. GRAH Bogui", "FRAN|Mme SOM Toulo"],
        ["PC|M. BALLO Pifouan", "FRAN|Mme SOM Toulo", "EPS|M. KOUA L’or", "MATH|M. GRAH Bogui", "DEVOIR"],
        ["PC|M. BALLO Pifouan", "FRAN|Mme SOM Toulo", "", "ACT. DU PERSONNEL", "DEVOIR"],
        ["TICE|M. AVIH Djèckèh", "HIST-GEO|M. ALLAH Cyrille", "", "FRAN|Mme SOM Toulo", "MATH|M. GRAH Bogui"],
        ["FHR|M. DELY Guy", "PC|M. BALLO Pifouan", "", "ESP / ALL|Mme MOBIO Adelaïde|M. YOUAN Bi", "MATH|M. GRAH Bogui"],
        ["MATH|M. GRAH Bogui", "ANG|M. YAYA Soro", "", "ESP / ALL|Mme MOBIO Adelaïde|M. YOUAN Bi", ""],
      ],
      "2nde C2": [
        ["PC|M. BALLO Pifouan", "HIST-GEO|M. BOCA Cocoa", "EPS|M. KOUA L’or", "HIST-GEO|M. BOCA Cocoa", "MATH|M. GOLI Gnaki"],
        ["PC|M. BALLO Pifouan", "DEVOIR", "EPS|M. KOUA L’or", "HIST-GEO|M. BOCA Cocoa", "MATH|M. GOLI Gnaki"],
        ["HIST-GEO|M. BOCA Cocoa", "DEVOIR", "", "PC|M. BALLO Pifouan", "PC|M. BALLO Pifouan"],
        ["MATH|M. GOLI Gnaki", "FRAN|Mme YAO Adjoua", "ANG|M. YAYA Soro", "PC|M. BALLO Pifouan", "DEVOIR"],
        ["MATH|M. GOLI Gnaki", "FRAN|Mme YAO Adjoua", "ANG|M. YAYA Soro", "ACT. DU PERSONNEL", "DEVOIR"],
        ["FHR|M. DELY Guy", "MATH|M. GOLI Gnaki", "", "ESP|Mme MOBIO Adelaïde", "SVT|M. TOA BI Emmanuel"],
        ["ESP|Mme MOBIO Adelaïde", "ANG|M. YAYA Soro", "", "TICE|M. GUEGUE Hermann", "SVT|M. TOA BI Emmanuel"],
        ["FRAN|Mme YAO Adjoua", "ESP|Mme MOBIO Adelaïde", "", "FRAN|Mme YAO Adjoua", ""],
      ],
      "1ère A": [
        ["SVT|M. GNAGO Parfait", "HIST-GEO|M. N’GUESSAN Christian", "FRAN|M. N’GUESSAN Modeste", "PHILO|M. MONNEY Arthur", "FHR|M. KOUADIO Richard"],
        ["SVT|M. GNAGO Parfait", "DEVOIR", "FRAN|M. N’GUESSAN Modeste", "PHILO|M. MONNEY Arthur", "FRAN|M. N’GUESSAN Modeste"],
        ["HIST-GEO|M. N’GUESSAN Christian", "DEVOIR", "EPS|M. MAMBO Georges", "ESP / ALL|Mme ADOU Julie|M. YOUAN Bi", "MATH|M. GOLI Gnaki"],
        ["HIST-GEO|M. N’GUESSAN Christian", "DEVOIR", "EPS|M. MAMBO Georges", "ESP / ALL|Mme ADOU Julie|M. YOUAN Bi", "DEVOIR"],
        ["TICE|M. AVIH Djèckèh", "PHILO|M. MONNEY Arthur", "ESP / ALL|Mme ADOU Julie|M. YOUAN Bi", "ACT. DU PERSONNEL", "DEVOIR"],
        ["FRAN|M. N’GUESSAN Modeste", "ANG|M. AGNIMEL Esmel", "", "ANG|M. AGNIMEL Esmel", ""],
        ["MATH|M. GOLI Gnaki", "ANG|M. AGNIMEL Esmel", "", "PC|M. DIGBEU Roland", "HIST-GEO|M. N’GUESSAN Christian"],
        ["MATH|M. GOLI Gnaki", "MATH|M. GOLI Gnaki", "", "PC|M. DIGBEU Roland", ""],
      ],
      "1ère C": [
        ["MATH|M. ACHI Ohoueu", "MATH|M. ACHI Ohoueu", "MATH|M. ACHI Ohoueu", "SVT|M. TOA BI Emmanuel", "HIST-GEO|M. N’GUESSAN Christian"],
        ["MATH|M. ACHI Ohoueu", "DEVOIR", "MATH|M. ACHI Ohoueu", "SVT|M. TOA BI Emmanuel", "HIST-GEO|M. N’GUESSAN Christian"],
        ["ANG|M. AGNIMEL Esmel", "DEVOIR", "", "EPS|M. MAMBO Georges", "SVT|M. TOA BI Emmanuel"],
        ["PC|M. DIGBEU Roland", "DEVOIR", "ANG|M. AGNIMEL Esmel", "EPS|M. MAMBO Georges", "DEVOIR"],
        ["PC|M. DIGBEU Roland", "HIST-GEO|M. N’GUESSAN Christian", "ANG|M. AGNIMEL Esmel", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO|M. N’GUESSAN Christian", "FRAN|Mme OBLE Djédji", "", "PHILO|M. MONNEY Arthur", "PC|M. DIGBEU Roland"],
        ["FRAN|Mme OBLE Djédji", "PC|M. DIGBEU Roland", "", "PHILO|M. MONNEY Arthur", "PC|M. DIGBEU Roland"],
        ["FRAN|Mme OBLE Djédji", "PC|M. DIGBEU Roland", "", "MATH|M. ACHI Ohoueu", ""],
      ],
      "1ère D": [
        ["MATH|M. MONDOTE Abiola", "PC|M. DJEGNAN Joël", "MATH|M. MONDOTE Abiola", "SVT|M. KOUASSI Joël", "HIST-GEO|M. N’GUESSAN Christian"],
        ["MATH|M. MONDOTE Abiola", "DEVOIR", "MATH|M. MONDOTE Abiola", "SVT|M. KOUASSI Joël", "HIST-GEO|M. N’GUESSAN Christian"],
        ["ANG|M. AGNIMEL Esmel", "DEVOIR", "FHR|Frère DION Fabrice", "EPS|M. MAMBO Georges", "SVT|M. KOUASSI Joël"],
        ["PC|M. DJEGNAN Joël", "DEVOIR", "ANG|M. AGNIMEL Esmel", "EPS|M. MAMBO Georges", "DEVOIR"],
        ["PC|M. DJEGNAN Joël", "HIST-GEO|M. N’GUESSAN Christian", "ANG|M. AGNIMEL Esmel", "ACT. DU PERSONNEL", "DEVOIR"],
        ["HIST-GEO|M. N’GUESSAN Christian", "FRAN|Mme OBLE Djédji", "", "PHILO|M. MONNEY Arthur", "PC|M. DJEGNAN Joël"],
        ["FRAN|Mme OBLE Djédji", "MATH|M. MONDOTE Abiola", "", "PHILO|M. MONNEY Arthur", "PC|M. DJEGNAN Joël"],
        ["FRAN|Mme OBLE Djédji", "", "", "TICE|M. AVIH Djèckèh", ""],
      ],
      "Tle A1": [
        ["ESP / ALL|Mme ADOU Julie|M. YOUAN Bi", "HIST-GEO|M. ALLAH Cyrille", "MATH|M. GRAH Bogui", "ESP / ALL|Mme ADOU Julie|M. YOUAN Bi", "ANG|M. YAYA Soro"],
        ["PHILO|M. MONNEY Arthur", "DEVOIR", "MATH|M. GRAH Bogui", "ESP / ALL|Mme ADOU Julie|M. YOUAN Bi", "ANG|M. YAYA Soro"],
        ["PHILO|M. MONNEY Arthur", "DEVOIR", "FRAN|M. N’GUESSAN Modeste", "FRAN|M. N’GUESSAN Modeste", "MATH|M. GRAH Bogui"],
        ["FRAN|M. N’GUESSAN Modeste", "DEVOIR", "PHILO|M. MONNEY Arthur", "PHILO|M. MONNEY Arthur", "DEVOIR"],
        ["FRAN|M. N’GUESSAN Modeste", "DEVOIR", "PHILO|M. MONNEY Arthur", "PHILO|M. MONNEY Arthur", "DEVOIR"],
        ["MATH|M. GRAH Bogui", "ANG|M. YAYA Soro", "", "HIST-GEO|M. ALLAH Cyrille", "SVT|M. KOUASSI Joël"],
        ["MATH|M. GRAH Bogui", "PHILO|M. MONNEY Arthur", "", "EPS|M. ISSA Badine", "SVT|M. KOUASSI Joël"],
        ["HIST-GEO|M. ALLAH Cyrille", "PHILO|M. MONNEY Arthur", "", "EPS|M. ISSA Badine", "HIST-GEO|M. ALLAH Cyrille"],
      ],
      "Tle A2": [
        ["ESP / ALL|Mme GABO Gisèle|M. YOUAN Bi", "FRAN|Mme YAO Adjoua", "FRAN|Mme YAO Adjoua", "ESP / ALL|Mme GABO Gisèle|M. YOUAN Bi", "PHILO|M. DELY Guy"],
        ["PHILO|M. DELY Guy", "DEVOIR", "FRAN|Mme YAO Adjoua", "ESP / ALL|Mme GABO Gisèle|M. YOUAN Bi", "PHILO|M. DELY Guy"],
        ["PHILO|M. DELY Guy", "DEVOIR", "", "ANG|M. AGNIMEL Esmel", "HIST-GEO|M. ALLAH Cyrille"],
        ["HIST-GEO|M. ALLAH Cyrille", "DEVOIR", "PHILO|M. DELY Guy", "ANG|M. AGNIMEL Esmel", "DEVOIR"],
        ["HIST-GEO|M. ALLAH Cyrille", "DEVOIR", "PHILO|M. DELY Guy", "HIST-GEO|M. ALLAH Cyrille", "DEVOIR"],
        ["FRAN|Mme YAO Adjoua", "MATH|M. GUIHIE Jean", "", "MATH|M. GUIHIE Jean", "MATH|M. GUIHIE Jean"],
        ["SVT|M. KOUASSI Joël", "MATH|M. GUIHIE Jean", "", "PHILO|M. DELY Guy", "EPS|M. MAMBO Georges"],
        ["SVT|M. KOUASSI Joël", "ANG|M. AGNIMEL Esmel", "", "PHILO|M. DELY Guy", "EPS|M. MAMBO Georges"],
      ],
      "Tle C": [
        ["PC|M. GNANKAN Attia", "ANG|M. AGNIMEL Esmel", "SVT|M. TOA BI Emmanuel", "PC|M. GNANKAN Attia", "MATH|M. GRAH Bogui"],
        ["PC|M. GNANKAN Attia", "DEVOIR", "SVT|M. TOA BI Emmanuel", "PC|M. GNANKAN Attia", "MATH|M. GRAH Bogui"],
        ["FRAN|Mme YAO Adjoua", "DEVOIR", "HIST-GEO|M. ATCHEBRO Dimitri", "PHILO|M. MONNEY Arthur", "HIST-GEO|M. ATCHEBRO Dimitri"],
        ["MATH|M. GRAH Bogui", "DEVOIR", "MATH|M. GRAH Bogui", "FRAN|Mme YAO Adjoua", "DEVOIR"],
        ["MATH|M. GRAH Bogui", "DEVOIR", "MATH|M. GRAH Bogui", "FRAN|Mme YAO Adjoua", "DEVOIR"],
        ["SVT|M. TOA BI Emmanuel", "HIST-GEO|M. ATCHEBRO Dimitri", "", "HIST-GEO|M. ATCHEBRO Dimitri", "ANG|M. AGNIMEL Esmel"],
        ["PHILO|M. MONNEY Arthur", "PC|M. GNANKAN Attia", "", "MATH|M. GRAH Bogui", "EPS|M. ISSA Badine"],
        ["PHILO|M. MONNEY Arthur", "PC|M. GNANKAN Attia", "", "MATH|M. GRAH Bogui", "EPS|M. ISSA Badine"],
      ],
      "Tle D": [
        ["PC|M. DIGBEU Roland", "ANG|M. AGNIMEL Esmel", "SVT|M. KOUASSI Joël", "PC|M. DIGBEU Roland", "SVT|M. KOUASSI Joël"],
        ["PC|M. DIGBEU Roland", "DEVOIR", "SVT|M. KOUASSI Joël", "PC|M. DIGBEU Roland", "SVT|M. KOUASSI Joël"],
        ["FRAN|Mme YAO Adjoua", "DEVOIR", "HIST-GEO|M. ATCHEBRO Dimitri", "PHILO|M. MONNEY Arthur", "HIST-GEO|M. ATCHEBRO Dimitri"],
        ["MATH|M. YAPI Luther", "DEVOIR", "PC|M. DIGBEU Roland", "FRAN|Mme YAO Adjoua", "DEVOIR"],
        ["MATH|M. YAPI Luther", "DEVOIR", "", "FRAN|Mme YAO Adjoua", "DEVOIR"],
        ["SVT|M. KOUASSI Joël", "HIST-GEO|M. ATCHEBRO Dimitri", "", "HIST-GEO|M. ATCHEBRO Dimitri", "ANG|M. AGNIMEL Esmel"],
        ["PHILO|M. MONNEY Arthur", "MATH|M. YAPI Luther", "", "MATH|M. YAPI Luther", "EPS|M. ISSA Badine"],
        ["PHILO|M. MONNEY Arthur", "MATH|M. YAPI Luther", "", "MATH|M. YAPI Luther", "EPS|M. ISSA Badine"],
      ],
    };
    // >>> FIN DES DONNEES GENEREES


    // Regroupement des matières par famille, pour le code couleur de la grille
    var FAMILLES = {
      sciences: ["MATH","PC","SVT","TICE"],
      lettres:  ["FRAN","ANG","ESP","ALL","ESP / ALL","PHILO"],
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

    // Professeur principal de la classe affichée. Sans entrée dans la liste,
    // la ligne disparaît plutôt que d'afficher un nom inventé ou un blanc.
    function renderPP(nom){
      var ligne = document.getElementById('edtPP');
      var pp = PROF_PRINCIPAUX[nom];
      if(!pp){ ligne.hidden = true; return; }
      document.getElementById('edtPPNom').textContent = pp;
      ligne.hidden = false;
    }

    function updateLabel(){
      var nom = nomClasse();
      document.getElementById('edtClassLabel').textContent = nom;
      renderPP(nom);
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
          cells.forEach(function(cell, i){
            var td = document.createElement('td');
            td.setAttribute('data-c', i + 1);
            if(cell){
              // « MATIÈRE|Professeur » (un 2e professeur après un autre « | » pour
              // un créneau de langue vivante 2) ou, sans professeur, un libellé
              var morceaux = cell.split('|');
              var subj = document.createElement('span');
              subj.className = 'subj';
              var mat = document.createElement('b');
              mat.className = 'mat';
              mat.textContent = morceaux[0];
              subj.appendChild(mat);
              morceaux.slice(1).forEach(function(prof){
                var p = document.createElement('small');
                p.className = 'prof';
                p.textContent = prof;
                subj.appendChild(p);
              });
              td.className = 'edt-slot';
              td.setAttribute('data-fam', familleOf(morceaux[0]));
              td.appendChild(subj);
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

  /* ==================================================================
     Calendrier des devoirs surveillés — choix d'un niveau
     ------------------------------------------------------------------
     Un bouton par niveau réduit le tableau à la date et à la colonne de
     ce niveau (la feuille de style masque les autres d'après data-niveau) ;
     « Tous » rend le tableau entier. Le tableau lui-même est écrit par
     outils/calendrier-devoirs-pdf.py, pas par ce script.
     ================================================================== */
  (function(){
    [].slice.call(document.querySelectorAll('.dev-calendrier')).forEach(function(bloc){
      var table   = bloc.querySelector('.dev-table');
      var boutons = [].slice.call(bloc.querySelectorAll('.dev-chips .filter-chip'));
      if(!table || !boutons.length) return;
      boutons.forEach(function(b){
        b.addEventListener('click', function(){
          boutons.forEach(function(x){
            x.classList.toggle('active', x === b);
            x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
          });
          table.setAttribute('data-niveau', b.getAttribute('data-niv'));
          /* la mention « faites glisser » dépend de la largeur du tableau */
          window.dispatchEvent(new Event('resize'));
        });
      });
    });
  })();
  

