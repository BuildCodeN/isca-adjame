<?php
/*
 * POST /api/enseignant-connexion.php
 * Corps JSON : { "identifiant": "ISCA-012", "code": "…" }
 * Réponse 200 : { "jeton": "…", "expireDans": 28800, "doitChangerCode": true|false }
 *
 * L'identifiant est « ISCA » suivi du numéro d'ordre de l'enseignant ; on
 * le tolère tapé « isca 12 », « ISCA012 »… Le code est d'abord le code
 * provisoire remis par l'administration, puis le mot de passe personnel.
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';

lancer(function () {
    exiger_methode('POST');
    $corps = corps_json();
    $saisi = is_string($corps['identifiant'] ?? null) ? $corps['identifiant'] : '';
    $code  = is_string($corps['code'] ?? null) ? $corps['code'] : '';

    $identifiant = normaliser_identifiant($saisi);
    $db = bdd();
    $ip = ip_client();
    bloquer_si_necessaire($db, $identifiant, $ip);

    $enseignant = null;
    if ($identifiant !== null) {
        $q = $db->prepare('SELECT * FROM enseignants WHERE identifiant = ? AND actif = 1');
        $q->execute([$identifiant]);
        $enseignant = $q->fetch() ?: null;
    }

    if ($code === '' || strlen($code) > 200 || !verifier_code($code, $enseignant)) {
        noter_tentative($db, $identifiant, $ip, false);
        refuser(401, 'Identifiant ou mot de passe incorrect.');
    }

    noter_tentative($db, $identifiant, $ip, true);
    $jeton = creer_session($db, (int) $enseignant['id'], $ip);
    $db->prepare('UPDATE enseignants SET derniere_connexion = ? WHERE id = ?')
       ->execute([heure(), $enseignant['id']]);

    repondre(200, [
        'jeton'           => $jeton,
        'expireDans'      => SESSION_DUREE,
        'doitChangerCode' => (int) $enseignant['code_provisoire'] === 1,
    ]);
});
