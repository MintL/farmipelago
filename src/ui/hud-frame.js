import { hudFrameContour, insetHudContour, hudContourPath, hudFrameBevel, hudSpeechTail } from './hud-frame-geometry.js';

export const HUD_FRAME_OUTSET = 8;
export const HUD_DIALOG_OUTSET = 14;
const SVG_NS = 'http://www.w3.org/2000/svg';
const frames = new WeakMap();
let nextFrameId = 0;
let resizeObserver;

function leafCluster(parent) {
  const group = document.createElementNS(SVG_NS, 'g');
  group.innerHTML = `<path class="hudLeafStem" d="M0 7Q4 0 2-9"/>
    <path class="hudLeafDark" d="M1 4C-8 4-10-2-8-6C-1-7 4-2 1 4Z"/>
    <path class="hudLeafLight" d="M1 4C-5 1-6-2-8-6C-1-7 4-2 1 4Z"/>
    <path class="hudLeafDark" d="M3 0C-3-6-1-13 3-15C9-11 9-4 3 0Z"/>
    <path class="hudLeafLight" d="M3 0V-15C9-11 9-4 3 0Z"/>
    <path class="hudLeafDark" d="M2 6C4-3 10-5 14-2C14 5 9 9 2 6Z"/>
    <path class="hudLeafLight" d="M2 6L14-2C14 5 9 9 2 6Z"/>`;
  parent.append(group);
  return group;
}

export function createHudFrame(element, options = {}) {
  let frame = frames.get(element);
  if (frame) {
    // Inventory and toast renderers replace their content; retain the artwork.
    if (frame.svg.parentNode !== element) element.prepend(frame.svg);
    return frame;
  }
  const { shape = 'panel', leaves = '', tab = false, directions = false, studs = false } = options;
  const id = `hud-face-${++nextFrameId}`;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('hudFrame');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2=".35" y2="1">
    <stop class="hudFaceTop"/><stop class="hudFaceBottom" offset="1"/>
    </linearGradient></defs>
    <g class="hudFrameArt">
      <g class="hudFrameLeaves"></g>
      <path class="hudFrameDepth" transform="translate(0 3)"/>
      <g class="hudFrameFace">
        <path class="hudFrameOutline"/>
        <path class="hudFrameSurface" fill="url(#${id})"/>
        <path class="hudFrameLight"/><path class="hudFrameShade"/>
      </g>
      <g class="hudFrameDetails"></g>
    </g>`;
  const outline = svg.querySelector('.hudFrameOutline');
  const depth = svg.querySelector('.hudFrameDepth');
  const surface = svg.querySelector('.hudFrameSurface');
  const light = svg.querySelector('.hudFrameLight');
  const shade = svg.querySelector('.hudFrameShade');
  const foliage = svg.querySelector('.hudFrameLeaves');
  const clusters = [];
  if (leaves === 'left' || leaves === 'both') clusters.push({ side: 'left', group: leafCluster(foliage) });
  if (leaves === 'right' || leaves === 'both') clusters.push({ side: 'right', group: leafCluster(foliage) });
  const details = svg.querySelector('.hudFrameDetails');
  const tabGroup = tab ? document.createElementNS(SVG_NS, 'g') : null;
  if (tabGroup) {
    tabGroup.classList.add('hudFrameTab');
    tabGroup.innerHTML = `<path class="hudTabDepth" d="M-10-2H10L13 2V5H-13V2Z"/>
      <path class="hudTabFace" d="M-9-4H9L12 0V2H-12V0Z"/>
      <path class="hudTabLight" d="M-9-4H9L10-2H-10Z"/>
      <path class="hudTabNotch" d="M-4-1H4V1H-4Z"/>`;
    details.append(tabGroup);
  }
  const markers = directions ? document.createElementNS(SVG_NS, 'path') : null;
  if (markers) { markers.classList.add('hudStickDirections'); details.append(markers); }
  const pins = studs ? document.createElementNS(SVG_NS, 'path') : null;
  if (pins) { pins.classList.add('hudFramePins'); details.append(pins); }
  let target = null, signature = '';
  element.classList.add('hudFramed');
  element.prepend(svg);

  const render = () => {
    const style = getComputedStyle(element);
    const inset = parseFloat(style.getPropertyValue('--hud-frame-inset')) || 0;
    const width = element.offsetWidth - 2 * inset, height = element.offsetHeight - 2 * inset;
    if (width < 16 || height < 16) return;
    const actualShape = shape === 'responsive' ? (width > height * 1.5 ? 'panel' : 'icon') : shape;
    const tail = hudSpeechTail(width, height, target);
    const key = [width, height, inset, actualShape, tail?.side, tail?.position, tail?.length].join(':');
    if (key === signature) return;
    signature = key;
    const contour = hudFrameContour(width, height, actualShape, tail);
    const inner = insetHudContour(contour, 1.5);
    const path = hudContourPath(contour), bevel = hudFrameBevel(contour, inner);
    svg.style.left = svg.style.top = `${inset}px`;
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    outline.setAttribute('d', path);
    depth.setAttribute('d', path);
    surface.setAttribute('d', hudContourPath(inner));
    light.setAttribute('d', bevel.light);
    shade.setAttribute('d', bevel.shade);
    for (const cluster of clusters) {
      const x = cluster.side === 'left' ? 2 : width - 2;
      cluster.group.setAttribute('transform', `translate(${x} ${height - (actualShape === 'icon' ? 12 : 6)}) scale(${cluster.side === 'left' ? 1 : -1} 1) rotate(-20)`);
    }
    if (tabGroup) tabGroup.setAttribute('transform', `translate(${width / 2} ${height - 1}) scale(${Math.min(1, width / 54)})`);
    if (markers) markers.setAttribute('d', `M${width / 2 - 4} 12l4-5 4 5Z
      M${width / 2 - 4} ${height - 12}l4 5 4-5Z
      M12 ${height / 2 - 4}l-5 4 5 4Z M${width - 12} ${height / 2 - 4}l5 4-5 4Z`);
    if (pins) pins.setAttribute('d', `M4 4h3v3H4Z M${width - 7} 4h3v3h-3Z`);
  };
  frame = { svg, render, setTarget(point) { target = point; render(); } };
  frames.set(element, frame);
  resizeObserver ??= new ResizeObserver(entries => {
    for (const entry of entries) frames.get(entry.target)?.render();
  });
  resizeObserver.observe(element);
  render();
  return frame;
}

export function createGameplayHudFrames() {
  const decorate = (selector, options) => {
    for (const element of document.querySelectorAll(selector)) createHudFrame(element, options);
  };
  decorate('#zoomControls', { tab: true, leaves: 'left' });
  decorate('#buildingToggle', { shape: 'icon', tab: true });
  decorate('#menuToggle, #cycleVehicle', { shape: 'icon', leaves: 'right' });
  decorate('#jump', { shape: 'icon', tab: true, leaves: 'right' });
  decorate('.equipmentAction', { shape: 'responsive', tab: true });
  decorate('#unloadButton, #siloActions button, #palletStock button:not(#palletTrade)', { shape: 'icon' });
  decorate('#inventoryMeter, #seedCropToast, #desktopHints, #palletTrade');
  decorate('#performanceBadge', { studs: true });
  decorate('#siloInventory', { leaves: 'left' });
  decorate('#stickBase', { shape: 'icon', leaves: 'both', directions: true });
  decorate('#stickKnob', { shape: 'icon' });
}

export function hudVisualBounds(element) {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return rect;
  const speech = element.matches('#storehouseCallout, #siloInventory[data-kind="cargo"]');
  const margin = speech ? HUD_DIALOG_OUTSET
    : element.classList.contains('hudFramed') || element.querySelector('.hudFramed') ? HUD_FRAME_OUTSET : 0;
  let bottom = rect.bottom;
  if (element.id === 'siloInventory') for (const action of element.querySelectorAll('#siloActions button, .palletActions button')) {
    if (!action.closest('[hidden]') && action.getClientRects().length) bottom = Math.max(bottom, action.getBoundingClientRect().bottom);
  }
  return { left: rect.left - margin, top: rect.top - margin, right: rect.right + margin,
    bottom: bottom + margin, width: rect.width + margin * 2, height: bottom - rect.top + margin * 2 };
}

export function hudViewport() {
  const top = document.querySelector('#topBar').getBoundingClientRect();
  const actions = document.querySelector('#actionCluster').getBoundingClientRect();
  return { width: innerWidth, height: innerHeight, safe: { left: top.left,
    right: innerWidth - top.right, top: top.top, bottom: actions.height ? innerHeight - actions.bottom : 16 } };
}
