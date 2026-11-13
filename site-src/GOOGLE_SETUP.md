# CityRoute Google migration

## Current state
The existing OSM-based routing, POI lookup, avoidance, saved walks and settings are retained.
Walking and transit navigation links open Google Maps.
The Google Maps display adapter is implemented but needs a real browser key before activation.
The fallback remains OpenStreetMap when the key is empty or Google authorization fails.
No Firebase project has been selected and no Firebase deployment has occurred.

## Activate the map
Enable Maps JavaScript API in the owner's Google Cloud project and configure billing.
Create a browser API key restricted to Maps JavaScript API and the exact site's HTTP referrers.
Set googleMapsApiKey in dist/map-config.js. This browser key is public by design;
never put a server credential or service-account key in this file.
Authorize the current production hostname and, after creation, the Firebase hostname.
Verify map loading and authorization errors on the actual production domain.

## Firebase Hosting
firebase.json is prepared for the existing static dist directory.
After connecting the owner's Firebase account, select or create the intended project and Hosting site.
Bind that exact site in Firebase configuration before deployment; do not guess a site ID.
Deploy a preview first, test it, then deploy the same assets to production.
Keep the current site available until the new URL and all external integrations are verified.
Saved routes currently live in browser localStorage and do not automatically move to a new origin.

## Verification completed
JavaScript syntax checks; four Node tests using a Google Maps test double for marker lifecycle,
map click/drag callbacks, view synchronization, authorization fallback, navigation parameters,
script references and Firebase static directory.
These do not establish live Google service availability or actual browser performance.

## Live verification still required
Mobile/desktop layout, Google key/domain/billing, geolocation, map point selection,
address search, scenic/direct/loop routes, optional finish, stop selection, route saving,
language/theme, transit links, avoidance error handling, cold-load speed and Firebase hosting.
Budget remains a saved preference; live place prices are not available.
