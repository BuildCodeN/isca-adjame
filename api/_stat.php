<?php
/*
 * Mesure d'audience du site — noyau commun (PHP + MySQL).
 *
 * Ce fichier ne se visite pas : il ne contient que des fonctions, chargées par
 * les scripts « stat*.php » (et par la connexion des enseignants, pour compter
 * les connexions) après la constante ISCA_API. Visité seul, il répond « introuvable ».
 *
 * CE QUI EST MESURÉ — et rien d'autre :
 *   • les pages ouvertes : laquelle, et d'où le visiteur arrive (le NOM du site
 *     d'origine seulement : Google, Facebook, un lien suivi « ?src=… »…) ;
 *   • le type d'appareil, le navigateur, le système, la langue ;
 *   • le temps passé sur la page, jusqu'où on l'a lue, le temps de chargement ;
 *   • quelques gestes qui disent ce que l'on cherche : un mot tapé dans la
 *     recherche des actualités, la classe dont on ouvre l'emploi du temps, un
 *     document ouvert, un numéro appelé, une bannière agrandie, une rubrique lue.
 *
 * CE QUI N'EST PAS ENREGISTRÉ : aucun cookie, aucune adresse IP, aucun identifiant
 * du navigateur, aucun nom, aucun texte saisi dans un formulaire (contact,
 * paiement, connexion). Pour compter les visiteurs sans les suivre, le serveur
 * calcule une « empreinte du jour » : HMAC-SHA256 de l'adresse et du navigateur
 * avec un sel tiré au hasard chaque jour, effacé au bout de deux jours. Elle sert
 * à savoir que deux pages ont été ouvertes par la même personne CE JOUR-LÀ ; une
 * fois le sel effacé, même l'administrateur ne peut plus la rattacher à une
 * adresse, et elle ne permet pas de reconnaître quelqu'un le lendemain (un
 * visiteur qui revient est donc recompté : on mesure des visiteurs « par jour »).
 *
 * Les heures sont en UTC, qui est l'heure d'Abidjan toute l'année.
 *
 * L'accès aux chiffres (stat-connexion.php, stat-resume.php, stat-export.php) est
 * réservé à l'administrateur : une clé longue tirée au hasard, dont la base ne garde
 * que l'empreinte (voir outils/preparer-statistiques.py).
 */
declare(strict_types=1);

if (!defined('ISCA_API')) {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/_noyau.php';

// ----------------------------------------------------------------- réglages
/** Les pages du site, et leur nom lisible. Toute autre adresse est comptée « autre ». */
const STAT_PAGES = [
    'index'             => 'Accueil',
    'etablissement'     => "L'Établissement",
    'scolarite'         => 'Scolarité',
    'vie-scolaire'      => 'Vie scolaire',
    'admissions'        => 'Admissions',
    'paiement'          => 'Paiement',
    'actualites'        => 'Actualités',
    'contact'           => 'Contact',
    'espace-enseignant' => 'Espace Enseignant',
];
/** Les gestes que le navigateur peut annoncer. « connexion_enseignant » est écrit par le serveur seul. */
const STAT_CATEGORIES_NAVIGATEUR = [
    'recherche', 'filtre', 'classe', 'telechargement', 'appel', 'courriel',
    'lien_externe', 'galerie', 'banniere', 'navigation', 'section',
];
const STAT_VISITE_PAUSE      = 1800;    // une visite se termine après 30 minutes sans rien
const STAT_MAX_VUES_JOUR     = 400;     // pages comptées au plus, par visiteur et par jour
const STAT_MAX_EVT_JOUR      = 600;     // gestes comptés au plus, par visiteur et par jour
const STAT_CONSERVATION_JOURS = 760;    // on garde 25 mois, puis on efface
const STAT_JETON_COURT       = 28800;   // une session d'administration : 8 heures…
const STAT_JETON_LONG        = 2592000; // …ou 30 jours si l'on coche « rester connecté »
const STAT_ECHECS_PAR_EMPREINTE = 10;   // clés fausses tolérées depuis une même adresse…
const STAT_FENETRE_ECHECS    = 900;     // …sur 15 minutes
const STAT_PERIODE_MAX_JOURS = 800;     // période la plus longue qu'on laisse calculer
// La clé d'administration est longue et tirée au hasard : on la protège par le même procédé que
// les mots de passe des enseignants (PBKDF2, 100 000 tours), avec un sel qui lui est propre.
const STAT_SEL_ACCES         = 'isca-adjame.com/statistiques/acces/v1';
const STAT_ITERATIONS_ACCES  = 100000;

// ----------------------------------------------------- empreinte du visiteur
/** Adresse du site sans « www. » ni port : sert à reconnaître une origine « interne ». */
function stat_site(): string
{
    $h = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $h = preg_replace('/:\d+\z/', '', $h) ?? $h;
    return preg_replace('/\Awww\./', '', $h) ?? $h;
}

/**
 * Le sel du jour. Créé à la première demande de la journée, il n'est gardé que
 * deux jours (celui de la veille sert aux dernières pages encore ouvertes à minuit).
 * Retourne null si le sel de ce jour n'existe plus (ou n'a jamais existé) et que
 * $creer est faux.
 */
function stat_sel(PDO $db, string $jour, bool $creer = true): ?string
{
    static $memoire = [];
    if (isset($memoire[$jour])) {
        return $memoire[$jour];
    }
    $q = $db->prepare('SELECT sel FROM stat_sels WHERE jour = ?');
    $q->execute([$jour]);
    $sel = $q->fetchColumn();
    if (is_string($sel) && $sel !== '') {
        return $memoire[$jour] = $sel;
    }
    if (!$creer) {
        return null;
    }
    $db->prepare('INSERT IGNORE INTO stat_sels (jour, sel) VALUES (?, ?)')->execute([$jour, bin2hex(random_bytes(16))]);
    $q->execute([$jour]);                                   // si deux visiteurs arrivent ensemble, une seule valeur a gagné
    $sel = (string) $q->fetchColumn();
    $db->prepare('DELETE FROM stat_sels WHERE jour < ?')->execute([gmdate('Y-m-d', time() - 2 * 86400)]);
    return $memoire[$jour] = $sel;
}

/** 16 caractères hexadécimaux : l'empreinte d'un visiteur POUR UN JOUR. Ni l'adresse ni le navigateur n'en sortent. */
function stat_empreinte(string $ip, string $ua, string $sel): string
{
    return substr(hash_hmac('sha256', $ip . '|' . $ua, $sel), 0, 16);
}

// ------------------------------------------------------------- l'appareil
/**
 * Type d'appareil, navigateur et système d'après l'en-tête User-Agent — qui n'est pas
 * gardé. Retourne null pour un robot (moteur de recherche, aperçu de lien, outil de
 * contrôle) : il n'est pas compté.
 */
function stat_agent(string $ua, bool $tactile = false): ?array
{
    if ($ua === '' || strlen($ua) > 600) {
        return null;
    }
    if (preg_match('/bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|pagespeed|gtmetrix|curl\/|wget|python|java\/|go-http|okhttp|monitor|uptime|pingdom|semrush|ahrefs|mj12|dataprovider|archive|scrapy|httpclient|libwww|node-fetch|axios/i', $ua)) {
        return null;
    }
    $systeme = 'Autre';
    if (preg_match('/Android/i', $ua)) {
        $systeme = 'Android';
    } elseif (preg_match('/iPhone|iPad|iPod/i', $ua)) {
        $systeme = 'iOS';
    } elseif (preg_match('/Windows/i', $ua)) {
        $systeme = 'Windows';
    } elseif (preg_match('/CrOS/i', $ua)) {
        $systeme = 'ChromeOS';
    } elseif (preg_match('/Macintosh|Mac OS X/i', $ua)) {
        $systeme = 'macOS';
    } elseif (preg_match('/Linux|X11/i', $ua)) {
        $systeme = 'Linux';
    }

    $tablette = (bool) preg_match('/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i', $ua);
    if ($systeme === 'macOS' && $tactile) {          // un iPad récent se présente comme un Mac
        $tablette = true;
        $systeme = 'iOS';
    }
    $mobile = !$tablette && preg_match('/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|Opera Mini|KaiOS/i', $ua);
    $appareil = $tablette ? 'tablette' : ($mobile ? 'mobile' : 'ordinateur');

    if (preg_match('/FBAN|FBAV|FB_IAB/', $ua)) {
        $navigateur = 'Facebook (appli)';
    } elseif (preg_match('/Instagram/i', $ua)) {
        $navigateur = 'Instagram (appli)';
    } elseif (preg_match('/EdgA?\/|Edg\//', $ua)) {
        $navigateur = 'Edge';
    } elseif (preg_match('/OPR\/|Opera/', $ua)) {
        $navigateur = 'Opera';
    } elseif (preg_match('/SamsungBrowser/', $ua)) {
        $navigateur = 'Samsung Internet';
    } elseif (preg_match('/UCBrowser|UCWEB/', $ua)) {
        $navigateur = 'UC Browser';
    } elseif (preg_match('/Firefox|FxiOS/', $ua)) {
        $navigateur = 'Firefox';
    } elseif (preg_match('/CriOS|Chrome\//', $ua)) {
        $navigateur = 'Chrome';
    } elseif (preg_match('/Safari\//', $ua)) {
        $navigateur = 'Safari';
    } else {
        $navigateur = 'Autre';
    }
    return ['appareil' => $appareil, 'navigateur' => $navigateur, 'systeme' => $systeme];
}

// ------------------------------------------------------ d'où l'on arrive
/**
 * D'où arrive le visiteur : [catégorie, nom du site]. Catégories : direct, interne,
 * recherche, facebook, whatsapp, reseau, site, campagne (un lien suivi « ?src=… »).
 * Seul le NOM de domaine du site d'origine est reçu : jamais la page ni les mots cherchés.
 */
function stat_origine(string $hote, string $src, string $site): array
{
    if ($src !== '') {
        return ['campagne', $src];
    }
    $hote = strtolower(trim($hote));
    if ($hote === '') {
        return ['direct', null];
    }
    $hote = preg_replace('/\A(www|m|l|lm|mobile|web)\./', '', $hote) ?? $hote;
    if (!preg_match('/\A[a-z0-9.\-]{3,80}\z/', $hote)) {
        return ['direct', null];
    }
    if ($site !== '' && ($hote === $site || str_ends_with($hote, '.' . $site))) {
        return ['interne', null];
    }
    if (preg_match('/(\A|\.)(google|bing|yahoo|duckduckgo|ecosia|qwant|yandex|baidu|ask)\.[a-z.]+\z/', $hote, $m)) {
        return ['recherche', ucfirst($m[2])];
    }
    if (preg_match('/(\A|\.)(facebook|fb|fbcdn)\.(com|me|watch)\z/', $hote) || $hote === 'fb.me') {
        return ['facebook', 'Facebook'];
    }
    if (preg_match('/whatsapp|\Awa\.me\z/', $hote)) {
        return ['whatsapp', 'WhatsApp'];
    }
    if (preg_match('/(\A|\.)(instagram|twitter|t\.co|x\.com|linkedin|youtube|youtu\.be|tiktok|telegram|snapchat|pinterest)/', $hote, $m)) {
        return ['reseau', ucfirst(str_replace('.com', '', $m[2]))];
    }
    return ['site', $hote];
}

// ---------------------------------------------------------------- nettoyage
/**
 * Nettoie un texte envoyé par le navigateur avant de le garder : caractères de contrôle ôtés,
 * espaces resserrés. Avec $epurer (les mots que le visiteur tape lui-même dans la recherche),
 * l'adresse électronique et les longues suites de chiffres (téléphone, numéro d'élève) sont aussi
 * effacées : la mesure d'audience ne doit jamais emporter une coordonnée. Les autres textes (le
 * numéro de l'établissement qu'on touche pour appeler, le nom d'un document…) viennent du site
 * lui-même : on les garde tels quels.
 */
function stat_nettoyer(string $texte, int $max, bool $minuscules = false, bool $epurer = false): string
{
    $texte = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $texte) ?? '';
    if ($epurer) {
        $texte = preg_replace('/[^\s@]+@[^\s@]+\.[^\s@]+/u', ' ', $texte) ?? '';
        $texte = preg_replace('/(?:\d[ .\-]?){9,}/u', '# ', $texte) ?? '';
    }
    $texte = trim(preg_replace('/\s+/u', ' ', $texte) ?? '');
    if ($minuscules) {
        $texte = mb_strtolower($texte, 'UTF-8');
    }
    return mb_substr($texte, 0, $max, 'UTF-8');
}

function stat_page(string $brut): string
{
    $brut = strtolower(trim($brut));
    return isset(STAT_PAGES[$brut]) ? $brut : 'autre';
}

function stat_ancre(string $brut): ?string
{
    $brut = ltrim(strtolower(trim($brut)), '#');
    return preg_match('/\A[a-z0-9_-]{1,40}\z/', $brut) ? $brut : null;
}

function stat_source(string $brut): string
{
    $brut = strtolower(trim($brut));
    return preg_match('/\A[a-z0-9_-]{1,24}\z/', $brut) ? $brut : '';
}

function stat_borner($valeur, int $min, int $max): ?int
{
    if (!is_numeric($valeur)) {
        return null;
    }
    return max($min, min($max, (int) $valeur));
}

// ------------------------------------------------------------- enregistrement
/** La visite en cours de ce visiteur aujourd'hui (moins de 30 minutes d'inactivité), sinon une nouvelle. */
function stat_visite(PDO $db, string $jour, string $visiteur, int $maintenant): string
{
    $q = $db->prepare('SELECT visite, le, COALESCE(duree_s, 0) AS d FROM stat_vues WHERE jour = ? AND visiteur = ? ORDER BY id DESC LIMIT 1');
    $q->execute([$jour, $visiteur]);
    $der = $q->fetch();
    if ($der && $maintenant - (strtotime($der['le'] . ' UTC') + (int) $der['d']) <= STAT_VISITE_PAUSE) {
        return (string) $der['visite'];
    }
    return bin2hex(random_bytes(6));
}

/**
 * Ce que le navigateur annonce (corps JSON : « a » = vue, fin ou evt). Tout est vérifié,
 * borné et nettoyé ; ce qui n'est pas reconnu est ignoré sans bruit. Ne retourne rien :
 * le visiteur ne doit jamais rien remarquer.
 */
function stat_enregistrer(PDO $db, array $d): void
{
    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    $agent = stat_agent($ua, !empty($d['t']));
    if ($agent === null) {
        return;                                              // robot, aperçu de lien, outil de contrôle
    }
    // Un visiteur qui demande à ne pas être suivi n'est pas compté, même si le script l'a oublié.
    if (($_SERVER['HTTP_DNT'] ?? '') === '1' || ($_SERVER['HTTP_SEC_GPC'] ?? '') === '1') {
        return;
    }
    $site = stat_site();
    $origine = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origine !== '') {                                   // une requête venue d'un autre site n'est pas la nôtre
        $h = parse_url($origine, PHP_URL_HOST);
        $h = is_string($h) ? preg_replace('/\Awww\./', '', strtolower($h)) : '';
        if ($h !== $site) {
            return;
        }
    }
    $pv = (string) ($d['pv'] ?? '');
    if (!preg_match('/\A[0-9a-f]{12}\z/', $pv)) {
        return;
    }

    $jour = gmdate('Y-m-d');
    $maintenant = time();
    $le = heure();
    $sel = stat_sel($db, $jour);
    $visiteur = stat_empreinte(ip_client(), $ua, (string) $sel);
    $action = (string) ($d['a'] ?? '');

    if ($action === 'vue') {
        $q = $db->prepare('SELECT COUNT(*) FROM stat_vues WHERE jour = ? AND visiteur = ?');
        $q->execute([$jour, $visiteur]);
        if ((int) $q->fetchColumn() >= STAT_MAX_VUES_JOUR) {
            return;
        }
        [$cat, $siteOrigine] = stat_origine((string) ($d['r'] ?? ''), stat_source((string) ($d['s'] ?? '')), $site);
        $langue = strtolower(substr((string) ($d['l'] ?? ''), 0, 2));
        $db->prepare(
            'INSERT IGNORE INTO stat_vues
               (pv, le, jour, visiteur, visite, page, ancre, appareil, navigateur, systeme, origine, origine_site, largeur, langue)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $pv, $le, $jour, $visiteur, stat_visite($db, $jour, $visiteur, $maintenant),
            stat_page((string) ($d['p'] ?? '')), stat_ancre((string) ($d['h'] ?? '')),
            $agent['appareil'], $agent['navigateur'], $agent['systeme'],
            $cat, $siteOrigine, stat_borner($d['w'] ?? null, 0, 10000),
            preg_match('/\A[a-z]{2}\z/', $langue) ? $langue : null,
        ]);
        if (random_int(1, 250) === 1) {
            stat_menage($db);
        }
        return;
    }

    if ($action === 'fin') {
        // Seul le navigateur qui a ouvert la page peut en compléter la ligne : on recalcule son empreinte
        // avec le sel du jour de la page et on la compare à celle qui y est enregistrée.
        $q = $db->prepare('SELECT jour, visiteur FROM stat_vues WHERE pv = ?');
        $q->execute([$pv]);
        $ligne = $q->fetch();
        if (!$ligne) {
            return;
        }
        $selPage = stat_sel($db, (string) $ligne['jour'], false);
        if ($selPage === null || !hash_equals((string) $ligne['visiteur'], stat_empreinte(ip_client(), $ua, $selPage))) {
            return;
        }
        $db->prepare(
            'UPDATE stat_vues
                SET duree_s = GREATEST(COALESCE(duree_s, 0), ?),
                    defilement = GREATEST(COALESCE(defilement, 0), ?),
                    chargement_ms = COALESCE(chargement_ms, ?)
              WHERE pv = ?'
        )->execute([
            stat_borner($d['d'] ?? null, 0, 3600) ?? 0,
            stat_borner($d['x'] ?? null, 0, 100) ?? 0,
            stat_borner($d['c'] ?? null, 1, 60000),
            $pv,
        ]);
        return;
    }

    if ($action === 'evt') {
        $categorie = (string) ($d['k'] ?? '');
        if (!in_array($categorie, STAT_CATEGORIES_NAVIGATEUR, true)) {
            return;
        }
        $nom = stat_nettoyer((string) ($d['n'] ?? ''), $categorie === 'recherche' ? 60 : 120, $categorie === 'recherche', $categorie === 'recherche');
        if ($nom === '' || $nom === '#') {
            return;
        }
        $q = $db->prepare('SELECT COUNT(*) FROM stat_evenements WHERE jour = ? AND visiteur = ?');
        $q->execute([$jour, $visiteur]);
        if ((int) $q->fetchColumn() >= STAT_MAX_EVT_JOUR) {
            return;
        }
        // Le même geste répété dans la même seconde (double clic) ne compte qu'une fois.
        $q = $db->prepare('SELECT 1 FROM stat_evenements WHERE jour = ? AND visiteur = ? AND categorie = ? AND nom = ? AND le >= ? LIMIT 1');
        $q->execute([$jour, $visiteur, $categorie, $nom, heure(-4)]);
        if ($q->fetchColumn()) {
            return;
        }
        // L'étiquette dit en clair de quoi il s'agit (le titre de la rubrique ou de l'actualité, le texte du lien).
        $etiquette = stat_nettoyer((string) ($d['e'] ?? ''), 80);
        $db->prepare('INSERT INTO stat_evenements (le, jour, visiteur, page, categorie, nom, etiquette, valeur) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
           ->execute([$le, $jour, $visiteur, stat_page((string) ($d['p'] ?? '')), $categorie, $nom,
                      $etiquette !== '' && $etiquette !== '#' ? $etiquette : null, stat_borner($d['v'] ?? null, 0, 100000)]);
    }
}

/**
 * Un geste noté par le SERVEUR (aucun navigateur ne peut l'annoncer) : une connexion à l'Espace
 * Enseignant réussie. Aucune identité : seulement « une connexion de plus, depuis un appareil ».
 * Ne doit JAMAIS gêner l'opération qui l'appelle : l'appelant enveloppe l'appel dans un try.
 */
function stat_noter_evenement(PDO $db, string $categorie, string $nom): void
{
    $jour = gmdate('Y-m-d');
    $visiteur = stat_empreinte(ip_client(), (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), (string) stat_sel($db, $jour));
    $db->prepare('INSERT INTO stat_evenements (le, jour, visiteur, page, categorie, nom, etiquette, valeur) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)')
       ->execute([heure(), $jour, $visiteur, 'espace-enseignant', $categorie, $nom]);
}

/** Ménage : rien ne s'accumule. Les données de plus de 25 mois et les essais de clé de plus de 30 jours partent. */
function stat_menage(PDO $db): void
{
    $limite = gmdate('Y-m-d', time() - STAT_CONSERVATION_JOURS * 86400);
    $db->prepare('DELETE FROM stat_vues WHERE jour < ?')->execute([$limite]);
    $db->prepare('DELETE FROM stat_evenements WHERE jour < ?')->execute([$limite]);
    $db->prepare('DELETE FROM stat_tentatives WHERE le < ?')->execute([heure(-30 * 86400)]);
}

// ----------------------------------------------------------- accès administrateur
/** Clé saisie : majuscules, sans espace ni tiret (« abcd-efgh… », « ABCD EFGH… » sont la même). */
function stat_normaliser_cle(string $saisie): string
{
    return strtoupper(preg_replace('/[\s\-]+/u', '', $saisie) ?? '');
}

function stat_cle_empreinte(string $cleNormalisee): string
{
    return hash_pbkdf2('sha256', $cleNormalisee, STAT_SEL_ACCES, STAT_ITERATIONS_ACCES, 64);
}

function stat_parametre(PDO $db, string $cle): ?string
{
    $q = $db->prepare('SELECT valeur FROM parametres WHERE cle = ?');
    $q->execute([$cle]);
    $v = $q->fetchColumn();
    return is_string($v) && $v !== '' ? $v : null;
}

/** Jeton d'administration : « v1.<expiration>.<signature> ». Sans mémoire côté serveur : la signature suffit. */
function stat_jeton_creer(PDO $db, int $duree): string
{
    $secret = stat_parametre($db, 'stat_secret');
    if ($secret === null) {
        refuser(503, "La mesure d'audience n'est pas encore installée sur le serveur.");
    }
    $exp = time() + $duree;
    return 'v1.' . $exp . '.' . hash_hmac('sha256', 'v1|stat|' . $exp, $secret);
}

/** Vérifie le jeton de l'en-tête X-Jeton-Stat ; sinon réponse 401. */
function stat_admin_exiger(PDO $db): void
{
    $jeton = (string) ($_SERVER['HTTP_X_JETON_STAT'] ?? '');
    if (!preg_match('/\Av1\.(\d{9,11})\.([0-9a-f]{64})\z/', $jeton, $m)) {
        refuser(401, 'Session expirée. Reconnectez-vous.');
    }
    $secret = stat_parametre($db, 'stat_secret');
    if ($secret === null || (int) $m[1] < time()
        || !hash_equals(hash_hmac('sha256', 'v1|stat|' . $m[1], $secret), $m[2])) {
        refuser(401, 'Session expirée. Reconnectez-vous.');
    }
}

/** Les échecs de connexion se comptent par empreinte de l'adresse (jamais l'adresse elle-même). */
function stat_empreinte_acces(PDO $db): string
{
    return stat_empreinte(ip_client(), 'acces', (string) stat_sel($db, gmdate('Y-m-d')));
}

function stat_bloque(PDO $db, string $empreinte): int
{
    $q = $db->prepare('SELECT le FROM stat_tentatives WHERE empreinte = ? AND reussie = 0 AND le >= ? ORDER BY le DESC LIMIT ?');
    $q->bindValue(1, $empreinte);
    $q->bindValue(2, heure(-STAT_FENETRE_ECHECS));
    $q->bindValue(3, STAT_ECHECS_PAR_EMPREINTE, PDO::PARAM_INT);
    $q->execute();
    $echecs = $q->fetchAll(PDO::FETCH_COLUMN);
    if (count($echecs) >= STAT_ECHECS_PAR_EMPREINTE) {
        return max(1, strtotime($echecs[STAT_ECHECS_PAR_EMPREINTE - 1] . ' UTC') + STAT_FENETRE_ECHECS - time());
    }
    return 0;
}

function stat_noter_tentative(PDO $db, string $empreinte, bool $reussie): void
{
    $db->prepare('INSERT INTO stat_tentatives (empreinte, reussie, le) VALUES (?, ?, ?)')->execute([$empreinte, $reussie ? 1 : 0, heure()]);
}

// ------------------------------------------------------------- période
/** Lit « du » et « au » (AAAA-MM-JJ) ; défaut : les 30 derniers jours, aujourd'hui compris. Sinon réponse 400. */
function stat_periode(): array
{
    $au = (string) ($_GET['au'] ?? gmdate('Y-m-d'));
    $du = (string) ($_GET['du'] ?? gmdate('Y-m-d', time() - 29 * 86400));
    foreach ([$du, $au] as $date) {
        $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $date, new DateTimeZone('UTC'));
        if (!$dt || $dt->format('Y-m-d') !== $date) {
            refuser(400, 'Période invalide.');
        }
    }
    if ($du > $au) {
        [$du, $au] = [$au, $du];
    }
    $jours = (int) (new DateTimeImmutable($du, new DateTimeZone('UTC')))->diff(new DateTimeImmutable($au, new DateTimeZone('UTC')))->days + 1;
    if ($jours > STAT_PERIODE_MAX_JOURS) {
        refuser(400, 'Période trop longue (' . STAT_PERIODE_MAX_JOURS . ' jours au plus).');
    }
    return [$du, $au, $jours];
}

// ------------------------------------------------------------- calculs
function stat_lignes(PDO $db, string $sql, array $params = []): array
{
    $q = $db->prepare($sql);
    $q->execute($params);
    return $q->fetchAll();
}

function stat_un(PDO $db, string $sql, array $params = [])
{
    $q = $db->prepare($sql);
    $q->execute($params);
    return $q->fetchColumn();
}

/** Les chiffres clés d'une période. */
function stat_kpi(PDO $db, string $du, string $au): array
{
    $p = [$du, $au];
    $vues = (int) stat_un($db, 'SELECT COUNT(*) FROM stat_vues WHERE jour BETWEEN ? AND ?', $p);
    $visites = (int) stat_un($db, 'SELECT COUNT(DISTINCT visite) FROM stat_vues WHERE jour BETWEEN ? AND ?', $p);
    $visiteurs = (int) stat_un($db, 'SELECT COUNT(*) FROM (SELECT 1 FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY jour, visiteur) t', $p);
    $rebonds = (int) stat_un($db, 'SELECT COUNT(*) FROM (SELECT visite FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY visite HAVING COUNT(*) = 1) t', $p);
    $duree = stat_un($db, 'SELECT AVG(s) FROM (SELECT SUM(duree_s) AS s FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY visite HAVING COUNT(duree_s) > 0) t', $p);
    $evenements = (int) stat_un($db, 'SELECT COUNT(*) FROM stat_evenements WHERE jour BETWEEN ? AND ?', $p);
    return [
        'vues'             => $vues,
        'visites'          => $visites,
        'visiteurs'        => $visiteurs,
        'rebonds'          => $rebonds,
        'tauxRebond'       => $visites > 0 ? round($rebonds / $visites * 100, 1) : null,
        'pagesParVisite'   => $visites > 0 ? round($vues / $visites, 2) : null,
        'dureeVisiteS'     => $duree !== null && $duree !== false ? (int) round((float) $duree) : null,
        'gestes'           => $evenements,
    ];
}

/** Une colonne de la ligne d'ENTRÉE de chaque visite, comptée : l'appareil, le navigateur, la provenance… */
function stat_repartition(PDO $db, string $colonne, string $du, string $au, int $limite = 12): array
{
    if (!in_array($colonne, ['appareil', 'navigateur', 'systeme', 'langue', 'origine', 'origine_site'], true)) {
        throw new InvalidArgumentException('colonne inconnue');
    }
    $sql = "SELECT v.$colonne AS k, COUNT(*) AS n
              FROM stat_vues v
              JOIN (SELECT MIN(id) AS mid FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY visite) e ON e.mid = v.id
             WHERE v.$colonne IS NOT NULL AND v.$colonne <> ''
             GROUP BY v.$colonne ORDER BY n DESC LIMIT " . (int) $limite;
    return array_map(fn($l) => ['k' => (string) $l['k'], 'n' => (int) $l['n']], stat_lignes($db, $sql, [$du, $au]));
}

function stat_centile(array $valeurs, float $p): ?int
{
    if ($valeurs === []) {
        return null;
    }
    sort($valeurs);
    $i = (int) floor(($p / 100) * (count($valeurs) - 1));
    return (int) $valeurs[$i];
}

/**
 * Tout ce que montre le tableau de bord pour une période, plus la période précédente de même
 * durée (pour les comparaisons) et les constats / pistes d'amélioration (voir _stat-analyse.php).
 */
function stat_resume(PDO $db, string $du, string $au): array
{
    $utc = new DateTimeZone('UTC');
    $debut = new DateTimeImmutable($du, $utc);
    $fin = new DateTimeImmutable($au, $utc);
    $nbJours = (int) $debut->diff($fin)->days + 1;
    $precAu = $debut->modify('-1 day');
    $precDu = $precAu->modify('-' . ($nbJours - 1) . ' days');
    $p = [$du, $au];

    $kpi = stat_kpi($db, $du, $au);
    $precedent = stat_kpi($db, $precDu->format('Y-m-d'), $precAu->format('Y-m-d'));

    // --- l'évolution jour par jour (les jours sans visite comptent zéro)
    $parJour = [];
    foreach (stat_lignes($db, 'SELECT jour, COUNT(*) AS vues, COUNT(DISTINCT visite) AS visites, COUNT(DISTINCT visiteur) AS visiteurs
                                 FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY jour', $p) as $l) {
        $parJour[(string) $l['jour']] = $l;
    }
    $jours = [];
    for ($d = $debut; $d <= $fin; $d = $d->modify('+1 day')) {
        $c = $d->format('Y-m-d');
        $l = $parJour[$c] ?? null;
        $jours[] = [
            'jour' => $c,
            'vues' => $l ? (int) $l['vues'] : 0,
            'visites' => $l ? (int) $l['visites'] : 0,
            'visiteurs' => $l ? (int) $l['visiteurs'] : 0,
        ];
    }

    // --- les pages : vues, lecture, entrées, sorties
    $pages = [];
    foreach (stat_lignes($db, 'SELECT page, COUNT(*) AS vues, COUNT(DISTINCT CONCAT(jour, visiteur)) AS visiteurs,
                                      AVG(duree_s) AS duree, COUNT(duree_s) AS mesures, AVG(defilement) AS defilement
                                 FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY page ORDER BY vues DESC', $p) as $l) {
        $pages[(string) $l['page']] = [
            'page' => (string) $l['page'],
            'nom' => STAT_PAGES[$l['page']] ?? 'Autres adresses',
            'vues' => (int) $l['vues'],
            'visiteurs' => (int) $l['visiteurs'],
            'dureeS' => $l['duree'] !== null ? (int) round((float) $l['duree']) : null,
            'mesures' => (int) $l['mesures'],
            'defilement' => $l['defilement'] !== null ? (int) round((float) $l['defilement']) : null,
            'entrees' => 0, 'rebonds' => 0, 'sorties' => 0,
        ];
    }
    foreach (stat_lignes($db, 'SELECT v.page, COUNT(*) AS entrees, SUM(c.n = 1) AS rebonds
                                 FROM stat_vues v
                                 JOIN (SELECT MIN(id) AS mid, COUNT(*) AS n FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY visite) c ON c.mid = v.id
                                GROUP BY v.page', $p) as $l) {
        if (isset($pages[$l['page']])) {
            $pages[$l['page']]['entrees'] = (int) $l['entrees'];
            $pages[$l['page']]['rebonds'] = (int) $l['rebonds'];
        }
    }
    foreach (stat_lignes($db, 'SELECT v.page, COUNT(*) AS sorties
                                 FROM stat_vues v
                                 JOIN (SELECT MAX(id) AS mid FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY visite) c ON c.mid = v.id
                                GROUP BY v.page', $p) as $l) {
        if (isset($pages[$l['page']])) {
            $pages[$l['page']]['sorties'] = (int) $l['sorties'];
        }
    }
    $precPages = [];
    foreach (stat_lignes($db, 'SELECT page, COUNT(*) AS vues FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY page', [$precDu->format('Y-m-d'), $precAu->format('Y-m-d')]) as $l) {
        $precPages[(string) $l['page']] = (int) $l['vues'];
    }
    foreach ($pages as $cle => $page) {
        $pages[$cle]['vuesPrecedentes'] = $precPages[$cle] ?? 0;
    }

    // --- les pages d'arrivée avec ancre (« scolarite#emploi-du-temps » : un lien partagé ou un raccourci)
    $ancres = array_map(fn($l) => ['page' => (string) $l['page'], 'ancre' => (string) $l['ancre'], 'n' => (int) $l['n']],
        stat_lignes($db, 'SELECT page, ancre, COUNT(*) AS n FROM stat_vues WHERE ancre IS NOT NULL AND jour BETWEEN ? AND ?
                           GROUP BY page, ancre ORDER BY n DESC LIMIT 15', $p));

    // --- quand : heure de la journée, jour de la semaine
    $heures = array_fill(0, 24, 0);
    foreach (stat_lignes($db, 'SELECT HOUR(le) AS h, COUNT(*) AS n FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY h', $p) as $l) {
        $heures[(int) $l['h']] = (int) $l['n'];
    }
    $semaine = array_fill(0, 7, 0);                         // 0 = lundi … 6 = dimanche
    foreach (stat_lignes($db, 'SELECT WEEKDAY(jour) AS j, COUNT(*) AS n FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY j', $p) as $l) {
        $semaine[(int) $l['j']] = (int) $l['n'];
    }

    // --- qui : appareils, navigateurs, systèmes, langues, provenance (ligne d'entrée de chaque visite)
    $origines = array_map(function ($l) {
        return $l;
    }, stat_lignes($db, "SELECT v.origine AS k, COUNT(*) AS n
                           FROM stat_vues v
                           JOIN (SELECT MIN(id) AS mid FROM stat_vues WHERE jour BETWEEN ? AND ? GROUP BY visite) e ON e.mid = v.id
                          GROUP BY v.origine ORDER BY n DESC", $p));
    $origines = array_map(fn($l) => ['k' => (string) $l['k'], 'n' => (int) $l['n']], $origines);

    // --- vitesse de chargement, par appareil
    $charg = ['mobile' => [], 'tablette' => [], 'ordinateur' => []];
    foreach (stat_lignes($db, 'SELECT appareil, chargement_ms FROM stat_vues WHERE jour BETWEEN ? AND ? AND chargement_ms IS NOT NULL LIMIT 30000', $p) as $l) {
        if (isset($charg[$l['appareil']])) {
            $charg[$l['appareil']][] = (int) $l['chargement_ms'];
        }
    }
    $chargement = [];
    foreach ($charg as $appareil => $valeurs) {
        $chargement[$appareil] = ['mesures' => count($valeurs), 'mediane' => stat_centile($valeurs, 50), 'p75' => stat_centile($valeurs, 75)];
    }

    // --- les gestes : ce que les visiteurs cherchent, ouvrent, appellent
    $gestes = [];
    foreach (stat_lignes($db, 'SELECT categorie, nom, MAX(etiquette) AS etiquette, COUNT(*) AS n, COUNT(DISTINCT CONCAT(jour, visiteur)) AS visiteurs,
                                      AVG(valeur) AS valeur_moy, SUM(valeur = 0) AS sans_resultat
                                 FROM stat_evenements WHERE jour BETWEEN ? AND ? GROUP BY categorie, nom ORDER BY n DESC', $p) as $l) {
        $c = (string) $l['categorie'];
        $gestes[$c]['total'] = ($gestes[$c]['total'] ?? 0) + (int) $l['n'];
        if (count($gestes[$c]['liste'] ?? []) < 20) {
            $gestes[$c]['liste'][] = [
                'nom' => (string) $l['nom'],
                'etiquette' => $l['etiquette'] !== null ? (string) $l['etiquette'] : null,
                'n' => (int) $l['n'],
                'visiteurs' => (int) $l['visiteurs'],
                'valeurMoy' => $l['valeur_moy'] !== null ? round((float) $l['valeur_moy'], 1) : null,
                'sansResultat' => (int) $l['sans_resultat'],
            ];
        }
    }
    // les connexions des enseignants, jour par jour
    $enseignants = array_map(fn($l) => ['jour' => (string) $l['jour'], 'connexions' => (int) $l['n'], 'appareils' => (int) $l['a']],
        stat_lignes($db, "SELECT jour, COUNT(*) AS n, COUNT(DISTINCT visiteur) AS a FROM stat_evenements
                           WHERE categorie = 'connexion_enseignant' AND jour BETWEEN ? AND ? GROUP BY jour ORDER BY jour", $p));

    $total = stat_lignes($db, 'SELECT MIN(jour) AS debut, MAX(jour) AS dernier, COUNT(*) AS n FROM stat_vues');

    $resume = [
        'periode' => ['du' => $du, 'au' => $au, 'jours' => $nbJours],
        'precedente' => ['du' => $precDu->format('Y-m-d'), 'au' => $precAu->format('Y-m-d')],
        'kpi' => $kpi,
        'precedent' => $precedent,
        'jours' => $jours,
        'pages' => array_values($pages),
        'ancres' => $ancres,
        'heures' => $heures,
        'semaine' => $semaine,
        'appareils' => stat_repartition($db, 'appareil', $du, $au),
        'navigateurs' => stat_repartition($db, 'navigateur', $du, $au),
        'systemes' => stat_repartition($db, 'systeme', $du, $au),
        'langues' => stat_repartition($db, 'langue', $du, $au, 6),
        'origines' => $origines,
        'sitesOrigine' => array_map(fn($l) => ['k' => $l['k'], 'n' => $l['n']],
            array_filter(stat_repartition($db, 'origine_site', $du, $au, 10), fn($l) => $l['k'] !== '')),
        'chargement' => $chargement,
        'gestes' => $gestes,
        'enseignants' => $enseignants,
        'mesureDepuis' => $total[0]['debut'] ?? null,
        'derniereMesure' => $total[0]['dernier'] ?? null,
        'vuesEnregistrees' => (int) ($total[0]['n'] ?? 0),
        'genereLe' => gmdate('Y-m-d H:i') . ' UTC',
    ];
    require_once __DIR__ . '/_stat-analyse.php';
    $resume += stat_analyser($resume);
    return $resume;
}
