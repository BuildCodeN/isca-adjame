<?php
/*
 * Mesure d'audience — constats et pistes d'amélioration.
 *
 * Ce fichier ne se visite pas (voir _stat.php). Il lit le résumé d'une période et en tire,
 * par des règles simples et visibles, deux listes :
 *   « constats » : ce que disent les chiffres, en phrases ;
 *   « pistes »   : ce qu'on pourrait améliorer sur le site, du plus urgent au moins urgent,
 *                  chacune avec sa raison (les chiffres) et une action concrète.
 *
 * Aucune intelligence cachée : chaque règle a un seuil, et ne se déclenche que si les chiffres
 * sont assez nombreux pour qu'on s'y fie. Les pistes sont des PISTES À EXAMINER, pas des
 * verdicts : quelques dizaines de visites ne prouvent rien, d'où la mention « encore peu de
 * données » tant que la période n'en compte pas assez.
 *
 * Pour ajouter une règle : écrire un bloc dans stat_analyser() qui appelle $constat(...) et/ou
 * $piste(...), avec son seuil.
 */
declare(strict_types=1);

if (!defined('ISCA_API')) {
    http_response_code(404);
    exit;
}

/** Les rubriques du site (page#ancre) et leur titre. À tenir à jour quand on en ajoute une : sert à repérer celles qu'on ne lit jamais. */
const STAT_RUBRIQUES = [
    'scolarite#cycles'           => 'Scolarité : les cycles',
    'scolarite#emploi-du-temps'  => 'Scolarité : emploi du temps',
    'scolarite#evaluations'      => 'Scolarité : évaluations et examens',
    'scolarite#resultats'        => 'Scolarité : résultats aux examens',
    'scolarite#vie-scolaire'     => 'Scolarité : règlement intérieur',
    'scolarite#devoirs-t1'       => 'Scolarité : calendrier des devoirs',
    'admissions#conditions'      => "Admissions : conditions d'inscription",
    'admissions#tests'           => "Admissions : tests d'entrée",
    'admissions#frais'           => 'Admissions : frais de scolarité',
    'admissions#services'        => 'Admissions : services complémentaires',
    'admissions#transport'       => 'Admissions : transport',
    'admissions#calendrier'      => 'Admissions : calendrier',
    'vie-scolaire#pratiques'     => 'Vie scolaire : pratiques spirituelles',
    'vie-scolaire#solidarite'    => "Vie scolaire : efforts de l'Avent et de Carême",
    'vie-scolaire#mouvements'    => 'Vie scolaire : mouvements religieux',
    'vie-scolaire#jeux'          => 'Vie scolaire : jeux et concours',
    'vie-scolaire#activites'     => 'Vie scolaire : activités socio-éducatives',
    'etablissement#theme-annee'  => "L'Établissement : thème de l'année",
    'contact#carte'              => "Contact : plan d'accès",
];

const STAT_ORIGINES = [
    'direct'    => "accès direct (adresse tapée, favori, ou lien reçu par message)",
    'recherche' => 'moteurs de recherche',
    'facebook'  => 'Facebook',
    'whatsapp'  => 'WhatsApp',
    'reseau'    => 'autres réseaux sociaux',
    'site'      => "d'autres sites",
    'campagne'  => 'liens suivis (?src=)',
    'interne'   => 'navigation interne',
];

function a_nb($n): string
{
    return number_format((float) $n, 0, ',', "\u{00A0}");
}

function a_pct($x, int $decimales = 0): string
{
    return number_format((float) $x, $decimales, ',', "\u{00A0}") . "\u{00A0}%";
}

function a_gui(string $s): string
{
    return "«\u{00A0}" . $s . "\u{00A0}»";
}

function a_duree(?int $s): string
{
    if ($s === null) {
        return '—';
    }
    return $s >= 60 ? intdiv($s, 60) . "\u{00A0}min" . ($s % 60 ? ' ' . ($s % 60) . "\u{00A0}s" : '') : $s . "\u{00A0}s";
}

/** « +12 % » / « −8 % » ; null si la période précédente est trop mince pour comparer. */
function a_variation($actuel, $precedent): ?string
{
    if ($precedent === null || (float) $precedent < 5) {
        return null;
    }
    $v = ((float) $actuel - (float) $precedent) / (float) $precedent * 100;
    return ($v >= 0 ? '+' : '−') . number_format(abs($v), 0, ',', "\u{00A0}") . "\u{00A0}%";
}

/** « a, b et c » */
function a_liste(array $elements): string
{
    $elements = array_values($elements);
    if (count($elements) <= 1) {
        return (string) ($elements[0] ?? '');
    }
    $dernier = array_pop($elements);
    return implode(', ', $elements) . ' et ' . $dernier;
}

function stat_analyser(array $r): array
{
    $k = $r['kpi'];
    $pr = $r['precedent'];
    $visites = (int) $k['visites'];
    $vues = (int) $k['vues'];
    $jours = max(1, (int) $r['periode']['jours']);
    $constats = [];
    $pistes = [];
    $constat = function (string $niveau, string $titre, string $texte) use (&$constats): void {
        $constats[] = ['niveau' => $niveau, 'titre' => $titre, 'texte' => $texte];
    };
    $piste = function (int $priorite, string $titre, string $pourquoi, string $action) use (&$pistes): void {
        $pistes[] = ['priorite' => $priorite, 'titre' => $titre, 'pourquoi' => $pourquoi, 'action' => $action];
    };
    $gestes = $r['gestes'];
    $liste = fn(string $cat): array => $gestes[$cat]['liste'] ?? [];
    $etiq = fn(array $l): string => (string) (($l['etiquette'] ?? '') !== '' ? $l['etiquette'] : $l['nom']);

    // ------------------------------------------------------------------ rien à analyser
    if ($visites === 0) {
        $constat('attention', 'Aucune visite sur cette période',
            $r['mesureDepuis'] === null
                ? "La mesure vient d'être mise en route : les premiers chiffres apparaîtront dès la prochaine visite d'un internaute."
                : 'Aucune visite entre le ' . $r['periode']['du'] . ' et le ' . $r['periode']['au'] . ". La mesure est active depuis le {$r['mesureDepuis']} : choisissez une période plus large.");
        return ['constats' => $constats, 'pistes' => $pistes];
    }

    $peu = $visites < 30;

    // ------------------------------------------------------------------ fréquentation
    $texte = sprintf("%s visiteurs, %s visites et %s pages vues en %d jour%s, soit environ %s visite%s par jour.",
        a_nb($k['visiteurs']), a_nb($visites), a_nb($vues), $jours, $jours > 1 ? 's' : '',
        number_format($visites / $jours, $visites / $jours < 10 ? 1 : 0, ',', "\u{00A0}"), $visites / $jours >= 2 ? 's' : '');
    $v = a_variation($visites, (int) $pr['visites']);
    $niveau = 'info';
    if ($v !== null) {
        $texte .= " Par rapport aux {$jours} jours précédents ({$pr['visites']} visites) : {$v}.";
        $variation = ($visites - (int) $pr['visites']) / max(1, (int) $pr['visites']) * 100;
        $niveau = $variation >= 10 ? 'bon' : ($variation <= -20 ? 'attention' : 'info');
    }
    $constat($niveau, 'Fréquentation', $texte);
    if ($peu) {
        $constat('attention', 'Encore peu de données',
            "Moins de 30 visites sur la période : les pourcentages ci-dessous bougent beaucoup d'une visite à l'autre. Laissez la mesure tourner deux à quatre semaines avant d'en tirer des conclusions.");
        $piste(3, 'Laisser la mesure tourner', "Seulement {$visites} visite" . ($visites > 1 ? 's' : '') . ' mesurée' . ($visites > 1 ? 's' : '') . ' sur la période.',
            "Relire ce rapport après deux à quatre semaines. D'ici là, faire connaître l'adresse du site (affiche, groupes WhatsApp des parents, page Facebook) augmente les données.");
    }

    // ------------------------------------------------------------------ pages
    $pages = $r['pages'];
    if (count($pages) >= 2 && $vues > 0) {
        $top = array_slice($pages, 0, 3);
        $morceaux = array_map(fn($p) => $p['nom'] . ' (' . a_pct($p['vues'] / $vues * 100) . ')', $top);
        $constat('info', 'Pages les plus consultées',
            'Les pages les plus ouvertes sont ' . a_liste($morceaux) . '. Une visite consulte en moyenne '
            . number_format((float) $k['pagesParVisite'], 1, ',', '') . ' page' . ($k['pagesParVisite'] >= 2 ? 's' : '') . '.');
    }

    // ------------------------------------------------------------------ appareils
    $mobile = 0.0;
    $appareils = [];
    foreach ($r['appareils'] as $a) {
        $appareils[$a['k']] = (int) $a['n'];
    }
    $totalAppareils = max(1, array_sum($appareils));
    if ($appareils) {
        $mobile = ($appareils['mobile'] ?? 0) / $totalAppareils * 100;
        $parts = [];
        foreach (['mobile' => 'un téléphone', 'ordinateur' => 'un ordinateur', 'tablette' => 'une tablette'] as $cle => $nom) {
            if (!empty($appareils[$cle])) {
                $parts[] = a_pct($appareils[$cle] / $totalAppareils * 100) . ' depuis ' . $nom;
            }
        }
        $constat('info', 'Appareils', 'Les visites se font ' . a_liste($parts) . '.');
    }

    // ------------------------------------------------------------------ provenance
    $origines = [];
    foreach ($r['origines'] as $o) {
        $origines[$o['k']] = (int) $o['n'];
    }
    unset($origines['interne']);                            // une visite commence toujours ailleurs : « interne » = rechargement d'une page
    $totalOrigines = max(1, array_sum($origines));
    if ($origines) {
        arsort($origines);
        $parts = [];
        foreach (array_slice($origines, 0, 4, true) as $cle => $n) {
            $parts[] = a_pct($n / $totalOrigines * 100) . ' ' . (STAT_ORIGINES[$cle] ?? $cle);
        }
        $texte = 'Les visiteurs arrivent par : ' . a_liste($parts) . '.';
        if (isset($origines['direct']) && $origines['direct'] / $totalOrigines >= 0.4) {
            $texte .= " « Accès direct » regroupe aussi les liens ouverts depuis WhatsApp ou un SMS : ces applications ne disent pas d'où vient le clic.";
        }
        $constat('info', 'Provenance', $texte);
    }

    // ------------------------------------------------------------------ moments
    if ($vues >= 50) {
        $heures = $r['heures'];
        $hMax = (int) array_search(max($heures), $heures, true);
        $semaine = $r['semaine'];
        $jMax = (int) array_search(max($semaine), $semaine, true);
        $nomsJours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        $constat('info', 'Moments forts',
            sprintf("Le pic de fréquentation se situe entre %d h et %d h (%s des pages vues). Le jour le plus actif est le %s.",
                $hMax, ($hMax + 1) % 24, a_pct($heures[$hMax] / $vues * 100), $nomsJours[$jMax]));
    }

    // ------------------------------------------------------------------ ce que l'on cherche : recherches
    $recherches = $liste('recherche');
    if ($recherches) {
        $morceaux = array_map(fn($l) => a_gui($l['nom']) . ' (' . $l['n'] . ')', array_slice($recherches, 0, 5));
        $constat('info', 'Mots cherchés dans les actualités', 'Les mots tapés dans la recherche : ' . a_liste($morceaux) . '.');
        $sansReponse = array_values(array_filter($recherches, fn($l) => $l['sansResultat'] > 0));
        if ($sansReponse) {
            $morceaux = array_map(fn($l) => a_gui($l['nom']) . ' (' . $l['sansResultat'] . ')', array_slice($sansReponse, 0, 5));
            $constat('attention', 'Recherches sans réponse', 'Ces mots n\'ont donné aucun résultat : ' . a_liste($morceaux) . '.');
            $piste(1, 'Répondre à ce que les visiteurs cherchent sans trouver',
                'Recherches restées sans résultat : ' . a_liste($morceaux) . '.',
                "Publier une actualité ou un document qui contient ces mots (ou ajouter une question-réponse dans la page concernée). Chaque mot cherché sans réponse est une information que les parents attendent.");
        }
        if ($gestes['recherche']['total'] >= 10) {
            $piste(2, 'Rendre la recherche plus visible',
                a_nb($gestes['recherche']['total']) . ' recherches ont été faites, alors que la recherche n\'existe que dans la page Actualités.',
                "Ajouter une barre de recherche sur l'accueil (ou dans le menu) : les parents ont l'habitude de chercher un mot plutôt que de parcourir les rubriques.");
        }
    }

    // ------------------------------------------------------------------ emplois du temps
    $classes = $liste('classe');
    if ($classes) {
        $morceaux = array_map(fn($l) => $l['nom'] . ' (' . $l['n'] . ')', array_slice($classes, 0, 5));
        $constat('info', 'Emplois du temps ouverts', 'Les classes dont on consulte le plus l\'emploi du temps : ' . a_liste($morceaux) . ". Au total {$gestes['classe']['total']} consultation" . ($gestes['classe']['total'] > 1 ? 's' : '') . '.');
        $vuesScol = 0;
        foreach ($pages as $p) {
            if ($p['page'] === 'scolarite') {
                $vuesScol = (int) $p['vues'];
            }
        }
        if ($gestes['classe']['total'] >= 15 || ($vuesScol >= 20 && $gestes['classe']['total'] / max(1, $vuesScol) >= 0.4)) {
            $piste(2, "Faciliter l'accès à l'emploi du temps",
                "L'emploi du temps des classes est ouvert {$gestes['classe']['total']} fois : c'est l'une des informations les plus demandées.",
                "Mettre « Emploi du temps » en bonne place dans le menu et sur la bannière de l'accueil ; proposer un lien direct par classe, à partager dans les groupes WhatsApp des parents.");
        }
    }

    // ------------------------------------------------------------------ documents
    $docs = $liste('telechargement');
    if ($docs) {
        $morceaux = array_map(fn($l) => a_gui($etiq($l)) . ' (' . $l['n'] . ')', array_slice($docs, 0, 4));
        $constat('info', 'Documents ouverts', 'Documents les plus ouverts : ' . a_liste($morceaux) . '.');
        if ($docs[0]['n'] >= 10) {
            $piste(3, 'Mettre en avant le document le plus demandé',
                a_gui($etiq($docs[0])) . " a été ouvert {$docs[0]['n']} fois.",
                "Le proposer directement sur l'accueil, avec un bouton clair, plutôt que dans une page secondaire.");
        }
    }

    // ------------------------------------------------------------------ appels et courriels
    $appels = $liste('appel');
    if ($appels) {
        $constat('info', 'Appels depuis le site',
            "{$gestes['appel']['total']} appel" . ($gestes['appel']['total'] > 1 ? 's' : '') . ' déclenché' . ($gestes['appel']['total'] > 1 ? 's' : '')
            . ' en touchant un numéro, surtout ' . $etiq($appels[0]) . " ({$appels[0]['n']}).");
        if ($gestes['appel']['total'] >= 5 && $vues >= 50) {
            $heures = $r['heures'];
            $hMax = (int) array_search(max($heures), $heures, true);
            $piste(3, 'Tenir le téléphone aux heures de forte affluence',
                "Le site déclenche {$gestes['appel']['total']} appels, et l'affluence est la plus forte vers {$hMax} h.",
                "S'assurer que l'infoline est tenue à ces heures-là, et afficher les horaires de réponse à côté du numéro.");
        }
    }

    // ------------------------------------------------------------------ bannières, actualités
    $bannieres = $liste('banniere');
    if ($bannieres) {
        $morceaux = array_map(fn($l) => a_gui($etiq($l)) . ' (' . $l['n'] . ')', array_slice($bannieres, 0, 4));
        $constat('bon', 'Bannières agrandies', 'Les bannières de l\'accueil qui retiennent l\'attention : ' . a_liste($morceaux) . '.');
    }
    $galeries = $liste('galerie');
    if ($galeries) {
        $morceaux = array_map(fn($l) => a_gui($etiq($l)) . ' (' . $l['n'] . ')', array_slice($galeries, 0, 3));
        $constat('info', 'Photos les plus regardées', 'Actualités dont on ouvre le plus les photos : ' . a_liste($morceaux) . '.');
    }

    // ------------------------------------------------------------------ rubriques lues
    $sections = $liste('section');
    if ($sections) {
        $morceaux = array_map(fn($l) => a_gui(STAT_RUBRIQUES[$l['nom']] ?? $etiq($l)) . ' (' . $l['n'] . ')', array_slice($sections, 0, 5));
        $constat('info', 'Rubriques réellement lues', 'Rubriques restées au moins 3 secondes à l\'écran : ' . a_liste($morceaux) . '.');
    }
    $lues = [];
    foreach ($sections as $l) {
        $lues[$l['nom']] = true;
    }
    $vuesPage = [];
    foreach ($pages as $p) {
        $vuesPage[$p['page']] = (int) $p['vues'];
    }
    if ($vues >= 100 && ($gestes['section']['total'] ?? 0) > 0) {
        $delaissees = [];
        foreach (STAT_RUBRIQUES as $cle => $titre) {
            $page = explode('#', $cle)[0];
            if (($vuesPage[$page] ?? 0) >= 30 && !isset($lues[$cle])) {
                $delaissees[] = $titre;
            }
        }
        if ($delaissees) {
            $piste(3, 'Rubriques jamais lues',
                'Sur des pages pourtant visitées, personne ne s\'est arrêté sur : ' . a_liste(array_slice($delaissees, 0, 5)) . '.',
                "Les remonter dans la page, les renommer dans le sous-menu pour qu'on comprenne ce qu'elles contiennent, ou les retirer si elles ne servent plus.");
        }
    }

    // ------------------------------------------------------------------ rebond et lecture
    if ($visites >= 50 && $k['tauxRebond'] !== null) {
        if ($k['tauxRebond'] >= 70) {
            $topEntree = null;
            foreach ($pages as $p) {
                if ($topEntree === null || $p['entrees'] > $topEntree['entrees']) {
                    $topEntree = $p;
                }
            }
            $constat('attention', 'Visites d\'une seule page', a_pct($k['tauxRebond']) . ' des visites s\'arrêtent après une seule page.');
            $piste(2, 'Donner envie de poursuivre la visite',
                a_pct($k['tauxRebond']) . ' des visites ne consultent qu\'une seule page' . ($topEntree ? ', surtout à l\'arrivée sur ' . a_gui($topEntree['nom']) : '') . '.',
                "Sur la page d'arrivée, placer en haut les trois liens les plus demandés (emploi du temps, admissions, paiement) et proposer une suite logique en bas de chaque page.");
        } elseif ($k['tauxRebond'] <= 40) {
            $constat('bon', 'Les visiteurs explorent', 'Seulement ' . a_pct($k['tauxRebond']) . " des visites s'arrêtent à la première page : le site donne envie d'aller plus loin.");
        }
    }
    foreach ($pages as $p) {
        if ($p['entrees'] >= 20 && $p['rebonds'] / max(1, $p['entrees']) >= 0.8 && $p['page'] !== 'index') {
            $piste(2, 'La page ' . a_gui($p['nom']) . ' fait repartir',
                a_pct($p['rebonds'] / $p['entrees'] * 100) . " de ceux qui arrivent directement sur {$p['nom']} repartent sans rien ouvrir d'autre ({$p['entrees']} arrivées).",
                "Vérifier que la page répond à ce qu'on vient y chercher, et ajouter en haut un lien vers la suite (accueil, rubrique voisine).");
        }
        if ($p['vues'] >= 20 && $p['mesures'] >= 10 && $p['defilement'] !== null && $p['defilement'] < 35 && $p['dureeS'] !== null && $p['dureeS'] < 20) {
            $piste(3, 'La page ' . a_gui($p['nom']) . ' est peu lue',
                "On y reste " . a_duree($p['dureeS']) . " en moyenne et on n'en lit que {$p['defilement']}\u{00A0}% environ.",
                "Mettre l'information principale tout en haut, raccourcir les introductions et ajouter des intertitres.");
        }
    }

    // ------------------------------------------------------------------ vitesse
    $cm = $r['chargement']['mobile'] ?? ['mesures' => 0];
    if (($cm['mesures'] ?? 0) >= 10) {
        $constat($cm['p75'] > 4000 ? 'attention' : 'info', 'Vitesse sur téléphone',
            sprintf("Sur téléphone, une page met %s s à se charger pour la moitié des visiteurs, et plus de %s s pour un sur quatre.",
                number_format($cm['mediane'] / 1000, 1, ',', ''), number_format($cm['p75'] / 1000, 1, ',', '')));
        if ($cm['p75'] > 4000 && $cm['mesures'] >= 20) {
            $piste(1, 'Alléger les pages pour les téléphones',
                'Un téléphone sur quatre met plus de ' . number_format($cm['p75'] / 1000, 1, ',', '') . ' s à charger une page : au-delà de 4 s, beaucoup de visiteurs renoncent.',
                "Réduire le poids des images de l'accueil (bannières, photos d'actualités), qui sont les éléments les plus lourds ; vérifier qu'elles sont bien compressées.");
        }
    }

    // ------------------------------------------------------------------ téléphone d'abord
    if ($visites >= 30 && $mobile >= 60) {
        $piste($mobile >= 75 ? 1 : 2, "Penser « téléphone d'abord »",
            a_pct($mobile) . ' des visites se font depuis un téléphone.',
            "Tester chaque nouvelle page et chaque bannière sur un écran de 390\u{00A0}px de large avant de publier ; garder les boutons d'appel visibles sans défiler ; éviter les tableaux larges.");
    }

    // ------------------------------------------------------------------ d'où viennent les visiteurs
    if ($visites >= 50 && $origines) {
        $part = fn(string $c): float => ($origines[$c] ?? 0) / $totalOrigines * 100;
        if ($part('facebook') >= 15) {
            $piste(3, 'Entretenir la page Facebook',
                'Facebook amène ' . a_pct($part('facebook')) . ' des visites.',
                'Publier chaque nouvelle actualité aussi sur la page Facebook, avec le lien vers la page du site concernée.');
        }
        if ($part('direct') >= 70 && ($origines['campagne'] ?? 0) === 0) {
            $piste(2, 'Savoir ce que rapportent WhatsApp et les affiches',
                a_pct($part('direct')) . " des visites sont « directes » : on ne peut pas savoir si elles viennent de WhatsApp, d'un SMS ou d'une affiche.",
                "Ajouter « ?src=whatsapp » ou « ?src=affiche » à la fin des liens que vous diffusez (l'outil « lien suivi » de ce tableau de bord le fait pour vous) : les visites apparaîtront ensuite sous ce nom.");
        }
        if ($visites >= 100 && $part('recherche') < 10) {
            $piste(2, 'Se faire mieux trouver sur Google',
                'Seulement ' . a_pct($part('recherche')) . ' des visites viennent d\'un moteur de recherche.',
                "Créer ou compléter la fiche Google Maps de l'établissement (adresse, téléphone, horaires, lien du site) et employer dans les titres les mots que tapent les parents (« collège Adjamé », « admission », « emploi du temps »).");
        }
    }

    // ------------------------------------------------------------------ espace enseignant
    $totalConnexions = 0;
    $maxAppareils = 0;
    foreach ($r['enseignants'] as $j) {
        $totalConnexions += (int) $j['connexions'];
        $maxAppareils = max($maxAppareils, (int) $j['appareils']);
    }
    if ($totalConnexions > 0) {
        $constat('info', 'Espace Enseignant', "{$totalConnexions} connexion" . ($totalConnexions > 1 ? 's' : '') . " réussie" . ($totalConnexions > 1 ? 's' : '')
            . " sur la période, jusqu'à {$maxAppareils} appareil" . ($maxAppareils > 1 ? 's' : '') . ' différent' . ($maxAppareils > 1 ? 's' : '') . ' en une journée.');
    } elseif ($jours >= 14 && $visites >= 30) {
        $piste(2, "Faire connaître l'Espace Enseignant",
            "Aucune connexion d'enseignant n'a été enregistrée sur la période.",
            "Rappeler l'adresse et la remise des fiches lors de la prochaine réunion, dans le groupe WhatsApp du personnel, et afficher un rappel en salle des professeurs.");
    }
    if ($totalConnexions > 0 && $jours >= 14 && $totalConnexions < 10) {
        $piste(2, "Relancer l'usage de l'Espace Enseignant",
            "Seulement {$totalConnexions} connexion" . ($totalConnexions > 1 ? 's' : '') . " d'enseignants en {$jours} jours.",
            "Rappeler l'adresse du site et le mot de passe de la fiche ; montrer en réunion qu'on y trouve son emploi du temps en deux gestes.");
    }

    // ------------------------------------------------------------------ pic horaire
    if ($vues >= 100) {
        $heures = $r['heures'];
        $hMax = (int) array_search(max($heures), $heures, true);
        $piste(3, 'Annoncer avant le pic de fréquentation',
            "L'affluence est la plus forte entre {$hMax}\u{00A0}h et " . (($hMax + 1) % 24) . "\u{00A0}h.",
            "Envoyer les annonces importantes (WhatsApp, SMS) un peu avant ce créneau : c'est là qu'elles seront lues sur le site.");
    }

    usort($pistes, fn($a, $b) => $a['priorite'] <=> $b['priorite']);
    return ['constats' => $constats, 'pistes' => array_slice($pistes, 0, 9)];
}
