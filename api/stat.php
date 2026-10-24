<?php
/*
 * POST /api/stat.php — collecte de la mesure d'audience (voir _stat.php pour ce qui est mesuré).
 *
 * Appelé en silence par assets/js/stat.js (navigator.sendBeacon) à l'ouverture d'une page, quand
 * on la quitte et à chaque geste utile. Corps JSON de 2 Ko au plus :
 *   { "a": "vue",  "pv": "<12 hex>", "p": "scolarite", "h": "emploi-du-temps", "r": "www.google.com",
 *     "s": "whatsapp", "w": 390, "l": "fr", "t": 1 }
 *   { "a": "fin",  "pv": "<12 hex>", "d": 41, "x": 75, "c": 1380 }
 *   { "a": "evt",  "pv": "<12 hex>", "p": "scolarite", "k": "classe", "n": "6ème 1", "e": "…", "v": 3 }
 *
 * Réponse : toujours vide (204), quoi qu'il arrive — le visiteur ne doit rien remarquer, et la
 * moindre panne de la mesure ne doit jamais gêner le site.
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';
require __DIR__ . '/_stat.php';

header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    exit;
}

try {
    $brut = file_get_contents('php://input', false, null, 0, 2049);
    if (is_string($brut) && $brut !== '' && strlen($brut) <= 2048) {
        $donnees = json_decode($brut, true);
        if (is_array($donnees)) {
            stat_enregistrer(bdd(), $donnees);
        }
    }
} catch (Throwable $e) {
    // Une base pas encore installée ou en panne : une ligne sur cinquante dans le journal, pas plus.
    if (random_int(1, 50) === 1) {
        error_log('[ISCA STAT] ' . get_class($e) . ' : ' . $e->getMessage());
    }
}
http_response_code(204);
