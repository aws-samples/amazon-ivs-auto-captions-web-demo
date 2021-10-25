const express = require("express");

const app = express();
app.disable("x-powered-by");

const port = 3000;

app.get("/auth", (req, res) => {
    console.log(`Stream key from environment is: ${process.env.STREAM_KEY}`);
    console.log(`Stream key from request is: ${req.query.name}`);
    if (req.query.name === process.env.STREAM_KEY) {
        console.log("Connection accepted: Valid stream key.");
        res.status(200).send("Connection accepted: Valid stream key.");
    } else {
        console.log("Connection rejected: Invalid stream key.");
        res.status(401).send("Connection rejected: Invalid stream key.");
    }
});

app.listen(port, () => {
    console.log(`Stream key validation server listening at http://127.0.0.1:${port}`);
});
