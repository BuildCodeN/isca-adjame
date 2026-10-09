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
const ECHECS_PAR_COMPTE = 5;       // échecs tolérés pour un identifiant…
const ECHECS_PAR_IP     = 60;      // …et, très large, pour une adresse
const FENETRE_ECHECS    = 900;     // …sur 15 minutes
const MOT_DE_PASSE_MIN  = 8;
const MOT_DE_PASSE_MAX  = 64;      // bcrypt ne lit que les 72 premiers octets
const CORPS_MAX         = 4096;    // taille maximale d'une requête (octets)

// Hash bcrypt valide d'un mot sans importance : sert à dépenser le même
// temps de calcul quand l'identifiant n'existe pas, pour qu'une réponse
// rapide ne révèle pas qu'un compte n'existe pas.
const HASH_FACTICE = '$2y$10$3.3anqyR9jAxvjqiWeccFOpuQJV4oI2T.10srs7GJOZI6CyMc2x9i';

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
 * Cherche « isca-config.php » dans cet ordre :
 *   1. la variable d'environnement ISCA_CONFIG (tests, autre hébergement) ;
 *   2. À CÔTÉ du dossier public_html — sur Hostinger :
 *      /home/uXXXX/domains/isca-adjame.com/isca-config.php ;
 *   3. un cran plus haut, puis le dossier personnel du compte.
 * Hors du dossier servi, le fichier ne peut être ni téléchargé ni écrasé
 * par un déploiement depuis GitHub.
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
    ]);
    foreach ($candidats as $fichier) {
        if (is_file($fichier)) {
            $contenu = require $fichier;
            if (is_array($contenu)) {
                return $config = $contenu;
            }
        }
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
            throw new RuntimeException('configuration absente ou incomplète');
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
 * Adresse du visiteur. Derrière le CDN de l'hébergeur, REMOTE_ADDR peut être
 * celle du CDN : on lit d'abord l'en-tête transmis. Il peut être falsifié,
 * c'est pourquoi la limite par adresse est très large : le vrai garde-fou
 * est la limite par identifiant.
 */
function ip_client(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR'] as $entete) {
        if (!empty($_SERVER[$entete])) {
            $premier = trim(explode(',', (string) $_SERVER[$entete])[0]);
            if (filter_var($premier, FILTER_VALIDATE_IP)) {
                $ip = $premier;
                break;
            }
        }
    }
    return substr($ip, 0, 45);
}

/** « isca 5 », « ISCA-005 », « isca005 » → « ISCA-005 » ; null si ce n'est pas un identifiant. */
function normaliser_identifiant(string $saisi): ?string
{
    $s = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $saisi) ?? '');
    if (!preg_match('/^ISCA(\d{1,4})$/', $s, $m)) {
        return null;
    }
    return sprintf('ISCA-%03d', (int) $m[1]);
}

/** Un code provisoire se tape souvent de travers : majuscules, espaces, tiret. */
function normaliser_code_provisoire(string $saisi): string
{
    return strtoupper(preg_replace('/[\s\-]+/', '', $saisi) ?? '');
}

// ------------------------------------------------------ limite des essais
/** Nombre d'échecs récents pour un identifiant ; et, s'il y a blocage, les secondes restantes. */
function etat_blocage(PDO $db, ?string $identifiant, string $ip): array
{
    $depuis = heure(-FENETRE_ECHECS);
    if ($identifiant !== null) {
        $q = $db->prepare('SELECT le FROM tentatives WHERE identifiant = ? AND reussie = 0 AND le >= ? ORDER BY le DESC LIMIT ?');
        $q->bindValue(1, $identifiant);
        $q->bindValue(2, $depuis);
        $q->bindValue(3, ECHECS_PAR_COMPTE, PDO::PARAM_INT);
        $q->execute();
        $echecs = $q->fetchAll(PDO::FETCH_COLUMN);
        if (count($echecs) >= ECHECS_PAR_COMPTE) {
            // le blocage se lève 15 minutes après le plus ancien des derniers échecs
            $debloque = strtotime($echecs[ECHECS_PAR_COMPTE - 1] . ' UTC') + FENETRE_ECHECS;
            return [true, max(1, $debloque - time())];
        }
    }
    $q = $db->prepare('SELECT COUNT(*) FROM tentatives WHERE ip = ? AND reussie = 0 AND le >= ?');
    $q->execute([$ip, $depuis]);
    if ((int) $q->fetchColumn() >= ECHECS_PAR_IP) {
        return [true, FENETRE_ECHECS];
    }
    return [false, 0];
}

function bloquer_si_necessaire(PDO $db, ?string $identifiant, string $ip): void
{
    [$bloque, $secondes] = etat_blocage($db, $identifiant, $ip);
    if ($bloque) {
        $minutes = (int) ceil($secondes / 60);
        header('Retry-After: ' . $secondes);
        refuser(429, sprintf('Trop de tentatives. Réessayez dans %d minute%s.', $minutes, $minutes > 1 ? 's' : ''),
            ['reessayerDans' => $secondes]);
    }
}

function noter_tentative(PDO $db, ?string $identifiant, string $ip, bool $reussie): void
{
    $q = $db->prepare('INSERT INTO tentatives (identifiant, ip, reussie, le) VALUES (?, ?, ?, ?)');
    $q->execute([$identifiant, $ip, $reussie ? 1 : 0, heure()]);
    if ($reussie && $identifiant !== null) {
        // la réussite remet le compteur à zéro
        $db->prepare('DELETE FROM tentatives WHERE identifiant = ? AND reussie = 0')->execute([$identifiant]);
    }
    if (random_int(1, 40) === 1) {            // ménage : rien ne s'accumule
        $db->prepare('DELETE FROM tentatives WHERE le < ?')->execute([heure(-30 * 86400)]);
        $db->prepare('DELETE FROM sessions WHERE expire_le < ?')->execute([heure()]);
    }
}

// ------------------------------------------------- mots de passe, sessions
/**
 * Vrai si $saisi est le mot de passe (ou le code provisoire) de $enseignant.
 * Le temps de calcul est le même que le compte existe ou non.
 */
function verifier_code(string $saisi, ?array $enseignant): bool
{
    $hash = $enseignant['code_hash'] ?? HASH_FACTICE;
    $ok = password_verify($saisi, $hash);
    if (!$ok && ($enseignant === null || (int) $enseignant['code_provisoire'] === 1)) {
        $ok = password_verify(normaliser_code_provisoire($saisi), $hash);
    }
    return $ok && $enseignant !== null;
}

/**
 * Règle du mot de passe personnel : assez long, des lettres ET des chiffres,
 * différent du code provisoire et de l'identifiant. Renvoie le message à
 * montrer à l'enseignant, ou null si le mot de passe convient.
 */
function probleme_mot_de_passe(string $nouveau, string $identifiant, string $ancien): ?string
{
    $longueur = mb_strlen($nouveau, 'UTF-8');
    if ($longueur < MOT_DE_PASSE_MIN) {
        return 'Le mot de passe doit comporter au moins ' . MOT_DE_PASSE_MIN . ' caractères.';
    }
    if ($longueur > MOT_DE_PASSE_MAX) {
        return 'Le mot de passe doit comporter ' . MOT_DE_PASSE_MAX . ' caractères au plus.';
    }
    if (!preg_match('/\p{L}/u', $nouveau) || !preg_match('/\d/', $nouveau)) {
        return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
    }
    $sans_signes = static fn(string $s): string => strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $s) ?? '');
    if (str_contains($sans_signes($nouveau), $sans_signes($identifiant))) {
        return 'Le mot de passe ne doit pas contenir votre identifiant.';
    }
    if ($nouveau === $ancien || $sans_signes($nouveau) === normaliser_code_provisoire($ancien)) {
        return 'Choisissez un mot de passe différent de l\'actuel.';
    }
    if (count(array_unique(mb_str_split($nouveau, 1, 'UTF-8'))) < 4) {
        return 'Choisissez un mot de passe moins évident.';
    }
    return null;
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
