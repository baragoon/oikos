/**
 * Modul: HTML Utilities
 * Zweck: XSS-Schutz fuer innerHTML-basiertes Rendering
 * Abhaengigkeiten: keine
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const ESCAPE_RE = /[&<>"']/g;

/**
 * Escapet einen String fuer die sichere Einbettung in HTML.
 * Gibt fuer null/undefined einen Leerstring zurueck.
 *
 * @param {*} str - Beliebiger Wert (wird zu String konvertiert)
 * @returns {string} HTML-sicherer String
 */
export function esc(str) {
  if (str == null) return '';
  return String(str).replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]);
}

/**
 * Normalisiert einen iCalendar LOCATION-String fuer die Anzeige.
 * Entfernt ICS-Backslash-Escapes (RFC 5545 §3.3.11) und fasst
 * mehrzeilige Adressen zu einem einzeiligen String zusammen.
 *
 * @param {string|null|undefined} raw
 * @returns {string}
 */
export function fmtLocation(raw) {
  if (!raw) return '';
  return raw
    .replace(/\\[Nn]/g, '\n')   // \n / \N → newline
    .replace(/\\,/g,  ',')      // \, → ,
    .replace(/\\;/g,  ';')      // \; → ;
    .replace(/\\\\/g, '\\')     // \\ → \
    .replace(/[\n\r;]+/g, ', ') // newlines / semicolons → ", "
    .replace(/\s*,\s*/g, ', ')  // normalize spaces around commas
    .replace(/(?:,\s*){2,}/g, ', ') // collapse double commas
    .replace(/  +/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, ''); // trim leading/trailing commas
}
