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
 * PRO Machine Translation using Public API
 */
async function translateText(text, from, to) {
    if (from === to) return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();
        return data[0][0][0]; 
    } catch (e) {
        console.error("Translation fail:", e);
        return text; // Fallback to original
    }
}

async function addMessage(text, role, lang = 'es') {
    const emptyMsg = document.querySelector('.empty');
    if (emptyMsg) emptyMsg.remove();

    const div = document.createElement('div');
    div.className = `msg msg-${role}`;
    
    let content = text;
    if (role === 'user') {
        const translated = await translateText(text, lang, 'es');
        content = `<span class="msg-lang">Original (${lang}): ${text}</span>${translated}`;
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
            // Already added locally if sent from here, but syncs other advisor tabs
            // We use a simple check to not duplicate
            const exist = Array.from(document.querySelectorAll('.msg-advisor')).some(m => m.innerText.includes(msg.displayES));
            if (!exist) addMessage(msg.displayES || msg.text, 'advisor');
        }
    });
}

async function sendMessage() {
    const text = replyInput.value.trim();
    if (!text || typeof db === 'undefined') return;

    // 1. Translate for user (Real-time PRO)
    const translatedText = await translateText(text, 'es', lastUserLang);

    // 2. Push to Firebase
    db.ref('chats').push({
        text: translatedText,
        role: 'advisor',
        lang: lastUserLang,
        displayES: text,
        timestamp: Date.now()
    });
    
    // 3. Update UI locally
    addMessage(text, 'advisor');
    replyInput.value = '';
}

sendBtn.onclick = sendMessage;
replyInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
