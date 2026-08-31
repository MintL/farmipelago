import { cropIds, crops } from './crops.js?v=crop-diversity-20260831-1';

const CATEGORIES = [
  { id: 'equipment', key: 'tool', label: 'Equipment', icon: 'plough' },
  { id: 'frontTools', key: 'frontTool', label: 'Front tool', icon: 'utility' },
];

const CATALOG = {
  equipment: [
    { id: 'plough', name: 'Plough', icon: 'plough', description: 'Turns grass tiles into prepared soil across four rows.', status: 'Available' },
    { id: 'seeder', name: 'Seeder', icon: 'seeder', description: 'Plants the selected seed in two clean rows of prepared soil.', status: 'Available' },
    { id: 'sprayer', name: 'Sprayer', icon: 'sprayer', description: 'Covers a wide strip and clears weeds from growing crops.', status: 'Available' },
  ],
  frontTools: [
    { id: 'loader', name: 'Front Loader', icon: 'utility', description: 'Move and lift heavy objects.', status: 'Available' },
    { id: 'forks', name: 'Pallet Forks', icon: 'utility', description: 'Carry crates and stacked supplies.', status: 'Not yet available', locked: true },
    { id: 'weight', name: 'Front Weight', icon: 'utility', description: 'Adds stability for heavy rear work.', status: 'Not yet available', locked: true },
  ],
};

const TOOL_LABELS = { plough: 'Plough', seeder: 'Seeder', sprayer: 'Sprayer' };
const DEFAULT_LOADOUT = { tool: 'plough', frontTool: 'loader' };

export function createUi({ onRegenerate, onLoadoutChange, onToolChange, onCycleVehicle, onStorageAction, onCropOverlayChange, onBuildModeChange, onBuildPointerStart, onBuildPointerMove, onBuildPointerEnd, onBuildPointerCancel, onLoadoutPreview = () => {}, panSurface }) {
  const input = { x: 0, y: 0, jumpQueued: false };
  const keys = new Set();
  let activeLoadout = { ...DEFAULT_LOADOUT };
  let draftLoadout = { ...activeLoadout };
  let activeVehicle = { id: 'tractor-1', type: 'tractor', name: 'Farm Tractor', icon: 'tractor', slots: ['tool', 'frontTool'] };
  let toolEnabled = false;
  let cropIndex = Math.max(0, cropIds.indexOf('corn'));
  let seedIndex = Math.max(0, cropIds.indexOf('corn'));
  let cropOverlayEnabled = false;
  let buildMode = false;
  let selectedBuilding = null;
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
  let toastTimer = null;
  let restoreFocus = null;
  let grainFill = 0;
  let grainCapacity = 36;
  let grainLabel = 'Storage';
  let storageAction = { kind: 'hidden', enabled: false };

  const topBar = document.querySelector('#topBar');
  const overlay = document.querySelector('#overlay');
  const barnDialog = document.querySelector('#barnDialog');
  const pauseDialog = document.querySelector('#pauseDialog');
  const pauseBody = document.querySelector('#pauseBody');
  const confirmBody = document.querySelector('#confirmBody');
  const pauseTitle = document.querySelector('#pauseTitle');
  const controlsList = document.querySelector('#controlsList');
  const showControls = document.querySelector('#showControls');
  const stickZone = document.querySelector('#stickZone');
  const stickBase = document.querySelector('#stickBase');
  const stickKnob = document.querySelector('#stickKnob');
  const actionCluster = document.querySelector('#actionCluster');
  const cycleVehicleButton = document.querySelector('#cycleVehicle');
  const desktopHints = document.querySelector('#desktopHints');
  const secondaryHint = document.querySelector('#secondaryHint');
  const secondaryHintLabel = document.querySelector('#secondaryHintLabel');
  const toolToggle = document.querySelector('#toolToggle');
  const unloadButton = document.querySelector('#unloadButton');
  const unloadIconUse = document.querySelector('#unloadIconUse');
  const toolIconUse = document.querySelector('#toolIconUse');
  const toolName = document.querySelector('#toolName');
  const toolState = document.querySelector('#toolState');
  const grainMeter = document.querySelector('#grainMeter');
  const grainMeterLabel = document.querySelector('#grainMeterLabel');
  const grainFillElement = document.querySelector('#grainFill');
  const grainValue = document.querySelector('#grainValue');
  const milestoneTracker = document.querySelector('#milestoneTracker');
  const milestoneTitle = document.querySelector('#milestoneTitle');
  const milestoneStatus = document.querySelector('#milestoneStatus');
  const milestoneRows = document.querySelector('#milestoneRows');
  const suitabilityToggle = document.querySelector('#suitabilityToggle');
  const buildingToggle = document.querySelector('#buildingToggle');
  const buildPalette = document.querySelector('#buildPalette');
  const siloOption = document.querySelector('#siloOption');
  const viewHint = document.querySelector('#viewHint');
  const cropSelector = document.querySelector('#cropSelector');
  const cropName = document.querySelector('#cropName');
  const toastElement = document.querySelector('#toast');
  const loadoutSummary = document.querySelector('#loadoutSummary');
  const vehicleName = document.querySelector('#vehicleName');
  const vehicleIdentity = document.querySelector('#vehicleIdentity');
  const applyLoadout = document.querySelector('#applyLoadout');
  const gameplayLayers = [topBar, stickZone, cycleVehicleButton, actionCluster, desktopHints];
  const stickRadius = 43;

  document.body.tabIndex = -1;
  const setInputMode = mode => { document.body.dataset.inputMode = mode; };
  setInputMode(matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard');

  const toast = message => {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.remove('show'), 1100);
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

  const clearInput = () => {
    keys.clear();
    input.jumpQueued = false;
    clearStick();
    clearPan();
    clearBuildPointer();
    panDragX = panDragY = 0;
  };

  const renderTool = () => {
    if (activeVehicle.type === 'harvester') {
      const action = toolEnabled ? 'Stop' : 'Start';
      toolToggle.setAttribute('aria-label', `${action} header`);
      toolToggle.setAttribute('aria-pressed', String(toolEnabled));
      toolToggle.title = `${action} header`;
      toolIconUse.setAttribute('href', '#icon-harvester');
      toolName.textContent = 'Harvest header';
      toolState.textContent = toolEnabled ? 'Collecting · 2.9 speed' : 'Ready to harvest · 5.8 speed';
      return;
    }
    const label = TOOL_LABELS[activeLoadout.tool];
    const action = toolEnabled ? 'Raise' : 'Lower';
    toolToggle.setAttribute('aria-label', `${action} ${label}`);
    toolToggle.setAttribute('aria-pressed', String(toolEnabled));
    toolToggle.title = `${action} ${label}`;
    toolIconUse.setAttribute('href', `#icon-${activeLoadout.tool}`);
    toolName.textContent = label;
    toolState.textContent = toolEnabled ? 'Lowered · 2.9 speed' : 'Raised · 5.8 speed';
  };

  const renderGrainMeter = () => {
    const visible = activeVehicle.type === 'harvester';
    grainMeter.hidden = !visible;
    const percent = grainCapacity ? Math.round(grainFill / grainCapacity * 100) : 0;
    grainMeterLabel.textContent = grainLabel;
    grainFillElement.style.width = `${percent}%`;
    grainValue.textContent = `${grainFill} / ${grainCapacity}`;
    grainMeter.setAttribute('aria-valuenow', String(percent));
    grainMeter.setAttribute('aria-valuetext', `${grainFill} of ${grainCapacity} ${grainLabel.toLowerCase()} stored`);
  };

  const renderSecondaryAction = () => {
    const seederActive = activeVehicle.type !== 'harvester' && activeLoadout.tool === 'seeder';
    const visible = seederActive || (activeVehicle.type === 'harvester' && storageAction.kind !== 'hidden');
    unloadButton.hidden = !visible;
    secondaryHint.hidden = !visible;
    if (seederActive) {
      const cropId = cropIds[seedIndex];
      const nextCrop = crops[cropIds[(seedIndex + 1) % cropIds.length]];
      unloadButton.setAttribute('aria-disabled', 'false');
      unloadButton.setAttribute('aria-label', `${crops[cropId].name} seed selected. Select ${nextCrop.name} seed`);
      unloadButton.title = `${crops[cropId].name} seed · select ${nextCrop.name}`;
      unloadIconUse.setAttribute('href', `#icon-${cropId}`);
      secondaryHintLabel.textContent = 'Seed';
      return;
    }
    unloadIconUse.setAttribute('href', '#icon-unload');
    secondaryHintLabel.textContent = 'Transfer cargo';
    unloadButton.setAttribute('aria-disabled', String(!storageAction.enabled));
    if (storageAction.kind === 'cargo') {
      unloadButton.setAttribute('aria-label', storageAction.enabled ? 'Drop off required produce at cargo pad' : 'Cargo pad cannot accept this storage');
      unloadButton.title = storageAction.enabled ? 'Drop off produce' : 'Cargo pad awaiting required produce';
    }
    else if (storageAction.kind === 'silo') {
      unloadButton.setAttribute('aria-label', storageAction.enabled ? 'Empty combine into nearby silo' : 'Combine storage is empty');
      unloadButton.title = storageAction.enabled ? 'Empty combine' : 'Storage empty';
    }
    else {
      unloadButton.setAttribute('aria-label', 'Move beside a silo or cargo pad');
      unloadButton.title = 'Find a storage destination';
    }
  };

  const useSecondaryAction = () => {
    if (overlayState || cropOverlayEnabled || buildMode) return;
    if (activeVehicle.type !== 'harvester' && activeLoadout.tool === 'seeder') {
      seedIndex = (seedIndex + 1) % cropIds.length;
      renderSecondaryAction();
      toast(`${crops[cropIds[seedIndex]].name} seed selected`);
      return;
    }
    if (activeVehicle.type === 'harvester') onStorageAction();
  };

  const renderMilestone = milestone => {
    milestoneTitle.textContent = `Milestone ${milestone.number}`;
    milestoneStatus.textContent = milestone.complete ? 'Awaiting pickup' : milestone.title;
    milestoneTracker.dataset.complete = String(milestone.complete);
    milestoneRows.replaceChildren();
    for (const requirement of milestone.requirements) {
      const row = document.createElement('div');
      const heading = document.createElement('div');
      const name = document.createElement('span');
      const value = document.createElement('strong');
      const track = document.createElement('div');
      const fill = document.createElement('span');
      const percent = requirement.target ? Math.min(100, requirement.delivered / requirement.target * 100) : 0;
      row.className = 'milestoneRow';
      heading.className = 'milestoneRowHeading';
      name.textContent = requirement.name;
      value.textContent = `${requirement.delivered} / ${requirement.target}`;
      track.className = 'milestoneTrack';
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', `${requirement.name} delivered`);
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', String(requirement.target));
      track.setAttribute('aria-valuenow', String(requirement.delivered));
      track.setAttribute('aria-valuetext', `${requirement.delivered} of ${requirement.target} ${requirement.name} delivered`);
      fill.style.width = `${percent}%`;
      heading.append(name, value);
      track.append(fill);
      row.append(heading, track);
      milestoneRows.append(row);
    }
  };

  const renderCropOverlay = () => {
    const crop = crops[cropIds[cropIndex]];
    suitabilityToggle.setAttribute('aria-pressed', String(cropOverlayEnabled));
    suitabilityToggle.setAttribute('aria-label', cropOverlayEnabled ? 'Hide crop suitability' : 'Show crop suitability');
    cropSelector.hidden = !cropOverlayEnabled;
    cropName.textContent = crop.name;
    document.body.dataset.viewMode = buildMode ? 'build' : cropOverlayEnabled ? 'overlay' : 'drive';
  };

  const renderBuildMode = () => {
    buildingToggle.setAttribute('aria-pressed', String(buildMode));
    buildingToggle.setAttribute('aria-label', buildMode ? 'Leave building mode' : 'Open building menu');
    buildingToggle.title = buildMode ? 'Leave building mode' : 'Buildings';
    buildPalette.hidden = !buildMode;
    siloOption.setAttribute('aria-pressed', String(selectedBuilding === 'silo'));
    viewHint.textContent = buildMode
      ? selectedBuilding ? 'DRAG ON LAND TO PLACE · WASD / ARROWS TO PAN' : 'SELECT A BUILDING · DRAG EMPTY GROUND TO PAN'
      : 'DRAG TO PAN · WASD / ARROWS · CLOSE SUITABILITY TO DRIVE';
    renderCropOverlay();
  };

  const notifyCropOverlay = () => onCropOverlayChange({ enabled: cropOverlayEnabled, cropId: cropIds[cropIndex] });

  const setCropOverlay = enabled => {
    if (overlayState || cropOverlayEnabled === enabled) return;
    if (enabled && buildMode) setBuildMode(false, true);
    cropOverlayEnabled = enabled;
    clearInput();
    renderCropOverlay();
    notifyCropOverlay();
    toast(cropOverlayEnabled ? `${crops[cropIds[cropIndex]].name} suitability` : 'Driving view');
  };

  const setBuildMode = (enabled, silent = false) => {
    if (overlayState || buildMode === enabled) return;
    if (enabled && cropOverlayEnabled) {
      cropOverlayEnabled = false;
      notifyCropOverlay();
    }
    buildMode = enabled;
    if (!buildMode) selectedBuilding = null;
    clearInput();
    renderBuildMode();
    onBuildModeChange(buildMode);
    if (!silent) toast(buildMode ? 'Building mode' : 'Driving view');
  };

  const toggleTool = () => {
    if (overlayState || cropOverlayEnabled || buildMode) return;
    toolEnabled = !toolEnabled;
    renderTool();
    onToolChange(toolEnabled);
    const label = activeVehicle.type === 'harvester' ? 'Header' : TOOL_LABELS[activeLoadout.tool];
    const state = activeVehicle.type === 'harvester' ? (toolEnabled ? 'started' : 'stopped') : (toolEnabled ? 'lowered' : 'raised');
    toast(`${label} ${state}`);
  };

  const cycleVehicle = () => {
    if (overlayState || cropOverlayEnabled || buildMode) return;
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
    const names = CATEGORIES.filter(category => activeVehicle.slots.includes(category.key)).map(category => itemFor(category.id, draftLoadout[category.key]).name);
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
          button.className = `loadoutOption${item.locked ? ' locked' : ''}`;
          button.setAttribute('aria-label', `${item.name}${item.locked ? ', locked preview' : ''}`);
          name.className = 'optionName';
          name.textContent = item.name;
          state.className = 'optionState';
          button.append(name, state);
          button.addEventListener('click', () => {
            if (item.locked || !activeVehicle.slots.includes(category.key)) return;
            draftLoadout[category.key] = item.id;
            renderLoadoutBays();
          });
          options.append(button);
        });
      }
      [...options.children].forEach((button, index) => {
        const item = CATALOG[category.id][index];
        const selected = draftLoadout[category.key] === item.id;
        const unavailable = !activeVehicle.slots.includes(category.key);
        options.closest('.loadoutBay').classList.toggle('unavailable', unavailable);
        button.disabled = unavailable;
        button.setAttribute('aria-disabled', String(unavailable));
        button.setAttribute('aria-pressed', String(selected));
        button.querySelector('.optionState').textContent = unavailable ? 'Unavailable' : item.locked ? 'Preview' : selected ? 'Selected' : 'Select';
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
    setBackgroundInert(false);
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
  };

  const openPause = () => {
    if (overlayState) return;
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
    if (overlayState || cropOverlayEnabled) return;
    draftLoadout = { ...activeLoadout };
    renderLoadoutBays();
    showOverlay('barn', barnDialog);
  };

  const closeBarn = () => {
    if (overlayState !== 'barn') return;
    draftLoadout = { ...activeLoadout };
    hideOverlay();
  };

  const equipDraft = () => {
    if (overlayState !== 'barn' || !loadoutChanged()) return;
    activeLoadout = { ...draftLoadout };
    toolEnabled = false;
    renderTool();
    onLoadoutChange({ ...activeLoadout });
    onToolChange(false);
    hideOverlay();
    renderGrainMeter();
    renderSecondaryAction();
    const label = activeVehicle.type === 'harvester' ? 'Combine Harvester' : TOOL_LABELS[activeLoadout.tool];
    toast(`${label} equipped`);
  };

  const updateStick = event => {
    const rect = stickZone.getBoundingClientRect();
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
    if (event.code === 'Escape') {
      event.preventDefault();
      if (overlayState === 'barn') closeBarn();
      else if (overlayState) closePause();
      else if (buildMode) setBuildMode(false);
      else if (cropOverlayEnabled) setCropOverlay(false);
      else openPause();
      return;
    }
    if (overlayState === 'barn') {
      const index = { Digit1: 0, Digit2: 1, Digit3: 2 }[event.code];
      if (index !== undefined) {
        const item = CATALOG.equipment[index];
        if (!item.locked && activeVehicle.slots.includes('tool')) draftLoadout.tool = item.id;
        renderLoadoutBays();
      }
      return;
    }
    if (overlayState) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (!cropOverlayEnabled && !buildMode && event.code === 'Space' && !event.repeat) input.jumpQueued = true;
    if (!cropOverlayEnabled && !buildMode && event.code === 'KeyE' && !event.repeat) toggleTool();
    if (!cropOverlayEnabled && !buildMode && event.code === 'KeyF' && !event.repeat) useSecondaryAction();
    if (!cropOverlayEnabled && !buildMode && event.code === 'KeyV' && !event.repeat) cycleVehicle();
    if (!cropOverlayEnabled && event.code === 'KeyB' && !event.repeat) setBuildMode(!buildMode);
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', clearInput);
  window.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') setInputMode('touch'); }, { capture: true });

  panSurface.addEventListener('pointerdown', event => {
    if ((!cropOverlayEnabled && !buildMode) || overlayState || panPointer !== null || buildPointer !== null) return;
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
    if (event.pointerId === buildPointer) {
      onBuildPointerEnd?.();
      buildPointer = null;
    }
    clearPan(event);
  });
  panSurface.addEventListener('pointercancel', event => {
    clearBuildPointer(event);
    clearPan(event);
  });
  panSurface.addEventListener('lostpointercapture', event => {
    clearBuildPointer(event);
    clearPan(event);
  });

  stickZone.addEventListener('pointerdown', event => {
    if (overlayState || cropOverlayEnabled || buildMode || stickPointer !== null) return;
    event.preventDefault();
    setInputMode('touch');
    const rect = stickZone.getBoundingClientRect();
    const edge = 72;
    stickOrigin.x = Math.max(edge, Math.min(rect.width - edge, event.clientX - rect.left));
    stickOrigin.y = Math.max(edge, Math.min(rect.height - edge, event.clientY - rect.top));
    stickBase.style.left = `${stickOrigin.x}px`;
    stickBase.style.top = `${stickOrigin.y}px`;
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
    if (overlayState || cropOverlayEnabled || buildMode) return;
    event.preventDefault();
    input.jumpQueued = true;
  });
  cycleVehicleButton.addEventListener('click', cycleVehicle);
  toolToggle.addEventListener('click', toggleTool);
  unloadButton.addEventListener('click', useSecondaryAction);
  suitabilityToggle.addEventListener('click', () => setCropOverlay(!cropOverlayEnabled));
  buildingToggle.addEventListener('click', () => setBuildMode(!buildMode));
  siloOption.addEventListener('click', () => {
    if (!buildMode) return;
    selectedBuilding = selectedBuilding === 'silo' ? null : 'silo';
    renderBuildMode();
    toast(selectedBuilding ? 'Silo selected · free' : 'Building selection cleared');
  });
  document.querySelector('#previousCrop').addEventListener('click', () => {
    cropIndex = (cropIndex + cropIds.length - 1) % cropIds.length;
    renderCropOverlay();
    notifyCropOverlay();
  });
  document.querySelector('#nextCrop').addEventListener('click', () => {
    cropIndex = (cropIndex + 1) % cropIds.length;
    renderCropOverlay();
    notifyCropOverlay();
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
  document.querySelector('#requestRegenerate').addEventListener('click', () => {
    overlayState = 'confirm';
    pauseBody.hidden = true;
    confirmBody.hidden = false;
    pauseTitle.textContent = 'Generate new farm?';
    document.querySelector('#cancelRegenerate').focus();
  });
  document.querySelector('#cancelRegenerate').addEventListener('click', closePause);
  document.querySelector('#confirmRegenerate').addEventListener('click', () => {
    toolEnabled = false;
    renderTool();
    onToolChange(false);
    hideOverlay();
    onRegenerate();
    toast('New farm generated');
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

  renderTool();
  renderGrainMeter();
  renderSecondaryAction();
  renderCropOverlay();
  renderBuildMode();
  renderLoadoutBays();

  return {
    driveInput() {
      if (overlayState || cropOverlayEnabled || buildMode) return { x: 0, y: 0 };
      let x = 0, y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x || y) return { x, y: -y };
      return { x: input.x, y: -input.y };
    },
    consumePan() {
      if (overlayState || (!cropOverlayEnabled && !buildMode)) return { keyboardX: 0, keyboardZ: 0, dragX: 0, dragY: 0 };
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
      if (overlayState || cropOverlayEnabled || buildMode) return false;
      const jump = input.jumpQueued;
      input.jumpQueued = false;
      return jump;
    },
    activeLoadout: () => ({ ...activeLoadout, vehicle: activeVehicle.type }),
    activeSeedId: () => cropIds[seedIndex],
    cropOverlayState: () => ({ enabled: cropOverlayEnabled, cropId: cropIds[cropIndex] }),
    buildState: () => ({ enabled: buildMode, selectedBuilding }),
    clearBuildingSelection() {
      selectedBuilding = null;
      renderBuildMode();
    },
    toolEnabled: () => toolEnabled,
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
      toolEnabled = Boolean(nextVehicle.toolEnabled);
      storageAction = { kind: activeVehicle.type === 'harvester' ? 'unavailable' : 'hidden', enabled: false };
      renderTool();
      renderGrainMeter();
      renderSecondaryAction();
      renderLoadoutBays();
    },
    setHarvestMeter(nextFill, nextCapacity, nextLabel = 'Storage') {
      grainFill = Math.max(0, Math.min(nextCapacity, nextFill));
      grainCapacity = nextCapacity;
      grainLabel = nextLabel;
      renderGrainMeter();
    },
    setStorageAction(nextAction) {
      storageAction = { kind: nextAction.kind, enabled: Boolean(nextAction.enabled) };
      renderSecondaryAction();
    },
    setMilestone: renderMilestone,
    isGameplayBlocked: () => overlayState !== null,
    isBarnOpen: () => overlayState === 'barn',
    setBarnAvailable(nextInsideBarn) {
      if (insideBarn === nextInsideBarn) return;
      insideBarn = nextInsideBarn;
      if (insideBarn) openBarn();
    },
    resetFarm() {
      insideBarn = false;
      if (buildMode) setBuildMode(false, true);
      toolEnabled = false;
      grainFill = 0;
      grainLabel = 'Storage';
      storageAction = { kind: activeVehicle.type === 'harvester' ? 'unavailable' : 'hidden', enabled: false };
      renderTool();
      renderGrainMeter();
      renderSecondaryAction();
      onToolChange(false);
      if (overlayState) hideOverlay();
    },
    toast,
  };
}
