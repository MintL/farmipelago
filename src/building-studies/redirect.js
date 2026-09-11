// Preserve links to the two earlier studies while consolidating the viewer.
const hash = location.hash.slice(1);
const target = new URL('./buildings.html', location.href);
target.hash = hash.includes('/') ? hash : `${hash || 'grain-mill'}/low-poly`;
location.replace(target.href);
