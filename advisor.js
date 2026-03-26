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

// MASSIVE LOCAL DICTIONARY (Extreme Fallback)
const extremeDict = {
    toES: {
        en: { 
            "hello": "hola", "hi": "hola", "hey": "hola", "greetings": "saludos", "morning": "buenos días", "afternoon": "buenas tardes", "evening": "buenas noches",
            "logistics": "logística", "shipping": "envío", "freight": "flete", "container": "contenedor", "containers": "contenedores", "warehouse": "almacén",
            "supply chain": "cadena de suministro", "trade": "comercio", "trading": "trading", "import": "importación", "export": "exportación",
            "customs": "aduanas", "clearance": "despacho", "broker": "agente", "forwarder": "transitario", "port": "puerto", "vessel": "barco",
            "price": "precio", "prices": "precios", "cost": "costo", "quote": "cotización", "quotation": "presupuesto", "invoice": "factura", "payment": "pago",
            "help": "ayuda", "need": "necesito", "problem": "problema", "issue": "asunto", "question": "pregunta", "info": "información", "details": "detalles",
            "miami": "miami", "china": "china", "shenzhen": "shenzhen", "shanghai": "shanghai", "usa": "ee.uu.", "mexico": "méxico", 
            "ai": "ia", "artificial intelligence": "inteligencia artificial", "software": "software", "solution": "solución", "solutions": "soluciones",
            "automated": "automatizado", "efficiency": "eficiencia", "optimize": "optimizar", "optimization": "optimización",
            "thank you": "gracias", "thanks": "gracias", "bye": "adiós", "goodbye": "adiós", "see you": "hasta luego", "welcome": "bienvenido",
            "yes": "sí", "no": "no", "ok": "de acuerdo", "okay": "ok", "ready": "listo", "done": "terminado", "working": "trabajando", "buy": "comprar", "sell": "vender"
        },
        zh: { 
            "你好": "hola", "您好": "hola", "物流": "logística", "供应链": "cadena de suministro", "国际贸易": "comercio internacional",
            "帮助": "ayuda", "送货": "envío", "货运": "flete", "集装箱": "contenedores", "海关": "aduanas", "清关": "despacho", "仓库": "almacén",
            "价格": "precio", "报价": "cotización", "发票": "factura", "付款": "pago", "谢谢": "gracias", "再见": "adiós", "美国": "ee.uu.", "中国": "china"
        }
    },
    fromES: {
        en: { 
            "hola": "hello", "buenos días": "good morning", "buenas tardes": "good afternoon", "saludos": "greetings",
            "logística": "logistics", "envío": "shipping", "flete": "freight", "contenedor": "container", "almacén": "warehouse",
            "aduanas": "customs", "despacho": "clearance", "precio": "price", "cotización": "quote", "factura": "invoice", "pago": "payment",
            "ayuda": "help", "necesito": "i need", "pregunta": "question", "gracias": "thank you", "adiós": "goodbye", "si": "yes", "no": "no",
            "claro": "sure", "entendido": "understood", "perfecto": "perfect", "listo": "ready", "comprar": "buy", "vender": "sell"
        },
        zh: { 
            "hola": "你好", "logística": "物流", "envío": "送货", "aduanas": "海关", "precio": "价格", "gracias": "谢谢", "adiós": "再见"
        }
    }
};

/**
 * EXTREME Translation Logic (Dictionary + API)
 */
async function translateText(text, from, to) {
    if (from === to) return text;
    
    // 1. Check Local Dictionary First (Instant & Global)
    let trans = text.toLowerCase();
    const map = (to === 'es' ? extremeDict.toES[from] : extremeDict.fromES[from]) || {};
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);
    let found = false;
    keys.forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        if (regex.test(trans)) {
            trans = trans.replace(regex, map[key]);
            found = true;
        }
    });
    if (found) return trans;

    // 2. API Fallback (MyMemory)
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
        content = `<div class="msg-lang">Original (${lang}): ${text}</div><div class="msg-trans">${translated}</div>`;
    } else if (role === 'advisor') {
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
            const textToMatch = msg.displayES || msg.text;
            const exist = Array.from(document.querySelectorAll('.msg-advisor')).some(m => m.innerText.includes(textToMatch));
            if (!exist) addMessage(msg.text, 'advisor', 'es', msg.displayES);
        }
    });
}

async function sendMessage() {
    const text = replyInput.value.trim();
    if (!text || typeof db === 'undefined') return;

    // CLEAR INPUT IMMEDIATELY (Bug Fix)
    replyInput.value = '';

    // UI Feedback
    addMessage(text, 'advisor');

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
