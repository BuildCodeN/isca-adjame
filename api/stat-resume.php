<?php
/*
 * GET /api/stat-resume.php?du=AAAA-MM-JJ&au=AAAA-MM-JJ        (en-tête X-Jeton-Stat)
 * Tout ce que montre le tableau de bord pour la période (30 derniers jours par défaut) : chiffres
 * clés et comparaison avec la période précédente de même durée, évolution jour par jour, pages,
 * heures, appareils, provenance, gestes (recherches, classes, documents, appels…), connexions
 * des enseignants, puis les constats et les pistes d'amélioration (voir _stat-analyse.php).
 * Réservé à l'administrateur.
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';
require __DIR__ . '/_stat.php';

lancer(function () {
    exiger_methode('GET');
    $db = bdd();
    stat_admin_exiger($db);
    [$du, $au] = stat_periode();
    repondre(200, stat_resume($db, $du, $au));
});
