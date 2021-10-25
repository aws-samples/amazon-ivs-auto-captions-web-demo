const WebSocket = require("ws");

class WebSocketManager {
    constructor(webSocketUrl) {
        console.info(`\nNew WebSocket connection: ${webSocketUrl}`);
        this.webSocketUrl = webSocketUrl;
        this.webSocket = null;
        this.connected = false;
    }

    connect() {
        try {
            this.webSocket = this.webSocketUrl ? new WebSocket(this.webSocketUrl) : null;

            this.webSocket.onopen = () => {
                console.log(`\nWebSocket connection "${this.webSocketUrl}" opened.`);
                this.connected = true;
            };

            this.webSocket.onclose = (e) => {
                console.log(`\nWebSocket connection "${this.webSocketUrl}" closed. Reconnect will be attempted in 100 ms.`, e.reason);
                this.connected = false;
                setTimeout(() => {
                    console.log("Reconnecting...");
                    this.webSocket = this.connect();
                }, 100);
            };

            this.webSocket.onerror = (err) => {
                this.connected = false;
                console.error("Socket encountered error: ", err.message, "Closing socket");
                this.webSocket.close();
            };

            return this.webSocket;
        } catch (error) {
            console.log(error);
        }
    }

    send(payload) {
        try {
            if (this.connected === true) {
                console.log("Sending data to Web Socket:\n", JSON.stringify({ url: this.webSocketUrl, payload }));
                this.webSocket.send(JSON.stringify(payload));
            } else {
                console.log("Websocket disconnected.");
            }
        } catch (error) {
            console.log(error);
        }
    }
}

module.exports = WebSocketManager;