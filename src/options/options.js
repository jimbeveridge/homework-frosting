// Copyright 2020 James E. Beveridge
// SPDX-License-Identifier: Apache-2.0

function processForm(e) {
    if (e.preventDefault) e.preventDefault();

    const phrases = document.getElementById('removelist').value;
    const myhomeworkkey = document.getElementById('myhomeworkkey').value.trim();
    chrome.storage.sync.set({ options: { filter: phrases, myhomeworkkey: myhomeworkkey } }, function() {
        document.getElementById('saved').innerHTML = "<span class='glow'>Saved</span>";
    });

    // You must return false to prevent the default form behavior
    return false;
}

window.onload = function() {
    document.getElementById('options-form').onsubmit = processForm;

    let el = document.getElementById("removelist");
    el.placeholder = "EXTRA CREDIT\nmacinerny";

    if (typeof myhw_update == 'function') {
        document.getElementById("myhwoptions").style.display = "initial";
    }

    chrome.storage.sync.get("options", function(obj) {
        let options = obj.options;
        if (options != null && options.filter != null) {
            el.value = options.filter;
        }
        if (options != null && options.myhomeworkkey != null) {
            document.getElementById("myhomeworkkey").value = options.myhomeworkkey;
        }
    });
}