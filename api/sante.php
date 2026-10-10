<?php
/*
 * GET /api/sante.php — contrôle de mise en service.
 *
 * Une fois la base créée et « isca-config.php » en place, ouvrir
 * https://isca-adjame.com/api/sante.php doit afficher
 *   {"ok":true,"enseignants":43,"annee":"2026-2027"}
 * Sinon, « probleme » dit dans quelle étape ça bloque :
 *   configuration : isca-config.php ne convient pas ; « detail » précise
 *                     introuvable : aucun fichier isca-config.php aux endroits prévus
 *                                   (à côté du dossier public_html, ou un ou deux
 *                                   dossiers plus haut, jamais dedans)
 *                     illisible   : le fichier existe mais n'est pas du PHP valide
 *                                   (la première ligne doit être « <?php »)
 *                     incomplet   : une des trois valeurs (base, utilisateur,
 *                                   mot de passe) manque ou est vide
 *   connexion     : la base refuse le nom, l'utilisateur ou le mot de passe
 *   tables        : la base est vide (installation-base-enseignants.sql pas encore importé)
 * Rien d'autre n'est révélé : ni chemins, ni noms, ni mots de passe.
 */
define('ISCA_API', true);
require __DIR__ . '/_noyau.php';

exiger_methode('GET');

try {
    $db = bdd();
} catch (ConfigurationIncomplete $e) {
    repondre(503, ['ok' => false, 'probleme' => 'configuration', 'detail' => etat_config()]);
} catch (Throwable $e) {
    error_log('[ISCA API] sante : ' . $e->getMessage());
    repondre(503, ['ok' => false, 'probleme' => 'connexion']);
}

try {
    $n = (int) $db->query('SELECT COUNT(*) FROM enseignants WHERE actif = 1')->fetchColumn();
    $annee = $db->query("SELECT valeur FROM parametres WHERE cle = 'annee_scolaire'")->fetchColumn();
} catch (Throwable $e) {
    error_log('[ISCA API] sante : ' . $e->getMessage());
    repondre(503, ['ok' => false, 'probleme' => 'tables']);
}

repondre(200, ['ok' => true, 'enseignants' => $n, 'annee' => $annee ?: '']);
