
// Note that response.statusText will often be empty because
// HTTP/2 does not define a way to carry the version or reason
// phrase that is included in an HTTP/1.1 status line.
const parseAPIResponse = response =>
    new Promise(resolve => resolve(response.text()))
    .catch(err =>
        // eslint-disable-next-line prefer-promise-reject-errors
        Promise.reject({
            type: 'NetworkError',
            status: response.status,
            message: err,
            url: response.url,
        }))
    .then((responseBody) => {

        if (!response.ok) {
            return Promise.reject({
                type: 'HttpError',
                status: response.status,
                body: responseBody,
                url: response.url,
            });
        }

        // Attempt to parse JSON
        try {
            const parsedJSON = JSON.parse(responseBody);
            if (response.ok) {
                return parsedJSON;
            } else {
                return Promise.reject({
                    type: 'HttpError',
                    status: response.status,
                    body: responseBody,
                    url: response.url,
                });
            }
        } catch (e) {
            // If we got an HTML page, truncate it.
            let body = response.statusText.substr(0, 500);

            // We should never get these unless response is mangled
            // Or API is not properly implemented
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject({
                type: 'InvalidJSON',
                status: response.status,
                body: body,
                url: response.url,
            });
        }
    });

async function do_fetch(url, opts) {
    const json = await fetch(url, opts)
        .then(parseAPIResponse);
    //.catch(err => alert(JSON.stringify(err, null, 4)));
}

async function do_fetch_with_auth(url, auth) {

    const headers = {
        'Content-Type': 'application/json',
        Authorization: auth,
        Accept: 'application/json',
        credentials: "include"
    };

    const json = await fetch(url, { headers: headers })
        .then(parseAPIResponse);
    //.catch(err => alert(JSON.stringify(err, null, 4)));
    return json;
}

// `bodies` is an array of { verb: vvv, url: xxx, json: yyy }
// verb defaults to POST
async function batch_post(bodies, auth) {
    const fetch_opts = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: auth,
        }
    };

    let jsons = {};
    let promises = [];

    for (let i = 0; i < bodies.length; i++) {
        let opts = Object.assign({}, fetch_opts);
        opts.body = bodies[i].json;
        if ("verb" in bodies[i]) {
            opts.method = bodies[i].verb;
        }

        const promise = do_fetch(bodies[i].url, opts)
            .then(result => {
                //jsons[i] = result.value;
                for (let i = 0; i < promises.length; i++) {
                    if (promises[i] === promise) {
                        promises.splice(i, 1);
                        break;
                    }
                }
            });
        promises.push(promise);

        // Once we hit our concurrency limit, wait for a promise to resolve
        // before continuing so as to cap the number of outstanding requests.
        if (promises.length >= 8) {
            await Promise.race(promises);
        }
    }

    // Make a copy of the list of pointers so that the splice() call above
    // doesn't fight with Promise.all().
    await Promise.all([...promises]);

    return jsons;
}
