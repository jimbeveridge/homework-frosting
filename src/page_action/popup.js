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

function generateTableHead(table, data) {
    let thead = table.createTHead();
    let row = thead.insertRow();
    for (let key of data) {
        let th = document.createElement("th");
        let text = document.createTextNode(key);
        th.appendChild(text);
        row.appendChild(th);
    }
}

function CreateTableFromJSON(doc, myBooks, col, id) {

    // EXTRACT VALUE FOR HTML HEADER.
    // ('Book ID', 'Book Name', 'Category' and 'Price')
    if (col == null || col.length == 0) {
        col = [];
        for (var i = 0; i < myBooks.length; i++) {
            for (var key in myBooks[i]) {
                if (col.indexOf(key) === -1) {
                    col.push(key);
                }
            }
        }
    }

    // CREATE DYNAMIC TABLE.
    var table = doc.createElement("table");

    // CREATE HTML TABLE HEADER ROW USING THE EXTRACTED HEADERS ABOVE.

    // ADD JSON DATA TO THE TABLE AS ROWS.
    for (var i = 0; i < myBooks.length; i++) {

        tr = table.insertRow();

        for (let j = 0; j < col.length; j++) {
            let tabCell = tr.insertCell(-1);
            if (col[j] in myBooks[i]) {
                data = myBooks[i][col[j]];
                if (data === false) data = "-";
                if (data === true) date = "<b>&#x2713;</b>";

                tabCell.innerHTML = data;
            }
        }
    }

    // Must do this last to get a tbody section
    generateTableHead(table, col);

    // FINALLY ADD THE NEWLY CREATED TABLE WITH JSON DATA TO A CONTAINER.
    var divContainer = doc.getElementById(id);
    divContainer.innerHTML = "";
    divContainer.appendChild(table);
}

function compare(a, b) {
    let bandA = "";
    let bandB = "";

    if ("dueIso" in a) bandA = a.dueIso;
    if ("dueIso" in b) bandB = b.dueIso;

    let comparison = 0;
    if (bandA > bandB) {
        comparison = 1;
    } else if (bandA < bandB) {
        comparison = -1;
    }
    return comparison;
}

function daysDiff(dt1, dt2)
{
    // calculate the time difference of two dates JavaScript
    let diffTime = (dt2.getTime() - dt1.getTime());
    // calculate the number of days between two dates javascript
    let daysDiff = diffTime / (1000 * 3600 * 24);
    return daysDiff;
}

function render(incoming) {

    let details = incoming;

    for (let i = 0; i < details.length; i++) {
        el = details[i];
        el.name = "<b>" + el.name + "</b>";
        el.due = dateFormat(new Date(el.dueIso), "ddd, mmm dS, yyyy, h:MM TT")
        if ("rework" in el) {
            if (el.rework) {
                el.today = true;
                el.due = "(corrections)";
                el.completed = false;
            }
        }
    }

    details = details.sort(compare);
    details = details.filter((item) => !item.name.includes('Banga') && !item.name.includes('Nielsen'));

    let headings = ["classname", "name", "due", "points"];

    var wanted = details.filter((item) => item.today);
    CreateTableFromJSON(document, wanted, headings, "forToday");

    wanted = details.filter((item) => item.late && !item.completed);
    CreateTableFromJSON(document, wanted, headings, "forLate");

    wanted = details.filter((item) => !item.completed && !item.late && !item.today);
    CreateTableFromJSON(document, wanted, headings, "forUpcoming");

    const now = Date();
    wanted = details.filter((item) => item.completed);
    CreateTableFromJSON(document, wanted, headings, "forCompleted");
}

function render_table_from_storage() {
    chrome.storage.local.get("data", function(obj) {

        let details = obj.data;

        details.sort(compare);
        render(details);
    });
}

render_table_from_storage();

// let details = obj.details;

// details.sort(compare);
// render(obj.details);