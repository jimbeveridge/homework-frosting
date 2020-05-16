const forTodayButton = document.getElementById("forTodayButton");
const forLateButton = document.getElementById("forLateButton");

const extractCopyText = text =>
    text
    .split("\n")
    // Get rid of new lines
    .filter(_ => _.replace(/\s+/g, ""))
    .map(c => c.trim())
    .join("\n");

const copyToClipboard = code =>
    navigator.clipboard
    .writeText(code)
    .then(() => alert("Copied to clipboard~"))
    .catch(() => alert("Failed to copy to clipboard..."));
// This function expects an HTML string and copies it as rich text.

function copyFormatted(html) {
    // Create container for the HTML
    // [1]
    var container = document.createElement('div')
    container.innerHTML = html

    // Hide element
    // [2]
    container.style.position = 'fixed'
    container.style.pointerEvents = 'none'
    container.style.opacity = 0

    // Detect all style sheets of the page
    var activeSheets = Array.prototype.slice.call(document.styleSheets)
        .filter(function(sheet) {
            return !sheet.disabled
        })

    // Mount the container to the DOM to make `contentWindow` available
    // [3]
    document.body.appendChild(container)

    // Copy to clipboard
    // [4]
    window.getSelection().removeAllRanges()

    var range = document.createRange()
    range.selectNode(container)
    window.getSelection().addRange(range)

    // [5.1]
    document.execCommand('copy')

    // [5.2]
    for (var i = 0; i < activeSheets.length; i++) activeSheets[i].disabled = true

    // [5.3]
    document.execCommand('copy')

    // [5.4]
    for (var i = 0; i < activeSheets.length; i++) activeSheets[i].disabled = false

    // Remove the container
    // [6]
    document.body.removeChild(container)
}

document.getElementById("copyButton").addEventListener("click", _ => {
    const forToday = document.getElementById("copyme");
    //const code = extractCopyText(forToday.innerHtml);
    copyFormatted(forToday.innerHTML);
});

function generateTableHead(table, data, primary) {
    let thead = table.createTHead();
    let row = thead.insertRow();
    for (let key of data) {
        let th = document.createElement("th");
        th.className = key;

        if (key == primary) {
            th.setAttribute("data-sort-default", "");
        }

        let text = document.createTextNode(key);
        th.appendChild(text);
        row.appendChild(th);
    }
}

function createTableFromJSON(doc, rows, headings, primary, id) {

    // Determine the names of the columns
    if (headings == null || headings.length == 0) {
        headings = [];
        for (var i = 0; i < rows.length; i++) {
            for (var key in rows[i]) {
                if (headings.indexOf(key) === -1) {
                    headings.push(key);
                }
            }
        }
    }

    var table = doc.createElement("table");

    for (var i = 0; i < rows.length; i++) {

        tr = table.insertRow();

        for (let j = 0; j < headings.length; j++) {
            const heading = headings[j];
            let tabCell = tr.insertCell(-1);
            tabCell.className = heading;

            if (heading in rows[i]) {
                data = rows[i][heading];
                if (data === false) data = "-";
                if (data === true) date = "<b>&#x2713;</b>";

                tabCell.innerHTML = data;

                const sortHeading = heading + "Sort";
                if (sortHeading in rows[i]) {
                    tabCell.setAttribute("data-sort", rows[i][sortHeading]);
                }
            }
        }
    }

    // Must do this last to get a tbody section
    generateTableHead(table, headings, primary);

    // FINALLY ADD THE NEWLY CREATED TABLE WITH JSON DATA TO A CONTAINER.
    var divContainer = doc.getElementById(id);
    divContainer.innerHTML = "";
    divContainer.appendChild(table);

    let desc = {};
    if (primary == "submitted") {
        desc = {
            descending: true
        };
    }
    let ts = new Tablesort(table, desc);
    ts.refresh();
}

// dt1 and dt2 are both iso date strings
function hoursDiff(dt1, dt2) {
    let d1 = new Date(dt1);
    let d2 = new Date(dt2);

    let diffTime = (d2.getTime() - d1.getTime());
    return diffTime / (1000 * 3600);
}

// If any of the words in `filters` appears in item.name,
// then this is skipped.
function is_skipped(name, filters) {
    for (let i = 0; i < filters.length; i++) {
        if (filters[i] == "") continue;
        if (name.toLowerCase().indexOf(filters[i].toLowerCase()) != -1) {
            return true;
        }
    }
    return false;
}

function is_today(iso, today) {
    const someDate = new Date(iso);
    if (today == null) today = new Date();
    return someDate.getDate() == today.getDate() &&
        someDate.getMonth() == today.getMonth() &&
        someDate.getFullYear() == today.getFullYear();
}

function render(rows, updated, filter) {
    const nowIso = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
        let el = rows[i];
        el.today = is_today(el.dueDateTime);
        el.late = el.dueDateTime < nowIso && (!el.completed || el.missingSubmission);
        el.due = dateFormat(new Date(el.dueDateTime), "ddd, mmm d, h:MM TT")
        el.submitted = el.submittedDateTime != "" ? dateFormat(new Date(el.submittedDateTime), "ddd, mmm d, h:MM TT") : "";

        el.dueSort = el.dueDateTime;
        el.submittedSort = el.submittedDateTime;
        el.pointsSort = el.points > 0 ? ("" + el.points).padStart(5, "0") : "00000";

        if ("rework" in el) {
            if (el.rework) {
                el.today = true;
                el.due = "(corrections)";
                el.completed = false;
            }
        }


        if (el.completed && hoursDiff(el.submittedDateTime, updated) < 24) {
            el.name += " &#11088;";
        }
    }

    let el = document.getElementById("updated");
    el.innerText = dateFormat(new Date(updated), "ddd, mmm dS, yyyy, h:MM TT");

    // TODO Issue #
    let filters = filter.trim().split("\n");
    for (let i = 0; i < filters.length; i++) {
        if (filters[i].trim() == "")
            filters[i] = "";
    }
    rows = rows.filter((item) => !is_skipped(item.name + " " + item.classname, filters));

    let headings = ["classname", "name", "due", "points"];

    var wanted = rows.filter((item) => item.today && !item.completed && !item.late);
    createTableFromJSON(document, wanted, headings, "due", "forToday");

    wanted = rows.filter((item) => item.late);
    createTableFromJSON(document, wanted, headings, "due", "forLate");

    wanted = rows.filter((item) => !item.completed && !item.late && !item.today);
    createTableFromJSON(document, wanted, headings, "due", "forUpcoming");

    headings = ["classname", "name", "submitted", "points"];
    wanted = rows.filter((item) => item.completed && !item.late);
    createTableFromJSON(document, wanted, headings, "submitted", "forCompleted");
}

async function render_table_from_storage() {
    document.getElementById("report").style.display = "initial";
    document.getElementById("autherror").style.display = "none";
    document.getElementById("neterror").style.display = "none";

    chrome.storage.local.get("data", function(local) {
        chrome.storage.sync.get("options", function(obj) {
            //alert(JSON.stringify(local, null, 4));
            let filter = "";
            let options = obj.options;
            if (options != null && options.filter != null) filter = options.filter;
            render(local.data.rows, local.data.updated, filter);
        });
    });
}

function render_error(err) {
    //alert(JSON.stringify(err, null, 4));
    document.getElementById("report").style.display = "none";
    const autherror = document.getElementById("autherror");
    const neterror = document.getElementById("neterror");

    if (err.status == 401) {
        neterror.style.display = "none";
        autherror.style.display = "initial";
        //document.getElementById("report")
    } else {
        neterror.style.display = "initial";
        autherror.style.display = "none";
        document.getElementById("errmessage").innerText = JSON.stringify(err, null, 4);
    }
}

chrome.storage.local.get("error", function(obj) {
    if (obj != null && Object.keys(obj).length !== 0) {
        render_error(obj.error);
    } else {
        render_table_from_storage();
    }
});


// let rows = obj.rows;

// rows.sort(compare);
// render(obj.rows);