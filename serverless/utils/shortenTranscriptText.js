const ONE_ROW_CHAR_COUNT = 40;
const WHITE_SPACE = ' ';
const NEW_LINE = '\n';

const shortenTranscriptText = (text) => {
  let blocks = [];
  let blockIndex = 0;

  while (blockIndex < text.length) {
    let block = text.substr(blockIndex);

    if (ONE_ROW_CHAR_COUNT < block.length) {
      block = text.substr(blockIndex, ONE_ROW_CHAR_COUNT);

      if (text.substr(blockIndex + ONE_ROW_CHAR_COUNT, 1) === WHITE_SPACE) {
        blockIndex += ONE_ROW_CHAR_COUNT;
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

  switch (blocks.length) {
    case 1:
      return blocks[0];
    case 2:
      return blocks[0] + NEW_LINE + blocks[1];
    default:
      return;
  }
};

module.exports = shortenTranscriptText;
