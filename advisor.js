const chatContainer = document.getElementById('chat-container');
const sessionSelector = document.getElementById('session-selector');
const replyInput = document.getElementById('reply-input');
const sendBtn = document.getElementById('send-btn');

// ==========================================
// CONFIGURACIÓN GEMINI (Misma clave que en la web)
const GEMINI_API_KEY = "AIzaSyBdDhKUTw4Ec13nvvJCzrQATDrLpBik2NY";
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyC0n24ottjUNnentg1aCgQSdfQHHpZJEuo",
    authDomain: "corpotrading-chat.firebaseapp.com",
    projectId: "corpotrading-chat",
    storageBucket: "corpotrading-chat.firebasestorage.app",
    messagingSenderId: "162943016451",
    appId: "1:162943016451:web:d1227a4992c99e27a17836",
    databaseURL: "https://corpotrading-chat-default-rtdb.firebaseio.com"
};

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.database();
}

let currentSessionId = null;
let lastUserLang = 'en';
const activeListeners = {};

async function translateText(text, from, to) {
    if (from === to || !text) return text;

    if (GEMINI_API_KEY) {
        try {
            const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Traduce este mensaje de ${from} a ${to} de forma profesional y exacta: ${text}` }] }] })
            });
            const d = await res.json();
            return d.candidates[0].content.parts[0].text;
        } catch (e) { console.error("Gemini Trans Error", e); }
    }

    // Fallback MyMemory
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000);
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
        content = `<span class="msg-lang">Original (${lang}): ${text}</span><span class="msg-trans">Traduciendo...</span>`;
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

function switchSession(sid) {
    if (currentSessionId === sid) return;
    currentSessionId = sid;
    chatContainer.innerHTML = '';
    const tab = document.querySelector(`[data-sid="${sid}"]`);
    if (tab) {
        tab.classList.remove('notified');
        tab.classList.add('active');
    }
    document.querySelectorAll('.session-tab').forEach(t => {
        if (t.dataset.sid !== sid) t.classList.remove('active');
    });

    db.ref(`chats/${sid}/messages`).once('value', (snapshot) => {
        snapshot.forEach(child => {
            const m = child.val();
            if (m.role === 'user') addMessage(m.text, 'user', m.lang || 'en', "", child.key);
            else addMessage(m.text, 'advisor', 'es', m.displayES, child.key);
        });
    });
}

function handleIncomingMessage(sid, msg, msgId) {
    if (msg.role === 'user' && typeof playNotification === 'function') playNotification();
    if (currentSessionId === sid) {
        if (document.getElementById(`m-${msgId}`)) return;
        if (msg.role === 'user') {
            lastUserLang = msg.lang || 'en';
            addMessage(msg.text, 'user', lastUserLang, "", msgId);
        } else if (msg.role === 'advisor') {
            addMessage(msg.text, 'advisor', 'es', msg.displayES, msgId);
        }
    } else {
        const tab = document.querySelector(`[data-sid="${sid}"]`);
        if (tab && msg.role === 'user') tab.classList.add('notified');
    }
}

if (typeof db !== 'undefined') {
    db.ref('chats').on('child_added', (snapshot) => {
        const sid = snapshot.key;
        if (!document.querySelector(`[data-sid="${sid}"]`)) {
            const empty = sessionSelector.querySelector('.empty');
            if (empty) empty.remove();
            const tab = document.createElement('div');
            tab.className = 'session-tab';
            tab.dataset.sid = sid;
            tab.innerText = `ID: ${sid.substr(-4)}`;
            tab.onclick = () => switchSession(sid);
            sessionSelector.appendChild(tab);
            if (!currentSessionId) switchSession(sid);
        }
        if (!activeListeners[sid]) {
            db.ref(`chats/${sid}/messages`).on('child_added', (sn) => {
                handleIncomingMessage(sid, sn.val(), sn.key);
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
        text: translatedText, role: 'advisor', lang: lastUserLang, displayES: text, timestamp: Date.now()
    });
}

sendBtn.onclick = sendMessage;
replyInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
