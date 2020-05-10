
const classesUrl = 'https://assignments.onenote.com/api/v1.0/edu/me/classes';

// Local storage
const adalKey = "adal.access.token.keyhttps://onenote.com/";
const adalExp = "adal.expiration.keyhttps://onenote.com/";

// function getCookies(domain, name, callback) {
//     chrome.cookies.get({ "url": domain, "name": name }, function(cookie) {
//         if (callback) {
//             callback(cookie);
//         }
//     });
// }

function fetch_classes(bearer, func) {
    const xhr = new XMLHttpRequest();

    xhr.open('GET', classesUrl);

    // set response format
    xhr.responseType = 'json';

    xhr.setRequestHeader('Authorization', "Bearer " + bearer);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', '*/*'); // accept all
    xhr.send();

    xhr.onload = () => {
        // get JSON response
        const obj = xhr.response;
        const classes = obj.value;
        func(classes, bearer, func);
    }
}

function make_url(classes, i) {
    let oneclass = classes[i];
    return "https://assignments.onenote.com//api/v1.0/edu/classes/" + oneclass.id + "/assignments";
}

async function fetch_all_with_bearer(bearer, classes) {

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': "Bearer " + bearer,
        'Accept': '*/*',
        credentials: "include"
    };

    const indices = Array.from({length: classes.length}, (x,i) => i);
    //const indices = [4, 5];

    let mapper = {};
    for (let i = 0; i < indices.length; i++) {
        mapper[classes[i].id] = classes[i].displayName;
    }

    let jsons = {};

    for (let i = 0; i < indices.length; i++) {
        const index = indices[i];
        jsons[classes[index].name] = await fetch(make_url(classes, index), { headers: headers })
            .then(checkStatus)
            .then((response) => response.json())
            .catch(error => console.log('There was a problem!', error));
    }

    for (var classname of Object.keys(jsons)) {
        jsons[classname] = jsons[classname].value;
    }

    return jsons;

    // We rate limit it to avoid 429 errors. Using Promise.all() makes
    // too many requests. We can probably do three requests at a time,
    // but that's harder.
    // indices.reduce((previousPromise, i) => {
    //     return previousPromise.then(() => {
    //         return fetch(make_url(classes, i), { headers: headers })
    //             .then(checkStatus)
    //             .then(function(response) {
    //                 const json = response.json();
    //                 jsons[mapper[json.classId]] = json;
    //                 console.log(JSON.stringify(response, null, 4));
    //                 if (Object.keys(jsons).length == indices.length) func(jsons);
    //                 return response.json;
    //             })
    //             .catch(error => console.log('There was a problem!', error))
    //     });
    // }, Promise.resolve());
}

// ------------------------------------------
//  HELPER FUNCTIONS
// ------------------------------------------

function checkStatus(response) {
    if (response.ok) {
        return Promise.resolve(response);
    } else {
        return Promise.reject(new Error(response.statusText));
    }
}

function parseJSON(response) {
    return response.json();
}


// function fetch_assignments_for_class(bearer, oneclass) {
//     const xhr = new XMLHttpRequest();

//     const url = "https://assignments.onenote.com//api/v1.0/edu/classes/" + oneclass.id + "/assignments";

//     xhr.open('GET', url);

//     // set response format
//     xhr.responseType = 'json';

//     //bearer = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IkN0VHVoTUptRDVNN0RMZHpEMnYyeDNRS1NSWSIsImtpZCI6IkN0VHVoTUptRDVNN0RMZHpEMnYyeDNRS1NSWSJ9.eyJhdWQiOiJodHRwczovL29uZW5vdGUuY29tLyIsImlzcyI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0L2U1ZjM0NzljLTUwMmYtNGU5Mi1iMDYwLTBjMGM1NjBkNjI3MS8iLCJpYXQiOjE1ODg5NzcyNjAsIm5iZiI6MTU4ODk3NzI2MCwiZXhwIjoxNTg4OTg0NzYwLCJhY3IiOiIxIiwiYWlvIjoiQVNRQTIvOFBBQUFBV2tGRHlOblFHbG5Qc0RqT3JGTW5rbktSZm9Qam9HUUJ6ZzdhdGJCRGh1Yz0iLCJhbXIiOlsicHdkIl0sImFwcGlkIjoiNWUzY2U2YzAtMmIxZi00Mjg1LThkNGItNzVlZTc4Nzg3MzQ2IiwiYXBwaWRhY3IiOiIwIiwiZmFtaWx5X25hbWUiOiJCZXZlcmlkZ2UiLCJnaXZlbl9uYW1lIjoiQnJpYW4iLCJpcGFkZHIiOiI3My4yNDEuNTUuMjE3IiwibmFtZSI6IkJyaWFuIEJldmVyaWRnZSIsIm9pZCI6ImU5Y2FkNzRiLWZkOGEtNDQ4OC1hZWRlLTk2OTQyZTczNThiMyIsIm9ucHJlbV9zaWQiOiJTLTEtNS0yMS0xMzU5MzIyNzE2LTE3MzIxNzQyNjItMzU5NTU2MTY1LTE3Njg3NCIsInB1aWQiOiIxMDAzMjAwMEE0MjhCNkY5Iiwic2NwIjoiTm90ZXMuUmVhZFdyaXRlIE5vdGVzLlJlYWRXcml0ZS5BbGwiLCJzdWIiOiJVVldqbEJGT0xLQkFPdk0yeG02WDZqSmtFakU5NkZhY1BGX3R3VFJlcGdvIiwidGlkIjoiZTVmMzQ3OWMtNTAyZi00ZTkyLWIwNjAtMGMwYzU2MGQ2MjcxIiwidW5pcXVlX25hbWUiOiJCU1YtOFcyQGJhc2lzaW5kZXBlbmRlbnQuY29tIiwidXBuIjoiQlNWLThXMkBiYXNpc2luZGVwZW5kZW50LmNvbSIsInV0aSI6Ik9wX1BfUzY3aWt5aTJrdkk1UUlsQUEiLCJ2ZXIiOiIxLjAifQ.DjnZISSyTpgJakWIPJs4FaifQNXiY86b4pDYfYPAQfHL-ZTADLVrzuNDDONyj3klTSg6I09ZIJOLBnw8ARJWqXpIAllMHKAthBJ1g7JoYx9L_20oREXkY4T_SVjxn7qcQqNB0sMSpOpv3aRzQoM6QH6SRliGuH7V8rp9rx3FkyCA1u4zGdK8jadvzVrIFBz0RjbImxZR_o6byW7K8L-7UjuUQKuyNU6SbOkdrUfBT3LPaRQcGgjGysdZEprpzdFsbSv2BdOEL8doH2LDCQH1bwLKv_KM-4dDahehOe-ACmgLCRIjl8CBdlEVBMrsKSVJBZ2Jqx_lrwhFPhxPnoI-Cw';

//     xhr.setRequestHeader('Authorization', "Bearer " + bearer);
//     xhr.setRequestHeader('Content-Type', 'application/json');
//     xhr.setRequestHeader('Accept', '*/*'); // accept all
//     xhr.send();

//     xhr.onload = () => {
//         // get JSON response
//         const obj = xhr.response;
//         const classes = obj.value;
//         console.log(JSON.stringify(classes, null, 4));
//         return classes;
//     }
// }

function get_assignments(classes) {
    let info = [];
    for (oneclass of classes) {
        assignments = read_assignments(oneclass.id);
        info[oneclass.name] = assignments.value;
        break;
    }
    return info;
}

function missing_submission(submissions) {
    if (submissions == null) return false;
    for (let i = 0; i < submissions.length; i++) {
        let sub = submissions[i];
        if (sub.status != "returned" && sub.submittedDateTime === null)
            return true;
    }
    return false;
}

function has_rework(submissions) {
    if (submissions == null) return false;
    for (let i = 0; i < submissions.length; i++) {
        let sub = submissions[i];
        if (sub.status == "returned" && sub.submittedDateTime === null)
            return true;
    }
    return false;
}

function get_latest(coll, key) {
    if (coll == null) return "";
    let latest = "";
    for (let i = 0; i < coll.length; i++) {
        if (coll[i][key] > latest) {
            latest = coll[i][key];
        }
    }
    return latest;
}

function create_row(classname, assignment) {
    row = {
        id: assignment.id,
        classname: classname,
        dueDateTime: assignment.dueDateTime,
        submittedDateTime: get_latest(assignment.submissions, "submittedDateTime"),
        name: assignment.displayName,
        points: assignment.grading ? assignment.grading.maxPoints : null,
        missingSubmission: missing_submission(assignment.submissions),
        rework: has_rework(assignment.submissions),
        completed: assignment.isCompleted
    };
    return row;
}

function create_rows_from_class_map(object) {
    let rows = [];
    for (var classname of Object.keys(object)) {
        let assignments = object[classname];
        for (let i = 0; i < assignments.length; i++) {
            let row = create_row(classname, assignments[i]);
            rows.push(row);
        }
    }
    return rows;
}

// For testing
function index_assignments(assignments) {
    let coll = {};
    for (let i = 0; i < assignments.length; i++) {
        let assignment = assignments[i];
        coll[assignment.id] = assignment;
    }
    return coll;
}

async function build(bearer) {
    fetch_classes(bearer, async function(classes) {
        jsons = await fetch_all_with_bearer(bearer, classes);
        coll = create_rows_from_class_map(jsons);
        //console.log(JSON.stringify(coll, null, 4));
        const now = new Date();
        chrome.storage.local.set({ data: { rows: coll, updated: now.toISOString() } }, function() {
            chrome.windows.create({
                // Just use the full URL if you need to open an external page
                url: chrome.runtime.getURL("page_action/page_action.html")
            });
        });
    });
}

function generate_report() {
    // TODO: Check the expiration time in "exp"
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tab = tabs[0];
        // Execute script in the current tab
        chrome.tabs.executeScript(tab.id, { code: `localStorage['${adalKey}']` }, build);
    });
}

// Check for chrome so as to allow unit tests.
if (!!chrome.runtime) {
    // https://developer.chrome.com/extensions/getstarted
    chrome.runtime.onInstalled.addListener(function() {

        chrome.pageAction.onClicked.addListener(function(tab) {
            generate_report();
        });

        // https://assignments.onenote.com/sections/classroom
        chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
            chrome.declarativeContent.onPageChanged.addRules([{
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { hostEquals: "teams.microsoft.com" }
                        // This doesn't work:
                        //pageUrl: { hostEquals: "teams.microsoft.com", pathSuffix: "sections/classroom" }
                    })
                ],
                actions: [new chrome.declarativeContent.ShowPageAction()]
            }]);
        });

    });
}
