// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAQUgK7BeCqwVyG-yf9_sMxaXf-2XXdl-I",
  authDomain: "cucu-ridu.firebaseapp.com",
  databaseURL:
    "https://cucu-ridu-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cucu-ridu",
  storageBucket: "cucu-ridu.firebasestorage.app",
  messagingSenderId: "247195463484",
  appId: "1:247195463484:web:a2b363e18fadd979343839",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const pfpCount = 27;

// DOM Elements
const initialScreen = document.getElementById("initial-screen");
const roomScreen = document.getElementById("room-screen");
const gameScreen = document.getElementById("game-screen");

/* New */
// Screens
const LoadingPage = document.getElementById("LoadingPage");

const FirstPage = document.getElementById("FirstPage");

const WaitingToStartPage = document.getElementById("WaitingToStartPage");

const ChooseAnswersPagePlayer = document.getElementById(
  "ChooseAnswersPagePlayer"
);
const ChooseAnswersPageQuestioner = document.getElementById(
  "ChooseAnswersPageQuestioner"
);
const ChooseAnswersPage = document.getElementById("ChooseAnswersPage");

// Buttons
const CreateRoomButton = document.getElementById("CreateRoomButton");
const JoinRoomButton = document.getElementById("JoinRoomButton");
const AnswerSelectorSubmitButton = document.getElementById(
  "AnswerSelectorSubmitButton"
);

// Other UI
const PlayerInfoCon = document.getElementById("PlayerInfoCon");
const UserPfp = document.getElementById("UserPfp");
const UserName = document.getElementById("UserName");

const PlayersPfpRowCon = document.getElementById("PlayersPfpRowCon");

const WaitToStartRoomCodeText = document.getElementById(
  "WaitToStartRoomCodeText"
);
const WaitUiPlayersText = document.getElementById("WaitUiPlayersText");
const WaitUiAdminText = document.getElementById("WaitUiAdminText");
const WaitUiAdminButton = document.getElementById("WaitUiAdminButton");

const AnswerCardText = document.getElementById("AnswerCardText");
const AnswerCardText2 = document.getElementById("AnswerCardText2");
const AnswerSelectorCon = document.getElementById("AnswerSelectorCon");
const AnswerNumberSelectorRow = document.getElementById(
  "AnswerNumberSelectorRow"
);

// State
let roomCode = null;
let playerId = null;
let isHost = false;
let roomRef = null;
let playerRef = null;

let playerName = "";
let playerPfp = 1;
let SelectedSpace = 1;
let TotalSpaces = 1;
let SelectedAnswer = [-1, -1, -1, -1, -1, -1, -1, -1, -1];
let PlayerDeck = [];

// Funzione per caricare i deck
function loadDecks() {
  return new Promise((resolve, reject) => {
    resolve({
      deckQuestions: decks.deckQuestions || [],
      deckAnswers: decks.deckAnswers || [],
    });
  });
}

// Funzione per mescolare un array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Authentication
auth
  .signInAnonymously()
  .then(() => {
    playerId = auth.currentUser.uid; // Assicura che l'UID sia disponibile
    console.log("Authenticated as:", playerId);

    // Ora che l'UID è garantito, cambia schermata
    ChangeScreen(LoadingPage, FirstPage);
  })
  .catch((error) => {
    console.error("Authentication failed:", error);
  });

// Create Room
CreateRoomButton.addEventListener("click", () => {
  loadDecks().then((decks) => {
    // Genera un codice stanza univoco
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    shuffleArray(decks.deckQuestions);
    shuffleArray(decks.deckAnswers);
    isHost = true;
    playerId = auth.currentUser.uid;

    // Crea un riferimento alla stanza
    roomRef = firebase.database().ref("rooms/" + roomCode);
    WaitToStartRoomCodeText.innerText = roomCode;
    WaitUiPlayersText.classList.add("hidden");

    playerName = generatePlayerName();
    playerPfp = generatePlayerPfp();

    // Imposta i dati iniziali della stanza
    roomRef
      .set({
        host: playerId,
        players: {
          [playerId]: {
            name: playerName,
            deck: [],
            wins: 0,
            profilePicture: playerPfp,
          },
        },
        deckQuestions: decks.deckQuestions,
        deckAnswers: decks.deckAnswers,
        currentRound: null,
        isRoundPlaying: false,
        isStartWaiting: true,
        currentAnswers: [],
        totalSubmissions: 0,
        totalPlayers: 1, // Inizializza solo 1 giocatore (l'admin)
      })
      .then(() => {
        // Aumenta il totalPlayers solo una volta
        roomRef.child("totalPlayers").set(1);

        // Avvia il monitoraggio dei giocatori
        monitorPlayersPfp();

        // Cambia schermata
        ChangeScreen(FirstPage, WaitingToStartPage);
        ShowInfoBar(true);
      });
  });
});

// Join Room
JoinRoomButton.addEventListener("click", () => {
  roomCode = prompt("Enter the room code:").toUpperCase();
  isHost = false;
  WaitUiAdminButton.classList.add("hidden");
  WaitUiAdminText.classList.add("hidden");

  playerName = generatePlayerName();
  playerPfp = generatePlayerPfp();

  // Check if the room is waiting to start
  db.ref(`rooms/${roomCode}/isStartWaiting`).once("value", (snapshot) => {
    if (snapshot.val() === true) {
      roomRef = firebase.database().ref("rooms/" + roomCode);
      WaitToStartRoomCodeText.innerText = roomCode;
      // Dopo che il giocatore si unisce
      roomRef
        .child(`players/${playerId}`)
        .set({
          name: playerName,
          deck: [],
          wins: 0,
          profilePicture: playerPfp,
        })
        .then(() => {
          // Aumenta il totalPlayers
          roomRef
            .child("totalPlayers")
            .transaction((currentTotal) => (currentTotal || 0) + 1);

          monitorPlayersPfp(); // Inizia a monitorare i giocatori
        });

      ChangeScreen(FirstPage, WaitingToStartPage);
      //switchToRoomScreen(roomCode);
      monitorPlayersPfp();
      ShowInfoBar(true);
      monitorIsRoundPlaying();
    } else {
      alert(
        "The room is not waiting to start. Please wait until the admin starts the game."
      );
    }
  });
});

// Start game
function startGame() {
  console.log("inizio");

  let currentQuestion = null; // Dichiarazione globale per il contesto della funzione

  // Aggiorna la stanza impostando isWaiting a false e l'admin come currentQuestioner
  roomRef
    .update({
      isStartWaiting: false,
      currentQuestioner: playerId,
    })
    .then(() => {
      // Assegna a tutti i giocatori le 11 carte risposta
      return assignInitialCardsToPlayers(roomCode);
    })
    .then(() => {
      // Pesca una domanda e salva il risultato
      return drawQuestion();
    })
    .then((question) => {
      currentQuestion = question; // Assegna la domanda pescata alla variabile globale

      // Aggiorna la stanza con i dettagli del round
      return roomRef.update({
        isRoundPlaying: true,
        roundPhase: 1,
        currentQuestion: currentQuestion,
        currentAnswers: [],
        currentWinner: null,
      });
    })
    .then(() => {
      console.log("Round Started");
      console.log(currentQuestion); // Ora la variabile è accessibile
      ChangeScreen(WaitingToStartPage, ChooseAnswersPage);
      loadChooseAnswersUI(); // Carica solo dopo che sono stati salvati i dati
    })
    .catch((error) => {
      console.error("Errore durante l'aggiornamento del round:", error);
    });
}

// Load Choose Answers UI
function loadChooseAnswersUI() {
  const roomRef = db.ref("rooms/" + roomCode);

  // Recupera i dati della stanza
  roomRef.once("value", (snapshot) => {
    const roomData = snapshot.val();
    console.log("roomData: ", roomData);
    console.log("current question: ", roomData.currentQuestion);

    if (!roomData) {
      console.error("Room data not found!");
      return;
    }

    // Controlla se tutti hanno inviato le risposte
    checkAllSubmissions();

    const currentQuestioner = roomData.currentQuestioner; // Chi fa la domanda
    const currentQuestion = roomData.currentQuestion; // La domanda attuale

    SelectedSpace = currentQuestion[1];
    TotalSpaces = currentQuestion[1];

    console.log("Auth UID:", playerId);
    console.log("Current Questioner:", currentQuestioner);
    console.log("Current Question:", currentQuestion);

    // Controlla se l'utente attuale è chi fa la domanda
    if (currentQuestioner === playerId) {
      console.log("You are the questioner");
      ChooseAnswersPageQuestioner.classList.remove("hidden");
      ChooseAnswersPagePlayer.classList.add("hidden");
      AnswerCardText.innerText = currentQuestion[0];
    } else {
      console.log("You are a player");
      ChooseAnswersPageQuestioner.classList.add("hidden");
      ChooseAnswersPagePlayer.classList.remove("hidden");

      // Accedi al mazzo del giocatore corrente
      const playerData = roomData.players[playerId]; // Recupera il dato del giocatore corrente
      cardsDeck = playerData.deck; // Assegna il mazzo del giocatore
      PlayerDeck = playerData.deck;

      AnswerSelectorCon.innerHTML = "";
      AnswerCardText2.innerText = currentQuestion[0];
      // Aggiunge un div per ogni carta nel mazzo del giocatore
      cardsDeck.forEach((card, index) => {
        AnswerSelectorCon.innerHTML += `
          <div class="AnswerSelectorCard" id="AnswerSelectorCard${index}" onclick="SelectAnswerCard(${index})">
            <h3 class="MediumText BlackText">✦ Risposta</h3>
            <h2 class="SemiBigText BlackText">${card[0]}</h2> <!-- Mostra la risposta -->
          </div>
        `;
      });
      AnswerSelectorCon.innerHTML += "<br>";

      AnswerNumberSelectorRow.innerHTML = "";
      for (let i = 0; i < roomData.currentQuestion[1]; i++) {
        AnswerNumberSelectorRow.innerHTML += `<div class="AnswerNumberSelectorPill" id="AnswerNumberSelectorPill${
          i + 1
        }" onclick="SelectSpace(${i + 1})">Space ${i + 1}</div>`;
      }

      SelectSpace(1);
    }
  });
}

// Select an answer div
function SelectAnswerCard(index) {
  const currentCard = document.getElementById(`AnswerSelectorCard${index}`); // Carta corrente
  const previousIndex = SelectedAnswer[SelectedSpace]; // Recupera l'indice attualmente selezionato nello spazio

  console.log("Current Card: ", currentCard);
  console.log("SelectedSpace: ", SelectedSpace);
  console.log("Previous Index in Space: ", previousIndex);

  // Controlla se lo spazio è vuoto
  if (previousIndex === -1) {
    // Spazio vuoto: assegna l'indice corrente
    SelectedAnswer[SelectedSpace] = index;
    currentCard.classList.add("SelectedAnswerCard"); // Aggiungi la classe per evidenziare la selezione
  } else {
    // Spazio già occupato: aggiorna il vecchio div e sostituisci con il nuovo
    const previousCard = document.getElementById(
      `AnswerSelectorCard${previousIndex}`
    );
    if (previousCard) {
      previousCard.classList.remove("SelectedAnswerCard"); // Rimuovi la classe dal vecchio div
    }
    SelectedAnswer[SelectedSpace] = index; // Aggiorna l'indice nello spazio
    currentCard.classList.add("SelectedAnswerCard"); // Aggiungi la classe al nuovo div

    // Scorri tutto SelectedAnswer e aggiorna le classi
    for (let i = 0; i < SelectedAnswer.length; i++) {
      if (i !== SelectedSpace) {
        const cardToUpdate = document.getElementById(
          `AnswerSelectorCard${SelectedAnswer[i]}`
        );
        if (cardToUpdate) {
          cardToUpdate.classList.add("SelectedAnswerCard"); // Aggiungi la classe a tutti i div corrispondenti agli indici selezionati
        }
      }
    }
  }

  console.log("Updated SelectedAnswer: ", SelectedAnswer);
}

// Select Space
function SelectSpace(index) {
  const allPills = document.querySelectorAll(".AnswerNumberSelectorPill"); // Seleziona tutti i div con la classe AnswerNumberSelectorPill
  const currentPill = document.getElementById(
    `AnswerNumberSelectorPill${index}`
  ); // Div attualmente selezionato

  console.log("SelectedSpace before update: ", SelectedSpace);

  // Rimuovi la classe SelectedPill da tutti i div
  allPills.forEach((pill) => {
    pill.classList.remove("SelectedPill");
  });

  // Aggiorna `SelectedSpace` con il nuovo indice
  SelectedSpace = index;

  // Aggiungi la classe al div corrente per evidenziare
  if (currentPill) {
    currentPill.classList.add("SelectedPill");
    console.log(
      `Added class "SelectedPill" to element with ID "AnswerNumberSelectorPill${index}".`
    );
  }

  console.log("Updated SelectedSpace: ", SelectedSpace);
}

// Submit Answers
function SubmitAnswers() {
  // Controlla se tutte le risposte sono state selezionate
  for (let i = 1; i < SelectedSpace; i++) {
    if (SelectedAnswer[i] === -1) {
      alert("Please select all answers before submitting.");
      return;
    }
  }

  // Creazione di un array temporaneo
  const tempSubmission = [playerId, []];
  console.log("SoloPlayerId: ", tempSubmission);
  console.log("TotalSpaces: ", TotalSpaces);

  // Aggiungere le risposte selezionate all'array temporaneo
  for (let i = 1; i < TotalSpaces + 1; i++) {
    const answer = PlayerDeck[SelectedAnswer[i]];
    console.log("Selected answer:", answer);

    if (Array.isArray(answer) && answer[0]) {
      tempSubmission[1].push(answer[0]); // Aggiunge la stringa al tempSubmission
    } else {
      console.warn("Invalid answer structure:", answer);
    }

    // Rimuove le carte dal deck del giocatore
    PlayerDeck.splice(SelectedAnswer[i], 1);
    console.log("Deck aggiornato:", PlayerDeck);
  }

  console.log("TempSubmission:", tempSubmission);

  // Gestire il contatore e aggiungere la risposta alla lista
  roomRef.child("totalSubmissions").transaction((currentTotal) => {
    const newTotal = (currentTotal || 0) + 1;

    // Aggiungere l'array come indice numerico
    roomRef.child(`submittedAnswers/${newTotal - 1}`).set(tempSubmission);

    return newTotal; // Aggiorna il contatore in Firebase
  });

  // Richiamare drawCardsFromDeck per pescare le carte rimanenti dal deckAnswers
  drawCardsFromDeck("deckAnswers", SelectedSpace)
    .then((drawnCards) => {
      console.log("Drawn cards:", drawnCards);

      // Aggiungere le carte pescate al deck del giocatore
      PlayerDeck = PlayerDeck.concat(drawnCards);
      console.log("Updated PlayerDeck with drawn cards:", PlayerDeck);

      // Sincronizzare tutto con Firebase
      return roomRef.update({
        [`players/${playerId}/deck`]: PlayerDeck, // Aggiorna il deck del giocatore
      });
    })
    .then(() => {
      console.log("Deck aggiornato su Firebase con successo.");
      alert("Answers submitted successfully!");
      ChooseAnswersPageQuestioner.classList.remove("hidden");
      ChooseAnswersPagePlayer.classList.add("hidden");

      // Controlla se tutti hanno inviato le risposte
      checkAllSubmissions();
    })
    .catch((error) => {
      console.error("Error submitting answers:", error);
      alert(
        "An error occurred while submitting the answers. Please try again."
      );
    });
}

// Check Submissions
function checkAllSubmissions() {
  roomRef.once("value", (snapshot) => {
    const roomData = snapshot.val();

    if (!roomData) {
      console.error("Room data not found!");
      return;
    }

    const totalSubmissions = roomData.totalSubmissions || 0;
    const totalPlayers = Object.keys(roomData.players || {}).length;

    console.log(`Submissions: ${totalSubmissions}, Players: ${totalPlayers}`);

    // Controlla se tutti hanno inviato le risposte (totalPlayers - 1 perché uno è il questioner)
    if (totalSubmissions === totalPlayers - 1) {
      console.log("All players have submitted their answers!");
      showAnswersToAll();
    }
  });
}

// Show Answers
function showAnswersToAll() {
  roomRef.child("submittedAnswers").once("value", (snapshot) => {
    const submittedAnswers = snapshot.val();

    if (!submittedAnswers) {
      console.error("No answers submitted!");
      return;
    }

    console.log("Submitted answers:", submittedAnswers);

    /*
    // Mostra le risposte a tutti i giocatori (modifica questa parte per la tua UI)
    DisplayAnswersPage.classList.remove("hidden");
    ChooseAnswersPagePlayer.classList.add("hidden");
    ChooseAnswersPageQuestioner.classList.add("hidden");

    // Aggiorna l'interfaccia con le risposte
    AnswersContainer.innerHTML = "";
    Object.values(submittedAnswers).forEach((submission) => {
      const playerId = submission[0];
      const answers = submission[1];

      AnswersContainer.innerHTML += `
        <div class="PlayerSubmission">
          <h3>Player ${playerId}</h3>
          <p>${answers.join(", ")}</p>
        </div>
      `;
    });*/
  });
}

// Funzione per monitorare costantemente isRoundPlaying
function monitorIsRoundPlaying() {
  const roomRef = db.ref("rooms/" + roomCode);
  const playersRef = db.ref(`rooms/${roomCode}/players`);

  // Ascolta i cambiamenti di isRoundPlaying
  roomRef.child("isRoundPlaying").on("value", (snapshot) => {
    if (snapshot.val() === true) {
      // Il round è iniziato, fai qualcosa per notificare i giocatori
      ChangeScreen(WaitingToStartPage, ChooseAnswersPage);
      loadChooseAnswersUI();
      console.log("RoundStarted");
    }
  });
}

// Show question and answers
function showQuestionAndAnswers() {
  roomRef.once("value").then((snapshot) => {
    const room = snapshot.val();
    const currentQuestionerUid = room.currentQuestioner;

    if (currentQuestionerUid === playerId) {
      // Visualizza le risposte anonime
      db.ref(`rooms/${roomCode}/currentRound/answers`).once(
        "value",
        (snapshot) => {
          const answers = snapshot.val();
          console.log("Answers:", answers);

          // Mostra le risposte a chi fa la domanda
          // Qui puoi gestire il UI per mostrare le risposte anonime
        }
      );
    }
  });
}
function LoadChooseAnswersScreen() {}

// Switch Screens
function ChangeScreen(toHide, toShow) {
  toHide.classList.add("hidden");
  toShow.classList.remove("hidden");
}

function ShowInfoBar(bool) {
  // Handle visibility for all elements with the class 'PlayerInfoCon'
  document.querySelectorAll(".PlayerInfoCon").forEach((element) => {
    if (bool) {
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
  });

  if (bool) {
    // Update all elements with the class 'UserName'
    document.querySelectorAll(".UserName").forEach((element) => {
      element.innerText = playerName;
    });

    // Update all elements with the class 'UserPfp'
    document.querySelectorAll(".UserPfp").forEach((element) => {
      element.src = `./Assets/PfP/${playerPfp}.jpg`;
    });
  }
}

// Update Profiles Row in real-time
function monitorPlayersPfp() {
  const playersRef = db.ref(`rooms/${roomCode}/players`);

  // Listener per nuovi giocatori aggiunti
  playersRef.on("child_added", (snapshot) => {
    const playerId = snapshot.key; // ID del giocatore
    const playerData = snapshot.val(); // Dati del giocatore

    // Aggiorna la UI per il nuovo giocatore
    PlayersPfpRowCon.innerHTML += `<div class="PlayerPfpCon" playerId="${playerId}">
      <img src="./Assets/PfP/${playerData.profilePicture}.jpg" alt="PFP" class="PlayerPfpImg">
      <h3 class="PlayerPfpText BlackText">${playerData.name}</h3>
    </div>`;
  });

  // Optional: Listener per aggiornare l'intera lista se necessario
  playersRef.on("value", (snapshot) => {
    const players = snapshot.val();
    PlayersPfpRowCon.innerHTML = "";
    if (players) {
      Object.entries(players).forEach(([playerId, playerData]) => {
        PlayersPfpRowCon.innerHTML += `<div class="PlayerPfpCon" playerId="${playerId}">
          <img src="./Assets/PfP/${playerData.profilePicture}.jpg" alt="PFP" class="PlayerPfpImg">
          <h3 class="PlayerPfpText BlackText">${playerData.name}</h3>
        </div>`;
      });
    }
  });
}

function showQuestionAndAnswers() {
  // Ottieni la stanza
  roomRef.once("value").then((snapshot) => {
    const room = snapshot.val();
    const currentQuestionerUid = room.currentQuestioner;

    // Mostra la domanda e le risposte a chi deve rispondere
    if (currentQuestionerUid === playerId) {
      console.log(currentQuestion.currentQuestion);
      //document.getElementById('question').innerText = currentQuestion.currentQuestion;
      //document.getElementById('answer-section').style.display = 'block'; // Mostra la UI di risposta
    }
  });
}

// Generate Random Player Name
function generatePlayerName() {
  return `${
    nounsAndAdjectives.names[
      Math.floor(Math.random() * nounsAndAdjectives.names.length)
    ]
  } ${
    nounsAndAdjectives.adjectives[
      Math.floor(Math.random() * nounsAndAdjectives.adjectives.length)
    ]
  }`;
}

// Genera Random Foto Profilo
function generatePlayerPfp() {
  return Math.floor(Math.random() * pfpCount) + 1;
}

// Pesca carte
function drawCardsFromDeck(deckPath, count) {
  const drawnCards = [];

  return roomRef
    .child(deckPath)
    .transaction((currentDeck) => {
      //console.log("Current Deck:", currentDeck);
      if (Array.isArray(currentDeck) && currentDeck.length >= count) {
        // Estrai le ultime `count` carte
        drawnCards.push(...currentDeck.slice(-count).map((card) => [...card]));
        // Rimuovi le carte pescate dal mazzo
        return currentDeck.slice(0, -count);
      } else {
        //console.error("Not enough cards in the deck or invalid deck structure!");
        return currentDeck || []; // Ritorna il mazzo originale o un array vuoto
      }
    })
    .then(() => {
      return drawnCards; // Restituisci le carte pescate
    })
    .catch((error) => {
      //console.error("Error drawing cards:", error);
      return [];
    });
}
function drawQuestion() {
  let drawnQuestion = null;

  return roomRef
    .child("deckQuestions")
    .transaction((currentDeck) => {
      if (Array.isArray(currentDeck) && currentDeck.length > 0) {
        drawnQuestion = [...currentDeck.slice(-1)[0]];
        return currentDeck.slice(0, -1);
      } else {
        return currentDeck || [];
      }
    })
    .then(() => drawnQuestion)
    .catch((error) => {
      console.error("Error drawing question:", error);
      return null;
    });
}

// Dai le carte ai giocatori
function assignInitialCardsToPlayers(roomId) {
  const roomRef = firebase.database().ref("rooms/" + roomId);

  roomRef
    .child("players")
    .once("value")
    .then((snapshot) => {
      const players = snapshot.val();

      const promises = Object.keys(players).map((playerId) => {
        return drawCardsFromDeck("deckAnswers", 11).then((cards) => {
          return roomRef.child(`players/${playerId}`).update({
            deck: cards,
          });
        });
      });

      return Promise.all(promises);
    })
    .then(() => {
      console.log("Initial cards assigned to all players.");
    })
    .catch((error) => {
      console.error("Error assigning cards:", error);
    });
}

// Elimina player
window.addEventListener("beforeunload", (event) => {
  // Prevenire l'uscita immediata (opzionale, ma supportato solo in alcuni browser)
  event.preventDefault();
  event.returnValue = "";

  // Ottieni il riferimento alla stanza e ai dati del giocatore
  const roomRef = db.ref("rooms/" + roomCode);
  const playerRef = roomRef.child("players/" + playerId);

  // Elimina il giocatore dalla stanza
  playerRef
    .remove()
    .then(() => {
      console.log(`Player ${playerId} removed from the room.`);
    })
    .catch((error) => {
      console.error("Error removing player from the room:", error);
    });

  // Controlla se il giocatore è l'admin della stanza
  roomRef.once("value", (snapshot) => {
    const roomData = snapshot.val();
    if (!roomData) {
      console.warn("Room not found.");
      return;
    }

    if (roomData.host === playerId) {
      // Elimina l'intera stanza se il giocatore è l'admin
      roomRef
        .remove()
        .then(() => {
          console.log(`Room ${roomCode} deleted as the admin left.`);
        })
        .catch((error) => {
          console.error("Error deleting the room:", error);
        });
    }
  });
});

/* UI */
// Buttons
WaitUiAdminButton.addEventListener("click", () => {
  startGame();
});

AnswerSelectorSubmitButton.addEventListener("click", () => {
  SubmitAnswers();
});

// Carte e nomi
/*Const decks (è troppo lunga per inserirla qui.)
 è fatta cosi:

  const decks = {
    deckQuestions: [
      ["_ è buono, ma _ è molto meglio!", 2],
      ...],
  deckAnswers: [
    ["Risposta molto funny", 0],
    ...]
*/
/* la const nounsAndAdjectives (è troppo lunga per inserirla qui.)
è fatta cosi:

 {
  names : ["nome", "nome" ...],
  adjectives : ["adjective", [adjective] ...]
*/

const decks = {
  deckQuestions: [
    ["_ è buono, ma _ è molto meglio!", 2],
    ["_ è un ottimo rimedio per il cancro", 1],
    ["La felicità è _", 1],
    ["Pensare a _ ti farà solo soffrire", 1],
    ["_ è stata la cosa più bella della mia vita", 1],
    ["Non raggiungo l'orgasmo senza pensare a _", 1],
    ["Hai mai provato a _ ? Ti cambia la vita da così a così!", 1],
    ["Ti voglio bene ma capirai che _ non è una cosa accettabile", 1],
    [
      "_ è una cosa che viene tramandata con amore da padre in figlio da generazioni",
      1,
    ],
    ["Il mio love language è _", 1],
    ["Chi cerca il benessere lo trova in _", 1],
    ["Pensare a _ è l'unica cosa che mi fa dormire seren*", 1],
    ["_ è un'esperienza che mi ha cambiato la vita", 1],
    ["Non ero attent* a lezione perché pensavo a _", 1],
    ["Ho piacevolmente discusso di _ con il mio prof di religione", 1],
    ["Per risolvere il suo problema ha solo bisogno di _", 1],
    ["Pensi che _ sia una leggitimazione per combattere _ ?", 2],
    ["Se fossi re donerei _ a tutta la popolazione", 1],
    ["Quando c'era lui bastava _ per essere felici", 1],
    ["Se continui ad evitare _ la conseguenza sarà _", 2],
    [
      "Nello spettacolo di ieri io ho interpretato _ che _ , il pubblico è stato così commosso che ha deciso di _",
      3,
    ],
    ["La mancia della nonna mi permetterà di prendere _", 1],
    ["Non capisco la lingua dei segni, non è che per caso potresti _?", 1],
    [
      "Penso che _ sia un fattore fondante della società moderna, ma senza _ questa non sarebbe nata",
      2,
    ],
    ["È inutile che mi dici di _ , la mia idea di _ è sempre la migliore", 2],
    [
      "Dovevi esserci quando Michael Jackson ha fatto la sua iconica performance con _",
      1,
    ],
    ["Dovevo studiare, ma ho preferito _", 1],
    ["_ , i soldi sono soldi", 1],
    [
      "_ sono il nemico della società, basterebbe _ e il mondo sarebbe migliore",
      2,
    ],
    ["Come osi criticare _ , senza non saresti qui", 1],
    ["La NASA ha inviato nello spazio _", 1],
    ["Quella ragazza trema, deve aver visto _", 1],
    ["Preferiresti _ per tutta la vita oppure avere _ nell'armadio", 2],
    ["Quando andavo all'asilo mi divertivo a _", 1],
    ["Come compito per casa devo _", 1],
    ["Ieri ho visto _ , sembrava più felice del solito", 1],
    ["Il mio roman empire è _", 1],
    [
      "Secondo l'oroscopo è l'ora di _ , ma preferisco rimanere a casa mia con  _",
      2,
    ],
    ["_ è un modo per fermare la guerra", 1],
    ["Non mi piace il pene ma per _ un pompino lo farei", 1],
    ["Il bottone rosso nella Casa Bianca serve per _", 1],
    ["È così stupid* che sarebbe in grado di _", 1],
    ["_ . Aura +9999", 1],
    ["Venderei la prof di inglese per _", 1],
    ["Ardua scelta: _ o _", 2],
    ["Per lavarmi la coscienza ho deciso di _", 1],
    ["Per essere il migliore serve _", 1],
    ["Il nemico numero uno di Carlo Conti è _", 1],
    ["_ è stata la cosa più brutta degli ultimi tempi", 1],
    ["Non è un venerdì sera senza _", 1],
    [
      "Questo weekend il solito: venerdì sera _ , sabato _ e domenica mattina _",
      3,
    ],
    ["_ : i ricordi del Vietnam", 1],
    ["Contattare c'è Posta Per Te per _", 1],
    ["_ è andat* ad Amici", 1],
    ["_ dovrebbe essere integrato nel programma scolastico ", 1],
    ["_ ! Ne hanno parlato a Forum", 1],
    ["Soluzione per un appartamento perfetto? _", 1],
    [
      "Dopo 30 anni di matrimonio io e mio marito abbiamo trovato un modo per mantenere viva la passione: _",
      1,
    ],
    ["Ogni brava moglie cristiana sa che è necessario _", 1],
    ["_ ha causato l'esplosione del Titan", 1],
    ["_ è il motivo per cui dio ha fatto estinguere i dinosauri", 1],
    ["Sono cresciut* con Pokémon, Yu-Gi-Oh e _", 1],
    ["Ho scoperto un subreddit a tema _ . Quante risate!", 1],
    ["Spareresti al tuo migliore amico in cambio di _", 1],
    ["_ può capitare", 1],
    ["La cosa che amo più delle ragazze è _", 1],
    ["_ lo dico tutte le mattine appena svegliat*!", 1],
    ["Spendida giornata per _", 1],
    ["Amanda mi ha regalato il nuovo profumo di chanel e _", 1],
    ["L'imputato, colpevole di aver _ , era in realtà innocente", 1],
    ["Nel nuovo film di inside out 3 l'emozione principale sarà _", 1],
    ["_ . Disse il mostro di Firenze in tribunale", 1],
    [
      "'Vai al supermercato, prendimi _ e _ , poi compra quel che vuoi' 'va bene, anche _?' 'va bene, i bisogni sono bisogni'",
      3,
    ],
    ["Usare _ come giocattolo anale non è molto conveniente", 1],
    ["Divorzio di Chiara Ferragni e Fedez, sentiamo cosa ne pensa _ !", 1],
    ["Voglio _ adesso! In questo esatto istante!", 1],
    [
      "Se non hai mai provato _ , dovresti chiedere a suor Claudia, è un'esperta",
      1,
    ],
    [
      "L'undicesimo comandamento, mai citato nei libri di chiesa, mi pare che sia riguardo a _, ma non ne sono certo",
      1,
    ],
    ["I libri di storia descrivono l'ascesa di Mussoli come _", 1],
    [
      "Solo un vero critico letterario può capire che dietro la figura di Leopardi si celava _",
      1,
    ],
    ["_ : perfetto per quando ho del tempo libero", 1],
    ["_ è una brutta abitudine", 1],
    ["Per buttare giù un po' di chili dovresti iniziare a _", 1],
    ["In Georgia usano _ per mangiare la zuppa", 1],
    ["'Topolino e _' il nuovo fumetto a soli 3,50€ in edicola", 1],
    ["_ , disse il poeta guardando il cielo stellato", 1],
    [
      "Ogni stagione ha i propri bisogni: primavera: _ , estate: _ , autunno:  _ e inverno: _",
      4,
    ],
    ["Ho preso 3 perchè non ho saputo come _", 1],
    ["Il medico consiglia _ come lubrificante prima di un rapporto anale", 1],
    ["_ a 90° sul letto della pimpa", 1],
    ["_ , da aggiungere alla smash cake", 1],
    [
      "Ma solo io mi ricordo quell'episodio di Dora l'esploratrice intitolato _",
      1,
    ],
    [
      "Sulla tomba voglio scrivere 'ho vissuto una vita fatta di sesso, droga e _'",
      1,
    ],
    ["Il mio cane non smette di _", 1],
    ["Per problemi come _ digitare 1, se invece ha bisogno di _ digitare 2", 2],
    ["_ MA È INACETTABILE, DISONESTO, IL PEGGIO DEL PEGGIO!", 1],
    ["Non riesci a toglierti dalla mente _? Semplice, Bevi per dimenticare", 1],
    ["L'italia ha inviato _ per aiutare i bimbi afghani", 1],
    ["_ , è questo il motivo della mia diarrea dottore", 1],
    ["Non c'è pace prima di _", 1],
    ["Qual è il mio superpotere? _", 1],
    ["_ , il premio nobel per la scienza di quest'anno", 1],
    [
      "Il cast del film che ha vinto gli Oscar aveva _ e _ ,  era una storia d'amore, finita male",
      2,
    ],
    ["Ho trovato come sorpresa nell'uovo di pasqua _", 1],
    ["Prendo l'happy meal solo per _", 1],
    ["_ , testato dai bambini, approvato dalle madri", 1],
    ["La voce nella mia testa mi dice di _", 1],
    ["I vicini continuano a _ da stamattina", 1],
    ["Alla fiera dell'est per due soldi _ mio padre comprò", 1],
    ["Il nuovo regolamento scolastico stabilisce che è vietato _", 1],
    ["Non sono riuscito a studiare per colpa di _", 1],
    [
      "Per mostrare solidarietà dopo le partite di calcio, il gesto dei calciatori è _",
      1,
    ],
    ["Se la vita ti dà dei limoni, facci _", 1],
    ["Papà, io da grande voglio essere _", 1],
    ["Il tempo è _", 1],
    ["_ mi sembra un po' too much", 1],
    ["_ è demure", 1],
    ["_ non è demure, ma Brat", 1],
    ["_ non può mancare a Natale", 1],
    ["_ mi rende eccitatissim*", 1],
    ["Non ho tempo di cucinare, prenderò _ d'asporto", 1],
    ["Invece del carbone la befana porta ora ai bambini cattivi _", 1],
    ["_ buono fino all'ultima goccia", 1],
    ["_ fece finire la mia ultima relazione", 1],
    ["Allerta meteo! Sulla penisola potrebbe arrivare _", 1],
    ["Le persone anziane odorano di _", 1],
    ["Salvini preferirebbe _ ai neri", 1],
    ["_ fu la chiave di volta per il caso Orlandi", 1],
    [
      "Non so con cosa verrà combattuto la terza guerra mondiale, ma nella quarta si useranno _",
      1,
    ],
    ["_ . Raccomando da 9 dentisti su 10", 1],
    ["Prossimamente su Rai sport 2: i mondiali di _", 1],
    ["Se dovesse finire il mondo vorrei solo un'ultima cosa: _", 1],
    ["Nel kit di soppravvivenza non può mancare _", 1],
    ["La scuola insegna anche a _", 1],
    [
      "Quali sono i 3 desideri che chiederesti al genio della lampada? _ , _ e _",
      3,
    ],
    ["Mi son dimenticat* di _", 1],
    ["_ . Così è come voglio morire!", 1],
    ["In un mondo depredato da _ , il nostro unico conforto è _", 2],
    ["Ho un sacco di problemi, ma _ non è fra questi", 1],
    ["_ è la cosa più emo che abbiamo mai fatto", 1],
    ["_ non esiste, non può farti del male", 1],
    ["Dimenticate la ruota! L'invenzione più rivoluzionaria è _", 1],
    ["_ sarà il focus del prossimo DLC di The Sims 4", 1],
    ["Hear me out! _ e _", 2],
  ],
  deckAnswers: [
    ["Una partita a Mario Cart irl con Steven Hawkins", 0],
    ["Un aborto spontaneo", 0],
    ["La 104", 0],
    ["Un sex-toy per cani", 0],
    ["La mentalità ISIS", 0],
    ["Gli ebrei", 0],
    ["Lo sperma", 0],
    ["Un gelato allo sperma", 0],
    ["Il colpo di grazia ", 0],
    ["I bambini operai di shein", 0],
    ["Il governo meloni", 0],
    ["La tratta degli schiavi", 0],
    ["La morte di Bossetti ", 0],
    ["Essere sulla lista di PDiddy e non saperlo", 0],
    ["La borra", 0],
    ["Brumotti picchiato nelle periferie", 0],
    ["Andare a puttane", 0],
    ["Vendere dischi illegali di Gigi D'Alessio", 0],
    ["Un dito in culo", 0],
    ["Iniziare con un dito e finire con tutto il braccio", 0],
    ["La cappella del papa", 0],
    ["La salumeria privata del clero", 0],
    ["Ringraziare Beyoncé ", 0],
    ["La zia Ermenegilda", 0],
    ["I rom", 0],
    ["Un'esplorazione rettale", 0],
    ["Un limone appassionato dal dubbio consenso", 0],
    ["Lanciare una sedia al compagno di classe speciale", 0],
    ["Il ricatto sessuale", 0],
    ["Manomettere i freni di una sedia a rotelle", 0],
    ["Il comunismo", 0],
    ["Nani da giardino che mostrano il culo ai passanti", 0],
    ["Il discorso di mussolini", 0],
    ["I campi di cotone ripopolati", 0],
    ["Mettere i fiori sulla tomba di Mussolini ", 0],
    ["Bestemmiare in chiesa", 0],
    ["Chiedere a un bambino cieco quante dita ho alzate", 0],
    ["Diffondere il verbo di Geova in un ospedale di malati di cancro", 0],
    ["Dare fuoco ad un asilo nido", 0],
    ["Una gruccia al posto della pillola abortiva ", 0],
    ["L'economia africana ", 0],
    ["Lo sbarco in Normandia ", 0],
    ["Rievocare la marcia su Roma", 0],
    ["Premere il bottone rosso sulla scrivania di Kim Jong-Un", 0],
    ["Lo sverginamento anale brutale", 0],
    ["Riportare il fascismo in Italia ", 0],
    ["Baciare il mio Bro senza omosessualità ", 0],
    ["Pisciare dal buco del culo", 0],
    ["Le mani di Gianni Morandi", 0],
    ["lo scandalo Ferragni", 0],
    ["Aprire un Only Fans con i video della tua ex", 0],
    ["Una pillola di Viagra ", 0],
    ["Sborrarsi accidentalmente in bocca", 0],
    ["Gerry Scotty che spara al Gabibbo", 0],
    ["Il rapimento di Aldo Moro", 0],
    ["La vera identità del Gabibbo", 0],
    ["Ritrovarsi a partorire in un cesso pubblico ", 0],
    ["Volersi scopare la propria figlia adolescente ", 0],
    ["Servire una merda bollita a un ristorante stellato", 0],
    ["Sverginare la suora novizia nel confessionale ", 0],
    ["Offrire una sigaretta a un delfino", 0],
    ["Essere molestato da un piccione curioso", 0],
    ["Il pizzo", 0],
    ["Considerare terroni chi vive sotto il Po' ", 0],
    ["Insultare i neri per moda ", 0],
    ["Criticare l'outfit di un barbone", 0],
    ["Affittare un pony con la sindrome di down", 0],
    ["Un pigiama con le righe e una stella gialla ", 0],
    [
      "Non andare a prendere la propria fidanzata alle elementari perché ti ha tradito ",
      0,
    ],
    ["Lezione pratica di educazione sessuale con un prete", 0],
    ["Un'orgia di frati benedettini", 0],
    ["Vivere come in 1984", 0],
    ["Salvare i pesci dall'annegamento", 0],
    ["Tagliare i capelli a qualcuno con una mietitrebbia ", 0],
    ["Il genocidio degli armeni", 0],
    ["Il cancro alla prostata all'ultimo stadio", 0],
    ["Avere la mononucleosi e sputare dal balcone ", 0],
    ["Riscrivere la bibbia", 0],
    ["Fare da chierichetto per fare colpo sulla suora", 0],
    ["L'undici settembre 2001", 0],
    [
      "Scoprire che il tuo idolo si è suicidato guardando un documentario sulla seconda guerra mondiale ",
      0,
    ],
    ["Andare in coma etilico bevendo l'ACE Gentile ", 0],
    ["Il comeback di Mozart prima di GTA VI", 0],
    ["La scissione dell'impero romano", 0],
    ["Fare il saluto al sole", 0],
    ["Infornare il tuo figlio gay con patate e rosmarino", 0],
    ["Normalizzare sparare alle persone nere", 0],
    ["Reprimere con la violenza i flashmob", 0],
    ["Comprare il crocifischio dalla lidl", 0],
    ["Dire di essere sieropositivo dopo essere venuto dentro", 0],
    ["Tingersi i peli pubici", 0],
    ["Comprare un tanga con la faccia di Obama", 0],
    ["Usare il naso di pinocchio per altri scopi", 0],
    ["Una pastiglia di cianuro alla fragola per una dolce morte", 0],
    ["Il progetto Bavaro", 0],
    ["Finanziare il ponte sullo stretto", 0],
    ["Asfaltare le coste per evitare gli sbarchi di immigrati ", 0],
    ["Matteo Salvini", 0],
    ["La crescita di uno xenomorpho nel buco del culo", 0],
    ["Convincere l'Unione Europea a finanziare un filmino porno amatoriale", 0],
    ["Evadere le tasse per comprare bimbi all'ingrosso ", 0],
    ["Dei transgender sieropositivi ", 0],
    ["Picchiare il mare per far arrivare le onde", 0],
    ["Scoprire tua madre ad un orgia con suore in una casa di riposo ", 0],
    ["Applicare un razzo a motore ad una sedia a rotelle", 0],
    ["Essere belli come un cesso a pedali ", 0],
    ["Ingravidare una donna col fertilizzante per piante", 0],
    ["Fingersi normali alla cassa mentre si ha un vibratore in culo", 0],
    ["Mettersi un velo e urlare: 'Allah okbar' in aereo", 0],
    ["Accendere una sigaretta sul tetto di Notre Dame", 0],
    ["Il trapassato presente", 0],
    ["Dichiarare guerra alla ex Jugoslavia", 0],
    ["Causare accidentalmente un omicidio di massa", 0],
    ["Una zuppa di fagioli mentre si ha la diarrea fulminante", 0],
    ["Toodles che porta a Topolino una pizza con pesto, rucola e cocaina", 0],
    ["Lavorare con la colla di amianto", 0],
    ["Determinare la massa del sole usando Ruffini", 0],
    ["L'amianto ", 0],
    ["Infilarsi un termometro a mercurio nel culo", 0],
    ["Sciogliere i ghiacciai con un phon", 0],
    ["Urlare 'Pikachu scelgo te!' lanciando un criceto ", 0],
    ["Sbattere la testa sul pavimento da neonati", 0],
    ["Perry l'ornitorinco", 0],
    ["L'ipotenusa del triangolo rettangolo", 0],
    ["Il grande teorema di Pitagora ", 0],
    ["Sfidare leggi della fisica dall'ultimo piano del palazzo", 0],
    ["Leggere il Mein kamf in piazza ad alta voce", 0],
    ["Il trenino Thomas ", 0],
    ["L'aspirapolvere  del teletubbies", 0],
    ["L'infinita vastità del cazzo che me ne frega ", 0],
    ["Le tailandesi", 0],
    ["Duffy Duck che canticchia il motivetto fascista ", 0],
    ["Usare la nutella come lubrificante ", 0],
    ["Il revenge porn", 0],
    ["Il tumore al seno", 0],
    ["L'egemonia dell'Inghilterra sul mare", 0],
    ["Fare la fine di yara ", 0],
    ["Attentati violenti in casa di riposo", 0],
    ["Il cavallo di troia", 0],
    ["Avere dei busti di dubbia provenienza in casa", 0],
    [
      "Usare i soldi pubblici per insabbiare gli atti di pedofilia nella chiesa",
      0,
    ],
    ["Fingersi un allievo dell'asilo quando si hanno 60 anni", 0],
    ["Evocare il drago shenron", 0],
    ["Avere 3 cromosomi 21", 0],
    ["Vantarsi di avere cromosomi in più ", 0],
    ["Mettere un cavallo al governo", 0],
    ["Fare un film porno con un cavallo", 0],
    ["Il dottore degli orifizi ", 0],
    ["Pucciare i biscotti nel latte materno", 0],
    ["L'attentato all'arciduca Francesco Ferdinando ", 0],
    ["Usare una palla di cannone in una partita di ping pong", 0],
    ["Una cosa a 3 con Loredana Bertè e Tiziano Ferro", 0],
    ["Attuare un genocidio per il meme", 0],
    ["Per il meme", 0],
    ["Il ventennio fascista", 0],
    ["Praticare sadomaso con Darth Vader", 0],
    ["Tirare fuori excalibur a letto", 0],
    ["Monaco amanuense", 0],
    ["Cantare faccetta nera davanti al parlamento", 0],
    ["Una torsione testicolare", 0],
    ["Le lesbiche", 0],
    ["I froci", 0],
    ["Accusare un trans di essere un transformer", 0],
    ["Usare i dolci per rapire i bimbi in un parco", 0],
    ["Investire bitcoin in una pornoattrice", 0],
    ["Peppa pig alla griglia ", 0],
    [
      "Buttarsi da un pallazzo per testare l'aerodinamicità del proprio corpo",
      0,
    ],
    ["Essere bravi a infornare come i tedeschi negli anni 40", 0],
    ["I bravi di don Rodrigo", 0],
    ["1000 bottiglie di baby oil", 0],
    ["Il mostro di Firenze", 0],
    ["Usare un calibro per misurarsi il cazzo", 0],
    [
      "Sperimentare il paradosso del gatto di Schrodinger con il tuo cuginetto ",
      0,
    ],
    ["I compagni di merende", 0],
    [
      "Dare un grissino sporco di merda a un bambino spacciandolo per un Mikado ",
      0,
    ],
    ["L'elicottero col cazzo", 0],
    ["Evocare Belzebub", 0],
    ["Vestirsi da nazista ad un gay pride ", 0],
    ["Mettere I BTS a capo della Corea del Nord", 0],
    ["Un allegro weekend a Catanzaro", 0],
    ["Sborrare nella bocca di un'antilope", 0],
    ["La teoria dell'evoluzionismo", 0],
    ["Essere l'assassino di Hitler", 0],
    [
      "Usare la moltiplicazione del corpo di Naruto per entrare in tutti i buchi",
      0,
    ],
    ["Vivere tutta la vita con un vibratore nel culo", 0],
    ["Anna calda a 3 cm da te", 0],
    ["Ha fatto anche cose buone", 0],
    ["Quando c'era lui i treni arrivavano in orario", 0],
    ["La madonna caraibica", 0],
    ["Invadere la Polonia", 0],
    ["L'impresa dei mille", 0],
    ["Nuclearizzare Foggia", 0],
    ["Il Vesuvio erutta a Napoli", 0],
    ["L'amore incondizionato dei fiorentini per i pisani", 0],
    ["Il comune emiliano di Sesso", 0],
    ["Rapire e uccidere Yara", 0],
    ["Essere innocente come Bossetti", 0],
    ["Jack lo Squirtatroie", 0],
    ["IT'S OVER NINE THOUSAND!!!!!", 0],
    ["Trovare un arto umano a casa del tipo conosciuto su tinder", 0],
    ["Evadere il fisco come Jeff Bezoz", 0],
    ["Sussurrare all'orecchio del vicino di urinatoio", 0],
    ["Occuparsi della fauna locale come il Trentino Alto Adige", 0],
    ["Le suffragette ", 0],
    ["Sessualizzare il demogorgone", 0],
    ["Il cast della melevisione in un video porno", 0],
    ["Circoncidersi con una pinzatrice rosa", 0],
    ["Bombardare il Vietnam col napalm", 0],
    ["Infilarsi un plug anale nella cappella", 0],
    ["Strizzare i capezzoli ad un toro", 0],
    ["Mungere il prof di matematica napoletano per la sufficienza ", 0],
    ["ll processo di Norimberga", 0],
    ["Esplodere come tuo zio musulmano ", 0],
    ["Rizzare le dodicenni ", 0],
    ["Diventare luterani per un giorno", 0],
    ["I diritti delle donne", 0],
    ["La fiera dell'est", 0],
    ["Vote Kamala for president ", 0],
    ["Trump come nuovo protagonosta di Matrix ", 0],
    ["Giocare a Risiko con eserciti veri", 0],
    ["Fare un bagno termale nel Vesuvio", 0],
    ["La durezza del mio pene quando canta Annalisa ", 0],
    [
      "Calcolare la dilatazione anale dopo il fisting con il teorema di Pitagora",
      0,
    ],
    ["Una cenetta romantica ispirata a Jeffrey Dahmer", 0],
    ["Usare la borra al posto della crema pasticcera ", 0],
    ["Chiedere a un bimbo orfano dove sono i suoi genitori", 0],
    ["Le rule 34 di JoJo Siwa", 0],
    ["Liberare i bimbi dallo scantinato", 0],
    ["Raggiungere l'uguaglianza schiarendo la pelle ai neri", 0],
    ["Raggiungere l'orgasmo con due dita nel naso", 0],
    ["Ficcarsi due dita e una matita negli occhi ", 0],
    ["Sciacquarsi le palle nella bacinella dell'acqua santa", 0],
    ["Disegnare forme falliche sulle lapidi al cimitero ", 0],
    ["Un chilo di bamba ", 0],
    ["Dei lecca lecca al gusto gonorrea ", 0],
    ["Un clitoride placcato oro", 0],
    ["Tagliare il cordone ombelicale sbagliato al neonato", 0],
    ["Chiara Facchetti che salda il debito pubblico italiano", 0],
    ["Trombare un lampione in pieno giorno", 0],
    ["Bere le cristalline acque del Brenta", 0],
    ["Eiaculare tanto da farsi venire un'ernia ai coglioni", 0],
    ["Inzuppare il tampax nella vodka", 0],
    ["Togliersi il preservativo prima di venire ", 0],
    ["Regalare preservativi bucati", 0],
    ["Le zingare che rubano nella metro di Milano", 0],
    ["Cagare a spruzzo in un vicolo buio e malfamato", 0],
    ["Portare la classe dei bambini speciali in gita a Chernobyl", 0],
    ["Fingersi gay per toccare una tetta", 0],
    ["Disegnare cazzi anatomicamente accurati", 0],
    ["Ruttare sui polli", 0],
    ["Usare un tubo di pringles come sex toy", 0],
    ["Dirigere un bombardamento aereo contro la Moldavia ", 0],
    [
      "Risolvere il problema dell'immigrazione in Italia cancellando Lampedusa",
      0,
    ],
    ["I bambini nascosti sotto il letto di Michael Jackson", 0],
    ["L'umidità della mia figa quando vedo Conte", 0],
    ["Scambiare pedopornografia nel parchetto cittadino", 0],
    ["Scopare con il datore di lavoro", 0],
    ["Lavarsi i genitali con vodka alla fragola e nitroglicerina", 0],
    ["Arrivare in ritardo al proprio funerale ", 0],
    ["Un pupazzo dei My Little Pony con un buco speciale ", 0],
    ["Un elefante tandem psichico da guerra ", 0],
    ["Far cadere la saponetta di proposito nelle docce della prigione", 0],
    ["Succhiare un cazzo fino a che non sborra", 0],
    ["Ficcarsi 3 procioni bel culo", 0],
    ["Usare la calcolatrice per fare 1+1", 0],
    ["Bere Jager dal bidè a casa della prozia", 0],
    ["Morire di diarrea fulminea", 0],
    [
      "Tornare indietro nel tempo solo per farsi fare un autografo da Hitler ",
      0,
    ],
    [
      "Tornare indietro nel tempo per farsi fare un pompino da Marilyn Monroe",
      0,
    ],
    ["Fumare la marijuana dal culo", 0],
    ["Sniffare le ceneri della nonna", 0],
    ["Usare le ceneri del cane come parmigiano ", 0],
    ["Praticare tuffi olimpici nella vasca da bagno", 0],
    ["Praticare il Kamasutra al pranzo di natale ", 0],
    ["Togliersi le costole per fare come D'Annunzio", 0],
    ["Orietta Berti ", 0],
    ["Anna Frank ", 0],
    ["Malgioglio", 0],
    ["Rocco Siffredi ", 0],
    ["Maria de Filippi ", 0],
    ["Alberto Angela ", 0],
    ["Inserire tua sorella nel database degli SCP", 0],
    ["Spiegare l'apologia cristiana suonando una vuvuzela", 0],
    [
      "Fabrizio Corona che si incula con un complesso sistema di leve e specchi",
      0,
    ],
    ["Una ninna nanna suonata con un flauto dolce nel naso", 0],
    ["Uno spiedino ti topi fritti in pastella", 0],
    ["Strozzarsi con una mozzarella aromatizzata all'uranio ", 0],
    ["Prendere 3 pastiglie di viagra per inchiappettare un puffo", 0],
    ["Le attività extraconiugali ", 0],
    ["L'astinenza", 0],
    ["Gesù inculato dalla Madonna con un dildo rosa", 0],
    [
      "Usare la cocaina al posto della farina per preparare una torta per la vendita di beneficenza.",
      0,
    ],
    ["L'ospedale pediatrico sotto attacco di israele ", 0],
    ["Un Charizard con tendenze neonaziste", 0],
    ["Sparare mensole dagli occhi", 0],
    ["Kaaaaaamehaaaaamehaaaaaa", 0],
    ["Fare sesso non protetto con la propria madre", 0],
    ["Unboxare falli di gomma su youtube kids", 0],
    ["Uscire le tette per curare i malati di Alzheimer ", 0],
    ["Mussolini che fa l'ahegao", 0],
    ["Lavarsi i capelli con l'olio della friggitrice", 0],
    ["Shrek", 0],
    ["Chiudere tua moglie incinta in balcone d'inverno ", 0],
    ["La fede in dio di Germano Mosconi ", 0],
    ["Clara di Heidi", 0],
    ["Il discorso del duce", 0],
    ["Bazinga", 0],
    [
      "Usare il mantello dell'invisibilità per segarsi nello spogliatoio delle ragazze",
      0,
    ],
    ["Accorgersi di avere tendenze necrofile", 0],
    ["Attraversare l'autostrada per catturare un Pikachu ", 0],
    ["Uccidere il proprio figlio a badilate perché gli piace Peppa Pig", 0],
    ["Presentarsi armati ad un concorso di monache austriache", 0],
    ["Organizzare la corrida con i comunisti", 0],
    ["Far dichiarare bancarotta a un sexy shop", 0],
    ["Farsi un piercing al cazzo", 0],
    ["Infilare il proprio braccio nel culo", 0],
    ["Terrorizzare i bambini col costume di Berlusconi", 0],
    ["Proclamare lo stato d'assedio", 0],
    ["Avere un orgasmo dopo aver assaggiato la torta alle mele", 0],
    ["Un cosplay hentai", 0],
    [
      "Michael Jackson che si stringe le mani per ricreare la pubblicità dei ringo",
      0,
    ],
    ["Igniettarsi la candeggina in vena per combattere il covid", 0],
    ["Il mio cazzo come emoji", 0],
    ["L'occhio di Sauron", 0],
    ["Organizzazione la corrida in un asilo nido", 0],
    ["Fare sogni bagnati su una babooshka ", 0],
    ["Farsi segare da una persona col parkinson ", 0],
    ["Saetta McQueen ", 0],
    ["Dio Portatore di Tuoni", 0],
    ["Usare Steve Hawking per il live action di cars", 0],
    [
      "dio bestia da soma in minia toma in minia soma in minia mosa in miniatura",
      0,
    ],
    ["Utilizzare una moka per costruire un reattore nucleare", 0],
    ["L'odore di pube di topo", 0],
    ["I dossi davanti all'asilo", 0],
    ["Chiara Facchetti", 0],
    ["L'impero asburgico", 0],
    ["Le 23 pugnalate di Giulio Cesare", 0],
    ["Il nonnismo", 0],
    ["L'encefalite acuta", 0],
    ["Accendere il riscaldamento come Nerone ha fatto a Roma", 0],
    ["Diventare sborraman", 0],
    ["Infilarsi le due torri gemelle in culo", 0],
    ["Fare sesso non protetto con la nonna dei croods ", 0],
    ["Il trono di cazzi", 0],
    ["Perry l'ornitorinco", 0],
    ["Scopare il gemello del tuo fidanzato", 0],
    ["Scopare il gemello della tua fidanzata", 0],
    ["Lo sciopero contro i diritti delle donne", 0],
    ["Rifarsi le tette per fare un titjob migliore", 0],
    ["Tua madre", 0],
    ["Biancaneve e i 7 cazzi", 0],
    ["Armando(della Pimpa)", 0],
    ["Dormire in un letto da mezza piazza per evitare il sesso a sorpresa", 0],
    ["Freddy fazbear", 0],
    ["Kermit la rana", 0],
    ["Il bastone di Jack frost", 0],
    ["Un'ustione di quinto grado", 0],
    ["Svenire dopo aver visto una figa", 0],
    ["Una sega con i piedi", 0],
    ["Lucia Mondella", 0],
    ["Torquato Tasso", 0],
    ["Raggiungere le note di Ariana Grande mentre cavalchi un cazzo", 0],
    ["Sganciare una mega scoraggia in un'ascensore affollato ", 0],
    ["Gumball watterson", 0],
    ["Lavorare alle 3 di notte in autostrada", 0],
    ["Andare a disoneste", 0],
    ["Mettere in punizione i tuoi amici perché sono troppo freaky", 0],
    ["Il dissing dei me contro te", 0],
    ["Tatuarsi l'occhio degli illuminati sul buco del culo", 0],
    ["Dio aeroplano nella valle delle torri", 0],
    ["Riprendere fiume", 0],
    ["Il secondo triumvirato ", 0],
    ["Raccontare le proprie esperienze sessuali al club del libro", 0],
    ["Assaggiare i reagenti colorati nel laboratorio di chimica", 0],
    ["Avere un duello al funerale di tuo nonno", 0],
    ["Essere investiti da un aereo", 0],
    ["Eccitare il clitoride fino all'orgasmo", 0],
    ["L'ergastolo per aver rubato un pacchetto di carte pokemon", 0],
    ["Una lesbica futurista", 0],
    ["Essere ingravidati da Mahmood con lo sguardo", 0],
    ["Rosario muniz", 0],
    ["Un pandoro farcito con la sborra", 0],
    ["Dichiarare a guerra all'Algeria ", 0],
    ["Un orgasmo a mani libere", 0],
    ["Impalato dal dio bestia", 0],
    ["Un satanasso molto promiscuo ", 0],
    ["Ruttare come una principessa camionista", 0],
    ["Essere calpestato da un cazzone", 0],
    ["Un bagno termale nel Vesuvio ", 0],
    ["Napoli a fuoco", 0],
    ["Castrare i terroni", 0],
    ["Correre scalzi nei prati sotto l'effetto di droghe pesanti ", 0],
    [
      "Infilare le palle in un orologio a pendolo che ha al posto del pendolo un ascia",
      0,
    ],
    ["Smerdarsi nei calzoni in classe", 0],
    ["Pomiciare con i paramedici venuti a soccorrere tuo padre", 0],
    ["Vomitare vodka e funghetti allucinogeni in corsia 2 al conad", 0],
    ["Togliersi la vita con una bottiglietta di plastica", 0],
    ["'Eh sì eh Marco eh B porterai minecreft?'", 0],
    ["Infilarsi del potassio puro su per il culo per diventare un razzo", 0],
    ["Evocare un demone per passare una seratina esotica", 0],
    ["Svegliarsi senza un rene dopo una seratina romantica ", 0],
    ["Farsi frati per non essere chiamati alle armi", 0],
    ["Farsi suora per non finire a letto con altri casi umani", 0],
    ["Gerry Scotti", 0],
    ["Un catetere", 0],
    ["Sniffare cocaina dal buco del culo", 0],
    ["Giocare a rugby con un neonato come palla", 0],
    ["Un'orgia con Meloni, Di Maio e Salvini", 0],
    ["Mangiare un peperoncino per sputare fiamme dal culo", 0],
    ["Maurizio Merluzzo in drag", 0],
    ["Eccitarsi alla vista del necrologio del giorno", 0],
    ["Usare il proprio jet privato per fare una passeggiatina con il cane", 0],
    ["Wanna Marchi", 0],
    ["Elenoire ferruzzi", 0],
    ["Pulirsi il culo con delle unghie da 50 cm", 0],
    ["Il phon accesso nella vasca da bagno", 0],
    ["Adorare le donne che sanno di merluzzo", 0],
    ["Il sesso non protetto nel giardino dell'Eden", 0],
    ["Portare ad ebollizione la sborra", 0],
    ["Francesca cipriani", 0],
    ["Paolo bonolis", 0],
    ["Donatella versace", 0],
    ["Blanco ", 0],
    ["Peppe Brescia ", 0],
    ["Peppe fetish", 0],
    ["Rita de Crescenzo ", 0],
    ["Il gelato al profilattico", 0],
    ["Essere dissati da favij", 0],
    ["Lo scandalo di Chiara Ferragni e il pandoro", 0],
    ["Le emorroidi a colazione", 0],
    ["Lo strumentopolo misterioso di Topolino", 0],
    ["Essere picchiati da papa Francesco ", 0],
    ["Una sfida a super smash bros con baby k", 0],
    ["Urlare 'maledettiiii!' davanti a un giornalista", 0],
    ["Urlare 'Teresaaaa' davanti a un giornalista", 0],
  ],
};

const nounsAndAdjectives = {
  names: [
    "Gianfranco",
    "Petunia",
    "Matilda",
    "Gesù",
    "Patrizia",
    "Anastasia ",
    "Tancredi",
    "Geltrude",
    "San bartolomeo",
    "Stefania",
    "Sandrina",
    "Gervasio",
    "Tibetino",
    "Filiberto",
    "Demetra",
    "Carlina",
    "Peppone",
    "Brumilda",
    "Ermenegilda",
    "Loretta",
    "Juan",
    "Gonzago",
    "Carmeletto",
    "Clarissa",
    "Asdrubale",
    "Osvaldo",
    "Moreno",
    "Gilberto",
    "Lucresia",
    "Esposito",
    "Proserpina",
    "Annunziata",
    "Pasqualino",
    "Simonetta",
    "Giovanni",
    "Natalia",
    "Anastasia",
    "Girolamo",
    "Ernesto",
    "Ambrogio",
    "Ettorina",
    "Onorino",
    "Giandomenica",
    "Natalino",
    "Romualda",
    "Melania",
    "Reginaldo",
    "Percivaldo",
    "Flaviana",
    "Manuela",
    "Madonna",
    "Gabibbo",
    "Calimero",
    "Mussolini",
    "Marilina",
    "Michael Jackson",
    "Orietta Berti",
    "Gerry Scotti",
    "Maria de Filippi",
  ],
  adjectives: [
    "Vibrante",
    "Caliente",
    "Eccitante",
    "Segante",
    "Scopante",
    "Cagarellante",
    "Macchiante",
    "Incontinente",
    "Gemente",
    "Performante",
    "Sniffante",
    "Folgorante",
    "Gocciolante",
    "Rizzante",
    "Scompisciante",
    "Sburrante",
    "Ninfomane",
    "Abominevole",
    "Gigante",
    "Piacevole",
    "Sensuale",
    "Omosessuale",
    "Petulante",
    "Pizzicolante",
    "Orgasmante",
    "Vegetante",
    "Indulgente",
    "Bocca larga",
    "Culo stretto",
    "Mani rapide",
    "Imprecante",
    "Salivante",
    "Ortofruttante",
    "Strimpellante",
    "Seno esplosivo",
    "Passione fisting",
    "Saccente",
    "Ano dilatato",
    "Comunista",
    "Fascista",
    "Eccessivamente omosessuale",
  ],
};
