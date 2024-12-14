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
  
  // DOM Elements
  const initialScreen = document.getElementById("initial-screen");
  const roomScreen = document.getElementById("room-screen");
  const gameScreen = document.getElementById("game-screen");
  
  const createRoomBtn = document.getElementById("create-room-btn");
  const joinRoomBtn = document.getElementById("join-room-btn");
  const roomCodeInput = document.getElementById("room-code-input");
  const roomCodeDisplay = document.getElementById("room-code-display");
  const playerList = document.getElementById("player-list");
  const startGameBtn = document.getElementById("start-game-btn");
  const waitingMessage = document.getElementById("waiting-message");
  
  const currentQuestion = document.getElementById("current-question");
  const cardsContainer = document.getElementById("cards-container");
  const cards = document.getElementById("cards");
  const confirmResponseBtn = document.getElementById("confirm-response-btn");
  
  const responsesContainer = document.getElementById("responses-container");
  const responses = document.getElementById("responses");
  const chooseWinnerBtn = document.getElementById("choose-winner-btn");
  
  // State
  let roomCode = null;
  let playerId = null;
  let isHost = false;
  
  // Authentication
  auth.signInAnonymously().then(() => {
    playerId = auth.currentUser.uid;
  });
  
  // Create Room
  createRoomBtn.addEventListener("click", () => {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    isHost = true;
  
    db.ref(`rooms/${roomCode}`).set({
      host: playerId,
      players: {
        [playerId]: {
          name: generatePlayerName(),
          deck: [],
          wins: 0,
          isAsking: false,
          profilePicture: Math.floor(Math.random() * 10),
        },
      },
      deckQuestions: [["Funny question", 1]],
      deckAnswers: [["Answer 1", 0], ["Answer 2", 0]],
      currentRound: null,
      isRoundPlaying: false,
    });
  
    switchToRoomScreen(roomCode);
  });
  
  // Join Room
  joinRoomBtn.addEventListener("click", () => {
    roomCode = roomCodeInput.value.toUpperCase();
    isHost = false;
  
    db.ref(`rooms/${roomCode}/players/${playerId}`).set({
      name: generatePlayerName(),
      deck: [],
      wins: 0,
      isAsking: false,
      profilePicture: Math.floor(Math.random() * 10),
    });
  
    switchToRoomScreen(roomCode);
  });
  
  // Switch to Room Screen
  function switchToRoomScreen(code) {
    initialScreen.classList.add("hidden");
    roomScreen.classList.remove("hidden");
    roomCodeDisplay.textContent = code;
  
    db.ref(`rooms/${code}/players`).on("value", (snapshot) => {
      playerList.innerHTML = "";
      const players = snapshot.val();
      for (const playerId in players) {
        const li = document.createElement("li");
        li.textContent = players[playerId].name;
        playerList.appendChild(li);
      }
  
      if (isHost) {
        startGameBtn.classList.remove("hidden");
        waitingMessage.classList.add("hidden");
      } else {
        startGameBtn.classList.add("hidden");
        waitingMessage.classList.remove("hidden");
      }
    });
  }
  
  // Generate Random Player Name
  function generatePlayerName() {
    const adjectives = ["Fast", "Silly", "Brave"];
    const nouns = ["Cat", "Fox", "Bear"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }
  