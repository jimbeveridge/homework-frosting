function processForm(e) {
    if (e.preventDefault) e.preventDefault();

    phrases = document.getElementById('options').value;
    chrome.storage.sync.set({ filter: phrases }, function() {
        document.getElementById('saved').innerHTML = "<span class='glow'>Saved</span>";
    });

    // You must return false to prevent the default form behavior
    return false;
}

window.onload = function() {
    let el = document.getElementById("options");
    el.placeholder = "EXTRA CREDIT\nmacinerny";

    chrome.storage.sync.get("filter", function(obj) {
        if (obj != null && obj != "") {
            el.value = obj.filter;
        }
    });
    document.getElementById('options-form').onsubmit = function(e) {
        processForm(e);
        return false;
    }
}