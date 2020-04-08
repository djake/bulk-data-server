const https        = require("https");
const lib          = require("../lib");
const Task         = require("./Task");
const NDJSONStream = require("./NDJSONStream");



class DownloadTask extends Task
{
    /**
     * Makes the request in order to receive the response headers and obtain the
     * "content-length" header (if any).
     */
    init()
    {
        return new Promise((resolve, reject) => {
            this._startTime = Date.now();
            try {
                const req = https.request(this.options.url, {
                    timeout: 0,
                    rejectUnauthorized: process.env.NODE_ENV !== "test"
                });

                req.on("error", reject);
                req.on("response", res => {
                    if (res.statusCode >= 400) {
                        return reject(new Error(`${res.statusCode} ${res.statusMessage}`));
                    }

                    // If "content-length" is present in the response headers, use it
                    // to compute the progress information. Otherwise `contentLength`
                    // will be `0`.
                    this.total = lib.uInt(res.headers["content-length"]);

                    res.on("end", () => this.end());
                    res.on("error", (e) => this.emit("error", e));

                    resolve(res);
                })
                req.end();
            } catch (ex) {
                reject(ex);
            }
        });
    }

    async start()
    {
        if (!this.response) {
            try {
                this.response = await this.init();
            } catch (ex) {
                this.error = ex;
            }
        }

        const transformer = new NDJSONStream();
        const pipeline = this.response.pipe(transformer);

        this.response.on("data", chunk => {
            this.position += Buffer.byteLength(chunk);
        });

        return pipeline;
    }
}

module.exports = DownloadTask;
