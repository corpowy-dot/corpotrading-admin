const chatContainer = document.getElementById('chat-container');
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

/**
 * PRO Machine Translation using MyMemory API (Free & CORS-Friendly)
 */
async function translateText(text, from, to) {
    if (from === to) return text;
    try {
        const langPair = `${from}|${to}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.responseData.translatedText || text;
    } catch (e) {
        console.error("Translation fail:", e);
        return text; 
    }
}

async function addMessage(text, role, lang = 'es', displayES = "") {
    const emptyMsg = document.querySelector('.empty');
    if (emptyMsg) emptyMsg.remove();

    const div = document.createElement('div');
    div.className = `msg msg-${role}`;
    
    let content = text;
    if (role === 'user') {
        const translated = await translateText(text, lang, 'es');
        content = `<span class="msg-lang">Original (${lang}): ${text}</span>${translated}`;
    } else if (role === 'advisor') {
        // En el panel del asesor, mostramos lo que el asesor escribió en ESPAÑOL
        content = displayES || text;
    }

    div.innerHTML = content;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

let lastUserLang = 'en';

// Firebase Real-time Listener
if (typeof db !== 'undefined') {
    db.ref('chats').on('child_added', (snapshot) => {
        const msg = snapshot.val();
        if (msg.role === 'user') {
            lastUserLang = msg.lang || 'en';
            addMessage(msg.text, 'user', lastUserLang);
        } else if (msg.role === 'advisor') {
            // Check if already displayed
            const textToMatch = msg.displayES || msg.text;
            const exist = Array.from(document.querySelectorAll('.msg-advisor')).some(m => m.innerText.includes(textToMatch));
            if (!exist) addMessage(msg.text, 'advisor', 'es', msg.displayES);
        }
    });
}

async function sendMessage() {
    const text = replyInput.value.trim();
    if (!text || typeof db === 'undefined') return;

    // UI Feedback (Instant)
    addMessage(text, 'advisor');
    replyInput.value = '';

    // 1. Translate for user (PRO)
    const translatedText = await translateText(text, 'es', lastUserLang);

    // 2. Push to Firebase
    db.ref('chats').push({
        text: translatedText,
        role: 'advisor',
        lang: lastUserLang,
        displayES: text,
        timestamp: Date.now()
    });
}

sendBtn.onclick = sendMessage;
replyInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
