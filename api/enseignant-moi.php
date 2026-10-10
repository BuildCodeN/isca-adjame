<?php
/*
 * GET /api/enseignant-moi.php        (en-tête X-Jeton)
 * Renvoie la fiche de l'enseignant CONNECTÉ, et d'elle seule : jamais celle
 * d'un autre, jamais la liste du personnel.
 *
 * { "civilite", "nom", "matiere", "principalDe", "annee",
 *   "edt": [8 lignes][5 jours] }   — une ligne par heure de cours, de la 1ère
 * à la 8ème H. (la pause déjeuner n'est pas une heure ; la table creneaux
 * numérote ses heures de 1 à 8).
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';

lancer(function () {
    exiger_methode('GET');
    $db = bdd();
    $ens = enseignant_connecte($db);

    $q = $db->prepare('SELECT jour, heure, contenu FROM creneaux WHERE enseignant_id = ?');
    $q->execute([$ens['id']]);
    $edt = array_fill(0, 8, array_fill(0, 5, ''));
    foreach ($q as $c) {
        $ligne = (int) $c['heure'] - 1;
        $jour  = (int) $c['jour'] - 1;
        if ($ligne >= 0 && $ligne <= 7 && $jour >= 0 && $jour <= 4) {
            $edt[$ligne][$jour] = $c['contenu'];
        }
    }
    $annee = $db->query("SELECT valeur FROM parametres WHERE cle = 'annee_scolaire'")->fetchColumn();

    repondre(200, [
        'civilite'        => $ens['civilite'],
        'nom'             => $ens['nom'],
        'matiere'         => $ens['discipline'],
        'principalDe'     => $ens['classe_principale'],
        'annee'           => $annee ?: '',
        'edt'             => $edt,
    ]);
});
