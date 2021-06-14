const CHAR_LIMIT = 40;
const WHITE_SPACE = " ";
const NEW_LINE = "\n";

module.exports = {
    shortenTranscriptText : (text) => {
        const blocks = [];
        let blockIndex = 0;

        while (blockIndex < text.length) {
            let block = text.substr(blockIndex);
            
            if (CHAR_LIMIT < block.length) {
                block = text.substr(blockIndex, CHAR_LIMIT);

                if (text.substr(blockIndex + CHAR_LIMIT, 1) === WHITE_SPACE) {
                    blockIndex += CHAR_LIMIT;
                } else {
                    const blockLength = block.lastIndexOf(WHITE_SPACE) + 1;
                    block = text.substr(blockIndex, blockLength);
                    blockIndex += blockLength;
                }
            } else {
                blockIndex = text.length;
            }
            
            blocks.push(block.trim());

            if (blocks.length > 2) {
                blocks.shift();
            }
        }

        let shortenedText;
        switch (blocks.length) {
            case 1:
                shortenedText = blocks[0];
                break;
            case 2:
                shortenedText = blocks[0] + NEW_LINE + blocks[1];
                break;
            default:
                break;
        }

        return shortenedText;
    }
};
