
const StatusToText = {
    0 : "ONGOING",
    1 : "FINISHED"
}

function displayServerResponse(message){
    const response = document.querySelector('.response');

    response.innerHTML = `<div class="serverResponse"> ${message} </div>`;
}

function validateSession() {
    let url = '/vote-rps/api/validate-session';
    let settings = {
        method : 'GET', 
        headers : {
            sessiontoken : localStorage.getItem('token')
        }
    };

    fetch(url, settings)
        .then(response => {
            if(response.ok) {
                return response.json();
            }
            
            throw new Error(response.statusText);
        })
        .then(responseJSON => {
            displayServerResponse(`Who are you stalking, ${responseJSON.name}?`);
        })
        .catch(err => {
            displayServerResponse(err.message);
            window.location.href = "/index.html";
        });   
}

function displayFoundGames(games){
    displayServerResponse('Displaying Query Response.');

    let gamesTable = document.getElementById('found-matches');

    gamesTable.innerHTML = "";

    // Game Variables
    let player1 = undefined;
    let player2 = undefined;
    let winner = undefined;

    if(Array.isArray(games)){
        games.forEach(game => {
            if(!game.players[0]){
                player1 = 'UNDEFINED';
            }
            else{
                player1 = game.players[0].name;
            }

            if(!game.players[1]){
                player2 = 'UNDEFINED';
            }
            else{
                player2 = game.players[1].name;
            }

            if(!game.winner){
                winner = 'UNDEFINED';
            }
            else{
                winner = game.winner.name;
            }

            gamesTable.innerHTML += `
            <tr>
                <td class="tb_row">${game.code}</td>
                <td class="tb_row">${game.owner.name}</td>
                <td class="tb_row">${player1} - ${player2}</td>
                <td class="tb_row">${winner}</td>
                <td class="tb_row">${game.voters.length}/20</td>
                <td class="tb_row">${StatusToText[game.status]}</td>
                <td class="tb_row">${game.date}</td>
            </tr>
            `;
        });
    }
    else{
        if(!games.players[0]){
            player1 = 'UNDEFINED';
        }
        else{
            player1 = games.players[0].name;
        }

        if(!games.players[1]){
            player2 = 'UNDEFINED';
        }
        else{
            player2 = games.players[1].name;
        }

        if(!games.winner){
            winner = 'UNDEFINED';
        }
        else{
            winner = games.winner.name;
        }

        gamesTable.innerHTML = `
        <tr>
            <td class="tb_row">${games.code}</td>
            <td class="tb_row">${games.owner.name}</td>
            <td class="tb_row">${player1} - ${player2}</td>
            <td class="tb_row">${winner}</td>
            <td class="tb_row">${games.voters.length}/20</td>
            <td class="tb_row">${StatusToText[games.status]}</td>
            <td class="tb_row">${games.date}</td>
        </tr>
        `;
    }
}

function getGamesByQuery(query, value){
    let url = `/vote-rps/api/games?${query}=${value}`;

    let settings = {
        method : 'GET',
        headers : {
            'Content-Type' : 'application/json',
            sessiontoken : localStorage.getItem('token')
        }
    };

    fetch( url, settings )
        .then(response => {
            if(response.ok){
                return response.json();
            }
            
            throw new Error(response.statusText);
        })
        .then(responseJSON => {
            console.log(responseJSON); 
            displayFoundGames(responseJSON);
        })
        .catch(err => {
            displayServerResponse(err.message);
            throw new Error(err.message);
        });
}

function watchGameQueryForm(){
    let userForm = document.querySelector('.game-form');

    userForm.addEventListener('submit' , (event) => {
        event.preventDefault();

        let query = document.getElementById('searchBy').value;
        let value = document.getElementById('searchBy-value').value;

        getGamesByQuery(query, value);
    });
}

function init(){
    validateSession();
    watchGameQueryForm();
}

init();
