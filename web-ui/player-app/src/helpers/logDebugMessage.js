const enableDebugMessages = true;

const logDebugMessage = (type, ...data) => {
  if (enableDebugMessages) {
    console[type](...data);
  }
};

export { logDebugMessage };
