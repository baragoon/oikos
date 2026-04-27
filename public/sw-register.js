/**
 * Modul: Service Worker Registrierung
 * Zweck: Ausgelagert aus index.html um CSP-Inline-Script-Verletzung zu vermeiden.
 *        Handhabt nahtlose Updates via controllerchange.
 * Abhängigkeiten: keine
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((err) => {
        console.warn('[SW] Registrierung fehlgeschlagen:', err);
      });
  });

  // SW-Update: Auf iOS-PWA fuehrt ein sofortiger Reload bei controllerchange
  // zu Timing-Problemen (leere Seite, verlorene Cookies). Stattdessen nur
  // nachladen wenn die Seite gerade nicht mitten im Initialisieren ist.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    // Kurz warten damit der neue SW vollstaendig aktiviert ist und
    // clients.claim() abgeschlossen hat, bevor die Seite neu laedt.
    // Auf iOS-Standalone verhindert das den "leere Seite"-Bug.
    setTimeout(() => window.location.reload(), 200);
  });

  const refreshSw = () => {
    navigator.serviceWorker.getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {});
  };

  window.addEventListener('focus', refreshSw);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshSw();
  });
}
