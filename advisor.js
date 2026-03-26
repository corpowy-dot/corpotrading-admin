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

// Translation Dictionaries
const dictionary = {
    toES: {
        en: { "Hello": "Hola", "Logistics": "Logística", "I need help": "Necesito ayuda", "Shipping": "Envío" },
        zh: { "你好": "Hola", "物流": "Logística", "帮助": "Necesito ayuda", "航运": "Envío" }
    },
    fromES: {
        en: { "Hola": "Hello", "Logística": "Logistics", "En qué puedo ayudar": "How can I help", "Entendido": "Understood" },
        zh: { "Hola": "你好", "Logística": "物流", "En qué puedo ayudar": "我可以如何帮您", "Entendido": "明白了" }
    }
};

function translateToSpanish(text, fromLang) {
    if (fromLang === 'es') return text;
    const map = dictionary.toES[fromLang] || {};
    let trans = text;
    Object.keys(map).forEach(key => {
        const regex = new RegExp(key, 'gi');
        trans = trans.replace(regex, map[key]);
    });
    return trans;
}

function translateFromSpanish(text, toLang) {
    if (toLang === 'es') return text;
    const map = dictionary.fromES[toLang] || {};
    let trans = text;
    Object.keys(map).forEach(key => {
        const regex = new RegExp(key, 'gi');
        trans = trans.replace(regex, map[key]);
    });
    return trans;
}

function addMessage(text, role, lang = 'es') {
    const emptyMsg = document.querySelector('.empty');
    if (emptyMsg) emptyMsg.remove();

    const div = document.createElement('div');
    div.className = `msg msg-${role}`;
    
    let content = text;
    if (role === 'user') {
        const translated = translateToSpanish(text, lang);
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
            // Already added locally if sent from here, but helps sync other advisor windows
            if (!document.querySelector(`[data-id="${snapshot.key}"]`)) {
                addMessage(msg.text, 'advisor');
            }
        }
    });
}

function sendMessage() {
    const text = replyInput.value.trim();
    if (!text || typeof db === 'undefined') return;

    // 1. Translate for user
    const translatedText = translateFromSpanish(text, lastUserLang);

    // 2. Push to Firebase
    db.ref('chats').push({
        text: translatedText,
        role: 'advisor',
        lang: lastUserLang,
        displayES: text,
        timestamp: Date.now()
    });
    
    // 3. Update UI locally for speed
    addMessage(text, 'advisor');
    replyInput.value = '';
}

sendBtn.onclick = sendMessage;
replyInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
