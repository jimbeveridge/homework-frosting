var t;

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

function assignments() {
    var date = new Date();
    var dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
        .toISOString()
        .split("T")[0];

    var elements = document.querySelectorAll("[class^='assignment-list-card-link_']");
    if (elements == null || elements.length == 0) return null;

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
            card.due = card.due.replace("today at", dateString);
            var date = new Date(card.due);
            card.dueIso = date;
        }

        div = el.querySelector("[class^='past-due-date_']");
        if (div != null) card.late = true;

        div = el.querySelector("[class^='completed-card_']");
        if (div != null) {
            card.completed = true;
            div = div.querySelector("svg[class*='checkmark_']");
            card.accepted = (div != null);
        }

        cards.push(card);
    }
    return cards;
}

// let obj = classes();
// if (obj != null) {
//     chrome.runtime.sendMessage({classes: obj}, function(response) {
//         console.log("Car Response: ", response);
//     });
// } else {
//     obj = assignments();
//     if (obj != null) {
//         chrome.runtime.sendMessage({assignments: obj}, function(response) {
//             console.log("Ass Response: ", response);
//         });
//     }
// }

function send_classes() {
    let obj = classes()
    if (obj == null) return;

    clearInterval(t);
    chrome.runtime.sendMessage({ classes: obj }, function(response) {
        alert("Ass Response: ", response);
    });
}

//if (document.title == "Assignments") {
t = setInterval(send_classes, 500);
//}

// // document.write("<PRE>");
// // document.write(JSON.stringify(cards, null, 4));
// // document.write("</PRE>");