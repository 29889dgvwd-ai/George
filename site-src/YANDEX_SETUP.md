# Yandex Maps activation

The map renderer is implemented in dist/yandex-bridge.js but is not activated: no owner-issued browser API key is available.

1. Obtain a key for JavaScript API 2.1 in https://developer.tech.yandex.ru/keys/ and enable the required Yandex service for the account.
2. Restrict the browser key to cityroute-walk-map.gbfksjhxmm.chatgpt.site (and the preview host only for testing).
3. Set yandexApiKey in dist/map-config.js. This is a browser key, not a server secret.
4. Preview and check loading, start/destination selection, draggable markers, place selection, routing, expansion and reset. Then republish.

Until the key is supplied, the existing OpenStreetMap map remains available. Places are from OpenStreetMap/Overpass and routing uses Valhalla; enabling the Yandex renderer does not switch those providers or claim Yandex business-search coverage. No borrowed/demo keys are used.
