<?php
/*
 * POST /api/stat-deconnexion.php        (en-tête X-Jeton-Stat)
 * Révoque le jeton d'administration du tableau de bord de fréquentation avant son expiration
 * naturelle (voir _stat.php : stat_jeton_revoquer). Ajouté le 18 novembre 2026, à la suite d'un
 * test d'intrusion : auparavant, « Se déconnecter » n'effaçait le jeton que dans le navigateur,
 * jamais côté serveur — le voler restait possible jusqu'à 30 jours malgré une déconnexion.
 *
 * Répond toujours « ok », que le jeton ait été valide, déjà expiré, ou absent : on ne révèle rien
 * sur son état (même principe que enseignant-deconnexion.php).
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';
require __DIR__ . '/_stat.php';

lancer(function () {
    exiger_methode('POST');
    $jeton = (string) ($_SERVER['HTTP_X_JETON_STAT'] ?? '');
    if (preg_match('/\Av1\.(\d{9,11})\.[0-9a-f]{64}\z/', $jeton, $m)) {
        stat_jeton_revoquer(bdd(), $jeton, (int) $m[1]);
    }
    repondre(200, ['ok' => true]);
});
