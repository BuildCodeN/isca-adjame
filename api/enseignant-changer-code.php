<?php
/*
 * POST /api/enseignant-changer-code.php        (en-tête X-Jeton)
 * Corps JSON : { "ancien": "…", "nouveau": "…" }
 *
 * À la première connexion, l'enseignant remplace son code provisoire par un
 * mot de passe qu'il est seul à connaître : l'administration ne peut ni le
 * lire ni le retrouver, seulement en remettre un provisoire (« mot de passe
 * oublié »). Les autres connexions ouvertes du même compte sont fermées.
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';

lancer(function () {
    exiger_methode('POST');
    $db = bdd();
    $ens = enseignant_connecte($db);
    $corps = corps_json();
    $ancien  = is_string($corps['ancien'] ?? null) ? $corps['ancien'] : '';
    $nouveau = is_string($corps['nouveau'] ?? null) ? $corps['nouveau'] : '';
    $ip = ip_client();

    // Un jeton volé ne doit pas permettre de deviner le mot de passe actuel :
    // les erreurs comptent dans la même limite que la connexion.
    bloquer_si_necessaire($db, $ens['identifiant'], $ip);
    if ($ancien === '' || strlen($ancien) > 200 || !verifier_code($ancien, $ens)) {
        noter_tentative($db, $ens['identifiant'], $ip, false);
        refuser(403, 'Le mot de passe actuel est incorrect.');
    }

    $probleme = probleme_mot_de_passe($nouveau, $ens['identifiant'], $ancien);
    if ($probleme !== null) {
        refuser(422, $probleme);
    }

    $db->prepare('UPDATE enseignants SET code_hash = ?, code_provisoire = 0, code_modifie_le = ? WHERE id = ?')
       ->execute([password_hash($nouveau, PASSWORD_DEFAULT), heure(), $ens['id']]);
    $db->prepare('DELETE FROM sessions WHERE enseignant_id = ? AND id <> ?')
       ->execute([$ens['id'], $ens['session_id']]);
    noter_tentative($db, $ens['identifiant'], $ip, true);

    repondre(200, ['ok' => true]);
});
