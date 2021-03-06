

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
            displayServerResponse(`Need a refresher, ${responseJSON.name}?`);
        })
        .catch(err => {
            displayServerResponse(err.message);
            window.location.href = "/index.html";
        });   
}

function init(){
    validateSession();
}

init();
