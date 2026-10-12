/* EMS-000: service worker minimo. La aplicacion no ofrece transacciones offline. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Deliberadamente no intercepta fetch: datos autenticados, reservas, pagos,
// contacto y webhooks nunca deben terminar en una cache del service worker.
