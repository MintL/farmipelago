// The synchronous entry points and incremental spawner consume the same work.
export function finishPreparation(work) {
  let result;
  do { result = work.next(); } while (!result.done);
  return result.value;
}

export function advancePreparation(work, milliseconds = 2) {
  const deadline = performance.now() + milliseconds;
  let result;
  do { result = work.next(); } while (!result.done && result.value !== false && performance.now() < deadline);
  return result;
}
