<?php
/*
 * GET /api/stat-export.php?type=jours|pages|gestes|provenance&du=AAAA-MM-JJ&au=AAAA-MM-JJ   (en-tête X-Jeton-Stat)
 * Les mêmes chiffres que le tableau de bord, en CSV (séparateur « ; », UTF-8 avec marque d'ordre
 * des octets) : s'ouvre directement dans Excel. Réservé à l'administrateur.
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';
require __DIR__ . '/_stat.php';

/** Une cellule qui commencerait par = + - @ serait prise pour une formule par Excel : on la neutralise. */
function csv_cellule($valeur)
{
    if (is_string($valeur) && $valeur !== '' && strpos("=+-@\t\r", $valeur[0]) !== false) {
        return "'" . $valeur;
    }
    return $valeur;
}

lancer(function () {
    exiger_methode('GET');
    $db = bdd();
    stat_admin_exiger($db);
    [$du, $au] = stat_periode();
    $type = (string) ($_GET['type'] ?? 'jours');
    if (!in_array($type, ['jours', 'pages', 'gestes', 'provenance'], true)) {
        refuser(400, "Type d'export inconnu.");
    }

    $p = [$du, $au];
    $entete = [];
    $lignes = [];
    if ($type === 'jours') {
        $entete = ['Jour', 'Visiteurs', 'Visites', 'Pages vues'];
        $r = stat_resume($db, $du, $au);
        foreach ($r['jours'] as $j) {
            $lignes[] = [$j['jour'], $j['visiteurs'], $j['visites'], $j['vues']];
        }
    } elseif ($type === 'pages') {
        $entete = ['Page', 'Pages vues', 'Visiteurs', 'Durée moyenne (s)', 'Lecture moyenne (%)', 'Arrivées', 'Visites d\'une seule page', 'Sorties'];
        $r = stat_resume($db, $du, $au);
        foreach ($r['pages'] as $pg) {
            $lignes[] = [$pg['nom'], $pg['vues'], $pg['visiteurs'], $pg['dureeS'], $pg['defilement'], $pg['entrees'], $pg['rebonds'], $pg['sorties']];
        }
    } elseif ($type === 'gestes') {
        $entete = ['Catégorie', 'Élément', 'Libellé', 'Nombre', 'Visiteurs', 'Résultats en moyenne'];
        foreach (stat_lignes($db, 'SELECT categorie, nom, MAX(etiquette) AS etiquette, COUNT(*) AS n, COUNT(DISTINCT CONCAT(jour, visiteur)) AS v, AVG(valeur) AS m
                                     FROM stat_evenements WHERE jour BETWEEN ? AND ? GROUP BY categorie, nom ORDER BY categorie, n DESC LIMIT 5000', $p) as $l) {
            $lignes[] = [$l['categorie'], $l['nom'], $l['etiquette'], (int) $l['n'], (int) $l['v'], $l['m'] !== null ? round((float) $l['m'], 1) : ''];
        }
    } else {
        $entete = ['Provenance', 'Site', 'Visites'];
        foreach (stat_lignes($db, 'SELECT v.origine AS o, COALESCE(v.origine_site, \'\') AS s, COUNT(*) AS n
                                     FROM stat_vues v
                                     JOIN (SELECT MIN(id) AS mid FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY visite) e ON e.mid = v.id
                                    GROUP BY v.origine, s ORDER BY n DESC LIMIT 2000', $p) as $l) {
            $lignes[] = [$l['o'], $l['s'], (int) $l['n']];
        }
    }

    entetes_api();                                           // posé d'abord, puis remplacé : une erreur plus haut reste du JSON
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="frequentation-' . $type . '-' . $du . '_' . $au . '.csv"');
    echo "\xEF\xBB\xBF";
    $sortie = fopen('php://output', 'w');
    fputcsv($sortie, $entete, ';', '"', '');
    foreach ($lignes as $ligne) {
        fputcsv($sortie, array_map('csv_cellule', $ligne), ';', '"', '');
    }
    fclose($sortie);
    exit;
});
