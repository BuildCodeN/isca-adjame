<?php
/*
 * POST /api/stat-connexion.php
 * Corps JSON : { "cle": "ABCD-EFGH-JKMN-PQRS", "longue": false }
 * Réponse 200 : { "jeton": "v1.…", "expireDans": 28800 }
 *
 * Ouvre l'accès au tableau de bord de fréquentation (statistiques.html). La clé est celle du
 * fichier remis à l'administrateur ; la base n'en garde que l'empreinte (PBKDF2). On tolère
 * minuscules, espaces et tirets. « longue » : session de 30 jours au lieu de 8 heures
 * (case « rester connecté sur cet appareil »).
 *
 * Toute clé fausse reçoit la même réponse (401). Depuis une même adresse, 10 échecs en
 * 15 minutes bloquent les essais suivants (429) ; l'adresse n'est jamais enregistrée, seulement
 * son empreinte du jour.
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';
require __DIR__ . '/_stat.php';

lancer(function () {
    exiger_methode('POST');
    $corps = corps_json();
    $saisie = is_string($corps['cle'] ?? null) ? $corps['cle'] : '';
    $longue = !empty($corps['longue']);

    $db = bdd();
    $empreinte = stat_empreinte_acces($db);
    $reste = stat_bloque($db, $empreinte);
    if ($reste > 0) {
        $minutes = (int) ceil($reste / 60);
        header('Retry-After: ' . $reste);
        refuser(429, sprintf('Trop de tentatives. Réessayez dans %d minute%s.', $minutes, $minutes > 1 ? 's' : ''), ['reessayerDans' => $reste]);
    }

    $attendue = stat_parametre($db, 'stat_cle_acces');
    if ($attendue === null) {
        refuser(503, "L'accès aux statistiques n'est pas encore installé sur le serveur.");
    }

    $cle = stat_normaliser_cle($saisie);
    $bonne = strlen($saisie) <= 100
        && preg_match('/\A[A-Z0-9]{12,40}\z/', $cle) === 1
        && hash_equals($attendue, stat_cle_empreinte($cle));
    stat_noter_tentative($db, $empreinte, $bonne);
    if (!$bonne) {
        refuser(401, 'Clé incorrecte.');
    }

    $duree = $longue ? STAT_JETON_LONG : STAT_JETON_COURT;
    repondre(200, ['jeton' => stat_jeton_creer($db, $duree), 'expireDans' => $duree]);
});
