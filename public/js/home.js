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
            displayServerResponse(`Welcome back ${responseJSON.name}`);
        })
        .catch(err => {
            console.log(err);
            displayServerResponse(err.message);
            window.location.href = "/index.html";
        });   
}

function init(){
    validateSession();
}

init();
