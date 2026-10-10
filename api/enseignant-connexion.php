<?php
/*
 * POST /api/enseignant-connexion.php
 * Corps JSON : { "motDePasse": "K7M4-X9PQ" }
 * Réponse 200 : { "jeton": "…", "expireDans": 28800 }
 *
 * Pas d'identifiant : le mot de passe de la fiche remise par l'administration
 * suffit, le serveur retrouve le compte à partir de lui (voir _noyau.php).
 * On tolère les minuscules, les espaces et l'absence de tiret.
 *
 * Toute erreur de mot de passe reçoit la même réponse (401), qu'il soit trop
 * court, inconnu ou celui d'un compte fermé. Depuis une même adresse, 30
 * échecs en 15 minutes bloquent les essais suivants (429).
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';

lancer(function () {
    exiger_methode('POST');
    $corps = corps_json();
    $saisi = is_string($corps['motDePasse'] ?? null) ? $corps['motDePasse'] : '';

    $db = bdd();
    $ip = ip_client();
    bloquer_si_necessaire($db, $ip);

    // Un mot qui n'a pas la forme d'un code de fiche (lettres et chiffres, 6 à
    // 64) est refusé sans calcul : inutile de faire travailler le serveur pour
    // une saisie manifestement fausse. Ce filtre écarte aussi les caractères
    // de contrôle : un octet nul en fin de mot de passe ne changerait pas la
    // clé (HMAC complète les clés courtes par des zéros), on ne l'accepte donc pas.
    $mot = normaliser_mot_de_passe($saisi);
    $enseignant = null;
    if (strlen($saisi) <= 200
        && preg_match('/\A[A-Z0-9]{' . MOT_DE_PASSE_MIN . ',' . MOT_DE_PASSE_MAX . '}\z/', $mot)) {
        $q = $db->prepare('SELECT id FROM enseignants WHERE cle_acces = ? AND actif = 1');
        $q->execute([cle_d_acces($mot)]);
        $enseignant = $q->fetch() ?: null;
    }

    if ($enseignant === null) {
        noter_tentative($db, $ip, false);
        refuser(401, 'Mot de passe incorrect.');
    }

    noter_tentative($db, $ip, true);
    $jeton = creer_session($db, (int) $enseignant['id'], $ip);
    $db->prepare('UPDATE enseignants SET derniere_connexion = ? WHERE id = ?')
       ->execute([heure(), $enseignant['id']]);

    repondre(200, [
        'jeton'      => $jeton,
        'expireDans' => SESSION_DUREE,
    ]);
});
