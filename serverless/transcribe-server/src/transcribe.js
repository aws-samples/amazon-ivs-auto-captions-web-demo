const {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} = require("@aws-sdk/client-transcribe-streaming");

const {
  AWS_REGION,
  LANGUAGE_CODE,
  VOCABULARY_FILTER,
  MEDIA_SAMPLE_RATE_HERTZ,
  VOCABULARY_NAME,
} = require("./constants");

const { METADATA_MANAGER, WEB_SOCKET_MANAGER } = require("./managers");

const { OVERLAYS_UTILS } = require("./utils");

const SUCCESS_EXIT_CODE = 0;
const ERROR_EXIT_CODE = 1;
let overlaysInformation = null;

const streamAudioToWebSocket = async function () {
  process.stdin._writableState.highWaterMark = 4096; // Read with chunk size of 3200 as the audio is 16kHz linear PCM
  process.stdin.resume();

  const transcribeInput = async function* () {
    for await (const chunk of process.stdin) {
      if (chunk.length > 6000) continue;
      yield { AudioEvent: { AudioChunk: chunk } };
    }
  };

  const transcribeClient = new TranscribeStreamingClient({
    region: AWS_REGION,
  });

  const startStreamTranscriptionCommand = new StartStreamTranscriptionCommand({
    LanguageCode: LANGUAGE_CODE,
    VocabularyName: VOCABULARY_NAME,
    VocabularyFilterName: VOCABULARY_FILTER,
    VocabularyFilterMethod: "remove",
    MediaSampleRateHertz: MEDIA_SAMPLE_RATE_HERTZ,
    MediaEncoding: "pcm",
    AudioStream: transcribeInput(),
  });

  const startStreamTranscriptionCommandOutput = await transcribeClient.send(
    startStreamTranscriptionCommand
  );

  console.log(
    `AWS Transcribe connection status code: ${startStreamTranscriptionCommandOutput.$metadata.httpStatusCode}`
  );

  for await (const transcriptionEvent of startStreamTranscriptionCommandOutput.TranscriptResultStream) {
    const transcript = transcriptionEvent.TranscriptEvent.Transcript;
    if (transcript) {
      const results = transcript.Results;
      METADATA_MANAGER.sendOverlaysMetadata(results, overlaysInformation);
      WEB_SOCKET_MANAGER.sendTranscription(results);
    }
  }
};

const startStreamingWrapper = async function () {
  try {
    await streamAudioToWebSocket();
    process.exit(SUCCESS_EXIT_CODE);
  } catch (error) {
    console.log("Streaming error: ", error);
    process.exit(ERROR_EXIT_CODE);
  } 
};

const getOverlays = async () => {
  try {
    let utilsResponse = await OVERLAYS_UTILS.getOverlaysMapAndPattern();
    overlaysInformation = utilsResponse;
  } catch (ex) {
    console.log("Overlays couldn't be loaded. Exception throwed: ", ex);
  }
};

getOverlays();
startStreamingWrapper();
