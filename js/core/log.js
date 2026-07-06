let logState = null;

function setLogState(state) {
  logState = state;
}

function log(msg) {
  if (!logState) return;
  logState.logs.unshift(`[${logState.year}年${logState.month}月] ${msg}`);
  if (logState.logs.length > 50) logState.logs.pop();
}

export { log, setLogState };
