<?php
/**
 * Kontaktformular AINO Haustechnik GmbH
 *
 * Nimmt das Formular von index.html entgegen, prueft die Eingaben und schickt
 * eine E-Mail an die Firma. Es wird nichts in einer Datenbank gespeichert.
 *
 * Wichtig zum Absender: Die Domain ainohaustechnik.ch hat SPF/DMARC nur fuer
 * Hostpoint. Eine Mail "von" info@ainohaustechnik.ch, die dieser Server
 * verschickt, wuerde im Spam landen. Darum ist der technische Absender eine
 * Adresse dieses Servers; die Antwort-Adresse (Reply-To) ist die des Besuchers.
 */
declare(strict_types=1);

const TO_ADDRESS   = 'info@ainohaustechnik.ch';
const FROM_ADDRESS = 'noreply@357.hostserv.eu';
const FROM_NAME    = 'AINO Webseite';
const SITE_URL     = 'https://ainohaustechnik.ch/';
const MAX_PER_HOUR = 5;          // Anfragen pro IP und Stunde
const MIN_SECONDS  = 3;          // schneller als das ist kein Mensch

const ANLIEGEN = [
    'Reparatur / Service',
    'Bad- / Küchenumbau',
    'Sanitär-Neuinstallation',
    'Boiler / Warmwasser',
    'Heizung / Kälte',
    'Sonstiges',
];

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$wantsJson = isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json');

function respond(bool $ok, string $message, int $status, bool $json): never
{
    if ($json) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . SITE_URL . '?' . ($ok ? 'gesendet=1' : 'fehler=1') . '#kontakt', true, 303);
    }
    exit;
}

/** Zeilenumbrueche und Steuerzeichen raus (Schutz vor Header-Injection). */
function oneLine(string $v): string
{
    return trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v) ?? '');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Nur POST erlaubt.', 405, $wantsJson);
}

// Nur Anfragen von der eigenen Seite
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !preg_match('#^https://(www\.)?ainohaustechnik\.ch$#', $origin)) {
    respond(false, 'Anfrage nicht erlaubt.', 403, $wantsJson);
}

// Honeypot: Menschen sehen dieses Feld nicht. Bots fuellen es aus.
if (trim((string)($_POST['website'] ?? '')) !== '') {
    respond(true, 'Danke!', 200, $wantsJson);          // stillschweigend verwerfen
}

// Zeitpruefung (nur wenn das Skript der Seite den Zeitstempel gesetzt hat)
$ts = (int)($_POST['ts'] ?? 0);
if ($ts > 0 && (time() - intdiv($ts, 1000)) < MIN_SECONDS) {
    respond(true, 'Danke!', 200, $wantsJson);
}

// Eingaben lesen und pruefen
$name     = oneLine((string)($_POST['name'] ?? ''));
$email    = oneLine((string)($_POST['email'] ?? ''));
$telefon  = oneLine((string)($_POST['telefon'] ?? ''));
$anliegen = oneLine((string)($_POST['anliegen'] ?? ''));
$nachricht = trim(str_replace("\r\n", "\n", (string)($_POST['nachricht'] ?? '')));

$errors = [];
if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
    $errors[] = 'Bitte geben Sie Ihren Namen an.';
}
if ($email === '' || mb_strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
}
if (mb_strlen($telefon) > 40) {
    $errors[] = 'Die Telefonnummer ist zu lang.';
}
if (!in_array($anliegen, ANLIEGEN, true)) {
    $anliegen = 'Sonstiges';
}
if (mb_strlen($nachricht) < 5 || mb_strlen($nachricht) > 5000) {
    $errors[] = 'Bitte schreiben Sie eine Nachricht (mindestens 5 Zeichen).';
}
if ($errors) {
    respond(false, implode(' ', $errors), 422, $wantsJson);
}

// Einfache Begrenzung pro IP (nur ein Hash, kurz im Temp-Ordner)
$ip   = $_SERVER['REMOTE_ADDR'] ?? 'unbekannt';
$file = sys_get_temp_dir() . '/aino_rl_' . hash('sha256', $ip . '|aino') . '.json';
$now  = time();
$hits = [];
if (is_file($file)) {
    $hits = json_decode((string)@file_get_contents($file), true) ?: [];
    $hits = array_values(array_filter($hits, static fn($t) => is_int($t) && $t > $now - 3600));
}
if (count($hits) >= MAX_PER_HOUR) {
    respond(false, 'Zu viele Anfragen. Bitte versuchen Sie es später noch einmal oder rufen Sie uns an.', 429, $wantsJson);
}

// Mail bauen
$subject = 'Anfrage Webseite: ' . $anliegen . ' (' . $name . ')';
$body = "Neue Anfrage über ainohaustechnik.ch\n"
      . "-----------------------------------\n"
      . "Name:     $name\n"
      . "E-Mail:   $email\n"
      . 'Telefon:  ' . ($telefon !== '' ? $telefon : '-') . "\n"
      . "Anliegen: $anliegen\n"
      . 'Zeit:     ' . date('d.m.Y H:i') . " Uhr\n\n"
      . "Nachricht:\n$nachricht\n\n"
      . "-----------------------------------\n"
      . "Zum Antworten einfach auf diese E-Mail antworten (Antwort geht an $email).\n";

$headers = [
    'From: =?UTF-8?B?' . base64_encode(FROM_NAME) . '?= <' . FROM_ADDRESS . '>',
    'Reply-To: =?UTF-8?B?' . base64_encode($name) . '?= <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: ainohaustechnik.ch',
];

$sent = mail(
    TO_ADDRESS,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    implode("\r\n", $headers)
);

if (!$sent) {
    error_log('kontakt.php: mail() fehlgeschlagen');
    respond(false, 'Die Nachricht konnte leider nicht gesendet werden. Bitte rufen Sie uns an: 079 407 67 81.', 500, $wantsJson);
}

$hits[] = $now;
@file_put_contents($file, json_encode($hits), LOCK_EX);

respond(true, 'Vielen Dank! Ihre Nachricht ist bei uns angekommen. Wir melden uns so schnell wie möglich.', 200, $wantsJson);
