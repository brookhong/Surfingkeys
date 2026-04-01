function RUNTIME(action, args, callback) {
    (args = args || {}).action = action;
    args.needResponse = callback !== undefined;
    chrome.runtime.sendMessage(args, callback);
}

var siteList = document.getElementById('siteList');
var newOriginInput = document.getElementById('newOrigin');
var addBtn = document.getElementById('addBtn');
var currentBlocklist = null;

function displayPattern(origin) {
    if (origin === '.*') return '* (all sites)';
    return origin;
}

function renderBlocklist(blocklist) {
    currentBlocklist = blocklist;
    siteList.innerHTML = '';
    var origins = Object.keys(blocklist);
    if (origins.length === 0) {
        siteList.innerHTML = '<li class="empty-msg">No disabled sites</li>';
        return;
    }
    origins.sort().forEach(function(origin) {
        var li = document.createElement('li');
        li.className = 'site-item';
        li.dataset.pattern = origin;

        var span = document.createElement('span');
        span.className = 'pattern';
        span.textContent = displayPattern(origin);
        span.onclick = function() {
            startEdit(li, origin);
        };

        var removeBtn = document.createElement('button');
        removeBtn.className = 'remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Remove';
        removeBtn.onclick = function() {
            delete blocklist[origin];
            RUNTIME('updateSettings', {
                settings: { blocklist: blocklist }
            }, function() {
                renderBlocklist(blocklist);
            });
        };

        li.appendChild(span);
        li.appendChild(removeBtn);
        siteList.appendChild(li);
    });
}

function startEdit(li, origin) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = origin === '.*' ? '' : origin;

    var saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Save';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'Cancel';

    var patternSpan = li.querySelector('.pattern');
    var removeBtn = li.querySelector('.remove');
    patternSpan.style.display = 'none';
    removeBtn.style.display = 'none';

    li.insertBefore(input, patternSpan);
    li.insertBefore(saveBtn, patternSpan);
    li.insertBefore(cancelBtn, patternSpan);
    input.focus();
    input.select();

    function finishEdit() {
        li.removeChild(input);
        li.removeChild(saveBtn);
        li.removeChild(cancelBtn);
        patternSpan.style.display = '';
        removeBtn.style.display = '';
    }

    function saveEdit() {
        var newPattern = input.value.trim();
        if (!newPattern) {
            finishEdit();
            return;
        }
        if (newPattern === origin) {
            finishEdit();
            return;
        }
        delete currentBlocklist[origin];
        currentBlocklist[newPattern] = 1;
        RUNTIME('updateSettings', {
            settings: { blocklist: currentBlocklist }
        }, function() {
            renderBlocklist(currentBlocklist);
        });
    }

    saveBtn.onclick = saveEdit;
    cancelBtn.onclick = finishEdit;
    input.onkeyup = function(e) {
        if (e.keyCode === 13) saveEdit();
        if (e.keyCode === 27) finishEdit();
    };
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function addOrigin() {
    var value = newOriginInput.value.trim();
    if (!value) return;
    var pattern = value;
    if (pattern.indexOf('*') === -1 && !pattern.match(/^https?:\/\//)) {
        pattern = 'https://' + pattern;
    }
    if (pattern.indexOf('*') === -1) {
        try {
            pattern = new URL(pattern).origin;
        } catch (e) {
            return;
        }
    }
    RUNTIME('getSettings', { key: 'blocklist' }, function(response) {
        var blocklist = response.settings.blocklist;
        blocklist[pattern] = 1;
        RUNTIME('updateSettings', {
            settings: { blocklist: blocklist }
        }, function() {
            newOriginInput.value = '';
            renderBlocklist(blocklist);
        });
    });
}

addBtn.addEventListener('click', addOrigin);
newOriginInput.addEventListener('keyup', function(e) {
    if (e.keyCode === 13) {
        addOrigin();
    }
});

RUNTIME('getSettings', { key: 'blocklist' }, function(response) {
    renderBlocklist(response.settings.blocklist);
});
