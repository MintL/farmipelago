import { cropIds, crops } from '../gameplay/catalog/crops.js';
import { FRONT_EQUIPMENT, REAR_EQUIPMENT, equipmentDefinition } from '../gameplay/catalog/equipment.js';
import { DEFAULT_DAY_PHASE } from '../world/environment/index.js';
import { queryUiDom } from './dom.js';
import { cropIcon, createCropMeterRenderer, formatLitres } from './format.js';
import { createDebugView } from './debug-view.js';

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

export function createUi({ commands, cameraPresetFov = 38, panSurface }) {
  const {
    restart: onRestart,
    changeLoadout: onLoadoutChange,
    equipmentAction: onEquipmentAction,
    cycleVehicle: onCycleVehicle,
    siloLoad: onSiloLoad,
    siloUnload: onSiloUnload,
    barnFeed: onBarnFeed,
    barnLoadMilk: onBarnLoadMilk,
    repaintPen: onPenRepaint,
    selectBuildingType: onBuildingTypeSelected,
    constructionPrimaryAction: onConstructionPrimaryAction,
    constructionCancel: onConstructionCancel,
    constructionDemolish: onConstructionDemolish,
    constructionUndo: onConstructionUndo,
    cargoDropOff: onCargoDropOff,
    changeBuildMode: onBuildModeChange,
    buildPointerStart: onBuildPointerStart,
    buildPointerMove: onBuildPointerMove,
    buildPointerEnd: onBuildPointerEnd,
    buildPointerCancel: onBuildPointerCancel,
    overrideUnlock: onUnlockOverride = () => {},
    clearUnlockOverrides: onClearUnlockOverrides = () => {},
    changeCameraPreset: onCameraPresetChange = () => true,
    changeTimeOfDay: onTimeOfDayChange = () => true,
    changeFastGrowth: onFastGrowthChange = () => {},
    rotateCameraStep: onCameraRotateStep = () => true,
    zoomCamera: onCameraZoom = () => {},
    persistentStateChange: onPersistentStateChange = () => {},
    previewLoadout: onLoadoutPreview = () => {},
  } = commands;
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
  let demolishConfirmationId = null;
  let insideBarn = false;
  let overlayState = null;
  let stickPointer = null;
  let stickPress = null;
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
  let cameraGesturePinching = false;
  let cameraGestureConsumed = false;
  let cameraGestureDistance = 0;
  let seedCropToastTimer = null;
  let restoreFocus = null;
  let inventoryHud = null;
  let siloInventory = null;
  let siloCropId = null;
  let debugUnlockables = [];
  let debugCameraFov = Number(cameraPresetFov);
  let debugDayPhase = DEFAULT_DAY_PHASE;
  const amountTickers = new Map();

  const {
    topBar, overlay, barnDialog, pauseDialog, pauseBody,
    confirmBody, pauseTitle, controlsList, showControls, hideHud, showDebug, debugPanel,
    debugTimeSlider, debugTimeValue, debugFastGrowth, debugCameraPresets, debugUnlockList,
    clearUnlockOverrides, stickZone, stickBase, stickKnob,
    actionCluster, cycleVehicleButton, desktopHints, secondaryHint, secondaryHintLabel,
    frontToolToggle, rearToolToggle, seedCycleControl, seedCropToast, unloadButton,
    unloadIconUse, frontToolState, rearToolState, inventoryMeter, siloInventoryElement,
    siloCropIcon, siloCropIconUse, siloCropValue, previousSiloCrop, nextSiloCrop,
    siloLoadButton, siloUnloadButton, siloUnloadIconUse, villageNeeds, villageNeedsGrid,
    buildingToggle, buildPalette, buildingOptions, repaintPen,
    constructionPopup, constructionCancel, constructionUndo, constructionConfirm, constructionDemolish, demolitionWarning,
    barnStorageRows, viewHint, loadoutSummary, vehicleName, vehicleIdentity, applyLoadout,
  } = queryUiDom();
  const gameplayLayers = [topBar, stickZone, cycleVehicleButton, actionCluster, desktopHints, siloInventoryElement, constructionPopup];

  document.body.tabIndex = -1;
  const setInputMode = mode => { document.body.dataset.inputMode = mode; };
  setInputMode(matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard');

  const debugView = createDebugView({
    cameraPresets: debugCameraPresets,
    timeSlider: debugTimeSlider,
    timeValue: debugTimeValue,
    unlockList: debugUnlockList,
    clearOverrides: clearUnlockOverrides,
  });
  const renderDebugCameraPresets = () => debugView.renderCameraPresets(debugCameraFov);
  const renderDebugTimeOfDay = () => debugView.renderTimeOfDay(debugDayPhase);
  const renderDebugUnlockables = () => debugView.renderUnlockables(debugUnlockables);

  const renderCropMeter = createCropMeterRenderer();

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
    stickPress = null;
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
      distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
    };
  };

  const beginCameraGesturePointer = event => {
    cameraGesturePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (cameraGesturePointers.size === 2) {
      cameraGestureStart = cameraGestureCenter();
      cameraGestureDistance = cameraGestureStart.distance;
      cameraGestureTriggered = false;
      cameraGesturePinching = false;
      cameraGestureConsumed = true;
      clearPan();
      clearBuildPointer();
      panDragX = panDragY = 0;
    }
    else if (cameraGesturePointers.size > 2) cameraGestureStart = null;
  };

  const updateCameraGesturePointer = event => {
    const point = cameraGesturePointers.get(event.pointerId);
    if (!point) return false;
    point.x = event.clientX;
    point.y = event.clientY;
    if (!cameraGestureStart || cameraGestureTriggered) return cameraGestureConsumed || !buildMode;
    const center = cameraGestureCenter();
    if (!center) return true;
    if (cameraGesturePinching || Math.abs(center.distance - cameraGestureStart.distance) >= 10) {
      cameraGesturePinching = true;
      if (center.distance > 0 && cameraGestureDistance > 0) onCameraZoom(cameraGestureDistance / center.distance);
      cameraGestureDistance = center.distance;
      return true;
    }
    const dx = center.x - cameraGestureStart.x;
    const dy = center.y - cameraGestureStart.y;
    if (!buildMode && Math.abs(dx) >= CAMERA_SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.1) {
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
    const consumed = cameraGestureConsumed || !buildMode;
    cameraGesturePointers.delete(event.pointerId);
    if (cameraGesturePointers.size === 0) cameraGestureConsumed = false;
    cameraGestureStart = null;
    cameraGestureTriggered = false;
    return consumed;
  };

  const clearCameraGesture = () => {
    cameraGesturePointers.clear();
    cameraGestureConsumed = false;
    cameraGesturePinching = false;
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

  const villageTitle = villageNeeds.querySelector('.villageTitle');
  const settlementRule = villageNeeds.querySelector('.settlementRule');
  const settlementProgress = villageNeeds.querySelector('.settlementProgress');
  const settlementNext = villageNeeds.querySelector('.settlementNext');
  const settlementNextUnlocks = villageNeeds.querySelector('.settlementNextUnlocks');
  const villageCards = new Map();
  const renderVillageNeeds = (needs, machine) => {
    const settlement = siloInventory.settlement;
    villageTitle.textContent = `Settlement · Tier ${settlement.tier}`;
    settlementRule.textContent = `Complete any ${settlement.requiredCompletions} of ${needs.length}`;
    const progressText = settlement.complete ? `Tier ${settlement.tier} complete` : '';
    settlementProgress.hidden = !settlement.complete;
    if (settlementProgress.textContent !== progressText) settlementProgress.textContent = progressText;
    const next = settlement.nextDevelopment;
    settlementNext.hidden = !next;
    if (next) settlementNextUnlocks.textContent = next.unlocks.join(' · ');
    for (const [id, card] of villageCards) {
      if (needs.some(need => need.id === id)) continue;
      card.element.remove();
      villageCards.delete(id);
    }
    for (const need of needs) {
      let card = villageCards.get(need.id);
      if (!card) {
        const element = document.createElement('div');
        element.setAttribute('role', 'group');
        element.className = 'villageNeedCard';
        const name = document.createElement('strong');
        name.textContent = need.name;
        const amount = document.createElement('span');
        amount.className = 'villageNeedAmount';
        const status = document.createElement('span');
        status.className = 'settlementRequirementStatus';
        element.append(cropIcon(need.icon, need.name), name, amount, status);
        villageNeedsGrid.append(element);
        card = { element, amount, status };
        villageCards.set(need.id, card);
      }
      const amountText = `${need.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} / ${need.target.toLocaleString('en-US')}${need.unit === 'items' ? '' : ' L'}`;
      const optional = settlement.complete && !need.complete;
      const statusText = need.complete ? '✓ Complete' : optional ? '' : need.locked ? 'Unavailable' : need.amount > 0 ? 'In progress' : 'Not started';
      card.amount.textContent = amountText;
      card.status.style.visibility = optional ? 'hidden' : '';
      card.status.textContent = optional ? '\u00a0' : statusText;
      card.element.dataset.optional = String(optional);
      card.element.dataset.complete = String(need.complete);
      card.element.setAttribute('aria-label', `${need.name}: ${amountText}, ${optional ? 'optional' : statusText}`);
    }
    const carriedId = Object.keys(machine.contents).find(id => machine.contents[id] > 0);
    const carried = needs.find(need => need.id === carriedId);
    siloLoadButton.hidden = true;
    siloUnloadButton.disabled = !carried || !carried.accepting || !machine.canTransfer || machine.storageKind !== 'crop'
      || !(machine.contents[carried.id] > 0);
    siloUnloadButton.setAttribute('aria-label', `Deliver ${carried?.name || 'carried crop'} to settlement`);
    siloUnloadButton.title = `Deliver ${carried?.name || 'carried crop'}`;
    siloUnloadIconUse.setAttribute('href', '#icon-silo-unload');
    siloInventoryElement.setAttribute('aria-label', villageTitle.textContent);
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
    const settlementInput = siloInventory.kind === 'cargo';
    villageNeeds.hidden = !settlementInput;
    siloInventoryElement.setAttribute('aria-live', settlementInput ? 'off' : 'polite');
    barnStorageRows.hidden = !cattleBarn;
    document.querySelector('.siloInventoryCrop').hidden = cattleBarn || settlementInput;
    previousSiloCrop.hidden = cattleBarn || settlementInput;
    nextSiloCrop.hidden = cattleBarn || settlementInput;
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
      const carriedCrop = cropsInSilo.find(crop => crop.id === carriedId && (!settlementInput || crop.accepting));
      if (carriedCrop) siloCropId = carriedCrop.id;
      siloInventory.autoSelectCarriedCrop = false;
    }
    if (settlementInput) {
      renderVillageNeeds(cropsInSilo, machine);
      return;
    }
    const crop = cropsInSilo.find(entry => entry.id === siloCropId) || cropsInSilo[0] || null;
    const canLoad = machine.storageKind === 'crop' && Boolean(crop?.amount) && machine.canTransfer
      && tankAmount < machine.capacity && (!tankCropId || tankCropId === crop.id);
    const canUnload = machine.storageKind === 'crop' && machine.canTransfer && tankAmount > 0;
    previousSiloCrop.disabled = cropsInSilo.length < 2;
    nextSiloCrop.disabled = cropsInSilo.length < 2;
    siloLoadButton.hidden = false;
    const unloadLabel = 'Unload cargo into silo';
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
    const tickerKey = `silo:${siloInventory.id}:${crop.id}`;
    const displayAmount = tickerValue(tickerKey, crop.amount, crop.amount, TRANSFER_TICKS_PER_SECOND, 'silo');
    siloCropValue.textContent = formatLitres(displayAmount);
    siloInventoryElement.setAttribute('aria-label', `Silo inventory: ${formatLitres(crop.amount)} ${itemName}`);
  };

  const positionStoragePopup = (x, y, minimumTop, bottomMargin) => {
    const bounds = siloInventoryElement.getBoundingClientRect();
    const popupHalfWidth = bounds.width * .5;
    if (siloInventory?.kind === 'cargo') {
      const safe = topBar.getBoundingClientRect();
      const left = safe.left;
      const right = innerWidth - safe.right;
      const top = safe.top;
      const centerX = Math.max(left + popupHalfWidth, Math.min(innerWidth - right - popupHalfWidth, x));
      const minAnchorY = top + bounds.height + 8;
      // The silo-style delivery action sits below the popup's own bounds.
      const actionHeight = siloUnloadButton.getBoundingClientRect().height + 8;
      let anchorY = Math.max(minAnchorY, Math.min(innerHeight - top - actionHeight, y));
      // Hidden desktop controls have empty rectangles; they must not push the
      // popup to the top. Only avoid controls that intersect its actual bounds.
      const controls = [stickZone, cycleVehicleButton, ...actionCluster.querySelectorAll('button')];
      const obstacles = controls.flatMap(control => {
        const rect = control.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(control).visibility !== 'hidden';
        return visible ? [rect] : [];
      }).sort((a, b) => b.top - a.top);
      for (const rect of obstacles) {
        const overlapsX = centerX + popupHalfWidth > rect.left - 8 && centerX - popupHalfWidth < rect.right + 8;
        const overlapsY = anchorY - 8 + actionHeight > rect.top - 8 && anchorY - 8 - bounds.height < rect.bottom + 8;
        if (overlapsX && overlapsY) anchorY = Math.max(minAnchorY, rect.top - actionHeight);
      }
      siloInventoryElement.style.left = `${centerX}px`;
      siloInventoryElement.style.top = `${anchorY}px`;
      return;
    }
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

  const renderConstructionPopup = () => {
    const state = constructionUiState;
    const visible = buildMode && state && !state.hidden;
    constructionPopup.hidden = !visible;
    if (!visible || state.buildingId !== demolishConfirmationId || state.phase !== 'complete') demolishConfirmationId = null;
    if (!state) return;
    const confirmingDemolition = demolishConfirmationId === state.buildingId;
    constructionPopup.dataset.confirmingDemolition = String(confirmingDemolition);
    demolitionWarning.hidden = !confirmingDemolition;
    demolitionWarning.textContent = state.type === 'cattle-barn'
      ? 'You will lose this barn, its pen, all cattle, and any stored hay and milk. This cannot be undone.'
      : 'You will lose this silo and all crops stored inside. This cannot be undone.';
    if (confirmingDemolition) constructionDemolish.setAttribute('aria-describedby', 'demolitionWarning');
    else constructionDemolish.removeAttribute('aria-describedby');
    constructionDemolish.hidden = state.phase !== 'complete';
    constructionDemolish.textContent = demolishConfirmationId === state.buildingId ? 'Confirm demolish' : 'Demolish';
    constructionCancel.hidden = state.phase === 'complete';
    constructionConfirm.hidden = state.phase === 'complete';
    constructionUndo.hidden = state.phase !== 'pen-draft';
    constructionConfirm.textContent = state.primaryLabel;
    constructionConfirm.disabled = state.primaryAction === 'confirm' && !state.canConfirm;
    constructionConfirm.setAttribute('aria-label', state.primaryLabel);
    const popupHalfWidth = constructionPopup.getBoundingClientRect().width * .5;
    const horizontalMargin = popupHalfWidth + 12;
    if (Number.isFinite(state.x)) constructionPopup.style.left = `${innerWidth <= horizontalMargin * 2
      ? innerWidth * .5
      : Math.max(horizontalMargin, Math.min(innerWidth - horizontalMargin, state.x))}px`;
    if (Number.isFinite(state.y)) constructionPopup.style.top = `${Math.max(70, constructionPopup.getBoundingClientRect().height + 20, Math.min(innerHeight - 48, state.y))}px`;
  };

  const constructionHint = () => {
    const state = constructionUiState;
    if (!state) {
      if (selectedBuilding) return 'DRAG ON LAND TO PLACE';
      return '';
    }
    if (state.phase === 'complete') return 'SELECTED BUILDING · DEMOLISH TO CLEAR THIS SITE';
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
    if (event.target.closest?.('#zoomControls button') && ['Space', 'Enter'].includes(event.code)) return;
    if (!event.ctrlKey && !event.metaKey && !event.altKey && ['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'].includes(event.code)) {
      event.preventDefault();
      onCameraZoom(['Equal', 'NumpadAdd'].includes(event.code) ? 1 / 1.2 : 1.2);
      return;
    }
    if (event.target.closest?.('#siloInventory button') && ['Space', 'Enter'].includes(event.code)) return;
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

  document.querySelector('#zoomIn').addEventListener('click', () => {
    if (!inputLocked()) onCameraZoom(1 / 1.2);
  });
  document.querySelector('#zoomOut').addEventListener('click', () => {
    if (!inputLocked()) onCameraZoom(1.2);
  });
  panSurface.addEventListener('wheel', event => {
    if (inputLocked()) return;
    event.preventDefault();
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    onCameraZoom(Math.exp(Math.max(-100, Math.min(100, pixels)) * .002));
  }, { passive: false });

  panSurface.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !inputLocked()) {
      event.preventDefault();
      beginCameraGesturePointer(event);
      panSurface.setPointerCapture(event.pointerId);
      if (!buildMode || cameraGestureConsumed) return;
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
    stickPress = { x: event.clientX, y: event.clientY, dragging: false };
    stickZone.setPointerCapture(event.pointerId);
    // A tap can select the world beneath the stick; dragging starts driving.

  });
  stickZone.addEventListener('pointermove', event => {
    if (event.pointerId !== stickPointer || !stickPress) return;
    if (Math.hypot(event.clientX - stickPress.x, event.clientY - stickPress.y) > 9) stickPress.dragging = true;
    if (stickPress.dragging) updateStick(event);
  });
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
  constructionConfirm.addEventListener('click', () => {
    if (!buildMode || constructionConfirm.disabled) return;
    const completingBuilding = constructionUiState?.primaryAction === 'confirm';
    const changed = onConstructionPrimaryAction?.();
    if (changed && completingBuilding) setBuildMode(false);
  });
  constructionCancel.addEventListener('click', () => { if (buildMode) onConstructionCancel?.(); });
  constructionDemolish.addEventListener('click', () => {
    const state = constructionUiState;
    if (!buildMode || state?.phase !== 'complete') return;
    if (demolishConfirmationId !== state.buildingId) {
      demolishConfirmationId = state.buildingId;
      renderConstructionPopup();
      return;
    }
    demolishConfirmationId = null;
    onConstructionDemolish?.(state.buildingId);
    renderConstructionPopup();
  });
  document.addEventListener('pointerdown', event => {
    if (!demolishConfirmationId || constructionDemolish.contains(event.target)) return;
    demolishConfirmationId = null;
    renderConstructionPopup();
  }, { capture: true });
  constructionDemolish.addEventListener('blur', () => {
    demolishConfirmationId = null;
    renderConstructionPopup();
  });
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
    else if (siloInventory.kind === 'cargo') onCargoDropOff();
    else onSiloUnload(siloInventory.id);
  });
  document.querySelector('#menuToggle').addEventListener('click', openPause);
  document.querySelector('#closeBarn').addEventListener('click', closeBarn);
  document.querySelector('#cancelLoadout').addEventListener('click', closeBarn);
  applyLoadout.addEventListener('click', equipDraft);
  document.querySelector('#closePause').addEventListener('click', closePause);
  document.querySelector('#resumeGame').addEventListener('click', closePause);
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
  debugFastGrowth.addEventListener('change', () => {
    onFastGrowthChange(debugFastGrowth.checked);
    onPersistentStateChange();
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
    const dialog = overlayState === 'barn' ? barnDialog : pauseDialog;
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
    persistentState: () => ({ seedCropId: selectedSeedCropId(), fastGrowth: debugFastGrowth.checked }),
    restorePersistentState(savedState) {
      debugFastGrowth.checked = savedState?.fastGrowth !== false;
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
          const amount = Math.max(0, Number(item?.amount) || 0);
          const target = Math.max(0, Math.floor(Number(item?.target) || 0));
          if (!itemId || (nextInventory.kind !== 'cargo' && !crops[itemId] && !['hay-bale', 'milk'].includes(itemId))) return [];
          return [{
            id: itemId,
            name: typeof item.name === 'string' ? item.name : crops[itemId]?.name || itemId,
            icon: typeof item.icon === 'string' ? item.icon : itemId,
            unit: ['bales', 'items'].includes(item.unit) ? item.unit : 'litres',
            amount,
            target,
            complete: item?.complete === true,
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
      const settlement = nextInventory.kind === 'cargo' ? nextInventory.settlement : null;
      const signature = [
        nextInventory.kind,
        JSON.stringify(settlement),
        cropsInSilo.map(crop => `${crop.id}:${crop.unit}:${crop.amount}:${crop.target || ''}:${crop.accepting}:${crop.locked}:${crop.complete}`).join('|'),
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
        settlement,
        machine,
        signature,
        carriedCropId,
        autoSelectCarriedCrop: !samePopup || siloInventory?.carriedCropId !== carriedCropId,
      };
      if (changed) renderSiloInventory();
      else siloInventoryElement.hidden = false;
      positionStoragePopup(nextInventory.x, nextInventory.y, 104, 54);
    },
    setDebugUnlockables(nextUnlockables) {
      debugUnlockables = Array.isArray(nextUnlockables) ? nextUnlockables.map(unlockable => ({ ...unlockable })) : [];
      renderDebugUnlockables();
    },
    setDebugTimeOfDay(nextPhase) {
      const phase = Number(nextPhase);
      if (!Number.isFinite(phase)) return;
      const normalized = ((phase % 1) + 1) % 1;
      if (Math.abs(normalized - debugDayPhase) < 1 / (24 * 60 * 2)) return;
      debugDayPhase = normalized;
      renderDebugTimeOfDay();
    },
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
