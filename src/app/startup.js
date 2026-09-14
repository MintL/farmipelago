try {
  await import('./main.js');
} catch (error) {
  console.error('Farmipelago could not start.', error);
  document.querySelector('#loadingMessage').textContent = 'Could not load your farm. Please refresh to try again.';
}
