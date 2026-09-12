/* ==================================================================
   Liste des élèves par classe
   ------------------------------------------------------------------
   Meme famille d'interaction que l'emploi du temps (assets/js/scolarite.js) :
   Cycle -> Niveau -> Classe, avec le meme repli honnete quand une
   classe n'a pas encore de liste ("non communiquee" plutot que vide
   ou fausse). Volontairement un fichier et un etat separes : ces deux
   volets n'ont ni le meme rythme de mise a jour (l'emploi du temps
   change par annee scolaire, les effectifs par mouvement d'eleves) ni
   la meme sensibilite des donnees.

   Aucun matricule ici : seuls "Nom et Prenoms" et la classe sont
   publies. Voir la remarque envoyee a la direction a ce sujet.
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

    var ELEVES_DATA = {
      "5ème 1": [
        "ADI Guy Paul-Marie",
        "ADISSA Abdullah Adesina Olarewaju",
        "AHI Houlohon Merveille Annielle Blanche-Aurore",
        "AKE Gloire Lyne Marie",
        "AKOSSO Akébié Ketia Shelemia Suzanne",
        "BAMBA Vamoué",
        "BAYILI Fatoumata",
        "BEUGRE Roy-Marie Kémuél",
        "BIANDJI Abigaël Orlane Elisabeth",
        "CLOVIS Noadia Marie Stella",
        "COULIBALY Chondenin Shahrahzad",
        "COULIBALY Zié Abdoul Kader",
        "DAHOUA Mien Timi Chris Eliab",
        "DAMOROKO Nathaniel Chris-Pharès",
        "DIABATE Djamila Latifa",
        "DIOMANDE Singa Anaëlle",
        "GABO Yannick Peniel Tokpla",
        "GBAGBA Peniel Eden",
        "GBOKO Nourah Abigaelle Nestly",
        "KONAN Marie Anice Ornella",
        "KONAN Naëlle Emanuella Moayé",
        "KONE Nidjan Aminata Djodama Hadja",
        "KONE Nielfang Chris-Yvann",
        "KOUASSI Sahoua Ruth Elvira",
        "KOUMEPKO Mawuli",
        "OKEKE Chibuike Michaël",
        "OUATTARA Kandana Samira Aminata",
        "OUATTARA Kayatibè Ali Mohamad El-Amine",
        "OUATTARA Tagniéri Paule Oriane",
        "OUATTARA Tièdbè Mohamed Lamine",
        "OUEDRAOGO Cheick Ahamad Tidiane",
        "SADDI Rahiatou",
        "SAIZONOU Achi Pierre-François Sèmako",
        "SALAHOU Shaban Schadrac",
        "SANGARE Loriyaga Cheikira Ornela",
        "SANOGO Awa Rachida",
        "SIDIBE Fatima Zahara",
        "SOUMAHORO Drolé Grace Prunelle",
        "TOURE Mariame Mansouria",
        "YEO Shitchon Ismaël",
        "ZARE Alissa-Amirah Kheira Marica",
        "ZOGBO Guina Franck Ezéchiel",
      ],
      "5ème 2": [
        "ADJA Yobou Djadanbiè Elisabeth Bénie",
        "AKE Ahou Léa Urane Adassa",
        "AKINTAYO Abdullahi Adedimeji Akorede",
        "ANATO Akouefa Marie Seraya Nofia",
        "ANGRA Sebime Jean-David Yann-Emmanuel Beyrassou",
        "BAHON Sohossie Christ Daniel",
        "BAKAYOKO Maïla Nourah",
        "BALOGUN Mariam Oluwakayinsola",
        "BAMA Essouabié Reine Claudine",
        "BELLO Ahmed Akandji",
        "BERTHE Zié Aboubacar",
        "BICABA Prince Vincent Salomon",
        "BROU Famien Chris Eyatilomé",
        "CLOVIS Dieket Jasiel Orli Neuvine",
        "COULIBALY Nana Leyla",
        "COULIBALY Sarrah",
        "DAPAH Kossia Sara",
        "DEPRY Elise Ciara Murielle",
        "DUAH Reine Stéphanie",
        "ETCHIAN Brou Chancel Chris Charbel",
        "ETIEN Pierre Marie Johan",
        "FOFANA Cheick Adams Rayan",
        "HAIDARA Fatoumata Zahara",
        "IYANDA David Akanji",
        "KONAN Jehuel",
        "KOROGO Amadou",
        "KOUMA Yegotchrè Mourad Chrys-Eden",
        "KRA Alinka Mowayé Victoire Emmanuella",
        "N'DO Melaine Carelle",
        "N'GUESSAN Khyra Ange Michelle Andrée",
        "OUATTARA Abdoul Aziz",
        "OUATTARA Abdoul Aziz",
        "OUATTARA Fatima Zahra",
        "OUEDRAOGO Alimata Nadia",
        "OUEDRAOGO Monica Marie Thérèse",
        "THOMPSON Kouassi Ariel Emmanuel Rayane",
        "TOURE Tiékoura Paul Collins",
        "YAO Paul Marie Victoire Prunelle Becely",
        "YATTARA Moussa Idrissa",
        "YEO Lohôpleu Ramatou",
        "YOUKOU Chris Samuel Yves Patrick Junior",
        "ZOKOU Emmanuel Nathanël",
      ],
      "5ème 3": [
        "ADELAKUN Waliyy Adeniyi",
        "ADEOYE Daaron Toluwani Adewumi",
        "ADISA Mohamed Awal Olalékan",
        "ADOU Yoyo Daniel Christ Elohim",
        "AGNIMEL Agness Christ-Exaucé",
        "AKRE Koutouanssè Kileab Daniel Melvin",
        "AMESSINOU Marie Grace Divine Josée",
        "AYANGBILE Enoc Olamide",
        "AYEWA Leka Gohonon Marie Esther Léatitia",
        "BARRY Mamadou Dian",
        "BARRY Thierno Moussa",
        "CAMARA Rahim Fodé Samuel",
        "DATTE Kando Daniel Avenel",
        "DIM Miracle Chinwendu",
        "DIOMANDE Noura Kadidjatou",
        "DOSSO Mandjo",
        "DOUMBIA Daouda",
        "DOUMBIA Moussa",
        "GNETO Koffi Paul Rayan",
        "GOSSAN Aguié Ange Emmanuel",
        "KAMBOU Chris Samuel",
        "KAN Ninsmonde Kindra Esther Johanna",
        "KOBEA Zebeyou Chris-Ryan Martyns",
        "KONATE Adam Bassériba Youssouf",
        "KONATE Isaac Mussah-Zana",
        "KOUADIO Koffi Mitchin Caleb",
        "MAIGA Zéinab Paul Emmanuelle",
        "N'CHO Edi Michel Ilann",
        "OKAFOR Nmesoma Victoria",
        "SANGARE Aboudramane",
        "SANOU Cheick Ousmane Abdoul Madjid",
        "SEKA Pierre Marie Ethan",
        "SEYNI Aboul Majid",
        "SIDIBE Sekou Mohamed",
        "SOULI Mouaz Boun Abass",
        "TAHOU Abraham",
        "TAUTHUI Noah Emmanuel",
        "TESSOUGUE Aïssatou",
        "TOUNGARA Mohamed Mamby Raïs",
        "TOURE Salimata",
        "YEO Katana Kheira Emmanuella",
        "YESUFU Khalidah Topey",
        "ZO BOTI Nan Ruth Leslie",
      ],
      "5ème 4": [
        "ADAMOU Bulyaminou",
        "ADEOYE Daaron Toluwani Adewumi",
        "ASSOUMANE Abdourahamane",
        "AWOGBILE Soburat Atinuke Adebukole",
        "BAH Aïssatou Lamarana",
        "BEDA Chidjè Grace Marie Alice",
        "COULIBALY Guibessongui Aboudramane",
        "DAHOUA Nienmiensran Jean-David Elisée",
        "DIALLO Youssouf",
        "DIANE Mohamed Tareck Imam",
        "DIBI Kignelman Cheick",
        "DIBY Djebi Ange Noël",
        "EHOUMAN N'goran Wesley Georges Mason",
        "EKIAN Marie Campbelle",
        "KANTE Yeshoua Karl Yvan Curtis",
        "KONAN Jakdiel",
        "KONKOBO Salimata",
        "LOUKOU Marie Grâce Ornella",
        "MARIKO Aichata",
        "MMADUEKWE Zani Somtochukwu",
        "N'GUESSAN Dan Paul Adams",
        "NOGBOU Akré Noah Emmanuel",
        "OBODOZIE Chimaobi Israel",
        "ONYEKWERE Chinonso Nore",
        "OUEDRAOGO Alassane",
        "POUYA Henry Christ Dylan",
        "SANUSI Moliki Adeyemo",
        "SEKONGO Tortcha Fatim",
        "SOUMAHORO Cheick Hamalla",
        "SOUMAHORO Chieckh Ismael Jean Claude",
        "SOUMHORO Abdoul Aziz",
        "SOW Rokiatou",
        "TOGOLA Awa",
        "ZAKEI Nassa Yvan",
      ],
      "4ème 1": [
        "ACHIO Noémie Mouna Maeva",
        "AGU Chukwudi Mark David",
        "ALIMAN Alloh Yohann Eliakim Pharell",
        "ASSOHOU Ayessian Dan Ethan Elie",
        "BODE Sultan Brandon Akorede Olawole",
        "BOGUI Gloria Anne Désirée",
        "BOUNDAONE Elvira Malika Maria-Orlane",
        "EKIAN Prince-Yvann Adiaffi",
        "EKRA Kouakou Christ David",
        "ETTE Marie Laurette Séréna",
        "FOFANA Ishaq Ben Ismael Ilan",
        "GBOCHO Emmanuel Onesime",
        "GNALI Marie Orlane Odrepone",
        "KASSI Manlan Omael Ange Marie",
        "KEITA Ousmane Abdel-Aziz",
        "KOFFI N'guetta Yoann Emmanuel",
        "KONE Kahira Aminata",
        "KOUADIO Enzo Ezeckiel",
        "KOUADIO Mahi Ange Emeraude",
        "KOUADIO Yah Marie Grâce",
        "KOUAME Blé Urielle Yasmine Fernanda",
        "KOUAME Ekra Arielle Sheridan",
        "KOUASSI Akpo Loan Mehdi",
        "KOUASSI Kouakou Christ Ance Lois",
        "KOUASSI Olaf Yohann Emmanuel",
        "LIGNON Tania Odélia",
        "LOCRE Okaa Armel",
        "MEITE Awa",
        "NWAGBO Chukwudalu Nnamdi Victor",
        "OFFO Otuodichukwu Chinaza Gods Favour",
        "OHACHOSIM Onyinyechi Joy",
        "OLAIGBE Halilat Arinola-Ashabi",
        "OUATTARA Titjiligni Emmanuela Marissa",
        "OUATTARA Yenin Fatim Samira Rahama",
        "OUEDRAOGO Fatoumata Zara Yasmine",
        "OUEDRAOGO Sali Karia",
        "OUSSOU Myenhmo Aurore Immaculée",
        "SORO Klotioloma Abdul-Kadri",
        "SOW Chahid Sie Carter-Kaleb",
        "SUAME Kanga Lyrane Grace Emmanuella",
        "TAGOUYA Zido Démaka Ayèla Maria Emeraude",
        "TANOH Kobenan Maxwell",
        "TOURE Said Cheick Khalid",
      ],
      "4ème 2": [
        "AGNES Yohan Paul André",
        "AJIBOYE Kasifatu Ayomide Asake",
        "ALLECHI Chiley Marie Eden Eunice",
        "ASSOU Edith Victoire",
        "ATSE Aba Belle Auriana",
        "AYECHI Doffou Ulrich Sidoine Emmanuel",
        "BAKAYOKO Losseni Yvan",
        "BAMBA Mamadou Uriel",
        "BAMBA Massadje Makani",
        "BEAH Yélo Vladimir Exaucé",
        "BOTTY Kenania Elvira Marie-Sarah",
        "BROU Claude-Ethan Trésor",
        "COULIBALY Jerbi Kloman Jean Oscar",
        "COULIBALY Rahmane Nael",
        "DOSSO Montchié Sahida",
        "GAHOUA Joyce Ossam Erudy",
        "KAPALA Hamid Torna Coulibaly",
        "KELEPILY Bintou",
        "KOFFI Kouassi Samuel Andre",
        "KONE Grâce Adassa",
        "KONE Mariam",
        "KONE Tchepodan Eva",
        "KOUAME Moyé Peniel Lionel Arurel",
        "MANDE Djeneba",
        "MARENA Mamadi Dyal",
        "METO Béraca Eliel Yessouvi",
        "MOMO Ini Hermine-Othniel",
        "N'DO Arone Stive",
        "NANGO Yogoman Ange Gaelle",
        "OFFO Otuodichukwu Chiduben Gods Will",
        "ONAGNELIN Lina Marie Frederique",
        "OYEBOLA Samuel Olorunwa Oyekanmi Iyanda",
        "SILUE Gnenema Daouda Rayane",
        "SOUMARE Mohamed",
        "SYLLA Fatimath Zara",
        "SYLLA Ibrahim Khalil",
        "TIVOLI Ya Limah Orlane",
        "TOURE Amara Marwane Tresor",
        "TRAORE Malika Roxane",
        "TRAORE Salimata Makousse",
        "YA Meira Marie Prielle",
        "YAO Jean Eliashib Jonathan",
        "YAPO Ake Charles Levy",
        "YAPO Kouamé Yanne Wilrich",
        "YEO Koubigué Grâce Noura",
        "ZEZE Apathio Roxane Hira",
        "ZOHO Wongbè Marie Grâce",
      ],
      "4ème 3": [
        "ADJELOU Chiadon Chancelle Esther Prunelle",
        "ALADE Moniratou Asabi Abul Samad",
        "AMANGOUA Adjoba Abigaël Priscille",
        "ASSEUFFY Malick Yvann",
        "AYANGBILE Divine Favour Justina",
        "BAH Lou Gohi Mirabelle",
        "BAMBA Rayane Boubacar",
        "BAMBA Zeynab Zea Ange Débora",
        "CAMARA Assa",
        "COULIBALY Awa",
        "COULIBALY Mitangui Marie Précieuse Kimael",
        "DEDO Daniel-Ariel Rehoboth Shimouel",
        "DIALLO Sory Binta",
        "DIOKE Mami Michel",
        "DODORA Dimy Christ Otniel",
        "DOH Mary Emmanuel",
        "FOFANA Massandje Hayes",
        "GOGO Zirimba Samuel Aurel Davy",
        "GOLLY Kouamé Christ Aubin Serge",
        "KOLO Dohognon Salomon Nael",
        "KONATE Gniré Oriane Prunelle",
        "KOUAME Sadanon Kemira Prunelle",
        "KOUASSI Ake Eliel Marc-Orane",
        "KRA Ayen Prunelle",
        "MOMO Ini Hermine-Othniel",
        "N'CHO Yavo Offolon Mathis Emmanuel",
        "N'DIN Inchaud Reyel Abdul Razack",
        "N'DIORE Koffi Miensah Adiel Oren Nathan",
        "N'GUESSAN Kouassi Myemoh Samuel",
        "N'GUESSAN Yao Hekassa Uriel",
        "OHACHOSIM Chinwemmeri Victory",
        "ONYEKWERE Jesse Nmeribunkem",
        "OULAMY Awa Soraya",
        "OWOADE Marie Prunelle Bosé Adesewa",
        "SILUE Nawa Ibrahim",
        "TAFA Mouina",
        "TOURE Gninnankan Marie France Emeraude",
        "TOURE Moussa Jean-Charles",
        "TRAORE Assetou",
        "TRAORE Malika Roxane",
        "TRAORE Sekou Ahamed Yacouba",
        "YABRE Oumou Salma",
        "YAO Kouakou Nathan Yann Elvis",
      ],
      "4ème 4": [
        "ADAGRA Imene Esther Nolivée",
        "ADINGRA Jean-Christ Emmanuel-Marie",
        "ADJOUMANI Yawa Elvira Oriane Frescaline",
        "ADJRABEY Melvynn Thierry Christ Roy",
        "AKANDAN Aho Christ Samuel",
        "AKOUEGNONHOU Evrard",
        "AMIDOU Yovo Lina Christelle",
        "AMULUCHE Akachukwu Wisdom Collins Junior",
        "BAMBA Aminata Latifa",
        "BAMBA Ramatou Sakina",
        "BAMBA Séré Samira",
        "BAPONE Ben Idrissa Ange Yohann",
        "BOGLER Sénan Schékina Adjoua Loraine",
        "BOUNDANE Cheick Ivan",
        "COULIBALY Malikah Maffoua",
        "COULIBALY Yasmine Yélé Aminata",
        "DABIRE Abraham",
        "DABIRE Awa Maïmouna Yasmine",
        "DAGNOGO Namblé Issouf",
        "DJIBO Aminata",
        "EMEJIAKA Chidinma Chelsea",
        "ETIEN Malamba Emmanuelle Nicole Erynn",
        "FOFANA Adama Cheick Aroune",
        "FOURREL DE FRETTES Nathan Jean-Michel Drissa",
        "KANTE Al Moustapha Ibounou Tidiane",
        "KARAMOKO Machiami Djamila",
        "KOFFI Kouadio Marie Prielle Eliora",
        "KOHOU Giovanna Marie-Laurena Mehitabel",
        "KONAN Louis-Marie Kindoh Famissié",
        "KONATE Massemi Akima",
        "KONATE Yachtoumouchtor Mariam",
        "KONE Djénéba",
        "KONE Jacque Kpayeregue",
        "KONE Nonsé Abdoul Rahim",
        "KONE Salimata Leila",
        "KOUA Ettien Mery-Lynn",
        "KOUASSI Rassou Hanniel Esli",
        "KPEA Christ Michel Kiliane",
        "LASISI Koffi Ridorl",
        "LATH Yedmel Gael Asriel",
        "MAYA Mervin Mondésir",
        "MEITE Siaka Junior",
        "MENSAH Christ Joel Adje",
        "N'GUESSAN Kacou Caleb Elishama Mael",
        "NIEUPA Gbayoro Shamir",
        "OMOJOSI Aichat Olaiten Ademike Adeola",
        "OSSAI Alexandre Chikaeze Cheick Rayanne",
        "OUATTARA Hadassa Perle Queren Inaya Serena",
        "OUATTARA Yélé Marilyne Océane",
        "TAHI Ouraba Auriane Lise Orphée",
        "TRAORE Azoumana",
        "TRAORE Leila Prunelle Victoire",
        "YABRE Cheick Ahmad Tidjane",
        "YAO Grâce Marie Emmanuelle",
        "YAO Kouassi Rayane",
        "YEO Ouayaga Ibrahim",
      ],
      "3ème 1": [
        "ABIE Gnehi Karl-Yanis Eliel",
        "ABO Agye Koffi Michaël",
        "ADEWALE Cheikh-Isaac Curtis",
        "ALI Jean Otniel",
        "ALLECHI Grâce Amen Rebecca Théophanie",
        "AMOAKON Tania Marie Roseline",
        "ASHIRU Moustapha Damilaré Olami-Lekan",
        "AYODEJI Patricia Okiki Eniola",
        "BOSSE Lois-Emmanuella",
        "BOUA Fedora Danièle Yona Arielle",
        "COULIBALY Lohognirimé Ben Jadid Moumine",
        "DADIET Arsène Chris-Emmanuel",
        "DAKOURY Bohui Hounto Olive Dorothée Ashley",
        "DIALLO Hafsata",
        "DIOMANDE Shaima Malhika",
        "EZEOBI Mmaduabuchukwu Everstus",
        "GOULIDEI Gnonsoacet Rony Max-Joseph",
        "KOFFI Achy Axel Salomon",
        "KOFFI Affoué Lory Loriane",
        "KONATE Sékou Hamed Lassida",
        "KONATE Zeynab Nadia Mariam",
        "KONE Gneninman Fatime Olivia",
        "KOSSONOU Kouadio Jean-Michel Chance",
        "KOUAKOU Mientimi Tabitha Ornella Henriette",
        "KOUASSI Blé Kehila Adjene Marie-Shanice Tardy",
        "KOUASSI N'wobeti Marie Rosaire",
        "LANTEYI Senanmi Marie Stella",
        "LASISI Aaliyah Atinouke Sarah",
        "MAIGA Saly Edith Ashley",
        "MALAN Amezian Anne Mirel",
        "MEITE Aymane Khalil",
        "MICHIDJE Marie-Aude Leslie Josaphate",
        "MOHAMED Doffou Kenndra Sorayah",
        "N'CHO N'taho Marie-Lauranne Divine",
        "NOMA Jean-Marie David",
        "OSUJI Ambless Chinaza Okpere",
        "SAKO Salimata Yasmine",
        "SANOGO Gnénéfoly Chris-Nicodème Delor",
        "SECK Mohamed",
        "SORO Kolotioloman Jean Paul",
        "SYLLA Mohamed Abdoul-Samade",
        "SYLLA Nordjon Imane",
        "TOURE Wally Marie Colombe Elvira",
        "ZIAO Katienefowa Naomie",
      ],
      "3ème 2": [
        "AKA Francis Ariel",
        "AKPELE Yao Loïc Ivan Teddy",
        "ASSA Anoumou Marie Désirée Lorraine",
        "BALDE Ramatoulaye Leila",
        "CISSE Salimatha Mayane-Mariame Cheick-Ahmed",
        "COULIBALY Fatoumata",
        "COULIBALY Lohognirimé Ben Jadid Moumine",
        "COULIBALY Zié Gohoua Alpha",
        "DOGBO Ephraim Appiah",
        "DOLO Kady Noura",
        "ELIASSON Kouassi Yves Dominique Yann",
        "FOFANA Adams Latifa",
        "GUIHE Sery Gaël Emeric Caleb",
        "JIMOH Roqueebat Adenike",
        "KEITA Affou Malika Tania",
        "KETO Amenan Akoua Carine",
        "KONATE Mohamed Bachir",
        "KONE Mamadou Ismaël",
        "KOUADIO Amenan Mary Richarde Grace Emmanuella",
        "KOUADIO Djamala Milikey Chris-Lirane",
        "KOUAME Gnamiensa Yasmine Marie-Lourdes",
        "KOUASSI Aka Baruch Marc Aurèle",
        "KOUASSI Aninioi Maela-Elqana",
        "KOUASSI Handon Ahou Nahoua Marie-",
        "NOUFE Ery Flora Eunice",
        "ODJO Elie Dieudonne Bamidele",
        "OGOUMON Jean Edwin",
        "OUATTARA Kafo Khalil Habib",
        "QUIST Abigaël Marie-Emmanuelle Akassi Djifa",
        "SALAHOU Ramadan Canis",
        "SERME Latifa Dorothée",
        "TIEMOKO Cheick Rayhan",
        "TIEMOKO Gogbele Grace Marie Prunelle Carelle",
        "YAO N'défè Anaya",
        "YEO Foundjanga Abigail Jecolia",
        "YOUGBARE Ousman",
        "ZOUNDI Sié Keren Marie-Esther",
      ],
      "3ème 3": [
        "ACHIAOU Christ-Excel",
        "ADIKO Monnin Francklin Peniel",
        "ADJOUMANI Bouaky Evrans Ivanichvili",
        "AHO Afran Jules Roger Abdulkader",
        "AKA Djaha Olivia Astrid",
        "AKOSSI Akossi Jaurès Christ Yoan",
        "ASSEMIEN Christ Emmanuel Sanh",
        "ATTOUA Akolia Chris-Marie Curtis Davy",
        "BASSA Kouassi Jean-Christ Florian",
        "BLON Jean Chris Magloire",
        "CISSE Hadja Matou",
        "COMOE Kouadio Joseph Vital",
        "COULIBALY Abdoulaye Eran Junior",
        "COULIBALY Nouguitchien Salimata Oriane",
        "COULIBALY Wonnan Oumar",
        "COULIBALY Yélamgnigui Noura Ruth",
        "DIARRASSOUBA Kadidja Asma",
        "DIOMANDE Yacouba Youssef",
        "EGEONU Chidiebere Miracle Chidalu",
        "EMEJIAKA Chidera Mervelos",
        "FAN Bogbé Marie Ange Penielle",
        "FOFANA Fatenemé Mansour",
        "FOFANA Losseni Rahim",
        "KABLAN Siébai Ange-Moriel",
        "KAMAGATE Nabintou Marie Danielle Océane",
        "KOFFI Dido Isamaël",
        "KONE Gnimin Aliyah",
        "KOTY Adou Chris Arsène",
        "KOUADIO Wilfried Axel",
        "KOUASSI Jean Evrette Messie",
        "KOUASSI Ramissou Johannes Famien",
        "LABLE Evly Eunice Yona Espérance",
        "LAGBO Yacé Atsel Wesley Betsaleel",
        "M'BRA Batihyet Jean-Japhet",
        "MAMBO Audy Arsène Paul-Marie",
        "ODOH Amani-Kacou Brayane Stevy",
        "OYEWUMI Alami Adelami",
        "SAKANOKO Bintou Stépanie",
        "SHITTU Aliyat Abike",
        "SOUMAHORO Fatim Latika",
        "TAN Kouakou Chris Emmanuel",
        "TCHATAKOURA David Israel",
        "TOURE Naleipo Malika Prunelle",
        "TOURE Naleipo Rayan Othniel",
        "TRAORE Fatoumata Oum Koulssoum",
        "TRAORE Mohamed Chigata",
        "TRAORE Zié Mohamed",
        "YAO Gnamienwa Noah Marie Lynn",
        "ZABSONRE Samira Silouane",
      ],
      "3ème 4": [
        "ACHIO Yapo Karl-Eric Israel",
        "ADEOYE Dominic Boluwatife Adedayo",
        "AYOOLA Moise Bidemi Christ Nathan",
        "BARRY Cheickna Mohamed Cissé Fama",
        "BESSOU Erwin Ange-Ruben",
        "BIEU Ange-Uriel Yvan",
        "COULIBALY Métola Al Hussein",
        "COULIBALY Yah Sarai",
        "DANH Kramo Gilles Emmanuel Rehuel",
        "DIALLO Adom Hana Jade Kerry",
        "DIE Lou Irié Kétura Julie",
        "DIOMANDE Onesime",
        "DJAFAROU Ibrahim",
        "DJE Serge-Yohan Dan Elie",
        "ESSE Brouh Yaba Maéva Urielle Jemima",
        "ETTIEN Affoua Axelle Muriel",
        "GBE Nouska Ashley Kendra",
        "KAMATE Adams Ben Souleymane",
        "KONE Gnimin Aliyah",
        "KONE Zié Nabina Moussa",
        "KOUASSI Assé Ange Daniel Wilfried",
        "KUYO Any Ahipaud Boris Cham",
        "MEITE Maya",
        "N'GUESSAN Christ Joseph-Marie Mohamed",
        "NADO Josué Chris Lois",
        "NOMBRE Geoffroy Emmanuel",
        "OBODOZIE Oluebube Precious",
        "ODOKA Islam Oloriré Yanick",
        "OHACHOSIM Somtochukw Promise",
        "OKAFOR Chiji Ifechukwu Wisdom",
        "OUATTARA Merouane Bakary",
        "SOUMAHORO Pierre-Aisance",
        "TRA Lou Gonézié Sindy Erika",
        "TRAORE Massiby Keny Samira",
        "UE Faizan Espérance Paule-Hannielle",
        "WUREIKU Kossonou Godwin Kwabenan Jonathan",
        "ZAMPALIGRE Maïmouna",
      ],
    };

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
      var el = document.getElementById('eleCycleGroup');
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
      var el = document.getElementById('eleNiveauGroup');
      el.innerHTML = '';
      LEVELS[state.cycle].cycles.forEach(function(n){
        el.appendChild(pill(n, n === state.niveau, function(){
          state.niveau = n;
          state.classe = LEVELS[state.cycle].classes[n][0];
          renderNiveaux();
          renderClasses();
          updateListe();
        }));
      });
    }

    function renderClasses(){
      var el = document.getElementById('eleClasseGroup');
      el.innerHTML = '';
      LEVELS[state.cycle].classes[state.niveau].forEach(function(cl){
        el.appendChild(pill(cl, cl === state.classe, function(){
          state.classe = cl;
          renderClasses();
          updateListe();
        }));
      });
    }

    function nomClasse(){
      return state.niveau + ' ' + state.classe;
    }

    function renderListe(liste){
      var corps = document.getElementById('eleCorps');
      var compte = document.getElementById('eleCompte');
      corps.innerHTML = '';
      if(!liste){
        compte.textContent = '';
        var vide = document.createElement('p');
        vide.className = 'eleves-vide';
        vide.textContent = 'Liste non encore communiquée pour cette classe.';
        corps.appendChild(vide);
        return;
      }
      compte.textContent = liste.length + (liste.length > 1 ? ' élèves' : ' élève');
      var ol = document.createElement('ol');
      ol.className = 'eleves-liste';
      liste.forEach(function(nom){
        var li = document.createElement('li');
        li.textContent = nom;
        ol.appendChild(li);
      });
      corps.appendChild(ol);
    }

    function updateListe(){
      var nom = nomClasse();
      document.getElementById('eleClassLabel').textContent = nom;
      renderListe(ELEVES_DATA[nom]);
    }

    function renderAll(){
      renderCycles();
      renderNiveaux();
      renderClasses();
      updateListe();
    }

    renderAll();
  })();
