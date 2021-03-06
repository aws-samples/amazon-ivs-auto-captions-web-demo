import { logDebugMessage } from './logDebugMessage';

const closeSocket = (socket) => {
  if (socket) {
    // Check if the current state of the connection is CONNECTING (0)
    // In that case wait before closing the connection
    if (socket.readyState === 0) {
      setTimeout(() => closeSocket(socket), 1000);
    } else {
      socket.close(1000, 'Work complete');
    }
  }
};

const setOnMessageListener = (socket, isDebugMode, onMessage) => {
  const listenerDebugOn = (event) => {
    try {
      const data = JSON.parse(event.data);
      logDebugMessage('log', '[WebSocket message] Data received from server:', data);
      onMessage(data);
    } catch (err) {
      logDebugMessage('log', err);
    }
  };

  const listenerDebugOff = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      logDebugMessage('error', err);
    }
  };

  socket.onmessage = isDebugMode ? listenerDebugOn : listenerDebugOff;
};

const createSocket = (url, isDebugMode, onMessage) => {
  let socket;

  try {
    /* eslint-disable no-undef */
    socket = new WebSocket(url);

    setOnMessageListener(socket, isDebugMode, onMessage);

    socket.onclose = (event) => {
      if (!event.wasClean) {
        logDebugMessage('error', '[WebSocket onclose event] Connection died, reconnecting...');
        setTimeout(() => createSocket(url, isDebugMode, onMessage), 100);
      }
    };

    socket.onerror = (error) => {
      logDebugMessage('error', '[WebSocket onerror event]', error);
    };
  } catch (err) {
    logDebugMessage('error', `[WebSockets exception] ${err.message}`);
  }

  return socket;
};

export { closeSocket, createSocket, setOnMessageListener };
