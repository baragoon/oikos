/**
 * Modul: Haushalt-Einstellungen (Preferences)
 * Zweck: REST-API fuer haushaltweite Praeferenzen (via sync_config-Tabelle)
 * Abhängigkeiten: express, server/db.js
 */

import { createLogger } from '../logger.js';
import express from 'express';
import * as db from '../db.js';

const log = createLogger('Preferences');

const router = express.Router();

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const DEFAULT_MEAL_TYPES = VALID_MEAL_TYPES.join(',');

const VALID_CURRENCIES = ['EUR', 'USD', 'GBP', 'SEK', 'NOK', 'DKK', 'CHF', 'CNY', 'PLN', 'CZK', 'HUF', 'JPY', 'AUD', 'CAD', 'TRY', 'RUB', 'UAH'];
const DEFAULT_CURRENCY = 'EUR';

const VALID_WIDGET_IDS = ['weather', 'tasks', 'calendar', 'shopping', 'meals', 'notes'];
const DEFAULT_WIDGET_CONFIG = JSON.stringify(VALID_WIDGET_IDS.map((id) => ({ id, visible: true })));

// --------------------------------------------------------
// Hilfsfunktionen
// --------------------------------------------------------

function cfgGet(key) {
  const row = db.get().prepare('SELECT value FROM sync_config WHERE key = ?').get(key);
  return row ? row.value : null;
}

function cfgSet(key, value) {
  db.get().prepare(`
    INSERT INTO sync_config (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                   updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  `).run(key, value);
}

// --------------------------------------------------------
// Widget-Hilfsfunktionen
// --------------------------------------------------------

function parseWidgetConfig(raw) {
  try {
    const parsed = JSON.parse(raw ?? DEFAULT_WIDGET_CONFIG);
    return normalizeWidgetConfig(parsed);
  } catch {
    return JSON.parse(DEFAULT_WIDGET_CONFIG);
  }
}

function normalizeWidgetConfig(input) {
  const valid = Array.isArray(input)
    ? input
      .filter((w) => w && typeof w === 'object' && VALID_WIDGET_IDS.includes(w.id))
      .map((w) => ({ id: w.id, visible: Boolean(w.visible) }))
    : [];

  // Fehlende Widget-IDs am Ende ergänzen
  const presentIds = new Set(valid.map((w) => w.id));
  for (const id of VALID_WIDGET_IDS) {
    if (!presentIds.has(id)) valid.push({ id, visible: true });
  }
  return valid;
}

// --------------------------------------------------------
// GET /api/v1/preferences
// Alle Haushalt-Praeferenzen lesen.
// Response: { data: { visible_meal_types: string[] } }
// --------------------------------------------------------

router.get('/', (req, res) => {
  try {
    const raw = cfgGet('visible_meal_types') ?? DEFAULT_MEAL_TYPES;
    const visibleMealTypes = raw.split(',').filter((t) => VALID_MEAL_TYPES.includes(t));
    const currency = cfgGet('currency') ?? DEFAULT_CURRENCY;
    const dashboardWidgets = parseWidgetConfig(cfgGet('dashboard_widgets'));

    res.json({
      data: {
        visible_meal_types: visibleMealTypes,
        currency,
        dashboard_widgets: dashboardWidgets,
      },
    });
  } catch (err) {
    log.error('GET /', err);
    res.status(500).json({ error: 'Interner Fehler', code: 500 });
  }
});

// --------------------------------------------------------
// PUT /api/v1/preferences
// Haushalt-Praeferenzen aktualisieren.
// Body: { visible_meal_types: string[] }
// Response: { data: { visible_meal_types: string[] } }
// --------------------------------------------------------

router.put('/', (req, res) => {
  try {
    const { visible_meal_types, currency, dashboard_widgets } = req.body;

    if (visible_meal_types !== undefined) {
      if (!Array.isArray(visible_meal_types)) {
        return res.status(400).json({ error: 'visible_meal_types muss ein Array sein', code: 400 });
      }
      const filtered = visible_meal_types.filter((t) => VALID_MEAL_TYPES.includes(t));
      if (filtered.length === 0) {
        return res.status(400).json({ error: 'Mindestens ein Mahlzeit-Typ muss aktiv sein', code: 400 });
      }
      cfgSet('visible_meal_types', filtered.join(','));
    }

    if (currency !== undefined) {
      if (!VALID_CURRENCIES.includes(currency)) {
        return res.status(400).json({ error: `Ungültige Währung. Erlaubt: ${VALID_CURRENCIES.join(', ')}`, code: 400 });
      }
      cfgSet('currency', currency);
    }

    if (dashboard_widgets !== undefined) {
      if (!Array.isArray(dashboard_widgets)) {
        return res.status(400).json({ error: 'dashboard_widgets muss ein Array sein', code: 400 });
      }
      const normalized = normalizeWidgetConfig(dashboard_widgets);
      cfgSet('dashboard_widgets', JSON.stringify(normalized));
    }

    const rawMealTypes = cfgGet('visible_meal_types') ?? DEFAULT_MEAL_TYPES;
    const savedMealTypes = rawMealTypes.split(',').filter((t) => VALID_MEAL_TYPES.includes(t));
    const savedCurrency = cfgGet('currency') ?? DEFAULT_CURRENCY;
    const savedWidgets = parseWidgetConfig(cfgGet('dashboard_widgets'));

    res.json({
      data: {
        visible_meal_types: savedMealTypes,
        currency: savedCurrency,
        dashboard_widgets: savedWidgets,
      },
    });
  } catch (err) {
    log.error('PUT /', err);
    res.status(500).json({ error: 'Interner Fehler', code: 500 });
  }
});

export default router;
