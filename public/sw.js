// NiceThings' service worker. It does one thing: show the weather notices a
// visitor asked for (lib/push-server.ts) and open the site when one is
// tapped. It keeps no copy of any page: the site always comes from the
// network, exactly as without it.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
    let notice = {};
    try {
        notice = event.data ? event.data.json() : {};
    } catch {
        notice = {};
    }
    if (!notice.title) return;
    event.waitUntil(
        self.registration.showNotification(notice.title, {
            body: notice.body || "",
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            lang: notice.lang || "fr",
            // A newer notice about the same city replaces the one before.
            tag: notice.tag || "nicethings",
            data: { url: notice.url || "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((open) => {
            // A tab of the site already open is brought forward and taken there.
            for (const client of open) {
                if ("focus" in client && new URL(client.url).origin === self.location.origin) {
                    if ("navigate" in client) client.navigate(url);
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});
