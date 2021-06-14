const fs = require("fs");
const archiver = require("archiver");

const args = process.argv.slice(2);

args.forEach((lambdaFolderPath) => {
  const lambdaFolderName = lambdaFolderPath.replace(/^.*[\\\/]/, "");

  const writeStream = fs.createWriteStream(`${lambdaFolderName}.zip`);
  writeStream.on("close", function () {
    console.log(`"${lambdaFolderName}.zip" created!`);
  });

  const archive = archiver("zip");
  archive.on("error", function (error) {
    console.error(error.message);
  });
  archive.pipe(writeStream);
  archive.directory(lambdaFolderPath, false);
  archive.finalize();
});
