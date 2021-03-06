const express = require('express')
const md5     = require("md5");
const fs      = require('fs')
const axios   = require('axios');
const getSize = require('get-folder-size');
const path    = require('path');
let   config  = require("./config.json");

const app = express()

function check_for_env_config(c) {
    if(process.env.cds__base_url) c.cds.base_url = process.env.cds__base_url
    if(process.env.caching__cache_time) c.caching.cache_time = process.env.caching__cache_time
    if(process.env.caching__max_cache_size) c.caching.cache_time = process.env.caching__max_cache_size
    return c
}

config = check_for_env_config(config)

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

function clearFolder(folder) {
    fs.readdir(folder, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(folder, file), err => {
                if (err) throw err;
            });
        }
    });
}
function checkCacheFolderSize() {
    getSize("cache", (err, size) => {
        if (err) { throw err; }

        size = (size / 1024 / 1024).toFixed(2)
        if( size > config.caching.max_cache_size) {
            console.warn(`Cache folder is overflowing by ${size-config.caching.max_cache_size} MB`)
            clearFolder("cache")
        }
    });
}

setInterval(deleteCachedFile,1000)
setInterval(checkCacheFolderSize,10000)

app.all('/*', (req, res) => {
    let url  = req.originalUrl[0] === "/" ? req.originalUrl.substr(1) : req.originalUrl

    let hash = md5(url);
    let file_ext = url.split(".")[url.split(".").length - 1]

    let file_cahced_path = "cache/"+hash+"."+file_ext

    if (!cachedFiles.hasOwnProperty(hash + "." + file_ext) && fs.existsSync(__dirname + "/" + file_cahced_path)) {
        console.info("Serving staticaly cached file: " + req.originalUrl + " (" + hash + "." + file_ext + ")")
        return res.status(200).sendFile(__dirname + "/" + file_cahced_path)
    }

    if(file_ext === "") {
        res.status(404).sendFile(__dirname + "/" + "static/403.html")
    } else {
        if (cachedFiles.hasOwnProperty(hash + "." + file_ext)) {
            console.info("Serving cached file: " + req.originalUrl + " (" + hash + "." + file_ext + ")")
            res.sendFile(__dirname + "/" + file_cahced_path)
            cachedFiles[hash + "." + file_ext] = new Date().getTime() + config.caching.cache_time * 1000
        } else {
            console.info("Fetching file from remote server: " + config.cds.base_url + url + " (" + hash + "." + file_ext + ")")

            axios({
                url: config.cds.base_url + url,
                responseType: 'stream',
            }).then(response => {
                if (response.status !== 200) {
                    res.status(404).sendFile(__dirname + "/" + "static/403.html")
                } else {
                    strm = fs.createWriteStream(file_cahced_path)
                    response.data.pipe(strm);
                    response.data.pipe(res);

                    cachedFiles[hash + "." + file_ext] = new Date().getTime() + config.caching.cache_time * 1000

                    strm.on('close', function () {
                        getSize("cache", (err, size) => {
                            if (err) {
                                throw err;
                            }
                            size = (size / 1024 / 1024).toFixed(2)
                            console.info(`Cache folder size is now ${size} MB`)
                        });
                    });
                }
            }).catch(why => {
                res.status(404).sendFile(__dirname + "/" + "static/403.html")
            });

        }
    }
})

app.listen(config.app.post, () => {
    console.log(`Example app listening at http://localhost:${config.app.post}`)
})