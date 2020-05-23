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
            window.location.href = "/pages/home.html";
        })
        .catch(err => {
        });   
}

function userLoginFetch( userName, password ){
    let url = '/vote-rps/api/user/login';

    let data = {
        userName,
        password
    }

    let settings = {
        method : 'POST',
        headers : {
            'Content-Type' : 'application/json'
        },
        body : JSON.stringify(data)
    }

    fetch( url, settings )
        .then(response => {
            if(response.ok){
                return response.json();
            }
            throw new Error(response.statusText);
        })
        .then(responseJSON => {
            localStorage.setItem('token', responseJSON.token);
            window.location.href = "/pages/home.html";
        })
        .catch(err => {
            displayServerResponse(err.message);
        });
}

function userSignupFetch( userName, password ){
    let url = '/vote-rps/api/user/signup';

    let data = {
        userName,
        password
    }

    let settings = {
        method : 'POST',
        headers : {
            'Content-Type' : 'application/json'
        },
        body : JSON.stringify(data)
    }

    fetch( url, settings )
        .then(response => {
            if(response.ok){
                return response.json();
            }
            
            throw new Error(response.statusText);
        })
        .then(responseJSON => {
            createdUser = responseJSON.name;
            displayServerResponse(`Created User ${createdUser}. Please log-in.`);
            userLoginFetch(userName, password);   
        })
        .catch(err => {
            displayServerResponse(err.message);
            throw new Error(err.message);
        });
}

function watchLoginForm(){
    let userForm = document.querySelector('.user-form');

    userForm.addEventListener('submit' , (event) => {
        event.preventDefault();

        let userName = document.getElementById('userName').value;
        let password = document.getElementById('userPassword').value;
        let signup = document.getElementById('userSignup');

        try {
            // User Sign-Up
            if(signup.checked){
                userSignupFetch(userName, password);
            }
            else{
                userLoginFetch(userName, password);
            }
        } catch (err) {
            displayServerResponse(err.message);
        }
    });
}

function init(){
    validateSession();
    watchLoginForm();
}

init();