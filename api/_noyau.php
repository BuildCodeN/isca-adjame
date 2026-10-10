<?php
/*
 * API de l'Espace Enseignant — noyau commun (PHP + MySQL).
 *
 * Conçue pour l'hébergement de l'ISCA : Hostinger « Business Web Hosting »
 * (PHP 8.2 et plus, bases MySQL, phpMyAdmin, déploiement depuis GitHub),
 * sans rien qui demande un serveur dédié ni Node.js.
 *
 * Ce fichier ne se visite pas : il ne contient que des fonctions, les
 * scripts « enseignant-*.php » et « sante.php » le chargent après avoir
 * posé la constante ISCA_API. Visité seul, il répond « introuvable ».
 *
 * Aucun secret ici. Les accès à la base de données vivent dans un fichier
 * « isca-config.php » placé À CÔTÉ du dossier public_html (jamais dedans,
 * jamais sur GitHub) — voir charger_config().
 *
 * CONNEXION PAR MOT DE PASSE SEUL. L'enseignant ne tape ni identifiant ni
 * nom : seulement le mot de passe de sa fiche. Le serveur retrouve le compte
 * à partir du mot de passe, ce qui suppose que deux enseignants n'aient
 * JAMAIS le même : c'est pourquoi les mots de passe sont des codes de
 * 8 caractères tirés au hasard par l'administration (jamais choisis par
 * l'enseignant), uniques par construction et par la base (clé unique).
 */
declare(strict_types=1);

if (!defined('ISCA_API')) {
    http_response_code(404);
    exit;
}

// Une erreur PHP ne doit jamais s'afficher dans la réponse (elle casserait
// le JSON et pourrait trahir un chemin) : elle va dans le journal du serveur.
ini_set('display_errors', '0');
error_reporting(E_ALL);

// ----------------------------------------------------------------- réglages
const SESSION_DUREE     = 28800;   // une connexion dure 8 heures
const ECHECS_PAR_IP     = 30;      // échecs tolérés depuis une même adresse…
const FENETRE_ECHECS    = 900;     // …sur 15 minutes (très au-dessus des fautes de frappe
                                   // de 43 enseignants derrière la même box, très en dessous
                                   // de ce qu'il faut pour deviner un code)
const MOT_DE_PASSE_MIN  = 6;       // en dessous, ce n'est pas un code de fiche : refus sans calcul
const MOT_DE_PASSE_MAX  = 64;
const CORPS_MAX         = 4096;    // taille maximale d'une requête (octets)

// Le mot de passe n'est jamais enregistré : la base garde sa « clé d'accès »,
// PBKDF2-HMAC-SHA256 du mot de passe (sel fixe de l'application, 100 000 tours,
// ~0,1 s). Elle sert à la fois de brouillage (impossible à relire) et de
// recherche (clé unique : le même mot de passe donne toujours la même clé, ce
// qui permet de retrouver le compte sans identifiant). Le mot de passe est un
// code de 8 caractères tirés au hasard parmi 31 : plus de 800 milliards de
// possibilités, que ni la limite d'essais ni le coût du calcul ne laissent
// parcourir. Le sel est public (ce fichier l'est) : il n'a pas à être secret,
// il sert seulement à ce que cette base ne se devine pas avec une table
// précalculée faite pour un autre site.
const SEL_ACCES        = 'isca-adjame.com/espace-enseignant/acces/v1';
const ITERATIONS_ACCES = 100000;

// ----------------------------------------------------------------- réponses
function entetes_api(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
}

function repondre(int $statut, array $donnees = []): never
{
    entetes_api();
    http_response_code($statut);
    echo json_encode($donnees, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function refuser(int $statut, string $message, array $plus = []): never
{
    repondre($statut, ['erreur' => $message] + $plus);
}

function exiger_methode(string $methode): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $methode) {
        header('Allow: ' . $methode);
        refuser(405, 'Méthode non autorisée.');
    }
}

function corps_json(): array
{
    $brut = file_get_contents('php://input', false, null, 0, CORPS_MAX + 1);
    if ($brut === false || $brut === '' || strlen($brut) > CORPS_MAX) {
        refuser(400, 'Requête invalide.');
    }
    $donnees = json_decode($brut, true);
    if (!is_array($donnees)) {
        refuser(400, 'Requête invalide.');
    }
    return $donnees;
}

/** Exécute un script d'API : toute panne inattendue devient une réponse propre. */
function lancer(callable $programme): void
{
    try {
        $programme();
    } catch (Throwable $e) {
        error_log('[ISCA API] ' . get_class($e) . ' : ' . $e->getMessage());
        refuser(503, 'Service momentanément indisponible. Réessayez dans quelques minutes.');
    }
}

// -------------------------------------------------- configuration et base
/**
 * « isca-config.php » absent, illisible ou incomplet. Une classe à part : une
 * panne de la base elle-même (PDOException, qui hérite de RuntimeException)
 * ne doit pas être prise pour un problème de configuration.
 */
final class ConfigurationIncomplete extends RuntimeException
{
}

/**
 * Où en est la configuration ? « introuvable » (aucun fichier isca-config.php
 * aux endroits prévus), « illisible » (un fichier existe mais ce n'est pas du
 * PHP valide qui renvoie une liste : souvent la première ligne « <?php »
 * manque), « incomplet » (une des trois valeurs manque), « ok ». Sert
 * seulement à sante.php pour dire à l'administrateur ce qui bloque, sans rien
 * révéler : ni chemin, ni valeur.
 */
function etat_config(?string $etat = null): string
{
    static $courant = 'introuvable';
    if ($etat !== null) {
        $courant = $etat;
    }
    return $courant;
}

/**
 * Cherche « isca-config.php » dans cet ordre :
 *   1. la variable d'environnement ISCA_CONFIG (tests, autre hébergement) ;
 *   2. À CÔTÉ du dossier public_html — sur Hostinger :
 *      /home/uXXXX/domains/isca-adjame.com/isca-config.php ;
 *   3. un cran plus haut (…/domains/), puis le dossier personnel du compte
 *      (/home/uXXXX/) : on a vite fait de déposer le fichier au « mauvais »
 *      niveau, tous restent HORS du site.
 * Hors du dossier servi, le fichier ne peut être ni téléchargé ni écrasé
 * par un déploiement depuis GitHub.
 *
 * Le fichier est lu sans jamais rien laisser sortir : s'il manque « <?php »
 * en première ligne, PHP afficherait son texte (mot de passe de la base
 * compris) dans la réponse. Une sortie parasite est donc avalée.
 */
function charger_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }
    $racine = rtrim((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
    $candidats = array_filter([
        getenv('ISCA_CONFIG') ?: null,
        $racine !== '' ? dirname($racine) . DIRECTORY_SEPARATOR . 'isca-config.php' : null,
        dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'isca-config.php',
        dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'isca-config.php',
        dirname(__DIR__, 4) . DIRECTORY_SEPARATOR . 'isca-config.php',
    ]);
    foreach (array_unique($candidats) as $fichier) {
        if (!@is_file($fichier)) {
            continue;
        }
        $contenu = null;
        ob_start();
        try {
            $contenu = require $fichier;
        } catch (Throwable $e) {
            error_log('[ISCA API] isca-config.php illisible : ' . get_class($e) . ' : ' . $e->getMessage());
        } finally {
            ob_end_clean();
        }
        if (is_array($contenu)) {
            etat_config('ok');
            return $config = $contenu;
        }
        etat_config('illisible');
    }
    return $config = [];
}

function bdd(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $c = charger_config();
    foreach (['bd_nom', 'bd_utilisateur', 'bd_mot_de_passe'] as $cle) {
        if (!isset($c[$cle]) || $c[$cle] === '') {
            if ($c !== []) {
                etat_config('incomplet');
            }
            throw new ConfigurationIncomplete('configuration absente ou incomplète');
        }
    }
    $dsn = sprintf(
        'mysql:host=%s;%sdbname=%s;charset=utf8mb4',
        $c['bd_hote'] ?? 'localhost',
        isset($c['bd_port']) ? 'port=' . (int) $c['bd_port'] . ';' : '',
        $c['bd_nom']
    );
    $pdo = new PDO($dsn, (string) $c['bd_utilisateur'], (string) $c['bd_mot_de_passe'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

// ------------------------------------------------------------------ outils
/** Heure UTC au format MySQL, décalée de $secondes (l'heure vient de PHP, pas du serveur MySQL). */
function heure(int $secondes = 0): string
{
    return gmdate('Y-m-d H:i:s', time() + $secondes);
}

/**
 * Adresse du visiteur, pour la limite d'essais. Derrière le CDN de
 * l'hébergeur, REMOTE_ADDR peut être celle du CDN : on lit alors l'en-tête
 * X-Forwarded-For, mais par la FIN. Chaque relais y ajoute à droite l'adresse
 * de celui qui l'a appelé ; ce qui se trouve à gauche a pu être écrit par le
 * visiteur lui-même, donc ne prouve rien. (Un visiteur qui falsifie l'en-tête
 * peut seulement contourner la limite par adresse, pas deviner un code.)
 */
function ip_client(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $relais = array_map('trim', explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']));
        $dernier = end($relais);
        if (is_string($dernier) && filter_var($dernier, FILTER_VALIDATE_IP)) {
            $ip = $dernier;
        }
    }
    return substr($ip, 0, 45);
}

// ------------------------------------------------------ limite des essais
/** [bloqué ?, secondes avant la fin du blocage] pour cette adresse. */
function etat_blocage(PDO $db, string $ip): array
{
    $q = $db->prepare('SELECT le FROM tentatives WHERE ip = ? AND reussie = 0 AND le >= ? ORDER BY le DESC LIMIT ?');
    $q->bindValue(1, $ip);
    $q->bindValue(2, heure(-FENETRE_ECHECS));
    $q->bindValue(3, ECHECS_PAR_IP, PDO::PARAM_INT);
    $q->execute();
    $echecs = $q->fetchAll(PDO::FETCH_COLUMN);
    if (count($echecs) >= ECHECS_PAR_IP) {
        // le blocage se lève quand le plus ancien des derniers échecs sort de la fenêtre
        $debloque = strtotime($echecs[ECHECS_PAR_IP - 1] . ' UTC') + FENETRE_ECHECS;
        return [true, max(1, $debloque - time())];
    }
    return [false, 0];
}

function bloquer_si_necessaire(PDO $db, string $ip): void
{
    [$bloque, $secondes] = etat_blocage($db, $ip);
    if ($bloque) {
        $minutes = (int) ceil($secondes / 60);
        header('Retry-After: ' . $secondes);
        refuser(429, sprintf('Trop de tentatives. Réessayez dans %d minute%s.', $minutes, $minutes > 1 ? 's' : ''),
            ['reessayerDans' => $secondes]);
    }
}

/**
 * Une réussite NE remet PAS le compteur à zéro : quelqu'un qui possède un
 * mot de passe valable ne doit pas pouvoir s'en servir pour effacer ses
 * échecs et deviner ceux des autres sans limite.
 */
function noter_tentative(PDO $db, string $ip, bool $reussie): void
{
    $q = $db->prepare('INSERT INTO tentatives (ip, reussie, le) VALUES (?, ?, ?)');
    $q->execute([$ip, $reussie ? 1 : 0, heure()]);
    if (random_int(1, 40) === 1) {            // ménage : rien ne s'accumule
        $db->prepare('DELETE FROM tentatives WHERE le < ?')->execute([heure(-30 * 86400)]);
        $db->prepare('DELETE FROM sessions WHERE expire_le < ?')->execute([heure()]);
    }
}

// ------------------------------------------------- mots de passe, sessions
/**
 * Un mot de passe se tape souvent de travers : minuscules, espaces, tiret
 * (« k7m4 x9pq », « K7M4-X9PQ », « K7M4X9PQ » sont le même). Les codes de fiche
 * n'ont ni espace ni tiret dans leur forme enregistrée.
 */
function normaliser_mot_de_passe(string $saisi): string
{
    return strtoupper(preg_replace('/[\s\-]+/u', '', $saisi) ?? '');
}

/**
 * Clé d'accès d'un mot de passe (déjà normalisé) : 64 caractères
 * hexadécimaux. C'est ce que la base enregistre — jamais le mot de passe —
 * et ce qu'elle cherche à la connexion. Même fonction pour l'API et pour
 * l'outil qui prépare les comptes (outils/hacher-codes.php) : un code imprimé
 * sur une fiche qui n'ouvrirait pas le compte serait découvert avant la remise.
 */
function cle_d_acces(string $motDePasseNormalise): string
{
    return hash_pbkdf2('sha256', $motDePasseNormalise, SEL_ACCES, ITERATIONS_ACCES, 64);
}

function creer_session(PDO $db, int $enseignant_id, string $ip): string
{
    $jeton = bin2hex(random_bytes(32));
    $q = $db->prepare('INSERT INTO sessions (enseignant_id, jeton_hash, cree_le, expire_le, ip) VALUES (?, ?, ?, ?, ?)');
    $q->execute([$enseignant_id, hash('sha256', $jeton), heure(), heure(SESSION_DUREE), $ip]);
    return $jeton;
}

/** L'enseignant connecté d'après l'en-tête X-Jeton, ou une réponse 401. */
function enseignant_connecte(PDO $db): array
{
    $jeton = (string) ($_SERVER['HTTP_X_JETON'] ?? '');
    if (!preg_match('/^[0-9a-f]{64}$/', $jeton)) {
        refuser(401, 'Session expirée. Reconnectez-vous.');
    }
    $q = $db->prepare(
        'SELECT e.*, s.id AS session_id FROM sessions s
           JOIN enseignants e ON e.id = s.enseignant_id
          WHERE s.jeton_hash = ? AND s.expire_le > ? AND e.actif = 1'
    );
    $q->execute([hash('sha256', $jeton), heure()]);
    $ligne = $q->fetch();
    if (!$ligne) {
        refuser(401, 'Session expirée. Reconnectez-vous.');
    }
    return $ligne;
}
