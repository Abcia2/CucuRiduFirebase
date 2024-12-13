// Configurazione Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAQUgK7BeCqwVyG-yf9_sMxaXf-2XXdl-I",
    authDomain: "cucu-ridu.firebaseapp.com",
    databaseURL: "https://cucu-ridu-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "cucu-ridu",
    storageBucket: "cucu-ridu.firebasestorage.app",
    messagingSenderId: "247195463484",
    appId: "1:247195463484:web:a2b363e18fadd979343839"
};

// Inizializza Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Nomi casuali
const adjectives = ["Divertente", "Matto", "Felice", "Sonnolento", "Spiritoso"];
const nouns = ["Pinguino", "Unicorno", "Gatto", "Drago", "Panda"];

// Variabili globali
let globalRoomCode = null;

// Genera un nome casuale
function getRandomName() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
}

// Autenticazione anonima
auth.signInAnonymously()
  .then(() => console.log("Autenticazione anonima riuscita"))
  .catch(error => console.error("Errore durante l'autenticazione anonima", error));

// Gestisce lo stato di autenticazione
auth.onAuthStateChanged(user => {
  if (user) {
    const uid = user.uid;
    const playerName = getRandomName();
    const playerRef = db.ref(`rooms/${globalRoomCode}/players/${uid}`);

    playerRef.set({
      id: uid,
      name: playerName,
      room: globalRoomCode,
      deck: [],
      isAsking: false
    })
    .then(() => {
      console.log(`Giocatore connesso: ${playerName} (UID: ${uid})`);
      document.getElementById("output").textContent = `Benvenuto, ${playerName}!`;
    })
    .catch(error => console.error("Errore nell'aggiungere il giocatore", error));

    // Rimuove il giocatore dalla stanza quando si disconnette
    playerRef.onDisconnect().remove();
  }
});

// Crea una nuova stanza
function createRoom() {
  const roomCode = generateRoomCode();
  const roomRef = db.ref(`rooms/${roomCode}`);
  const uid = auth.currentUser.uid;
  const playerName = getRandomName();

  globalRoomCode = roomCode;
  roomRef.set({
    admin: uid,
    players: {
      [uid]: { name: playerName }
    }
  })
  .then(() => {
    console.log(`Stanza creata con codice: ${roomCode} - GlobalRoomCode: ${globalRoomCode}`);
    localStorage.setItem("roomCode", roomCode);
    document.getElementById("output").textContent = `Stanza creata! Codice: ${roomCode}`;
  })
  .catch(error => console.error("Errore nella creazione della stanza", error));
}

// Entra in una stanza esistente
function joinRoom() {
  const roomCode = prompt("Inserisci il codice della stanza:");
  if (!roomCode) return;

  const roomRef = db.ref(`rooms/${roomCode}`);
  globalRoomCode = roomCode;
  const uid = auth.currentUser.uid;
  const playerName = getRandomName();

  roomRef.get().then(snapshot => {
    if (snapshot.exists()) {
      roomRef.child('players').update({
        [uid]: { name: playerName }
      })
      .then(() => {
        console.log(`Entrato nella stanza: ${roomCode}`);
        localStorage.setItem("roomCode", roomCode);
        document.getElementById("output").textContent = `Sei entrato nella stanza: ${roomCode}`;
      })
      .catch(error => console.error("Errore nell'entrare nella stanza", error));
    } else {
      alert("Stanza non trovata!");
    }
  })
  .catch(error => console.error("Errore nella lettura della stanza", error));
}

// Genera un codice stanza univoco
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Event listener per i bottoni
document.getElementById("createRoom").addEventListener("click", createRoom);
document.getElementById("joinRoom").addEventListener("click", joinRoom);