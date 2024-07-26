const {
  TranslateClient,
  TranslateTextCommand
} = require('@aws-sdk/client-translate');
const WebSocket = require('ws');
const {
  AWS_GW_WS,
  AWS_TRANSLATE_PORT,
  CAPTIONS_TRANSLATIONS_LANGUAGE_CODES,
  WRITER_WEBSOCKET_SENDTRANSCRIPTION_ROUTE,
  AUDIO_LANGUAGE_CODE
} = require('./constants');

const WebSocketManager = require('./utils/webSocketManager');

const translateClient = new TranslateClient();

const sendTranslationWebSocketManager = new WebSocketManager(AWS_GW_WS);
sendTranslationWebSocketManager.connect();

const webSocketServer = new WebSocket.Server({ port: AWS_TRANSLATE_PORT });

const translationsLanguageCodes =
  CAPTIONS_TRANSLATIONS_LANGUAGE_CODES.split('/');
console.log('Languages to translate to: ', translationsLanguageCodes);

const processTranslation = async (transcriptData, targetLanguageCode) => {
  try {
    const translateResult = await translateClient.send(
      new TranslateTextCommand({
        SourceLanguageCode: AUDIO_LANGUAGE_CODE,
        TargetLanguageCode: targetLanguageCode,
        Text: transcriptData.text
      })
    );
    console.log(
      'Translate Result:\n',
      JSON.stringify({
        transcription: transcriptData.text,
        languageCode: targetLanguageCode,
        translation: translateResult.TranslatedText
      })
    );

    const data = {
      text: translateResult.TranslatedText,
      startTime: transcriptData.startTime,
      endTime: transcriptData.endTime,
      partial: transcriptData.partial
    };

    if (sendTranslationWebSocketManager.connected) {
      const payload = {
        action: WRITER_WEBSOCKET_SENDTRANSCRIPTION_ROUTE,
        data: data,
        lang: targetLanguageCode
      };
      sendTranslationWebSocketManager.send(payload);
    }
  } catch (error) {
    console.error(error.message);
  }
};

webSocketServer.on('listening', () => {
  console.log(`Server is listening on port ${AWS_TRANSLATE_PORT}`);
});

webSocketServer.on('connection', (webSocket) => {
  console.log(new Date() + ' Connection accepted.');

  webSocket.on('message', async (message) => {
    console.log('Received Message: ', message);
    const parsedTranscript = JSON.parse(message);

    if (parsedTranscript && parsedTranscript.data) {
      await Promise.allSettled(
        translationsLanguageCodes.map((translationLanguageCode) =>
          processTranslation(parsedTranscript.data, translationLanguageCode)
        )
      );
    }
  });

  webSocket.on('close', (statusCode, reason) => {
    console.log(
      `Connection Closed. Status code: ${statusCode}, Reason: ${reason}`
    );
  });
});
