const {
    TranscribeStreamingClient,
    StartStreamTranscriptionCommand
} = require("@aws-sdk/client-transcribe-streaming");

const {
    AWS_REGION,
    AUDIO_LANGUAGE_TRANSCRIBE_CODE,
    AUDIO_LANGUAGE_CODE,
    VOCABULARY_FILTER,
    MEDIA_SAMPLE_RATE_HERTZ,
    VOCABULARY_NAME,
    AWS_GW_WS,
    TRANSLATE_ENABLED,
    TRANSLATE_WEB_SOCKET_URL,
    VOCABULARY_FILTER_METHOD,
    MEDIA_ENCODING,
    WRITER_WEBSOCKET_SENDTRANSCRIPTION_ROUTE,
    SUCCESS_EXIT_CODE,
    ERROR_EXIT_CODE,
    TWO_ROW_CHARACTER_COUNT
} = require("./constants");


const metadataManager = require("./metadataManager");
const WebSocketManager = require("./utils/webSocketManager");
const shortenTranscriptText = require("./utils/shortenTranscriptText");

const { OVERLAYS_UTILS } = require("./utils");

const directTranscriptionWSManager = new WebSocketManager(AWS_GW_WS);
directTranscriptionWSManager.connect();

let translateTranscriptionWSManager;
if (TRANSLATE_ENABLED == 'true') {
    translateTranscriptionWSManager = new WebSocketManager(TRANSLATE_WEB_SOCKET_URL);
    translateTranscriptionWSManager.connect();
}

let overlaysInformation = null;
let endTimePrev = null;
let feedTime = process.argv[2];
let previousSentCaptionEndTimeTranscribe = 0;
let previousSentCaptionEndTimeTranslate = 0;

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
        LanguageCode: AUDIO_LANGUAGE_TRANSCRIBE_CODE,
        VocabularyName: VOCABULARY_NAME,
        VocabularyFilterName: VOCABULARY_FILTER,
        VocabularyFilterMethod: VOCABULARY_FILTER_METHOD,
        MediaSampleRateHertz: MEDIA_SAMPLE_RATE_HERTZ,
        MediaEncoding: MEDIA_ENCODING,
        AudioStream: transcribeInput(),
    });

    const startStreamTranscriptionCommandOutput = await transcribeClient.send(
        startStreamTranscriptionCommand
    );

    console.log(
        `AWS Transcribe connection status code: ${startStreamTranscriptionCommandOutput.$metadata.httpStatusCode}`
    );

    for await (const transcriptionEvent of startStreamTranscriptionCommandOutput.TranscriptResultStream) {
        
        if (transcriptionEvent.TranscriptEvent.Transcript) {
            const results = transcriptionEvent.TranscriptEvent.Transcript.Results;
            const parsedTranscription = parseTranscription(results);

            if (parsedTranscription) {

                let caption;

                // AUDIO TRANSCRIPTION
                if (AUDIO_LANGUAGE_CODE == 'en') {
                    metadataManager.sendOverlaysMetadata(results, overlaysInformation);
                    caption = buildCaptionForPartial(parsedTranscription);
                    buildAndSendPayload(caption, AUDIO_LANGUAGE_CODE);
                } else if (parsedTranscription.partial === false) {
                    caption = buildCaptionForTotalTranscribe(parsedTranscription);
                    buildAndSendPayload(caption, AUDIO_LANGUAGE_CODE);
                }

                // AUDIO TRANSLATION
                if (TRANSLATE_ENABLED == 'true') {
                    if (parsedTranscription.partial === false) {
                        caption = buildCaptionForTotalTranslate(parsedTranscription);
                        buildAndSendPayload(caption, null);
                    }      
                }
            } 
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

const parseTranscription = (results) => {
    let startTime = null;
    let endTime = null;

    if (results && results.length > 0) {
        if (results[0].Alternatives.length > 0) {
            const transcriptText = results[0].Alternatives[0].Transcript;

            startTime = endTimePrev ?? (+feedTime + +results[0].StartTime);
            endTime = +feedTime + +results[0].EndTime;
            endTimePrev = endTime;

            if (results[0].IsPartial === false) {
                endTimePrev = null;
            }

            console.info(
                new Date(),
                "[Transcription to send to WebSocket] Feed Time: ",
                feedTime,
                ", Transcribe Start time: ",
                results[0].StartTime,
                ", Transcribe End Time: ",
                results[0].EndTime,
                ", Final Start time: ",
                startTime,
                ", Final End Time: ",
                endTime,
                ", Result Id ",
                results[0].ResultId,
                ", Is Partial: ",
                results[0].IsPartial
            );

            return {
                text: transcriptText,
                startTime,
                endTime,
                partial: results[0].IsPartial,
            };
        }

        return null;
    }

    return null;
};

const buildAndSendPayload = (data, lang) => {
    const payload = {
        action: WRITER_WEBSOCKET_SENDTRANSCRIPTION_ROUTE,
        data,
        lang,
    };

    lang !== null ? directTranscriptionWSManager.send(payload) : translateTranscriptionWSManager.send(payload);
}

const buildCaptionForPartial = (parsedTranscription) => {

    return {
        ...parsedTranscription,
        text: shortenTranscriptText(parsedTranscription.text)
    }

};

const getDisplayTime = (text) => {
    if (text.length <= TWO_ROW_CHARACTER_COUNT) return 4;
    return text.length / 20;
};

const buildCaptionForTotalTranscribe = (total) => {
    const caption = {};
    caption.partial = false;
    caption.text = total.text;
    caption.startTime = total.startTime > previousSentCaptionEndTimeTranscribe ? total.startTime : previousSentCaptionEndTimeTranscribe;
    caption.endTime = caption.startTime + getDisplayTime(total.text);

    previousSentCaptionEndTimeTranscribe = caption.endTime;

    return caption;
};

const buildCaptionForTotalTranslate = (total) => {
    const caption = {};
    caption.partial = false;
    caption.text = total.text;
    caption.startTime = total.startTime > previousSentCaptionEndTimeTranslate ? total.startTime : previousSentCaptionEndTimeTranslate;
    caption.endTime = caption.startTime + getDisplayTime(total.text);

    previousSentCaptionEndTimeTranslate = caption.endTime;

    return caption;
};


getOverlays();
startStreamingWrapper();