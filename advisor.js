const chatContainer = document.getElementById('chat-container');
const replyInput = document.getElementById('reply-input');
const sendBtn = document.getElementById('send-btn');

// Translation Dictionaries (Full logic for demo)
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
    // Simple heuristic for demo; in production use API
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

function loadChats() {
    const raw = localStorage.getItem('corpotrading_chats');
    if (raw) {
        const chats = JSON.parse(raw);
        chatContainer.innerHTML = '';
        chats.forEach(m => addMessage(m.text, m.role, m.lang));
    }
}

function sendMessage() {
    const text = replyInput.value.trim();
    if (!text) return;

    // 1. Get current chats
    const raw = localStorage.getItem('corpotrading_chats') || '[]';
    const chats = JSON.parse(raw);
    
    // 2. Identify target language from last user message
    const lastUserMsg = [...chats].reverse().find(m => m.role === 'user');
    const targetLang = lastUserMsg ? lastUserMsg.lang : 'en';

    // 3. Translate for user
    const translatedText = translateFromSpanish(text, targetLang);

    // 4. Update local storage
    const newMsg = { text: translatedText, role: 'advisor', lang: targetLang, displayES: text };
    chats.push(newMsg);
    localStorage.setItem('corpotrading_chats', JSON.stringify(chats));
    
    // 5. Update UI
    addMessage(text, 'advisor');
    replyInput.value = '';
}

sendBtn.onclick = sendMessage;
replyInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };

// Sync Listener
window.addEventListener('storage', (e) => {
    if (e.key === 'corpotrading_chats') {
        loadChats();
    }
});

// Initial Load
loadChats();
