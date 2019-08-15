window.onload = function () {
    initializeFirebase();
    initializeFirebaseUI();
    //listenUserStatus();
};

function initializeFirebase() {
    var config = {
        apiKey: "AIzaSyAhLsIT6egSpec2E93p1ZtlZEX2N4wySGs",
        authDomain: "dwplanning-fd04c.firebaseapp.com",
        databaseURL: "https://dwplanning-fd04c.firebaseio.com",
        projectId: "dwplanning-fd04c",
        storageBucket: "dwplanning-fd04c.appspot.com",
        messagingSenderId: "1042985627662",
        appId: "1:1042985627662:web:4191afccd69de798"
    };
    firebase.initializeApp(config);
}

function initializeFirebaseUI() {
    let uiConfig = {
        callbacks: {
            signInSuccess: function (currentUser, credential, redirectUrl) {
                console.log("=============================");
                document.getElementById('title').innerHTML = "Bienvenido " + currentUser.email;
                console.log(currentUser, credential, redirectUrl);
                return false;
            },
            uiShown: function () {
                document.getElementById('loader').style.display = 'none';
            }
        },
        signInSuccessUrl: '<url-to-redirect-to-on-success>',
        signInOptions: [
            firebase.auth.GoogleAuthProvider.PROVIDER_ID,
            //firebase.auth.FacebookAuthProvider.PROVIDER_ID,
            //firebase.auth.TwitterAuthProvider.PROVIDER_ID,
            //firebase.auth.GithubAuthProvider.PROVIDER_ID,
            //firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID,
            firebase.auth.EmailAuthProvider.PROVIDER_ID,
            {
                provider: firebase.auth.PhoneAuthProvider.PROVIDER_ID,
                recaptchaParameters: {
                    type: 'image',
                    //size: 'invisible',
                    badge: 'bottonleft'
                }
            }
        ],
        tosUrl: '<your-tos-url>',
        privacyPolicyUrl: function () {
            window.location.assign('<your-privacy-policy-url>');
        }
    };
    let ui = new firebaseui.auth.AuthUI(firebase.auth());
    ui.start('#firebaseui-auth-container', uiConfig);
}

function listenUserStatus() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log('Usurario activo: ' + user.email);
        } else {
            console.log('No logueado');
        }
    });
}