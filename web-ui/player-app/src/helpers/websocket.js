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
      console.log('[Websocket message] Data received from server:', data);
      onMessage(data);
    } catch (err) {
      console.error(err);
    }
  };

  const listenerDebugOff = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error(err);
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

    socket.onclose = () => {
      setTimeout(() => createSocket(url, isDebugMode, onMessage), 100);
    };

    socket.onerror = (error) => {
      console.error('[Websocket onerror event]', error);
    };
  } catch (err) {
    console.error(`[Websockets exception] ${err.message}`);
  }

  return socket;
};

export { closeSocket, createSocket, setOnMessageListener };
