
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
            displayServerResponse(`What are you changing, ${responseJSON.name}?`);
        })
        .catch(err => {
            displayServerResponse(err.message);
            window.location.href = "/index.html";
        });   
}

function patchPassword(newPassword, newPasswordConfirmation, password){
    let url = '/vote-rps/api/user/newPassword';

    let data = {
        newPassword,
        newPasswordConfirmation,
        password
    }

    let settings = {
        method : 'PATCH',
        headers : {
            'Content-Type' : 'application/json',
            sessiontoken : localStorage.getItem('token')
        },
        body : JSON.stringify(data)
    };

    fetch( url, settings )
        .then(response => {
            if(response.ok){
                return response.json();
            }
            
            throw new Error(response.statusText);
        })
        .then(responseJSON => {
            localStorage.setItem('token', responseJSON.token);
            validateSession();
        })
        .catch(err => {
            displayServerResponse(err.message);
            throw new Error(err.message);
        });
}

function patchUsername(newUserName, password){
    let url = '/vote-rps/api/user/newUserName';

    let data = {
        newUserName,
        password
    };

    console.log(data);

    let settings = {
        method : 'PATCH',
        headers : {
            'Content-Type' : 'application/json',
            sessiontoken : localStorage.getItem('token')
        },
        body : JSON.stringify(data)
    };

    fetch( url, settings )
        .then(response => {
            if(response.ok){
                return response.json();
            }
            
            throw new Error(response.statusText);
        })
        .then(responseJSON => {
            localStorage.setItem('token', responseJSON.token);
            validateSession();
        })
        .catch(err => {
            displayServerResponse(err.message);
            throw new Error(err.message);
        });
}

function watchUpdateUserNameForm(){
    let userForm = document.getElementById('new-username-form');

    userForm.addEventListener('submit' , (event) => {
        event.preventDefault();

        let newUserName = document.getElementById('new-username').value;
        let password = document.getElementById('userPassword-new-username').value;

        patchUsername(newUserName, password);
    });
}

function watchUpdatePasswordForm(){
    let userForm = document.getElementById('new-password-form');

    userForm.addEventListener('submit' , (event) => {
        event.preventDefault();

        let newPassword = document.getElementById('new-password').value;
        let newPasswordConfirmation = document.getElementById('new-password-confirmation').value;
        let password = document.getElementById('userPassword-new-password').value;

        patchPassword(newPassword, newPasswordConfirmation, password);
    });
}

function init(){
    validateSession();
    watchUpdateUserNameForm();
    watchUpdatePasswordForm();
}

init();
