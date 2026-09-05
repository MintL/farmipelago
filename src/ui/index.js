import { cropIds, crops } from '../gameplay/catalog/crops.js';
import { FRONT_EQUIPMENT, REAR_EQUIPMENT, equipmentDefinition } from '../gameplay/catalog/equipment.js';
import { dayPhaseLabel, DEFAULT_DAY_PHASE } from '../world/environment/index.js';

const CATEGORIES = [
  { id: 'equipment', key: 'tool', label: 'Equipment', emptyLabel: 'No rear tool', icon: 'plough' },
  { id: 'frontTools', key: 'frontTool', label: 'Front tool', emptyLabel: 'No front tool', icon: 'utility' },
];

const CATALOG = {
  equipment: REAR_EQUIPMENT,
  frontTools: FRONT_EQUIPMENT,
};

const DEFAULT_LOADOUT = { tool: 'plough', frontTool: 'loader' };
const TICKER_STEP_LITRES = 10;
const METER_TICKS_PER_SECOND = 120;
const TRANSFER_TICKS_PER_SECOND = METER_TICKS_PER_SECOND;
const CAMERA_SWIPE_THRESHOLD = 48;

export function createUi({ onRestart, onLoadoutChange, onEquipmentAction, onCycleVehicle, onSiloLoad, onSiloUnload, onBarnFeed, onBarnLoadMilk, onPenRepaint, onBuildingTypeSelected, onConstructionPrimaryAction, onConstructionCancel, onConstructionUndo, onCargoDropOff, onBuildModeChange, onBuildPointerStart, onBuildPointerMove, onBuildPointerEnd, onBuildPointerCancel, onUnlockOverride = () => {}, onClearUnlockOverrides = () => {}, onMilestoneOverride = () => {}, onCameraPresetChange = () => true, onTimeOfDayChange = () => true, onCameraRotateStep = () => true, cameraPresetFov = 38, onMilestoneCelebrationDismissed = () => {}, onPersistentStateChange = () => {}, onLoadoutPreview = () => {}, panSurface }) {
  const input = { x: 0, y: 0, jumpQueued: false };
  const keys = new Set();
  let activeLoadout = { ...DEFAULT_LOADOUT };
  let draftLoadout = { ...activeLoadout };
  let activeVehicle = { id: 'tractor-1', type: 'tractor', name: 'Farm Tractor', icon: 'tractor', slots: ['tool', 'frontTool'] };
  let equipmentEnabled = { front: false, rear: false };
  let unlockedGates = new Set(['crop:wheat']);
  let seedIndex = 0;
  let buildMode = false;
  let cinematicActive = false;
  let screenshotHudHidden = false;
  let selectedBuilding = null;
  let buildHint = '';
  let constructionUiState = null;
  let constructionUiSignature = '';
  let insideBarn = false;
  let overlayState = null;
  let stickPointer = null;
  let stickOrigin = { x: 0, y: 0 };
  let panPointer = null;
  let panLastX = 0;
  let panLastY = 0;
  let panDragX = 0;
  let panDragY = 0;
  let buildPointer = null;
  const cameraGesturePointers = new Map();
  let cameraGestureStart = null;
  let cameraGestureTriggered = false;
  let seedCropToastTimer = null;
  let restoreFocus = null;
  let inventoryHud = null;
  let siloInventory = null;
  let siloCropId = null;
  let milestoneState = null;
  let debugUnlockables = [];
  let debugMilestones = [];
  let debugCameraFov = Number(cameraPresetFov);
  let debugDayPhase = DEFAULT_DAY_PHASE;
  const amountTickers = new Map();

  const topBar = document.querySelector('#topBar');
  const overlay = document.querySelector('#overlay');
  const barnDialog = document.querySelector('#barnDialog');
  const pauseDialog = document.querySelector('#pauseDialog');
  const celebrationDialog = document.querySelector('#celebrationDialog');
  const celebrationEyebrow = document.querySelector('#celebrationEyebrow');
  const celebrationHeading = document.querySelector('#celebrationHeading');
  const celebrationTitle = document.querySelector('#celebrationTitle');
  const celebrationCopy = document.querySelector('#celebrationCopy');
  const celebrationUnlocksLabel = document.querySelector('#celebrationUnlocksLabel');
  const celebrationUnlocks = document.querySelector('#celebrationUnlocks');
  const celebrationContinue = document.querySelector('#celebrationContinue');
  const celebrationContinueLabel = document.querySelector('#celebrationContinueLabel');
  const pauseBody = document.querySelector('#pauseBody');
  const confirmBody = document.querySelector('#confirmBody');
  const pauseTitle = document.querySelector('#pauseTitle');
  const controlsList = document.querySelector('#controlsList');
  const showControls = document.querySelector('#showControls');
  const hideHud = document.querySelector('#hideHud');
  const showDebug = document.querySelector('#showDebug');
  const debugPanel = document.querySelector('#debugPanel');
  const debugTimeSlider = document.querySelector('#debugTimeSlider');
  const debugTimeValue = document.querySelector('#debugTimeValue');
  const debugCameraPresets = [...document.querySelectorAll('.debugCameraPreset')];
  const debugUnlockList = document.querySelector('#debugUnlockList');
  const debugMilestoneList = document.querySelector('#debugMilestoneList');
  const clearUnlockOverrides = document.querySelector('#clearUnlockOverrides');
  const stickZone = document.querySelector('#stickZone');
  const stickBase = document.querySelector('#stickBase');
  const stickKnob = document.querySelector('#stickKnob');
  const actionCluster = document.querySelector('#actionCluster');
  const cycleVehicleButton = document.querySelector('#cycleVehicle');
  const desktopHints = document.querySelector('#desktopHints');
  const secondaryHint = document.querySelector('#secondaryHint');
  const secondaryHintLabel = document.querySelector('#secondaryHintLabel');
  const frontToolToggle = document.querySelector('#frontToolToggle');
  const rearToolToggle = document.querySelector('#rearToolToggle');
  const seedCycleControl = document.querySelector('#seedCycleControl');
  const seedCropToast = document.querySelector('#seedCropToast');
  const unloadButton = document.querySelector('#unloadButton');
  const unloadIconUse = document.querySelector('#unloadIconUse');
  const frontToolState = document.querySelector('#frontToolState');
  const rearToolState = document.querySelector('#rearToolState');
  const inventoryMeter = document.querySelector('#inventoryMeter');
  const siloInventoryElement = document.querySelector('#siloInventory');
  const siloCropIcon = document.querySelector('#siloCropIcon');
  const siloCropIconUse = document.querySelector('#siloCropIconUse');
  const siloCropValue = document.querySelector('#siloCropValue');
  const previousSiloCrop = document.querySelector('#previousSiloCrop');
  const nextSiloCrop = document.querySelector('#nextSiloCrop');
  const siloLoadButton = document.querySelector('#siloLoad');
  const siloUnloadButton = document.querySelector('#siloUnload');
  const siloUnloadIconUse = document.querySelector('#siloUnloadIconUse');
  const milestoneTracker = document.querySelector('#milestoneTracker');
  const milestoneTitle = document.querySelector('#milestoneTitle');
  const milestoneRows = document.querySelector('#milestoneRows');
  const buildingToggle = document.querySelector('#buildingToggle');
  const buildPalette = document.querySelector('#buildPalette');
  const buildingOptions = [...document.querySelectorAll('[data-building-id]')];
  const repaintPen = document.querySelector('#repaintPen');
  const constructionPopup = document.querySelector('#constructionPopup');
  const constructionCancel = document.querySelector('#constructionCancel');
  const constructionUndo = document.querySelector('#constructionUndo');
  const constructionConfirm = document.querySelector('#constructionConfirm');
  const barnStorageRows = document.querySelector('#barnStorageRows');
  const viewHint = document.querySelector('#viewHint');
  const loadoutSummary = document.querySelector('#loadoutSummary');
  const vehicleName = document.querySelector('#vehicleName');
  const vehicleIdentity = document.querySelector('#vehicleIdentity');
  const applyLoadout = document.querySelector('#applyLoadout');
  const gameplayLayers = [topBar, stickZone, cycleVehicleButton, actionCluster, desktopHints, siloInventoryElement, constructionPopup];

  document.body.tabIndex = -1;
  const setInputMode = mode => { document.body.dataset.inputMode = mode; };
  setInputMode(matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard');

  const cropIcon = (cropId, label, className = 'icon') => {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    icon.setAttribute('class', className);
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', label);
    use.setAttribute('href', `#icon-${cropId}`);
    icon.append(use);
    return icon;
  };

  const renderDebugCameraPresets = () => {
    for (const button of debugCameraPresets) {
      const selected = Number(button.dataset.cameraFov) === debugCameraFov;
      const state = button.querySelector('.debugUnlockState');
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${button.dataset.cameraLabel}: ${selected ? 'Active' : 'Select preset'}`);
      state.textContent = selected ? 'Active' : 'Select';
    }
  };

  const renderDebugTimeOfDay = () => {
    const totalMinutes = Math.round(debugDayPhase * 24 * 60) % (24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const phaseLabel = dayPhaseLabel(debugDayPhase);
    debugTimeSlider.value = String(totalMinutes);
    debugTimeSlider.setAttribute('aria-valuetext', `${clock}, ${phaseLabel}`);
    debugTimeValue.value = `${clock} · ${phaseLabel}`;
    debugTimeValue.textContent = debugTimeValue.value;
  };

  const renderDebugUnlockables = () => {
    debugUnlockList.replaceChildren();
    for (const unlockable of debugUnlockables) {
      const button = document.createElement('button');
      const details = document.createElement('span');
      const name = document.createElement('strong');
      const category = document.createElement('small');
      const state = document.createElement('small');
      const canOverride = Boolean(unlockable.canOverride);
      const overridden = Boolean(unlockable.overridden);
      name.textContent = unlockable.name;
      category.textContent = unlockable.category;
      state.className = 'debugUnlockState';
      state.textContent = overridden ? 'Override on' : unlockable.unlocked ? 'Unlocked' : 'Locked';
      details.append(name, category);
      button.className = 'debugUnlock';
      button.type = 'button';
      button.dataset.unlockId = unlockable.id;
      button.setAttribute('aria-pressed', String(overridden));
      button.setAttribute('aria-label', `${unlockable.name}: ${state.textContent}${canOverride ? '. Toggle override' : '. Unlocked by progression'}`);
      button.disabled = !canOverride;
      button.append(details, state);
      debugUnlockList.append(button);
    }
    clearUnlockOverrides.hidden = !debugUnlockables.some(unlockable => unlockable.overridden);
  };

  const renderDebugMilestones = () => {
    debugMilestoneList.replaceChildren();
    for (const milestone of debugMilestones) {
      const button = document.createElement('button');
      const details = document.createElement('span');
      const name = document.createElement('strong');
      const category = document.createElement('small');
      const state = document.createElement('small');
      name.textContent = milestone.title;
      category.textContent = 'Milestone';
      state.className = 'debugUnlockState';
      state.textContent = milestone.active ? 'Active' : 'Switch';
      details.append(name, category);
      button.className = 'debugUnlock debugMilestone';
      button.type = 'button';
      button.dataset.milestoneId = milestone.id;
      button.setAttribute('aria-pressed', String(milestone.active));
      button.setAttribute('aria-label', `${milestone.title}: ${milestone.active ? 'Active milestone' : 'Switch to this milestone and clear its progress'}`);
      button.disabled = milestone.active;
      button.append(details, state);
      debugMilestoneList.append(button);
    }
  };

  const cropMeters = new WeakMap();

  const renderCropMeter = (container, { cropId, label, value, percent, ariaLabel, ariaValueText }) => {
    let meter = cropMeters.get(container);
    if (!meter) {
      const heading = document.createElement('div');
      const track = document.createElement('div');
      const fill = document.createElement('span');
      heading.className = 'cropMeterHeading';
      track.className = 'cropMeterTrack';
      track.setAttribute('role', 'progressbar');
      track.append(fill);
      container.replaceChildren(heading, track);
      meter = { heading, track, fill };
      cropMeters.set(container, meter);
    }
    const amount = document.createElement('strong');
    amount.textContent = value;
    meter.heading.replaceChildren(cropIcon(cropId || 'silo', label, 'icon cropMeterIcon'), amount);
    meter.track.setAttribute('aria-label', ariaLabel);
    meter.track.setAttribute('aria-valuemin', '0');
    meter.track.setAttribute('aria-valuemax', '100');
    meter.track.setAttribute('aria-valuenow', String(percent));
    meter.track.setAttribute('aria-valuetext', ariaValueText);
    meter.fill.style.width = `${percent}%`;
  };

  const showSeedCropToast = cropId => {
    const icon = cropIcon(cropId, '', 'icon');
    const name = document.createElement('span');
    icon.removeAttribute('role');
    icon.removeAttribute('aria-label');
    icon.setAttribute('aria-hidden', 'true');
    name.className = 'cropToastName';
    name.textContent = crops[cropId].name;
    seedCropToast.replaceChildren(icon, name);
    seedCropToast.classList.add('show');
    clearTimeout(seedCropToastTimer);
    seedCropToastTimer = setTimeout(() => seedCropToast.classList.remove('show'), 1000);
  };

  const formatLitres = amount => `${Math.max(0, Number(amount) || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} L`;

  const formatRequirementAmount = (amount, unit = 'litres') => unit === 'bales'
    ? `${Math.max(0, Math.floor(Number(amount) || 0))} ${Math.floor(Number(amount) || 0) === 1 ? 'bale' : 'bales'}`
    : formatLitres(amount);

  const formatRequirementProgress = (amount, target, unit = 'litres') => unit === 'bales'
    ? `${Math.max(0, Math.floor(Number(amount) || 0))} / ${Math.max(0, Math.floor(Number(target) || 0))} bales`
    : `${formatLitres(amount)} / ${formatLitres(target)}`;

  const availableCropIds = () => cropIds.filter(cropId => unlockedGates.has(`crop:${cropId}`));
  const selectedSeedCropId = () => availableCropIds()[seedIndex] || 'wheat';

  const tickerValue = (key, target, initialValue = target, ticksPerSecond = METER_TICKS_PER_SECOND, view = 'grain') => {
    const safeTarget = Math.max(0, Number(target) || 0);
    const ticker = amountTickers.get(key);
    if (!ticker) {
      const safeInitialValue = Math.max(0, Number(initialValue) || 0);
      amountTickers.set(key, { value: safeInitialValue, target: safeTarget, elapsed: 0, ticksPerSecond, view });
      return safeInitialValue;
    }
    if (ticker.target !== safeTarget) {
      ticker.target = safeTarget;
      ticker.elapsed = 0;
    }
    ticker.ticksPerSecond = ticksPerSecond;
    ticker.view = view;
    return ticker.value;
  };

  const clearStick = () => {
    stickPointer = null;
    input.x = input.y = 0;
    stickKnob.style.transform = 'translate(0px, 0px)';
    stickBase.classList.remove('active');
  };

  const clearPan = event => {
    if (!event || event.pointerId === panPointer) panPointer = null;
  };

  const clearBuildPointer = event => {
    if (buildPointer === null || (event && event.pointerId !== buildPointer)) return;
    onBuildPointerCancel?.();
    buildPointer = null;
  };

  const cameraGestureCenter = () => {
    const points = [...cameraGesturePointers.values()];
    if (points.length !== 2) return null;
    return {
      x: (points[0].x + points[1].x) * .5,
      y: (points[0].y + points[1].y) * .5,
    };
  };

  const beginCameraGesturePointer = event => {
    cameraGesturePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (cameraGesturePointers.size === 2) {
      cameraGestureStart = cameraGestureCenter();
      cameraGestureTriggered = false;
    }
    else if (cameraGesturePointers.size > 2) cameraGestureStart = null;
  };

  const updateCameraGesturePointer = event => {
    const point = cameraGesturePointers.get(event.pointerId);
    if (!point) return false;
    point.x = event.clientX;
    point.y = event.clientY;
    if (!cameraGestureStart || cameraGestureTriggered) return true;
    const center = cameraGestureCenter();
    if (!center) return true;
    const dx = center.x - cameraGestureStart.x;
    const dy = center.y - cameraGestureStart.y;
    if (Math.abs(dx) >= CAMERA_SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.1) {
      cameraGestureTriggered = true;
      onCameraRotateStep(dx < 0 ? -1 : 1);
    }
    else if (Math.abs(dy) >= CAMERA_SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      cameraGestureTriggered = true;
    }
    return true;
  };

  const endCameraGesturePointer = event => {
    if (!cameraGesturePointers.has(event.pointerId)) return false;
    cameraGesturePointers.delete(event.pointerId);
    cameraGestureStart = null;
    cameraGestureTriggered = false;
    return true;
  };

  const clearCameraGesture = () => {
    cameraGesturePointers.clear();
    cameraGestureStart = null;
    cameraGestureTriggered = false;
  };

  const clearInput = () => {
    keys.clear();
    input.jumpQueued = false;
    clearStick();
    clearPan();
    clearBuildPointer();
    clearCameraGesture();
    panDragX = panDragY = 0;
  };

  const inputLocked = () => overlayState !== null || cinematicActive || screenshotHudHidden;
  const itemLocked = item => Boolean(item?.unavailable || (item?.gate && !unlockedGates.has(item.gate)));

  const renderEquipmentAction = (slot, button, stateElement, item) => {
    const enabled = equipmentEnabled[slot];
    button.hidden = !item;
    if (!item) return;
    const action = enabled ? 'Raise' : 'Lower';
    button.setAttribute('aria-label', `${action} ${slot} tool: ${item.name}`);
    button.setAttribute('aria-pressed', String(enabled));
    button.title = `${action} ${slot} tool: ${item.name}`;
    stateElement.textContent = enabled ? `${item.name} · lowered` : `${item.name} · raised`;
  };

  const renderEquipmentActions = () => {
    const frontItem = activeVehicle.type === 'harvester'
      ? { id: 'header', name: 'Harvest header', working: true }
      : equipmentDefinition(activeLoadout.frontTool);
    const rearItem = activeVehicle.type === 'harvester' ? null : equipmentDefinition(activeLoadout.tool);
    renderEquipmentAction('front', frontToolToggle, frontToolState, frontItem?.working ? frontItem : null);
    renderEquipmentAction('rear', rearToolToggle, rearToolState, rearItem?.working ? rearItem : null);
  };

  const renderInventoryMeter = () => {
    inventoryMeter.hidden = !inventoryHud;
    if (!inventoryHud) return;
    const displayAmount = tickerValue(`inventory:${inventoryHud.id}`, inventoryHud.amount, inventoryHud.amount, METER_TICKS_PER_SECOND, 'inventory');
    const percent = inventoryHud.capacity ? Math.round(displayAmount / inventoryHud.capacity * 100) : 0;
    renderCropMeter(inventoryMeter, {
      cropId: inventoryHud.iconId,
      label: inventoryHud.label,
      value: `${formatLitres(displayAmount)} / ${formatLitres(inventoryHud.capacity)}`,
      percent,
      ariaLabel: `${inventoryHud.label} inventory`,
      ariaValueText: `${formatLitres(displayAmount)} of ${formatLitres(inventoryHud.capacity)} in ${inventoryHud.label.toLowerCase()}`,
    });
  };

  const renderSiloInventory = () => {
    const cropsInSilo = siloInventory?.crops || [];
    siloInventoryElement.hidden = !siloInventory;
    if (!siloInventory) {
      delete siloInventoryElement.dataset.kind;
      return;
    }
    siloInventoryElement.dataset.kind = siloInventory.kind;
    const machine = siloInventory.machine;
    const cattleBarn = siloInventory.kind === 'cattle-barn';
    const cargoPad = siloInventory.kind === 'cargo';
    barnStorageRows.hidden = !cattleBarn;
    document.querySelector('.siloInventoryCrop').hidden = cattleBarn;
    previousSiloCrop.hidden = cattleBarn;
    nextSiloCrop.hidden = cattleBarn;
    if (cattleBarn) {
      const barn = siloInventory.barn;
      barnStorageRows.replaceChildren();
      for (const [icon, label, value] of [
        ['cow', 'Cows', `${barn.herd} / ${barn.capacity}`],
        ['hay-bale', 'Hay', `${formatLitres(barn.hayLitres)} / ${formatLitres(barn.hayCapacity)}`],
        ['milk', 'Milk', `${formatLitres(barn.milkLitres)} / ${formatLitres(barn.milkCapacity)}`],
      ]) {
        const row = document.createElement('div');
        const copy = document.createElement('span');
        const strong = document.createElement('strong');
        copy.textContent = label; strong.textContent = value;
        row.append(cropIcon(icon, label), copy, strong); barnStorageRows.append(row);
      }
      siloLoadButton.hidden = false;
      siloLoadButton.disabled = !barn.canLoadMilk;
      siloLoadButton.setAttribute('aria-label', 'Load milk into Water / Milk Tank');
      siloLoadButton.title = 'Load milk';
      siloUnloadButton.disabled = !barn.canFeed;
      siloUnloadButton.setAttribute('aria-label', 'Feed carried hay bale');
      siloUnloadButton.title = 'Feed bale';
      siloUnloadIconUse.setAttribute('href', '#icon-hay-bale');
      siloInventoryElement.setAttribute('aria-label', `Cattle barn: ${barn.herd} of ${barn.capacity} cattle, ${formatLitres(barn.hayLitres)} hay, ${formatLitres(barn.milkLitres)} milk`);
      return;
    }
    const tankAmount = Object.values(machine.contents).reduce((sum, amount) => sum + amount, 0);
    const tankCropId = Object.keys(machine.contents).find(cropId => machine.contents[cropId] > 0) || null;
    if (cropsInSilo.length && !cropsInSilo.some(crop => crop.id === siloCropId)) siloCropId = cropsInSilo[0].id;
    if (siloInventory.autoSelectCarriedCrop) {
      const carriedId = machine.carriedBale ? 'hay-bale' : tankCropId;
      const carriedCrop = cropsInSilo.find(crop => crop.id === carriedId && (!cargoPad || crop.accepting));
      if (carriedCrop) siloCropId = carriedCrop.id;
      siloInventory.autoSelectCarriedCrop = false;
    }
    const crop = cropsInSilo.find(entry => entry.id === siloCropId) || cropsInSilo[0] || null;
    const canLoad = !cargoPad && machine.storageKind === 'crop' && Boolean(crop?.amount) && machine.canTransfer
      && tankAmount < machine.capacity && (!tankCropId || tankCropId === crop.id);
    const canUnload = cargoPad
      ? Boolean(crop) && crop.accepting && machine.canTransfer && crop.amount < crop.target
        && (crop.unit === 'bales' ? machine.carriedBale : (machine.contents[crop.id] || 0) > 0)
      : machine.storageKind === 'crop' && machine.canTransfer && tankAmount > 0;
    previousSiloCrop.disabled = cropsInSilo.length < 2;
    nextSiloCrop.disabled = cropsInSilo.length < 2;
    siloLoadButton.hidden = cargoPad;
    const unloadLabel = cargoPad && crop?.unit === 'bales' ? 'Deliver carried hay bale' : cargoPad ? 'Deliver selected cargo' : 'Unload cargo into silo';
    siloUnloadButton.setAttribute('aria-label', unloadLabel);
    siloUnloadButton.title = unloadLabel;
    siloUnloadIconUse.setAttribute('href', '#icon-silo-unload');
    siloLoadButton.disabled = !canLoad;
    siloUnloadButton.disabled = !canUnload;
    if (!crop) {
      siloCropIconUse.setAttribute('href', '#icon-silo');
      siloCropIcon.setAttribute('aria-label', 'Empty');
      siloCropValue.textContent = '—';
      siloInventoryElement.setAttribute('aria-label', 'Silo inventory is empty');
      return;
    }
    const itemName = crop.name || crops[crop.id]?.name || crop.id;
    siloCropIconUse.setAttribute('href', `#icon-${crop.icon || crop.id}`);
    siloCropIcon.setAttribute('aria-label', crop.locked ? `${itemName} unavailable` : itemName);
    const tickerKey = `${cargoPad ? 'cargo' : 'silo'}:${siloInventory.id}:${crop.id}`;
    const displayAmount = tickerValue(tickerKey, crop.amount, crop.amount, TRANSFER_TICKS_PER_SECOND, 'silo');
    siloCropValue.textContent = cargoPad
      ? formatRequirementProgress(displayAmount, crop.target, crop.unit)
      : formatLitres(displayAmount);
    siloInventoryElement.setAttribute('aria-label', cargoPad
      ? `Cargo pad: ${formatRequirementAmount(crop.amount, crop.unit)} of ${formatRequirementAmount(crop.target, crop.unit)} ${itemName} delivered`
      : `Silo inventory: ${formatLitres(crop.amount)} ${itemName}`);
  };

  const positionStoragePopup = (x, y, minimumTop, bottomMargin) => {
    const popupHalfWidth = siloInventoryElement.getBoundingClientRect().width * .5;
    const horizontalMargin = popupHalfWidth + 12;
    siloInventoryElement.style.left = `${innerWidth <= horizontalMargin * 2
      ? innerWidth * .5
      : Math.max(horizontalMargin, Math.min(innerWidth - horizontalMargin, x))}px`;
    siloInventoryElement.style.top = `${Math.max(minimumTop, Math.min(innerHeight - bottomMargin, y))}px`;
  };

  const cycleSiloCrop = direction => {
    const cropsInSilo = siloInventory?.crops || [];
    if (cropsInSilo.length < 2) return;
    const currentIndex = Math.max(0, cropsInSilo.findIndex(crop => crop.id === siloCropId));
    siloCropId = cropsInSilo[(currentIndex + direction + cropsInSilo.length) % cropsInSilo.length].id;
    renderSiloInventory();
  };

  const renderSecondaryAction = () => {
    const seederActive = activeVehicle.type !== 'harvester' && activeLoadout.tool === 'seeder';
    seedCycleControl.hidden = !seederActive;
    if (!seederActive) seedCropToast.classList.remove('show');
    secondaryHint.hidden = !seederActive;
    if (seederActive) {
      const availableCrops = availableCropIds();
      const cropId = selectedSeedCropId();
      const nextCrop = crops[availableCrops[(seedIndex + 1) % availableCrops.length]];
      unloadButton.setAttribute('aria-disabled', 'false');
      unloadButton.setAttribute('aria-label', `${crops[cropId].name} seed selected. Select ${nextCrop.name} seed`);
      unloadButton.title = `${crops[cropId].name} seed · select ${nextCrop.name}`;
      unloadIconUse.setAttribute('href', `#icon-${cropId}`);
      secondaryHintLabel.textContent = 'Seed';
    }
  };

  const useSecondaryAction = () => {
    if (inputLocked() || buildMode) return;
    if (activeVehicle.type !== 'harvester' && activeLoadout.tool === 'seeder') {
      seedIndex = (seedIndex + 1) % availableCropIds().length;
      renderSecondaryAction();
      onPersistentStateChange();
      showSeedCropToast(selectedSeedCropId());
      return;
    }
  };

  const renderMilestone = milestone => {
    milestoneState = milestone;
    milestoneTitle.textContent = milestone.title;
    milestoneTracker.dataset.complete = String(milestone.complete);
    milestoneRows.replaceChildren();
    if (milestone.hint) {
      const hint = document.createElement('span');
      hint.className = 'milestoneHint';
      hint.textContent = milestone.hint;
      milestoneRows.append(hint);
    }
    for (const requirement of milestone.requirements) {
      const row = document.createElement('div');
      const requirementId = requirement.itemId || requirement.cropId;
      const displayDelivered = tickerValue(`milestone:${milestone.id}:${requirementId}`, requirement.delivered, requirement.delivered, TRANSFER_TICKS_PER_SECOND, 'milestone');
      const percent = requirement.target ? Math.min(100, displayDelivered / requirement.target * 100) : 0;
      row.className = 'milestoneRow';
      row.dataset.locked = String(requirement.locked);
      renderCropMeter(row, {
        cropId: requirement.icon || requirementId,
        label: requirement.name,
        value: requirement.locked ? 'Unavailable' : formatRequirementProgress(displayDelivered, requirement.target, requirement.unit),
        percent,
        ariaLabel: requirement.locked ? `${requirement.name} unavailable` : `${requirement.name} delivered`,
        ariaValueText: `${formatRequirementAmount(displayDelivered, requirement.unit)} of ${formatRequirementAmount(requirement.target, requirement.unit)} ${requirement.name} delivered`,
      });
      milestoneRows.append(row);
    }
  };

  const renderConstructionPopup = () => {
    const state = constructionUiState;
    const visible = buildMode && state && !state.hidden;
    constructionPopup.hidden = !visible;
    if (!state) return;
    constructionUndo.hidden = state.phase !== 'pen-draft';
    constructionConfirm.textContent = state.primaryLabel;
    constructionConfirm.disabled = state.primaryAction === 'confirm' && !state.canConfirm;
    constructionConfirm.setAttribute('aria-label', state.primaryLabel);
    const popupHalfWidth = constructionPopup.getBoundingClientRect().width * .5;
    const horizontalMargin = popupHalfWidth + 12;
    if (Number.isFinite(state.x)) constructionPopup.style.left = `${innerWidth <= horizontalMargin * 2
      ? innerWidth * .5
      : Math.max(horizontalMargin, Math.min(innerWidth - horizontalMargin, state.x))}px`;
    if (Number.isFinite(state.y)) constructionPopup.style.top = `${Math.max(70, Math.min(innerHeight - 48, state.y))}px`;
  };

  const constructionHint = () => {
    const state = constructionUiState;
    if (!state) {
      if (selectedBuilding) return 'DRAG ON LAND TO PLACE';
      return 'SELECT A BUILDING · DRAG EMPTY GROUND TO PAN';
    }
    if (state.type === 'silo') return 'MOVE SILO OR CONFIRM PLACEMENT';
    return '';
  };

  const renderBuildMode = () => {
    buildingToggle.setAttribute('aria-pressed', String(buildMode));
    buildingToggle.setAttribute('aria-label', buildMode ? 'Leave building mode' : 'Open building menu');
    buildingToggle.title = buildMode ? 'Leave building mode' : 'Buildings';
    buildPalette.hidden = !buildMode;
    let visibleOptions = 0;
    for (const option of buildingOptions) {
      const type = option.dataset.buildingId;
      const locked = type === 'cattle-barn' && !unlockedGates.has('building:cattle-barn');
      option.hidden = locked;
      option.disabled = locked;
      if (!locked) visibleOptions++;
      option.setAttribute('aria-pressed', String(selectedBuilding === type));
    }
    buildPalette.dataset.optionCount = String(visibleOptions);
    repaintPen.hidden = constructionUiState?.type !== 'cattle-barn' || constructionUiState.inputMode !== 'edit';
    viewHint.textContent = buildMode && buildHint ? buildHint : buildMode
      ? constructionHint()
      : '';
    renderConstructionPopup();
    document.body.dataset.viewMode = buildMode ? 'build' : 'drive';
  };

  const setBuildMode = enabled => {
    if (inputLocked()) return;
    if (overlayState || buildMode === enabled) return;
    buildMode = enabled;
    if (!buildMode) {
      selectedBuilding = null;
      constructionUiState = null;
      constructionUiSignature = '';
    }
    clearInput();
    renderBuildMode();
    onBuildModeChange(buildMode);
  };

  const toggleEquipment = slot => {
    if (inputLocked() || buildMode) return;
    const item = activeVehicle.type === 'harvester'
      ? slot === 'front' ? { working: true } : null
      : equipmentDefinition(slot === 'front' ? activeLoadout.frontTool : activeLoadout.tool);
    if (!item?.working) return;
    equipmentEnabled[slot] = !equipmentEnabled[slot];
    renderEquipmentActions();
    onEquipmentAction(slot, equipmentEnabled[slot]);
  };

  const cycleVehicle = () => {
    if (inputLocked() || buildMode) return;
    clearInput();
    onCycleVehicle();
  };

  const itemFor = (categoryId, itemId) => CATALOG[categoryId].find(item => item.id === itemId);
  const loadoutChanged = () => CATEGORIES.some(category =>
    activeVehicle.slots.includes(category.key) && draftLoadout[category.key] !== activeLoadout[category.key]
  );

  const renderVehicleIdentity = () => {
    vehicleName.textContent = activeVehicle.name;
    vehicleIdentity.setAttribute('aria-label', `${activeVehicle.name}, currently controlled vehicle`);
  };

  const renderSummary = () => {
    if (activeVehicle.type === 'harvester') {
      const strong = document.createElement('strong');
      strong.textContent = 'Combine Harvester · Built-in header';
      loadoutSummary.replaceChildren(strong, document.createTextNode(loadoutChanged() ? 'Rear and front tools are unavailable with the combine' : 'Current harvesting loadout'));
      applyLoadout.disabled = !loadoutChanged();
      return;
    }
    const names = CATEGORIES
      .filter(category => activeVehicle.slots.includes(category.key))
      .map(category => itemFor(category.id, draftLoadout[category.key])?.name || category.emptyLabel);
    const strong = document.createElement('strong');
    strong.textContent = names.join(' · ');
    loadoutSummary.replaceChildren(strong, document.createTextNode(loadoutChanged() ? 'Review and equip these changes' : 'Current loadout'));
    applyLoadout.disabled = !loadoutChanged();
  };

  const renderLoadoutBays = () => {
    CATEGORIES.forEach(category => {
      const bayId = category.id === 'equipment' ? 'equipment' : 'frontTool';
      const options = document.querySelector(`#${bayId}Options`);
      if (!options.childElementCount) {
        CATALOG[category.id].forEach(item => {
          const button = document.createElement('button');
          const name = document.createElement('span');
          const state = document.createElement('span');
          button.type = 'button';
          button.className = 'loadoutOption';
          name.className = 'optionName';
          name.textContent = item.name;
          state.className = 'optionState';
          button.append(name, state);
          button.addEventListener('click', () => {
            if (itemLocked(item) || !activeVehicle.slots.includes(category.key)) return;
            draftLoadout[category.key] = draftLoadout[category.key] === item.id ? null : item.id;
            renderLoadoutBays();
          });
          options.append(button);
        });
      }
      [...options.children].forEach((button, index) => {
        const item = CATALOG[category.id][index];
        const locked = itemLocked(item);
        const selected = draftLoadout[category.key] === item.id;
        const unavailable = !activeVehicle.slots.includes(category.key);
        button.classList.toggle('locked', locked);
        options.closest('.loadoutBay').classList.toggle('unavailable', unavailable);
        button.disabled = unavailable;
        button.setAttribute('aria-disabled', String(unavailable));
        button.setAttribute('aria-pressed', String(selected));
        button.setAttribute('aria-label', `${item.name}${locked ? ', locked preview' : selected ? ', selected. Deselect' : ', select'}`);
        button.querySelector('.optionState').textContent = unavailable ? 'Unavailable' : locked ? 'Locked' : selected ? 'Deselect' : 'Select';
      });
    });
    renderVehicleIdentity();
    renderSummary();
    onLoadoutPreview({
      vehicle: activeVehicle.type,
      tool: draftLoadout.tool,
      frontTool: draftLoadout.frontTool,
    });
  };

  const setBackgroundInert = blocked => {
    gameplayLayers.forEach(layer => {
      layer.inert = blocked;
      if (blocked) layer.setAttribute('aria-hidden', 'true');
      else layer.removeAttribute('aria-hidden');
    });
  };

  const showOverlay = (state, dialog) => {
    if (!overlayState) restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlayState = state;
    overlay.dataset.state = state;
    clearInput();
    overlay.hidden = false;
    barnDialog.hidden = dialog !== barnDialog;
    pauseDialog.hidden = dialog !== pauseDialog;
    celebrationDialog.hidden = dialog !== celebrationDialog;
    setBackgroundInert(true);
    requestAnimationFrame(() => {
      if (dialog === barnDialog) return;
      const focusTarget = dialog.querySelector('button:not([disabled])');
      focusTarget?.focus({ preventScroll: true });
    });
  };

  const hideOverlay = () => {
    overlayState = null;
    delete overlay.dataset.state;
    overlay.hidden = true;
    barnDialog.hidden = true;
    pauseDialog.hidden = true;
    celebrationDialog.hidden = true;
    setBackgroundInert(cinematicActive);
    const target = restoreFocus?.isConnected ? restoreFocus : document.body;
    restoreFocus = null;
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  };

  const resetPausePanel = () => {
    pauseBody.hidden = false;
    confirmBody.hidden = true;
    pauseTitle.textContent = 'Paused';
    controlsList.hidden = true;
    showControls.setAttribute('aria-expanded', 'false');
    debugPanel.hidden = true;
    showDebug.setAttribute('aria-expanded', 'false');
  };

  const openPause = () => {
    if (inputLocked()) return;
    resetPausePanel();
    showOverlay('pause', pauseDialog);
  };

  const closePause = () => {
    if (overlayState === 'confirm') {
      overlayState = 'pause';
      resetPausePanel();
      document.querySelector('#requestRegenerate').focus();
    }
    else if (overlayState === 'pause') hideOverlay();
  };

  const openBarn = () => {
    if (inputLocked()) return;
    draftLoadout = { ...activeLoadout };
    renderLoadoutBays();
    showOverlay('barn', barnDialog);
  };

  const closeBarn = () => {
    if (overlayState !== 'barn') return;
    draftLoadout = { ...activeLoadout };
    hideOverlay();
  };

  const closeCelebration = () => {
    if (overlayState !== 'celebration') return;
    hideOverlay();
    onMilestoneCelebrationDismissed();
  };

  const setScreenshotHudHidden = hidden => {
    screenshotHudHidden = Boolean(hidden);
    if (screenshotHudHidden) document.body.dataset.hudHidden = 'true';
    else delete document.body.dataset.hudHidden;
    clearInput();
    setBackgroundInert(screenshotHudHidden || cinematicActive || overlayState !== null);
  };

  const enterScreenshotMode = () => {
    if (cinematicActive) return;
    if (overlayState) hideOverlay();
    setScreenshotHudHidden(true);
  };

  const equipDraft = () => {
    if (overlayState !== 'barn' || !loadoutChanged()) return;
    const nextLoadout = { ...draftLoadout };
    if (onLoadoutChange(nextLoadout) === false) return;
    activeLoadout = nextLoadout;
    equipmentEnabled = { front: false, rear: false };
    renderEquipmentActions();
    onEquipmentAction('front', false);
    onEquipmentAction('rear', false);
    hideOverlay();
    renderInventoryMeter();
    renderSecondaryAction();
  };

  const updateStick = event => {
    const rect = stickZone.getBoundingClientRect();
    const stickRadius = parseFloat(getComputedStyle(stickZone).getPropertyValue('--stick-travel')) || 43;
    let dx = event.clientX - rect.left - stickOrigin.x;
    let dy = event.clientY - rect.top - stickOrigin.y;
    const length = Math.hypot(dx, dy) || 1;
    if (length > stickRadius) { dx = dx / length * stickRadius; dy = dy / length * stickRadius; }
    input.x = dx / stickRadius;
    input.y = dy / stickRadius;
    stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  window.addEventListener('keydown', event => {
    setInputMode('keyboard');
    if (screenshotHudHidden) {
      event.preventDefault();
      if (!event.repeat && (event.code === 'KeyH' || event.code === 'Escape')) setScreenshotHudHidden(false);
      return;
    }
    if (cinematicActive) {
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyH' && !event.repeat) {
      event.preventDefault();
      enterScreenshotMode();
      return;
    }
    if (event.code === 'Escape') {
      event.preventDefault();
      if (overlayState === 'barn') closeBarn();
      else if (overlayState === 'celebration') closeCelebration();
      else if (overlayState) closePause();
      else if (buildMode) setBuildMode(false);
      else openPause();
      return;
    }
    if (overlayState === 'barn') {
      const index = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7 }[event.code];
      if (index !== undefined) {
        const item = CATALOG.equipment[index];
        if (item && !itemLocked(item) && activeVehicle.slots.includes('tool')) {
          draftLoadout.tool = draftLoadout.tool === item.id ? null : item.id;
        }
        renderLoadoutBays();
      }
      return;
    }
    if (overlayState) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (!buildMode && event.code === 'Space' && !event.repeat) input.jumpQueued = true;
    if (!buildMode && event.code === 'KeyQ' && !event.repeat) toggleEquipment('front');
    if (!buildMode && event.code === 'KeyE' && !event.repeat) toggleEquipment('rear');
    if (!buildMode && event.code === 'KeyF' && !event.repeat) useSecondaryAction();
    if (!buildMode && event.code === 'KeyV' && !event.repeat) cycleVehicle();
    if (!buildMode && event.code === 'BracketLeft' && !event.repeat) onCameraRotateStep(-1);
    if (!buildMode && event.code === 'BracketRight' && !event.repeat) onCameraRotateStep(1);
    if (event.code === 'KeyB' && !event.repeat) setBuildMode(!buildMode);
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', clearInput);
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') setInputMode('touch');
    if (!screenshotHudHidden) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setScreenshotHudHidden(false);
  }, { capture: true });

  panSurface.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !buildMode && !inputLocked()) {
      event.preventDefault();
      beginCameraGesturePointer(event);
      panSurface.setPointerCapture(event.pointerId);
      return;
    }
    if (!buildMode || overlayState || panPointer !== null || buildPointer !== null) return;
    if (buildMode && onBuildPointerStart?.({ x: event.clientX, y: event.clientY })) {
      buildPointer = event.pointerId;
      panSurface.setPointerCapture(event.pointerId);
      return;
    }
    panPointer = event.pointerId;
    panLastX = event.clientX;
    panLastY = event.clientY;
    panSurface.setPointerCapture(event.pointerId);
  });
  panSurface.addEventListener('pointermove', event => {
    if (updateCameraGesturePointer(event)) {
      event.preventDefault();
      return;
    }
    if (event.pointerId === buildPointer) {
      onBuildPointerMove?.({ x: event.clientX, y: event.clientY });
      return;
    }
    if (event.pointerId !== panPointer) return;
    panDragX += event.clientX - panLastX;
    panDragY += event.clientY - panLastY;
    panLastX = event.clientX;
    panLastY = event.clientY;
  });
  panSurface.addEventListener('pointerup', event => {
    if (endCameraGesturePointer(event)) return;
    if (event.pointerId === buildPointer) {
      onBuildPointerEnd?.({ x: event.clientX, y: event.clientY });
      buildPointer = null;
    }
    clearPan(event);
  });
  panSurface.addEventListener('pointercancel', event => {
    if (endCameraGesturePointer(event)) return;
    clearBuildPointer(event);
    clearPan(event);
  });
  panSurface.addEventListener('lostpointercapture', event => {
    if (endCameraGesturePointer(event)) return;
    clearBuildPointer(event);
    clearPan(event);
  });

  stickZone.addEventListener('pointerdown', event => {
    if (inputLocked() || buildMode || stickPointer !== null) return;
    event.preventDefault();
    setInputMode('touch');
    const rect = stickZone.getBoundingClientRect();
    stickOrigin.x = rect.width / 2;
    stickOrigin.y = rect.height / 2;
    stickBase.classList.add('active');
    stickPointer = event.pointerId;
    stickZone.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  stickZone.addEventListener('pointermove', event => { if (event.pointerId === stickPointer) updateStick(event); });
  stickZone.addEventListener('pointerup', event => { if (event.pointerId === stickPointer) clearStick(); });
  stickZone.addEventListener('pointercancel', event => { if (event.pointerId === stickPointer) clearStick(); });
  stickZone.addEventListener('lostpointercapture', clearStick);

  document.querySelector('#jump').addEventListener('pointerdown', event => {
    if (inputLocked() || buildMode) return;
    event.preventDefault();
    input.jumpQueued = true;
  });
  const bindGameplayPress = (button, action) => {
    let suppressClickUntil = 0;
    button.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      event.preventDefault();
      suppressClickUntil = performance.now() + 800;
      action();
    });
    button.addEventListener('click', event => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
      if (event.detail > 0 && performance.now() < suppressClickUntil) return;
      action();
    });
  };
  bindGameplayPress(cycleVehicleButton, cycleVehicle);
  bindGameplayPress(frontToolToggle, () => toggleEquipment('front'));
  bindGameplayPress(rearToolToggle, () => toggleEquipment('rear'));
  bindGameplayPress(unloadButton, useSecondaryAction);
  buildingToggle.addEventListener('click', () => setBuildMode(!buildMode));
  for (const option of buildingOptions) option.addEventListener('click', () => {
    if (!buildMode || option.disabled) return;
    const type = option.dataset.buildingId;
    onBuildingTypeSelected?.(type);
    selectedBuilding = null;
    renderBuildMode();
  });
  repaintPen.addEventListener('click', () => { if (buildMode) onPenRepaint?.(); });
  constructionConfirm.addEventListener('click', () => { if (buildMode && !constructionConfirm.disabled) onConstructionPrimaryAction?.(); });
  constructionCancel.addEventListener('click', () => { if (buildMode) onConstructionCancel?.(); });
  constructionUndo.addEventListener('click', () => { if (buildMode) onConstructionUndo?.(); });
  previousSiloCrop.addEventListener('click', () => cycleSiloCrop(-1));
  nextSiloCrop.addEventListener('click', () => cycleSiloCrop(1));
  siloLoadButton.addEventListener('click', () => {
    if (siloInventory?.kind === 'cattle-barn') onBarnLoadMilk?.(siloInventory.id);
    else if (siloInventory && siloCropId) onSiloLoad(siloInventory.id, siloCropId);
  });
  siloUnloadButton.addEventListener('click', () => {
    if (!siloInventory) return;
    if (siloInventory.kind === 'cattle-barn') onBarnFeed?.(siloInventory.id);
    else if (siloInventory.kind === 'cargo') onCargoDropOff(siloCropId);
    else onSiloUnload(siloInventory.id);
  });
  document.querySelector('#menuToggle').addEventListener('click', openPause);
  document.querySelector('#closeBarn').addEventListener('click', closeBarn);
  document.querySelector('#cancelLoadout').addEventListener('click', closeBarn);
  applyLoadout.addEventListener('click', equipDraft);
  document.querySelector('#closePause').addEventListener('click', closePause);
  document.querySelector('#resumeGame').addEventListener('click', closePause);
  celebrationContinue.addEventListener('click', closeCelebration);
  showControls.addEventListener('click', () => {
    const expanded = showControls.getAttribute('aria-expanded') === 'true';
    showControls.setAttribute('aria-expanded', String(!expanded));
    controlsList.hidden = expanded;
  });
  hideHud.addEventListener('click', enterScreenshotMode);
  showDebug.addEventListener('click', () => {
    const expanded = showDebug.getAttribute('aria-expanded') === 'true';
    showDebug.setAttribute('aria-expanded', String(!expanded));
    debugPanel.hidden = expanded;
  });
  debugTimeSlider.addEventListener('input', () => {
    const nextPhase = Math.min(1 - Number.EPSILON, Math.max(0, Number(debugTimeSlider.value) / (24 * 60)));
    if (onTimeOfDayChange(nextPhase) === false) return;
    debugDayPhase = nextPhase;
    renderDebugTimeOfDay();
  });
  debugPanel.addEventListener('click', event => {
    const button = event.target.closest('.debugCameraPreset');
    if (!button) return;
    const nextFov = Number(button.dataset.cameraFov);
    if (onCameraPresetChange(nextFov) === false) return;
    debugCameraFov = nextFov;
    renderDebugCameraPresets();
  });
  debugUnlockList.addEventListener('click', event => {
    const button = event.target.closest('.debugUnlock');
    if (!button || button.disabled) return;
    const unlockable = debugUnlockables.find(item => item.id === button.dataset.unlockId);
    if (unlockable) onUnlockOverride(unlockable.id, !unlockable.overridden);
  });
  debugMilestoneList.addEventListener('click', event => {
    const button = event.target.closest('.debugMilestone');
    if (!button || button.disabled) return;
    onMilestoneOverride(button.dataset.milestoneId);
  });
  clearUnlockOverrides.addEventListener('click', onClearUnlockOverrides);
  document.querySelector('#requestRegenerate').addEventListener('click', () => {
    overlayState = 'confirm';
    pauseBody.hidden = true;
    confirmBody.hidden = false;
    pauseTitle.textContent = 'Restart Farmipelago?';
    document.querySelector('#cancelRegenerate').focus();
  });
  document.querySelector('#cancelRegenerate').addEventListener('click', closePause);
  document.querySelector('#confirmRegenerate').addEventListener('click', () => {
    if (onRestart()) return;
    overlayState = 'pause';
    resetPausePanel();
  });

  overlay.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const dialog = overlayState === 'barn' ? barnDialog : overlayState === 'celebration' ? celebrationDialog : pauseDialog;
    const focusable = [...dialog.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter(element => !element.closest('[hidden]'));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  renderEquipmentActions();
  renderDebugCameraPresets();
  renderDebugTimeOfDay();
  renderInventoryMeter();
  renderSecondaryAction();
  renderBuildMode();
  renderLoadoutBays();

  const showMilestoneCelebration = milestone => {
    const completeGame = Boolean(milestone?.completeGame);
    celebrationEyebrow.textContent = completeGame ? 'Current prototype complete' : 'Shipment complete';
    celebrationHeading.textContent = completeGame ? 'Farmipelago complete' : 'Milestone complete';
    celebrationTitle.textContent = milestone?.title || 'Milestone';
    celebrationCopy.replaceChildren(
      celebrationTitle,
      document.createTextNode(completeGame
        ? ' was the final available delivery. You have unlocked every current farming capability.'
        : ' has expanded what this Farmipelago can do.')
    );
    celebrationContinueLabel.textContent = completeGame ? 'Keep farming' : 'Continue farming';
    celebrationUnlocks.replaceChildren();
    const unlocks = Array.isArray(milestone?.unlocks) ? milestone.unlocks : [];
    celebrationUnlocksLabel.hidden = unlocks.length === 0;
    celebrationUnlocks.hidden = unlocks.length === 0;
    for (const gate of unlocks) {
      const cropId = typeof gate === 'string' && gate.startsWith('crop:') ? gate.slice(5) : null;
      const item = document.createElement('li');
      item.className = 'unlockItem';
      if (cropId && crops[cropId]) {
        const icon = cropIcon(cropId, '', 'icon unlockIcon');
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createElement('strong');
        label.textContent = crops[cropId].name;
        item.append(icon, label);
      }
      else if (gate === 'equipment:hay') {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        const label = document.createElement('strong');
        icon.setAttribute('class', 'icon unlockIcon');
        icon.setAttribute('aria-hidden', 'true');
        use.setAttribute('href', '#icon-baler');
        icon.append(use);
        label.textContent = 'Hay equipment';
        item.append(icon, label);
      }
      else if (gate === 'equipment:livestock' || gate === 'building:cattle-barn') {
        const icon = cropIcon(gate === 'equipment:livestock' ? 'milk-tank' : 'cattle-barn', '', 'icon unlockIcon');
        const label = document.createElement('strong');
        icon.setAttribute('aria-hidden', 'true');
        label.textContent = gate === 'equipment:livestock' ? 'Livestock equipment' : 'Cattle barn';
        item.append(icon, label);
      }
      else {
        const label = document.createElement('strong');
        label.textContent = gate;
        item.append(label);
      }
      celebrationUnlocks.append(item);
    }
    showOverlay('celebration', celebrationDialog);
  };

  return {
    driveInput() {
      if (inputLocked() || buildMode) return { x: 0, y: 0 };
      let x = 0, y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x || y) return { x, y: -y };
      return { x: input.x, y: -input.y };
    },
    consumePan() {
      if (inputLocked() || !buildMode) return { keyboardX: 0, keyboardZ: 0, dragX: 0, dragY: 0 };
      let keyboardX = 0, keyboardZ = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) keyboardX -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) keyboardX += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) keyboardZ -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) keyboardZ += 1;
      const pan = { keyboardX, keyboardZ, dragX: panDragX, dragY: panDragY };
      panDragX = panDragY = 0;
      return pan;
    },
    consumeJump() {
      if (inputLocked() || buildMode) return false;
      const jump = input.jumpQueued;
      input.jumpQueued = false;
      return jump;
    },
    activeLoadout: () => ({ ...activeLoadout, vehicle: activeVehicle.type }),
    activeSeedId: selectedSeedCropId,
    persistentState: () => ({ seedCropId: selectedSeedCropId() }),
    restorePersistentState(savedState) {
      const savedSeedIndex = availableCropIds().indexOf(savedState?.seedCropId);
      if (savedSeedIndex !== -1) seedIndex = savedSeedIndex;
      renderSecondaryAction();
    },
    buildState: () => ({ enabled: buildMode, selectedBuilding }),
    setBuildHint(nextHint) {
      buildHint = String(nextHint || '');
      if (buildMode) renderBuildMode();
    },
    setConstructionPopup(nextState) {
      const nextSignature = nextState
        ? [nextState.buildingId, nextState.type, nextState.phase, nextState.inputMode, nextState.primaryAction, nextState.primaryLabel, nextState.canConfirm].join(':')
        : '';
      const stateChanged = nextSignature !== constructionUiSignature;
      constructionUiSignature = nextSignature;
      constructionUiState = nextState ? { ...nextState } : null;
      if (buildMode && stateChanged) renderBuildMode();
      else renderConstructionPopup();
    },
    clearBuildingSelection() {
      selectedBuilding = null;
      renderBuildMode();
    },
    equipmentEnabled: slot => Boolean(equipmentEnabled[slot]),
    anyEquipmentEnabled: () => equipmentEnabled.front || equipmentEnabled.rear,
    setActiveVehicle(nextVehicle) {
      activeVehicle = {
        id: nextVehicle.id,
        type: nextVehicle.type,
        name: nextVehicle.name,
        icon: nextVehicle.icon,
        slots: [...nextVehicle.slots],
      };
      activeLoadout = { ...nextVehicle.loadout };
      draftLoadout = { ...activeLoadout };
      equipmentEnabled = {
        front: Boolean(nextVehicle.frontToolEnabled),
        rear: Boolean(nextVehicle.rearToolEnabled),
      };
      renderEquipmentActions();
      inventoryHud = null;
      renderInventoryMeter();
      renderSecondaryAction();
      renderLoadoutBays();
    },
    setInventoryHud(nextInventory) {
      if (!nextInventory) inventoryHud = null;
      else {
        const capacity = Math.max(1, Number(nextInventory.capacity) || 1);
        inventoryHud = {
          id: String(nextInventory.id || 'inventory'),
          label: String(nextInventory.label || 'Storage'),
          iconId: String(nextInventory.iconId || 'silo'),
          amount: Math.max(0, Math.min(capacity, Number(nextInventory.amount) || 0)),
          capacity,
        };
      }
      renderInventoryMeter();
    },
    animate(dt) {
      const changedViews = new Set();
      for (const ticker of amountTickers.values()) {
        const difference = ticker.target - ticker.value;
        if (Math.abs(difference) < TICKER_STEP_LITRES) {
          if (ticker.value !== ticker.target) {
            ticker.value = ticker.target;
            changedViews.add(ticker.view);
          }
          continue;
        }
        ticker.elapsed += Math.max(0, dt);
        const ticks = Math.floor(ticker.elapsed * ticker.ticksPerSecond);
        if (!ticks) continue;
        ticker.elapsed -= ticks / ticker.ticksPerSecond;
        const step = Math.min(Math.abs(difference), ticks * TICKER_STEP_LITRES);
        ticker.value = Math.round((ticker.value + Math.sign(difference) * step) * 100) / 100;
        changedViews.add(ticker.view);
      }
      if (changedViews.has('inventory')) renderInventoryMeter();
      if (changedViews.has('silo')) renderSiloInventory();
      if (changedViews.has('milestone') && milestoneState) renderMilestone(milestoneState);
    },
    setStoragePopup(nextInventory) {
      if (!nextInventory) {
        if (!siloInventory) return;
        siloInventory = null;
        renderSiloInventory();
        return;
      }
      if (nextInventory.kind === 'cattle-barn') {
        const previousId = siloInventory?.id;
        const previousKind = siloInventory?.kind;
        const previousSignature = siloInventory?.signature;
        const machine = {
          type: nextInventory.machine?.type || 'tractor',
          capacity: Math.max(0, Number(nextInventory.machine?.capacity) || 0),
          contents: { ...nextInventory.machine?.contents },
          canTransfer: Boolean(nextInventory.machine?.canTransfer),
          carriedBale: Boolean(nextInventory.machine?.carriedBale),
          storageKind: nextInventory.machine?.storageKind || null,
        };
        const barn = {
          herd: Math.max(0, Math.floor(nextInventory.herd || 0)), capacity: Math.max(0, Math.floor(nextInventory.capacity || 0)),
          hayLitres: Math.max(0, Math.floor(nextInventory.hayLitres || 0)), hayCapacity: Math.max(1, Math.floor(nextInventory.hayCapacity || 1)),
          milkLitres: Math.max(0, Math.floor(nextInventory.milkLitres || 0)), milkCapacity: Math.max(1, Math.floor(nextInventory.milkCapacity || 1)),
          canFeed: Boolean(nextInventory.canFeed), canLoadMilk: Boolean(nextInventory.canLoadMilk),
        };
        const signature = Object.values(barn).join(':');
        siloInventory = { id: nextInventory.id, kind: nextInventory.kind, machine, barn, crops: [], signature };
        if (previousId !== nextInventory.id || previousKind !== nextInventory.kind || previousSignature !== signature) renderSiloInventory();
        else siloInventoryElement.hidden = false;
        positionStoragePopup(nextInventory.x, nextInventory.y, 150, 74);
        return;
      }
      const cropsInSilo = Array.isArray(nextInventory.items)
        ? nextInventory.items.flatMap(item => {
          const itemId = typeof item?.id === 'string' ? item.id : null;
          const amount = Math.max(0, Math.floor(Number(item?.amount) || 0));
          const target = Math.max(0, Math.floor(Number(item?.target) || 0));
          if (!itemId || (!crops[itemId] && !['hay-bale', 'milk'].includes(itemId))) return [];
          return [{
            id: itemId,
            name: typeof item.name === 'string' ? item.name : crops[itemId]?.name || itemId,
            icon: typeof item.icon === 'string' ? item.icon : itemId,
            unit: item.unit === 'bales' ? 'bales' : 'litres',
            amount,
            target,
            accepting: item?.accepting !== false,
            locked: Boolean(item?.locked),
          }];
        })
        : cropIds.flatMap(cropId => {
        const amount = Math.max(0, Math.floor(Number(nextInventory.contents?.[cropId]) || 0));
        return amount ? [{ id: cropId, amount }] : [];
      });
      const samePopup = siloInventory?.id === nextInventory.id && siloInventory?.kind === nextInventory.kind;
      const machine = {
        type: nextInventory.machine?.type || 'tractor',
        capacity: Math.max(0, Number(nextInventory.machine?.capacity) || 0),
        contents: { ...nextInventory.machine?.contents },
        canTransfer: Boolean(nextInventory.machine?.canTransfer),
        carriedBale: Boolean(nextInventory.machine?.carriedBale),
        storageKind: nextInventory.machine?.storageKind || null,
      };
      const carriedCropId = machine.carriedBale
        ? 'hay-bale'
        : Object.keys(machine.contents).find(cropId => machine.contents[cropId] > 0) || null;
      if (nextInventory.kind === 'silo' && crops[carriedCropId] && !cropsInSilo.some(crop => crop.id === carriedCropId)) {
        cropsInSilo.push({ id: carriedCropId, amount: 0 });
      }
      const signature = [
        nextInventory.kind,
        cropsInSilo.map(crop => `${crop.id}:${crop.unit}:${crop.amount}:${crop.target || ''}:${crop.accepting}:${crop.locked}`).join('|'),
        machine.type,
        machine.capacity,
        machine.canTransfer,
        machine.carriedBale,
        Object.entries(machine.contents).map(([itemId, amount]) => `${itemId}:${amount}`).sort().join('|'),
      ].join(';');
      const changed = siloInventory?.id !== nextInventory.id || siloInventory?.signature !== signature;
      for (const crop of cropsInSilo) {
        const previousAmount = samePopup
          ? siloInventory.crops.find(previous => previous.id === crop.id)?.amount || 0
          : crop.amount;
        const key = `${nextInventory.kind === 'cargo' ? 'cargo' : 'silo'}:${nextInventory.id}:${crop.id}`;
        const ticker = amountTickers.get(key);
        if (samePopup && changed && ticker) {
          ticker.value = previousAmount;
          ticker.target = crop.amount;
          ticker.elapsed = 0;
        }
        else tickerValue(key, crop.amount, previousAmount, TRANSFER_TICKS_PER_SECOND, 'silo');
      }
      siloInventory = {
        id: nextInventory.id,
        kind: nextInventory.kind,
        crops: cropsInSilo,
        machine,
        signature,
        carriedCropId,
        autoSelectCarriedCrop: !samePopup || siloInventory?.carriedCropId !== carriedCropId,
      };
      if (changed) renderSiloInventory();
      else siloInventoryElement.hidden = false;
      positionStoragePopup(nextInventory.x, nextInventory.y, 104, 54);
    },
    setMilestone: renderMilestone,
    setDebugUnlockables(nextUnlockables) {
      debugUnlockables = Array.isArray(nextUnlockables) ? nextUnlockables.map(unlockable => ({ ...unlockable })) : [];
      renderDebugUnlockables();
    },
    setDebugMilestones(nextMilestones) {
      debugMilestones = Array.isArray(nextMilestones) ? nextMilestones.map(milestone => ({ ...milestone })) : [];
      renderDebugMilestones();
    },
    setDebugTimeOfDay(nextPhase) {
      const phase = Number(nextPhase);
      if (!Number.isFinite(phase)) return;
      const normalized = ((phase % 1) + 1) % 1;
      if (Math.abs(normalized - debugDayPhase) < 1 / (24 * 60 * 2)) return;
      debugDayPhase = normalized;
      renderDebugTimeOfDay();
    },
    showMilestoneCelebration,
    setCinematicActive(active) {
      cinematicActive = Boolean(active);
      if (cinematicActive) document.body.dataset.cinematic = 'true';
      else delete document.body.dataset.cinematic;
      clearInput();
      setBackgroundInert(cinematicActive || overlayState !== null);
    },
    setUnlockedGates(nextGates) {
      const previousSeed = selectedSeedCropId();
      unlockedGates = new Set(Array.isArray(nextGates) ? nextGates : []);
      if (selectedBuilding === 'cattle-barn' && !unlockedGates.has('building:cattle-barn')) selectedBuilding = null;
      const availableCrops = availableCropIds();
      seedIndex = Math.max(0, availableCrops.indexOf(previousSeed));
      renderSecondaryAction();
      renderLoadoutBays();
      renderEquipmentActions();
      renderBuildMode();
    },
    isGameplayBlocked: () => overlayState !== null || screenshotHudHidden,
    isBarnOpen: () => overlayState === 'barn',
    setBarnAvailable(nextInsideBarn) {
      if (insideBarn === nextInsideBarn) return;
      insideBarn = nextInsideBarn;
      if (insideBarn) openBarn();
    },
    resetFarm() {
      cinematicActive = false;
      setScreenshotHudHidden(false);
      insideBarn = false;
      if (buildMode) setBuildMode(false);
      equipmentEnabled = { front: false, rear: false };
      inventoryHud = null;
      renderEquipmentActions();
      renderInventoryMeter();
      renderSecondaryAction();
      onEquipmentAction('front', false);
      onEquipmentAction('rear', false);
      if (overlayState) hideOverlay();
    },
  };
}
