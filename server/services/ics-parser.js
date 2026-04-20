/**
 * Modul: ICS-Parser
 * Zweck: Gemeinsamer ICS/iCalendar-Parser für Apple Calendar und ICS-Abonnements.
 *        Enthält RFC-5545-konformes Parsing, Zeitzonenkonvertierung und RRULE-Expansion.
 * Abhängigkeiten: server/services/recurrence.js
 */

import { nextOccurrence } from './recurrence.js';

function unfoldLines(ics) {
  return ics.replace(/\r?\n[ \t]/g, '');
}

function parseICS(ics) {
  const unfolded = unfoldLines(ics);
  const events   = [];
  const vEventRe = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match;
  while ((match = vEventRe.exec(unfolded)) !== null) {
    const block = match[1];
    const get   = (prop) => {
      const re = new RegExp(`^${prop}(?:;[^:]*)?:(.*)$`, 'im');
      const m  = re.exec(block);
      return m ? m[1].trim() : null;
    };
    const uid         = get('UID');
    const summary     = get('SUMMARY') || '(kein Titel)';
    const description = get('DESCRIPTION') || null;
    const location    = get('LOCATION')    || null;
    const rrule       = get('RRULE')       ? `RRULE:${get('RRULE')}` : null;
    const parseDTLine = (prop) => {
      const re = new RegExp(`^${prop}((?:;[^:]*)*):(.*)$`, 'im');
      const m = block.match(re);
      if (!m) return { value: null, tzid: null };
      const params  = m[1];
      const value   = m[2].trim();
      const tzMatch = params.match(/;TZID=([^;:]+)/i);
      return { value, tzid: tzMatch ? tzMatch[1].trim() : null };
    };
    const dtStartLine = parseDTLine('DTSTART');
    const dtEndLine   = parseDTLine('DTEND');
    const dtStartRaw  = dtStartLine.value;
    const dtEndRaw    = dtEndLine.value;
    const allDay  = /^DTSTART;VALUE=DATE:/im.test(block);
    const dtstart = dtStartRaw ? formatICSDate(dtStartRaw, allDay, dtStartLine.tzid) : null;
    let   dtend   = dtEndRaw   ? formatICSDate(dtEndRaw,   allDay, dtEndLine.tzid)   : null;
    if (allDay && dtend) {
      const d = new Date(dtend + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      dtend = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (!dtend && dtstart) {
      const durMatch = /^DURATION(?:;[^:]*)?:(.*)$/im.exec(block);
      if (durMatch) dtend = applyDuration(dtstart, durMatch[1].trim(), allDay);
    }
    if (!uid || !dtstart) continue;
    events.push({ uid, summary, description, location, dtstart, dtend, rrule, allDay });
  }
  return events;
}

function tzLocalToUTC(localStr, tzid) {
  try {
    const fakeUTC = new Date(localStr + 'Z');
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tzid, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
    }).formatToParts(fakeUTC);
    const get = (type) => {
      const part = parts.find(p => p.type === type);
      const v = part ? part.value : '0';
      return v === '24' ? 0 : parseInt(v, 10);
    };
    const tzDisplayedAsUTC = Date.UTC(
      get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')
    );
    const offsetMs = fakeUTC.getTime() - tzDisplayedAsUTC;
    return new Date(fakeUTC.getTime() + offsetMs).toISOString().replace('.000Z', 'Z');
  } catch { return localStr; }
}

function formatICSDate(val, allDay, tzid) {
  if (allDay || /^\d{8}$/.test(val)) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  }
  const y = val.slice(0, 4), mo = val.slice(4, 6), d = val.slice(6, 8);
  const h = val.slice(9, 11), mi = val.slice(11, 13), s = val.slice(13, 15) || '00';
  if (val.endsWith('Z')) return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  if (tzid) return tzLocalToUTC(`${y}-${mo}-${d}T${h}:${mi}:${s}`, tzid);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

function applyDuration(dtstart, dur, allDay) {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(dur);
  if (!m) return null;
  const weeks = parseInt(m[1] || '0', 10), days  = parseInt(m[2] || '0', 10);
  const hours = parseInt(m[3] || '0', 10), mins  = parseInt(m[4] || '0', 10);
  const secs  = parseInt(m[5] || '0', 10);
  const base = new Date(dtstart.includes('T') ? dtstart : dtstart + 'T00:00:00');
  base.setDate(base.getDate() + weeks * 7 + days);
  base.setHours(base.getHours() + hours, base.getMinutes() + mins, base.getSeconds() + secs);
  if (allDay) {
    base.setDate(base.getDate() - 1);
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  }
  return base.toISOString().replace('.000Z', 'Z');
}

function expandRRULE(vevent, windowStart, windowEnd) {
  if (!vevent.rrule) return [];
  const results    = [];
  const startDate  = vevent.dtstart.slice(0, 10);
  const timeSuffix = vevent.allDay ? '' : (vevent.dtstart.slice(10) || '');
  let durationMs = null;
  if (vevent.dtend) {
    const s = new Date(vevent.allDay ? vevent.dtstart + 'T00:00:00Z' : vevent.dtstart);
    const e = new Date(vevent.allDay ? vevent.dtend   + 'T00:00:00Z' : vevent.dtend);
    if (!isNaN(s) && !isNaN(e)) durationMs = e - s;
  }
  let current = startDate, iterations = 0;
  const MAX_ITER = 1500;
  while (current <= windowEnd && iterations < MAX_ITER) {
    iterations++;
    if (current >= windowStart) {
      const occStart = current + timeSuffix;
      let occEnd = null;
      if (durationMs !== null) {
        if (vevent.allDay) {
          const d = new Date(current + 'T00:00:00Z');
          d.setUTCMilliseconds(d.getUTCMilliseconds() + durationMs);
          occEnd = d.toISOString().slice(0, 10);
        } else {
          occEnd = new Date(new Date(occStart).getTime() + durationMs)
            .toISOString().replace('.000Z', 'Z');
        }
      }
      results.push({
        uid: `${vevent.uid}__${current}`, summary: vevent.summary,
        description: vevent.description, location: vevent.location,
        dtstart: occStart, dtend: occEnd, rrule: null, allDay: vevent.allDay,
      });
    }
    const next = nextOccurrence(current, vevent.rrule);
    if (!next || next <= current) break;
    current = next;
  }
  return results;
}

export { unfoldLines, parseICS, formatICSDate, tzLocalToUTC, applyDuration, expandRRULE };
