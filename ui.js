export function createUi({ onRegenerate, onPloughChange }) {
  const input = { x: 0, y: 0, jumpQueued: false };
  const keys = new Set();
  let ploughEnabled = false;
  let ploughedCount = 0;
  let stickPointer = null;
  let toastTimer = null;
  const stickZone = document.querySelector('#stickZone');
  const stickBase = document.querySelector('#stickBase');
  const stickKnob = document.querySelector('#stickKnob');
  const toolToggle = document.querySelector('#toolToggle');
  const status = document.querySelector('#status');
  const toastElement = document.querySelector('#toast');
  const stickRadius = 46;

  const toast = message => {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.remove('show'), 900);
  };
  const renderStatus = () => { status.textContent = `${ploughedCount} tile${ploughedCount === 1 ? '' : 's'} ploughed`; };
  const renderPlough = () => {
    toolToggle.setAttribute('aria-label', `Turn plough ${ploughEnabled ? 'off' : 'on'}`);
    toolToggle.setAttribute('aria-pressed', String(ploughEnabled));
    toolToggle.classList.toggle('off', !ploughEnabled);
  };
  const updateStick = event => {
    const rect = stickBase.getBoundingClientRect();
    let dx = event.clientX - rect.left - rect.width * .5;
    let dy = event.clientY - rect.top - rect.height * .5;
    const length = Math.hypot(dx, dy) || 1;
    if (length > stickRadius) { dx = dx / length * stickRadius; dy = dy / length * stickRadius; }
    input.x = dx / stickRadius;
    input.y = dy / stickRadius;
    stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const clearStick = () => {
    stickPointer = null;
    input.x = input.y = 0;
    stickKnob.style.transform = 'translate(0px,0px)';
  };

  window.addEventListener('keydown', event => { keys.add(event.code); if (event.code === 'Space') input.jumpQueued = true; });
  window.addEventListener('keyup', event => keys.delete(event.code));
  stickZone.addEventListener('pointerdown', event => {
    if (stickPointer !== null) return;
    stickPointer = event.pointerId;
    stickZone.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  stickZone.addEventListener('pointermove', event => { if (event.pointerId === stickPointer) updateStick(event); });
  stickZone.addEventListener('pointerup', event => { if (event.pointerId === stickPointer) clearStick(); });
  stickZone.addEventListener('pointercancel', event => { if (event.pointerId === stickPointer) clearStick(); });
  document.querySelector('#jump').addEventListener('pointerdown', event => { event.preventDefault(); input.jumpQueued = true; });
  toolToggle.addEventListener('click', () => {
    ploughEnabled = !ploughEnabled;
    renderPlough();
    onPloughChange(ploughEnabled);
    toast(ploughEnabled ? 'PLOUGH ON' : 'PLOUGH OFF');
  });
  document.querySelector('#regen').addEventListener('click', () => { onRegenerate(); toast('NEW FARM'); });
  renderStatus();
  renderPlough();

  return {
    driveInput() {
      let x = 0, y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x || y) return { x, y: -y };
      return { x: input.x, y: -input.y };
    },
    consumeJump() { const jump = input.jumpQueued; input.jumpQueued = false; return jump; },
    ploughEnabled: () => ploughEnabled,
    incrementPloughed() { ploughedCount++; renderStatus(); },
    resetPloughed() { ploughedCount = 0; renderStatus(); },
    toast,
  };
}
