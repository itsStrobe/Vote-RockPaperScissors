
// -- CONSTANTS -- 

const INITIAL_CREDITS = 120;

// -- ENUMS -- 

const Phase = {
    LOBBY : 0,
    BETTING : 1,
    VOTING : 2,
    DRAWING : 3,
    RESOLUTION : 4,
    FINISHED : 5
};

const Card = {
    ROCK : 0,
    PAPER : 1,
    SCISSORS : 2
};

const Compare = {
    0 : {
        weakTo: 1,
        strongTo: 2
    }, // Rock
    1 : {
        weakTo: 2, 
        strongTo: 0
    }, // Paper
    2: {
        weakTo: 0,
        strongTo: 1
    } // Scissors
};

// -- CLASSES --

class Player {
    constructor(number, name, socket){
        this.number = number;
        this.name = name;
        this.socket = socket;

        this.credits = 120; // Default amount
        this.hand = [];
        this.selection = null;
        this.isReady = false;
    }
}

class Voter {
    constructor(name, socket){
        this.name = name;
        this.socket = socket;

        this.voted = false;
    }
}

class Game {
    // -- CLASS METHODS -- 
    static fillDeck(card_deck){
        let possibleCards = [Card.ROCK, Card.PAPER, Card.SCISSORS];

        while(card_deck.length < 30){
            card_deck.push(possibleCards[Math.floor(Math.random() * 3)]);
        }

        return card_deck;
    }

    static shuffleDeck(card_deck){
        return card_deck.sort(() => Math.random() - 0.5);;
    }

    constructor(gameCode){
        console.log(`Creating new game 'code=${gameCode}'`);
        this.code = gameCode;

        this.players = new Object(); // name : { #, name, credits, hand, selection, isReady, socket }
        this.voters = new Object(); // name : { name, voted, socket }
        this.phase = Phase.LOBBY;
        this.currentBet = 0;
        this.card_deck = [];
        this.winner = null;

        this.numPlayers = 0;
        this.numVoters = 0;
    }

    isPlayer(name){
        return this.players[name] != null;
    }

    addPlayer(name, socket){
        if(this.numPlayers < 2){
            this.numPlayers++;
            this.players[name] = new Player(this.numPlayers, name, socket);
            return true;
        }

        return false;
    }

    playerRetire(name){
        if(!this.isPlayer(name)){
            return;
        }

        this.phase = Phase.FINISHED;
        Object.keys(this.players).forEach(player => {
            if(player != name){
                this.winner = player;
            }
        });
    }

    proposeBet(name, bet){
        if(!this.isPlayer(name)){
            return;
        }


        if(this.players[name].credits < bet){
            bet = this.players[name].credits;
        }
        if(bet <= 0){
            bet = 1;
        }

        this.currentBet = Math.trunc(bet);
    }

    makeCardSelection(name, cardIdx){
        if(this.players[name].hand == []){
            return;
        }
        console.log(`My Hand: ${this.players[name].hand}`);
        this.players[name].selection = this.players[name].hand[cardIdx];
        this.players[name].hand.splice(cardIdx, 1);
    }

    revealCards(){
        if(!this.arePlayersFinished()){
            return;
        }

        let players = Object.keys(this.players);

        if (Compare[this.players[players[0]].selection].strongTo === this.players[players[1]].selection) {
            this.winner = players[0];

            this.players[players[0]].credits += this.currentBet;
            this.players[players[1]].credits -= this.currentBet;
        }
        else if (Compare[this.players[players[0]].selection].weakTo === this.players[players[1]].selection) {
            this.winner = players[1];

            this.players[players[1]].credits += this.currentBet;
            this.players[players[0]].credits -= this.currentBet;
        }
        else {
            this.winner = 'Draw';
        }

        this.phase = Phase.RESOLUTION;
    }

    removePlayer(name){
        if(this.players[name] != null){
            delete this.players[name];
            this.numPlayers--;
            return true;
        }

        return false;
    }

    isVoter(name){
        return this.voters[name] != null;
    }

    addVoter(name, socket){
        if(this.numVoters < 30){
            this.numVoters++;
            this.voters[name] = new Voter(name, socket);
            return true;
        }
        
        return false;
    }

    makeVote(name, cardIdx){
        if(!this.isVoter(name) && this.voters[name].voted){
            return;
        }

        switch(cardIdx){
            case 0:
                this.card_deck.push(Card.ROCK);
                break;

            case 1:
                this.card_deck.push(Card.PAPER);
                break;
            
            case 2:
                this.card_deck.push(Card.SCISSORS);
                break;
        }

        this.voters[name].voted = true;
    }

    removeVoter(name){
        if(this.voters[name] != null){
            delete this.voters[name];
            this.numVoters--;
            return true;
        }

        return false;
    }

    getPlayersState(){
        let cleanPlayers = [{}, {}];
        
        Object.keys(this.players).forEach(player => {
            cleanPlayers[this.players[player].number - 1] = {
                number : this.players[player].number,
                name : this.players[player].name,
                credits : this.players[player].credits,
                selection : this.players[player].selection,
                isReady : this.players[player].isReady
            }
        });
    
        return cleanPlayers;
    }

    getPlayersSelections(){
        let selections = [{}, {}];

        // If Players are Currently Drawing, Hide Info.
        if(this.phase == Phase.DRAWING){
            return selections;
        }
        
        Object.keys(this.players).forEach(player => {
            selections[this.players[player].number - 1] = {
                number : this.players[player].number,
                name : this.players[player].name,
                selection : this.players[player].selection
            }
        });
    
        return selections;
    }

    getVotersState(){
        let cleanVoters = [ ];
        
        Object.keys(this.voters).forEach(voter => {
            cleanVoters.push({
                name : this.voters[voter].name,
                voted : this.voters[voter].voted
            });
        });
    
        return cleanVoters;
    }

    playerReadyAction(name){
        if(this.players[name].isReady){
            this.players[name].isReady = false;
        }
        else{
            this.players[name].isReady = true;
        }
    }

    arePlayersReady(){
        if(this.numPlayers < 2){
            return false;
        }

        let playersReady = true;
        
        Object.keys(this.players).forEach(player => {
            console.log(`Player ${player} - ${this.players[player].isReady}`)
            if(!this.players[player].isReady){
                playersReady = false;
            }
        });

        return playersReady;
    }

    updatePhaseOnPlayersReady(){
        if(this.phase == Phase.LOBBY){
            this.phase = Phase.BETTING;
        }
        else if(this.phase == Phase.BETTING){
            this.phase = Phase.VOTING;

            // Evaluate if there are no Voters
            if(this.areVotersFinished()){
                this.onVotersFinished();
            }
        }
        else if(this.phase == Phase.RESOLUTION){
            console.log(`RESOLUTION - Winner ${this.winner}`);
            // If Draw, pick again
            if(this.winner == "Draw"){
                this.resetPlayersSelections();

                if(this.doPlayersHaveCards()){
                    this.phase = Phase.DRAWING;
                }
                else{
                    this.phase = Phase.BETTING;
                }
            }
            // If the Winner has all the Money, end the game
            else if(this.isThereAWinner()){
                this.phase = Phase.FINISHED;
            }
            // Continue the Game
            else {
                this.phase = Phase.BETTING;

                Object.keys(this.players).forEach(player => {
                    this.players[player].hand = [];
                    this.players[player].selection = null;
                    this.card_deck = [];
                    this.winner = null;
                });
            }
        }

        // RESET PLAYERS READY STATUS
        Object.keys(this.players).forEach(player => {
            this.players[player].isReady = false;
        });

        return this.phase;
    }

    arePlayersFinished(){
        let allSelected = true;

        Object.keys(this.players).forEach(player => {
            console.log(`${player} - Selection: ${this.players[player].selection}`);
            if(this.players[player].selection == null){
                allSelected = false;
            }
        });
    
        return allSelected;
    }

    areVotersFinished(){
        let allVoted = true;

        Object.keys(this.voters).forEach(voter => {
            if(!this.voters[voter].voted){
                allVoted = false;
            }
        });
    
        console.log(`All Voted: ${allVoted}`);
        return allVoted;
    }

    drawPlayerCards(){
        // Draw Player Cards
        let card_it = 0;
        Object.keys(this.players).forEach(player => {
            this.players[player].hand = [];
            for(let it = 0; it < 3; it++){
                this.players[player].hand.push(this.card_deck[card_it]);
                card_it++;
            }
            console.log(this.players[player].hand);
        });
    }

    onVotersFinished(){
        // Change Phase of Game
        this.phase = Phase.DRAWING;

        // Fill and Shuffle Decks
        this.card_deck = Game.fillDeck(this.card_deck);
        this.card_deck = Game.shuffleDeck(this.card_deck);

        this.drawPlayerCards();
        Object.keys(this.voters).forEach(voter => {
            this.voters[voter].voted = false;
        });
    }

    doPlayersHaveCards(){
        let doThey = false;

        Object.keys(this.players).forEach(player => {
            if(this.players[player].hand.length > 0){
                doThey = true;
            }
        });

        return doThey;
    }

    resetPlayersSelections(){
        Object.keys(this.players).forEach(player => {
            this.players[player].selection = null;
        });
        this.winner = null;
    }

    isThereAWinner(){
        let isThereAWinner = false;

        Object.keys(this.players).forEach(player => {
            if(this.players[player].credits >= INITIAL_CREDITS*2){
                this.winner = player;
                isThereAWinner = true;
            }
        });

        return isThereAWinner;
    }
}

module.exports = { Phase, Card, Compare, Player, Voter, Game };
