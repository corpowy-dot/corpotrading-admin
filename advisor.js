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
 * PRO Machine Translation (Async Fallback)
 */
async function translateText(text, from, to) {
    if (from === to || !text) return text;
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000); // 3s Timeout
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        const data = await response.json();
        return data.responseData.translatedText || text;
    } catch (e) { return text; }
}

async function addMessage(text, role, lang = 'es', displayES = "", msgId = null) {
    const div = document.createElement('div');
    div.className = `msg msg-${role}`;
    if (msgId) div.id = `m-${msgId}`;
    
    let content = text;
    if (role === 'user') {
        // Placeholder until translation arrives
        content = `<span class="msg-lang">Original (${lang}): ${text}</span><span class="msg-trans">Traduciendo...</span>`;
        
        // Background Translation
        translateText(text, lang, 'es').then(trans => {
            const transNode = div.querySelector('.msg-trans');
            if (transNode) transNode.innerText = trans;
        });
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
    
    currentSessionId = sid;
    chatContainer.innerHTML = '';
    const tab = document.querySelector(`[data-sid="${sid}"]`);
    if (tab) {
        tab.classList.remove('notified');
        tab.classList.add('active');
        tab.style.boxShadow = 'none';
        tab.style.borderColor = 'var(--primary)';
    }
    document.querySelectorAll('.session-tab').forEach(t => {
        if (t.dataset.sid !== sid) t.classList.remove('active');
    });

    // Reload history for this session
    db.ref(`chats/${sid}/messages`).once('value', (snapshot) => {
        snapshot.forEach(child => {
            const m = child.val();
            if (m.role === 'user') addMessage(m.text, 'user', m.lang, "", child.key);
            else addMessage(m.text, 'advisor', 'es', m.displayES, child.key);
        });
    });
}

function handleIncomingMessage(sid, msg, msgId) {
    // 1. SOUND ALERT (Always if role is user)
    if (msg.role === 'user' && typeof playNotification === 'function') {
        playNotification();
    }

    // 2. UI UPDATE
    if (currentSessionId === sid) {
        // Check for duplicates
        if (document.getElementById(`m-${msgId}`)) return;

        if (msg.role === 'user') {
            lastUserLang = msg.lang || 'en';
            addMessage(msg.text, 'user', lastUserLang, "", msgId);
        } else if (msg.role === 'advisor') {
            addMessage(msg.text, 'advisor', 'es', msg.displayES, msgId);
        }
    } else {
        // High-vis notification for background session
        const tab = document.querySelector(`[data-sid="${sid}"]`);
        if (tab && msg.role === 'user') {
            tab.classList.add('notified');
        }
    }
}

/**
 * Global Listeners
 */
if (typeof db !== 'undefined') {
    // Listen for new sessions
    db.ref('chats').on('child_added', (snapshot) => {
        const sid = snapshot.key;
        if (!document.querySelector(`[data-sid="${sid}"]`)) {
            const empty = sessionSelector.querySelector('.empty');
            if (empty) empty.remove();

            const tab = document.createElement('div');
            tab.className = 'session-tab';
            tab.dataset.sid = sid;
            tab.innerText = `Chat: ${sid.substr(-4)}`; 
            tab.onclick = () => switchSession(sid);
            sessionSelector.appendChild(tab);

            if (!currentSessionId) switchSession(sid);
        }
        
        // Always attach message listener to NEW session
        if (!activeListeners[sid]) {
            db.ref(`chats/${sid}/messages`).on('child_added', (msgSnap) => {
                handleIncomingMessage(sid, msgSnap.val(), msgSnap.key);
            });
            activeListeners[sid] = true;
        }
    });

    // Handle existing sessions on reload (already handled by child_added in Firebase)
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
