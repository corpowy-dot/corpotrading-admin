const chatContainer = document.getElementById('chat-container');
const sessionSelector = document.getElementById('session-selector');
const replyInput = document.getElementById('reply-input');
const sendBtn = document.getElementById('send-btn');

// Firebase Configuration (PRO)
const firebaseConfig = {
  apiKey: "AIzaSyC0n24ottjUNnentg1aCgQSdfQHHpZJEuo",
  authDomain: "corpotrading-chat.firebaseapp.com",
  projectId: "corpotrading-chat",
  storageBucket: "corpotrading-chat.firebasestorage.app",
  messagingSenderId: "162943016451",
  appId: "1:162943016451:web:d1227a4992c99e27a17836",
  databaseURL: "https://corpotrading-chat-default-rtdb.firebaseio.com"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.database();
}

let currentSessionId = null;
let lastUserLang = 'en';
const activeListeners = {}; 

/**
 * PRO Machine Translation using MyMemory API
 */
async function translateText(text, from, to) {
    if (from === to || !text) return text;
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.responseData.translatedText || text;
    } catch (e) { return text; }
}

async function addMessage(text, role, lang = 'es', displayES = "") {
    const div = document.createElement('div');
    div.className = `msg msg-${role}`;
    
    let content = text;
    if (role === 'user') {
        const translated = await translateText(text, lang, 'es');
        content = `<span class="msg-lang">Original (${lang}): ${text}</span><span class="msg-trans">${translated}</span>`;
    } else if (role === 'advisor') {
        content = displayES || text;
    }

    div.innerHTML = content;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Load a specific session's messages
 */
function switchSession(sid) {
    if (currentSessionId === sid) return;
    
    // UI Update
    currentSessionId = sid;
    chatContainer.innerHTML = '';
    const tab = document.querySelector(`[data-sid="${sid}"]`);
    if (tab) {
        tab.classList.remove('notified'); // Clear notification
        tab.classList.add('active');
    }
    document.querySelectorAll('.session-tab').forEach(t => {
        if (t.dataset.sid !== sid) t.classList.remove('active');
    });

    // Attach listener if not already attached
    if (!activeListeners[sid]) {
        db.ref(`chats/${sid}/messages`).on('child_added', (snapshot) => {
            const msg = snapshot.val();
            handleIncomingMessage(sid, msg);
        });
        activeListeners[sid] = true;
    } else {
        // Reload history
        db.ref(`chats/${sid}/messages`).once('value', (snapshot) => {
            snapshot.forEach(child => {
                const m = child.val();
                if (m.role === 'user') addMessage(m.text, 'user', m.lang);
                else addMessage(m.text, 'advisor', 'es', m.displayES);
            });
        });
    }
}

function handleIncomingMessage(sid, msg) {
    if (currentSessionId === sid) {
        if (msg.role === 'user') {
            lastUserLang = msg.lang || 'en';
            addMessage(msg.text, 'user', lastUserLang);
            if (typeof playNotification === 'function') playNotification();
        } else if (msg.role === 'advisor') {
            addMessage(msg.text, 'advisor', 'es', msg.displayES);
        }
    } else {
        // Notification for background session
        const tab = document.querySelector(`[data-sid="${sid}"]`);
        if (tab && msg.role === 'user') {
            tab.classList.add('notified');
            if (typeof playNotification === 'function') playNotification();
        }
    }
}

/**
 * Listen for all sessions
 */
if (typeof db !== 'undefined') {
    db.ref('chats').on('child_added', (snapshot) => {
        const sid = snapshot.key;
        
        // Remove empty state if exists
        const empty = sessionSelector.querySelector('.empty');
        if (empty) empty.remove();

        // Create Tab
        if (!document.querySelector(`[data-sid="${sid}"]`)) {
            const tab = document.createElement('div');
            tab.className = 'session-tab';
            tab.dataset.sid = sid;
            tab.innerText = `ID: ${sid.substr(-5)}`; 
            tab.onclick = () => switchSession(sid);
            sessionSelector.appendChild(tab);

            // Auto-switch if first session
            if (!currentSessionId) switchSession(sid);
        }
        
        // Watch for messages even if not active session yet
        if (!activeListeners[sid]) {
            db.ref(`chats/${sid}/messages`).on('child_added', (sn) => {
                handleIncomingMessage(sid, sn.val());
            });
            activeListeners[sid] = true;
        }
    });
}

async function sendMessage() {
    const text = replyInput.value.trim();
    if (!text || !currentSessionId || typeof db === 'undefined') return;

    replyInput.value = '';

    const translatedText = await translateText(text, 'es', lastUserLang);

    db.ref(`chats/${currentSessionId}/messages`).push({
        text: translatedText,
        role: 'advisor',
        lang: lastUserLang,
        displayES: text,
        timestamp: Date.now()
    });
}

sendBtn.onclick = sendMessage;
replyInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
