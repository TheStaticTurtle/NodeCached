const express = require('express')
const md5     = require("md5");
const fs      = require('fs')
const axios   = require('axios');
const config  = require("./config.json");

const app = express()

let cachedFiles = {}

function deleteCachedFile() {
    let now = new Date().getTime()

    for (const file in cachedFiles) {
        if(now > cachedFiles[file]) {
            console.log(`Removing ${file} from cache`);
            fs.unlink("cache/"+file, (err) => {
                if(err != null) {
                    console.error(`Failed to delete file ${file} -> ${err}`);
                }
            });
            delete cachedFiles[file]
        }
    }
}

setInterval(deleteCachedFile,1000)

app.all('/*', (req, res) => {
    let url  = req.originalUrl[0] === "/" ? req.originalUrl.substr(1) : req.originalUrl

    let hash = md5(url);
    let file_ext = url.split(".")[url.split(".").length - 1]

    let file_cahced_path = "cache/"+hash+"."+file_ext

    if (cachedFiles.hasOwnProperty(hash+"."+file_ext)) {
        console.info("Serving cached file: "+req.originalUrl+" ("+hash+"."+file_ext+")")
        res.sendFile(__dirname + "/" + file_cahced_path)
        cachedFiles[hash+"."+file_ext] = new Date().getTime() + config.caching.cache_time * 1000
    } else {
        console.info("Fetching file from remote server: "+config.cds.base_url+url+" ("+hash+"."+file_ext+")")

        axios({
            url: config.cds.base_url+url,
            responseType: 'stream',
        }).then(response => {
                if(response.status !== 200) {
                    res.sendStatus(404)
                } else {
                    response.data.pipe(fs.createWriteStream(file_cahced_path));
                    response.data.pipe(res);

                    cachedFiles[hash+"."+file_ext] = new Date().getTime() + config.caching.cache_time * 1000
                }
            }
        );

    }
})

app.listen(config.app.post, () => {
    console.log(`Example app listening at http://localhost:${config.app.post}`)
})