<?php
/*
 * POST /api/enseignant-deconnexion.php        (en-tête X-Jeton)
 * Ferme la connexion. Répond toujours « ok » : on ne dit pas si le jeton
 * existait.
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';

lancer(function () {
    exiger_methode('POST');
    $jeton = (string) ($_SERVER['HTTP_X_JETON'] ?? '');
    if (preg_match('/^[0-9a-f]{64}$/', $jeton)) {
        bdd()->prepare('DELETE FROM sessions WHERE jeton_hash = ?')->execute([hash('sha256', $jeton)]);
    }
    repondre(200, ['ok' => true]);
});
