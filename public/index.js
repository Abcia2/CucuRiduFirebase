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

  firebase.database().ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === false) {
      // Disconnessione dell'utente
      const uid = auth.currentUser?.uid;
      if (uid) {
        const playersRef = db.ref(`players/${uid}`);
        playersRef.remove(); // Rimuove il giocatore solo se offline
      }
    } else {
      // Connessione online, nessuna rimozione necessaria
    }
  });
  
  
  // Arrays per generare nomi casuali
  const adjectives = ["Funny", "Crazy", "Happy", "Sleepy", "Witty"];
  const nouns = ["Penguin", "Unicorn", "Cat", "Dragon", "Panda"];
  
  function getRandomName() {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective} ${noun}`;
  }
  
  // Autenticazione anonima
  auth.signInAnonymously()
    .then(() => {
      console.log("Autenticato anonimamente");
    })
    .catch((error) => {
      console.error("Errore nell'autenticazione anonima", error);
    });
  
  auth.onAuthStateChanged((user) => {
    if (user) {
      const uid = user.uid;
      const playerName = getRandomName();
      const playerRef = firebase.database().ref(`players/${uid}`);
      let deck = []
  
      // Salva il giocatore nel database
      playerRef.set({
        name: playerName,
        uid: uid,
        deck : deck
      });
  
      console.log(`Giocatore: ${playerName} (UID: ${uid})`);
      document.getElementById("output").textContent = `Benvenuto, ${playerName}!`;

      playerRef.onDisconnect().remove();
  
      // Abilita i pulsanti
      document.getElementById("createRoom").disabled = false;
      document.getElementById("joinRoom").disabled = false;
    }
  });


// Creazione Stanza
// Creazione stanza con controllo di unicità e gestione dei dati
function createRoom() {
    const roomCode = generateRoomCode();  // Funzione per generare un codice stanza univoco
    const roomRef = db.ref(`rooms/${roomCode}`);
    const uid = auth.currentUser.uid;      // ID utente autenticato
  
    // Controllo se il codice stanza esiste già
    roomRef.get().then(snapshot => {
      if (snapshot.exists()) {
        alert("Questo codice stanza è già in uso. Prova un altro codice.");
        return;  // Esce dalla funzione se il codice esiste già
      }
  
      // Creazione della stanza
      roomRef.set({
        admin: uid,                           // ID del creatore (admin)
        players: {                            // Inserisce l'utente come giocatore
          [uid]: true
        }
      })
        .then(() => {
          console.log(`Stanza creata con codice: ${roomCode}`);
          document.getElementById("output").textContent = `Stanza creata! Codice: ${roomCode}`;
        })
        .catch((error) => {
          console.error("Errore nella creazione della stanza", error);
        });
    });
  }
  
  // Funzione per generare un codice stanza univoco
  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  

  // Entrare in una stanza
function joinRoom() {
    const roomCode = prompt("Inserisci il codice della stanza:");
    if (!roomCode) return; // Se l'utente annulla l'inserimento, esci
  
    const roomRef = db.ref(`rooms/${roomCode}`);
    const uid = auth.currentUser.uid;
  
    roomRef.get().then(snapshot => {
      if (snapshot.exists()) {
        const roomData = snapshot.val();
  
        // Controlla se l'utente è già nella stanza
        if (roomData.players && roomData.players[uid]) {
          alert("Sei già nella stanza!");
          return;
        }
  
        // Aggiungi il giocatore alla stanza
        roomRef.child('players').update({
          [uid]: true
        })
        .then(() => {
          console.log(`Entrato nella stanza: ${roomCode}`);
          document.getElementById("output").textContent = `Sei entrato nella stanza: ${roomCode}`;
        })
        .catch(error => {
          console.error("Errore nell'entrare nella stanza", error);
        });
      } else {
        alert("Stanza non trovata!");
      }
    }).catch(error => {
      console.error("Errore nella lettura della stanza", error);
    });
  }

  
  
  
  // Event listeners per i pulsanti
  document.getElementById("createRoom").addEventListener("click", createRoom);
  document.getElementById("joinRoom").addEventListener("click", joinRoom);
  