const WebSocket = require("ws");
const { AWS_GW_WS } = require("./constants");
const { TEXT_UTILS } = require("./utils");

let ws = connect();
let connected = false;
let endTimePrev = null;
let feedTime = process.argv[2];

function connect() {
  try {
    const webSocket = AWS_GW_WS ? new WebSocket(AWS_GW_WS) : null;
    
    webSocket.onopen = function () {
      console.log('Socket is opened.');
      connected = true;
    };

    webSocket.onclose = function (e) {
      console.log('Socket is closed. Reconnect will be attempted in 100 ms.', e.reason);
      connected = false;
      setTimeout(function () {
        console.log('Reconnecting...');
        ws = connect();
      }, 100);
    };

    webSocket.onerror = function (err) {
      connected = false;
      console.error('Socket encountered error: ', err.message, 'Closing socket');
      webSocket.close();
    };

    return webSocket;

  } catch (error) {
    console.log(error);
  }
};



const sendDataToClients = (message) => {
  try {
    if (connected === true) {
      console.log('Sending data to Web Socket', JSON.stringify(message));
      ws.send(JSON.stringify({ action: "sendtranscription", data: message }));
    } else{
      console.log('Websocket disconnected.');
    }
  } catch (error) {
    console.log(error);
  }
};

const formatTranscriptionPayloadAndSend = (transcript, startTime, endTime, partial) => {
  const payload = {
    text: transcript,
    startTime,
    endTime,
    partial,
  };
  sendDataToClients(JSON.stringify(payload));
};

module.exports = {
  sendTranscription: (results) => {
    let startTime = null;
    let endTime = null;

    if (results.length > 0) {

      if (results[0].Alternatives.length > 0) {

        const transcriptText = results[0].Alternatives[0].Transcript;
        const decodedTranscriptText = decodeURIComponent(escape(transcriptText));
        const shortenedTranscriptText = TEXT_UTILS.shortenTranscriptText(decodedTranscriptText);

        startTime = endTimePrev ?? (+feedTime + +results[0].StartTime);
        endTime = +feedTime + +results[0].EndTime;
        endTimePrev = endTime;

        if (results[0].IsPartial === false) {
          endTimePrev = null;
        }

        console.debug(new Date(), 
        "[Transcription to send to WebSocket] Feed Time: ", feedTime,
        ", Transcribe Start time: ", results[0].StartTime, 
        ", Transcribe End Time: ", results[0].EndTime,  
        ", Final Start time: ", startTime,
        ", Final End Time: ", endTime, 
        ", Result Id ", results[0].ResultId,
        ", Is Partial: ", results[0].IsPartial
        );
        
        formatTranscriptionPayloadAndSend(shortenedTranscriptText, startTime, endTime, results[0].IsPartial);
      }
    }
  }
};
