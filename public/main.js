// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyAQUgK7BeCqwVyG-yf9_sMxaXf-2XXdl-I",
    authDomain: "cucu-ridu.firebaseapp.com",
    databaseURL: "https://cucu-ridu-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "cucu-ridu",
    storageBucket: "cucu-ridu.firebasestorage.app",
    messagingSenderId: "247195463484",
    appId: "1:247195463484:web:a2b363e18fadd979343839",
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.database();
  
  // Log messages to the page
  function logMessage(message) {
    document.getElementById("log").innerHTML += `<p>${message}</p>`;
  }
  
  // Anonymous authentication
  auth.signInAnonymously()
    .then(() => {
      const uid = auth.currentUser.uid;
      logMessage(`Authenticated as UID: ${uid}`);
    })
    .catch((error) => logMessage(`Authentication error: ${error.message}`));
  
  // Generate random player name
  function generatePlayerName() {
    const adjectives = ["Fast", "Silly", "Brave", "Cool", "Smart"];
    const nouns = ["Bear", "Cat", "Fox", "Duck", "Llama"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }
  
  // Create room
  function createRoom() {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const hostUid = auth.currentUser.uid;
  
    const room = {
      host: hostUid,
      players: {},
      deckQuestions: [["What's the funniest thing you've ever done?", 1]],
      deckAnswers: [["Hilarious answer", 0], ["Creative response", 0]],
      roundsPlayed: 0,
      lastWinner: null,
      isRoundPlaying: false,
      currentRound: {}
    };
  
    const player = {
      name: generatePlayerName(),
      deck: [],
      wins: 0,
      isAsking: false,
      profilePicture: Math.floor(Math.random() * 10)
    };
  
    db.ref(`rooms/${roomCode}`).set(room)
      .then(() => {
        return db.ref(`rooms/${roomCode}/players/${hostUid}`).set(player);
      })
      .then(() => {
        logMessage(`Room created with code: ${roomCode}. You have been added as a player.`);
      })
      .catch((error) => logMessage(`Room creation error: ${error.message}`));
  }
  
  // Join a room
  function joinRoom() {
    const roomCode = document.getElementById("roomCode").value;
    const uid = auth.currentUser.uid;
  
    const player = {
      name: generatePlayerName(),
      deck: [],
      wins: 0,
      isAsking: false,
      profilePicture: Math.floor(Math.random() * 10)
    };
  
    db.ref(`rooms/${roomCode}/players/${uid}`).set(player)
      .then(() => logMessage(`Joined room ${roomCode} as ${player.name}`))
      .catch((error) => logMessage(`Join room error: ${error.message}`));
  }
  
  // Start game
  function startGame() {
    const roomCode = document.getElementById("roomCode").value;
  
    db.ref(`rooms/${roomCode}`).once("value")
      .then((snapshot) => {
        const room = snapshot.val();
        const deckAnswers = [...room.deckAnswers];
  
        Object.keys(room.players).forEach((uid) => {
          const playerCards = [];
          for (let i = 0; i < 11; i++) {
            playerCards.push(deckAnswers.pop());
          }
          db.ref(`rooms/${roomCode}/players/${uid}/deck`).set(playerCards);
        });
  
        const currentRound = {
          questionMaster: room.host,
          question: room.deckQuestions.pop(),
          responses: [],
          chosenResponse: null
        };
  
        db.ref(`rooms/${roomCode}`).update({
          deckAnswers,
          deckQuestions: room.deckQuestions,
          currentRound,
          isRoundPlaying: true
        });
  
        logMessage("Game started!");
      })
      .catch((error) => logMessage(`Start game error: ${error.message}`));
  }
  
  // Event listeners
  document.getElementById("createRoom").addEventListener("click", createRoom);
  document.getElementById("joinRoom").addEventListener("click", joinRoom);
  document.getElementById("startGame").addEventListener("click", startGame);
  