// When page loads:
//   If Assignments page (with classes):
//     Send message to bg page with class count
//     bg page saves the class count, the frameId, the tabId
//     bg page sets "classIndex" to the desired class index
//     bg page returns the desired class state if update is running, otherwise false
//   If Assignments Detail page (with list of assignments):
//     If "classIndex" is an integer (not missing, not false):
//       Request existing class data
//       Click the button for More, if present
//       Click the button for Completed
//       Get the assignments from the page
//       Add the assignments to the assignments array
//       Click the button for the picker
//   Otherwise:
//     clear storage?

const retryMaxSeconds = 30;
const retryIntervalMs = 1000;
const retryMaxCount = retryMaxSeconds * 1000 / retryIntervalMs;

// state is off, on, init. Storage monitoring is only active if "on".
const initData = { state: "on", classIndex: 11, classCount: 0, details: [] };

var retryTimer;
var retryCount = 0;

// Index of class we are processing
var savedData;

function log(str) {
    chrome.runtime.sendMessage({ action: "LOG", message: str }, function(response) {});
}

function class_count() {
    var elements = document.querySelectorAll("[id^='repost-enrollment-picker-']");
    return (elements == null) ? 0 : elements.length;
}

function is_assignments_page() {
    btn = document.getElementById('assignmentListView.assigned.student-toggle-button');
    return (btn != null);
}

// We don't actually need this because we can get the class names on the assignments detail page.
function classes() {
    var elements = document.querySelectorAll("[id^='repost-enrollment-picker-']");
    if (elements == null || elements.length == 0) return null;

    var classes = []
    for (const el of elements) {
        var div = el.querySelector("p[class^='item-text_']");
        if (div != null) {
            classes.push(div.innerText);
        } else {
            classes.push("");
        }
    }
    //alert("LOADED " + JSON.stringify(classes, null, 4));
    return classes;
}

function date_string(d) {
    const dateString = new Date(d.getTime() - (d.getTimezoneOffset() * 60000))
        .toISOString()
        .split("T")[0];
    return dateString;
}

// Returns null if we aren't sure if this is the assignments page.
// Returns an empty collection if there are no assignments.
function assignments() {
    const now = new Date();
    var tomorrow = new Date();
    var yesterday = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    yesterday.setDate(yesterday.getDate() - 1);

    if (!is_assignments_page()) return null;

    var elements = document.querySelectorAll("[class^='assignment-list-card-link_']");
    if (elements.length == 0) return elements;

    var cards = [];
    for (const el of elements) {
        card = {};
        var div = el.querySelector("[class^='assignment-card-title_']");
        if (div != null) card.name = div.innerText;

        div = el.querySelector("span[class*='assignment-card-class-name-text_']");
        if (div != null) card.classname = div.innerText;

        div = el.querySelector("[class^='has-points-text_']");
        if (div != null) card.points = parseInt(div.innerText);

        div = el.querySelector("[class^='assignment-card-duedate_']");
        if (div != null) {
            card.due = div.innerText;
            card.due = card.due.replace("Due ", "");
            card.today = card.due.startsWith("today");
            //log(card.due.replace("today at", date_string(now)).replace("tomorrow at ", date_string(tomorrow)));
            let date = new Date(card.due
                .replace("today at", date_string(now))
                .replace("yesterday at", date_string(yesterday))
                .replace("tomorrow at", date_string(tomorrow)));
            log("ass8" + date.toString());
            if (date.toString() != "Invalid Date") {
                card.dueIso = date.toISOString();
            }
            log("ass9");
        }
        log("ass10");

        div = el.querySelector("[class^='past-due-date_']");
        if (div != null) card.late = true;

        div = el.querySelector("[class^='completed-card_']");
        if (div != null) {
            log("ass11");
            card.completed = true;
            div = div.querySelector("svg[class*='checkmark_']");
            card.accepted = (div != null);
        }
        log("ass12");

        cards.push(card);
    }
    log("ass13");
    return cards;
}

// // document.write("<PRE>");
// // document.write(JSON.stringify(cards, null, 4));
// // document.write("</PRE>");

function goto_class(n) {
    document.getElementById('repost-enrollment-picker-' + n).click();
    btn = document.querySelector("button[class^='ms-Button ms-Button--primary teams-button-primary']");
    if (btn != null) {
        log(7);
        btn.click();
        return;
    }

    // When we initially go to the page by clicking Assignments on
    // the left, the Next button is disabled, so we have to wait for
    // it to be enabled after we click the class above.
    btn = document.querySelector("button[class^='ms-Button ms-Button--primary is-disabled teams-button-primary']");
    if (btn != null) {
        log(8);
        let localTimer = setInterval(function() {
            btn = document.querySelector("button[class^='ms-Button ms-Button--primary teams-button-primary']");
            if (btn != null) {
                log(9);
                clearInterval(localTimer);
                btn.click();
                return;
            }
        }, 200);
    }
}

// Bring up the modal dialog
function click_well() {
    var btn = document.querySelector("button[class^='well-button_']");
    if (btn != null) btn.click();
}

// Started by the Page Action when the user clicks the button
function start_gathering() {
    log("start_gathering");
    savedData = initData;
    let count = process_classes_page();
    log("start_g RET");

    retryTimer = setInterval(timer_tick, 1000);

    if (count == 0) {
        chrome.storage.local.set({ data: savedData }, function() {
            log("set3");
            click_well();
        });
    }
}

// function notify_bg_page() {
//     log("notify_bg_page");
//     retryCount += 1;
//     // Give up after one minute of trying
//     if (retryCount > retryMaxCount) {
//         log("notify_bg_page - giving up");
//         clearInterval(retryTimer);
//         return;
//     }

//     let count = class_count();
//     if (count > 0) {
//         log("notify_bg_page - sendMessage");
//         clearInterval(retryTimer);
//         // As a side effect, the background page will also receive
//         // the tab id and the frame id.
//         chrome.runtime.sendMessage({ "action": "update", "class_count": count }, function(response) {
//             //alert("Background page responded: " + response);
//         });
//     }
// }

const clickedAttr = "data-clicked";
const childCountAttr = "data-child-count";

// The Assigned or Completed sections
function expand_section(btn) {
    if (btn != null) {
        log("expand 1");
        let expanded1 = btn.getAttribute("aria-expanded") === "true";

        let elements = btn.parentNode.querySelectorAll("[class^='assignment-list-card-link_']");
        let childNewCount = elements.length;

        log("expand 2");
        let clicked = btn.getAttribute(clickedAttr) === "true";
        log("expand 3 exp " + expanded1 + " childNewCount " + childNewCount + " clckd " + clicked);
        if (!expanded1) {
            log("expand 4");
            if (!clicked) {
                log("CLICKING SECTION");
                btn.setAttribute(clickedAttr, "true");
                btn.click();
                log("expand 6");
            }
            log("expand 7");
            return false;
        } else {
            log("expand 8" + (childNewCount > 0));
            return childNewCount > 0;
        }
    }
    log("expand done");
    return true;
}

// Possible states:
// 1. There's no "View More" button.
// 2. There a "View More" button and we've never pressed it.
// 3. There a "View More" button, we've pressed it, and it's processing.
// 4. There NO "View More" button because processing is done.
// 5. There still a "View More" button after pressing it, and processing is done.
function expand_view_more(btn, parent) {
    log("expand_view_more 0");
    if (btn != null) { // Cases #1 and #4
        log("expand_view_more 1");

        let clicked = btn.getAttribute(clickedAttr) === "true";

        let childOldCount = parent.getAttribute(childCountAttr);
        if (childOldCount == null || childOldCount == "") {
            childOldCount = 0;
        }

        let elements = parent.parentNode.querySelectorAll("[class^='assignment-list-card-link_']");
        let childNewCount = elements.length;

        if (clicked) {
            if (childOldCount < childNewCount) {
                // Case #5
                clicked = false;
            } else {
                // Still waiting for the page to update
                return false;
            }
        } else { // Cases #2 and #5
            log("CLICKING VIEW_MORE");
            btn.setAttribute(clickedAttr, "true");
            btn.setAttribute(childCountAttr, childNewCount);
            btn.click();
            return false;
        }
    }
    log("expand_view_more done");
    return true;
}


// The Assigned and Completed buttons always exist, even if there are no assignments.
function expand_all_sections() {
    let btn = document.getElementById('assignmentListView.assigned.student-toggle-button');
    log("expand_all_sections 1");
    let result = expand_section(btn);
    if (!result) return false;

    log("expand_all_sections 2");
    let more = btn.querySelector("button[class^='load-more-button_']");
    result = expand_view_more(more, btn);
    if (!result) return false;

    log("expand_all_sections 3");
    btn = document.getElementById('assignmentListView.graded.student-toggle-button');
    result = expand_section(btn);
    if (!result) return false;

    log("expand_all_sections 4");
    more = btn.parentNode.querySelector("button[class^='load-more-button_']");
    result = expand_view_more(more, btn);
    if (!result) return false;

    log("expand_all_sections done");
    return true;
}

function process_classes_page() {
    let count = class_count();
    log("process_classes_page " + count + " " + savedData.classIndex + " " + savedData.classCount);
    if (count > 0) {
        log("pcp1");
        if (savedData.classIndex < count) {
            log("pcp2");
            savedData.classCount = count;
            chrome.storage.local.set({ data: savedData }, function() {
                log("pcp3");
                goto_class(savedData.classIndex);
            });
        }
    }
    log("pcp5");

    return count;
}

// returns false if we need to be called again in the future
function process_page() {
    let count = process_classes_page();
    if (count > 0) {
        log("pp RET" + count);
        return true;
    }

    log("pp3");
    let btn = document.getElementById('assignmentListView.assigned.student-toggle-button');
    if (btn != null) {
        // If opening sections is still pending, retry later.
        if (!expand_all_sections()) {
            log("pp4");
            return false;
        }

        details = assignments();
        // details.length being zero is not an error. That just
        // means there are no assigments in that section.
        if (details.length > 0) {
            log("pp5");
            savedData.details = savedData.details.concat(details);
        }
        savedData.classIndex += 1;
        chrome.storage.local.set({ data: savedData }, function() {
            log("pp6 ");
            if (savedData.classIndex < savedData.classCount) {
                click_well();
            } else {
                log("pp-----------");
                log(JSON.stringify(savedData, null, 4));
                savedData.state = "done";
                chrome.storage.local.set({ data: savedData });
                //chrome.runtime.sendMessage({ "action": "display", "class_count": count }, function(response) {});
            }
        });
        log("pp7");

        return true;
    }

    return false;
}

function timer_tick() {
    log("TICK");
    clearInterval(retryTimer);

    retryCount += 1;
    // Give up after one minute of trying
    if (retryCount > retryMaxCount) {
        log("process-page - TIMEOUT");
        savedData.state = "error";
        chrome.storage.local.set({ data: savedData });
        return;
    }

    chrome.storage.local.get("data", function(obj) {
        log("STATE " + obj.data.state);
        if (obj.data.state == "on") {
            if (!process_page()) {
                retryTimer = setInterval(timer_tick, 250);
            }
        }
    });
}

function addInitStateHandler() {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (changes.data.newValue.state == "init") {
            start_gathering();
        }
    });
}

// TODO - Handle viewing from multiple browser tabs.
if (document.title == "Assignments") {
    log("contentScript.js");
    chrome.storage.local.get("data", function(obj) {
        if (obj.data.state == "on") {
            log(3);
            savedData = obj.data;
            retryTimer = setInterval(timer_tick, 500);
        } else if (obj.data.state == "off") {
            log(1);
            addInitStateHandler();
        }
    });
}