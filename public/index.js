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

// Arrays per nomi casuali
const adjectives = ["Funny", "Crazy", "Happy", "Sleepy", "Witty"];
const nouns = ["Penguin", "Unicorn", "Cat", "Dragon", "Panda"];


// Vars
let GlobalRoomCode = null;

function getRandomName() {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective} ${noun}`;
}

// Autenticazione anonima
auth.signInAnonymously()
    .then(() => console.log("Autenticato anonimamente"))
    .catch(error => console.error("Errore nell'autenticazione anonima", error));

auth.onAuthStateChanged(user => {
    if (user) {
        const uid = user.uid;
        const playerName = getRandomName();
        const playerRef = firebase.database().ref(`rooms/${GlobalRoomCode}/players/${uid}`);

        playerRef.set({
            id: uid,
            name: playerName,
            room: GlobalRoomCode,
deck: [],
            isAsking: false 
        })

        console.log(`Giocatore connesso: ${playerName} (UID: ${uid})`);
        document.getElementById("output").textContent = `Benvenuto, ${playerName}!`;

        // Remove me from Firebase when I disconnect
        playerRef.onDisconnect().remove();

        // Abilita i pulsanti
        document.getElementById("createRoom").disabled = false;
        document.getElementById("joinRoom").disabled = false;

        // Controllo per rimuovere il giocatore se si disconnette
        firebase.database().ref('.info/connected').on('value', snapshot => {
            if (snapshot.val() === false) {
                const roomCode = localStorage.getItem('roomCode');
                if (roomCode) {
                    const roomRef = db.ref(`rooms/${roomCode}/players/${uid}`);
                    roomRef.remove().then(() => {
                        console.log(`Giocatore ${uid} rimosso dalla stanza ${roomCode}`);
                    });

                    roomRef.parent.get().then(snapshot => { // Verifica se c'è un admin
                        if (snapshot.exists() && snapshot.val().admin === uid) {
                            db.ref(`rooms/${roomCode}`).remove().then(() => {
                                console.log(`Stanza ${roomCode} eliminata perché l'admin si è disconnesso.`);
                            });
                        }
                    }).catch(error => console.error("Errore nel verificare la stanza o i giocatori", error));
                }
            }
        });
    }
    else{

    }
});


// Creazione stanza
function createRoom() {
    const roomCode = generateRoomCode();
    const roomRef = db.ref(`rooms/${roomCode}`);
    const uid = auth.currentUser.uid;
    const playerName = getRandomName();

    GlobalRoomCode = roomCode;
    roomRef.set({
        admin: uid,
        players: {
            [uid]: { name: playerName }
        }
    }).then(() => {
        console.log(`Stanza creata con codice: ${roomCode} - GlobalRoomCode: ${GlobalRoomCode}`);
        localStorage.setItem("roomCode", roomCode); // Salva il codice stanza localmente
        document.getElementById("output").textContent = `Stanza creata! Codice: ${roomCode}`;
    }).catch(error => console.error("Errore nella creazione della stanza", error));
}

// Entrare in una stanza
function joinRoom() {
    const roomCode = prompt("Inserisci il codice della stanza:");
    if (!roomCode) return;

    const roomRef = db.ref(`rooms/${roomCode}`);
    GlobalRoomCode = roomCode;
    const uid = auth.currentUser.uid;
    const playerName = getRandomName();

    roomRef.get().then(snapshot => {
        if (snapshot.exists()) {
            roomRef.child('players').update({
                [uid]: { name: playerName }
            }).then(() => {
                console.log(`Entrato nella stanza: ${roomCode}`);
                localStorage.setItem("roomCode", roomCode); // Salva il codice stanza localmente
                document.getElementById("output").textContent = `Sei entrato nella stanza: ${roomCode}`;
            }).catch(error => console.error("Errore nell'entrare nella stanza", error));
        } else {
            alert("Stanza non trovata!");
        }
    }).catch(error => console.error("Errore nella lettura della stanza", error));
}

// Gestione disconnessione giocatori
firebase.database().ref('.info/connected').on('value', snapshot => {
    if (snapshot.val() === false) {
        const uid = auth.currentUser?.uid;
        if (uid) {
            const roomCode = localStorage.getItem('roomCode');
            if (roomCode) {
                const roomRef = db.ref(`rooms/${roomCode}`);
                roomRef.child(`players/${uid}`).remove().then(() => {
                    console.log(`Giocatore ${uid} rimosso dalla stanza ${roomCode}`);
                });

                roomRef.get().then(snapshot => {
                    if (snapshot.exists() && snapshot.val().admin === uid) {
                        roomRef.remove().then(() => {
                            console.log(`Stanza ${roomCode} eliminata perché l'admin si è disconnesso.`);
                        });
                    }
                });
            }
        }
    }
});

// Genera codice stanza univoco
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Event listeners
document.getElementById("createRoom").addEventListener("click", createRoom);
document.getElementById("joinRoom").addEventListener("click", joinRoom);