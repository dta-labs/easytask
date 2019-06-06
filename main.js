if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Registro de SW exitoso ', reg))
        .catch(err => console.log('Error en registro del SW ', err))
}

let usersList;
let authUser;
let projectsList;
let actualProject;
let actualProjectKey;
let tasksList;
let newTaskIndex = 0;
let newProjectIndex = 0;
let showProjectInfo = false;
let showChat = false;
let viewIndex = 1;

window.onload = function () {
    viewIndex = (screen.width > 480) ? 1 : 2;
    setFileUploadEvent();
    initializeFirebase();
    initializeUI();
    loadUsersFromFB();
    loadProjectsFromFB();
};

// #region Firebase

function initializeFirebase() {
    var config = {
        apiKey: "AIzaSyAhLsIT6egSpec2E93p1ZtlZEX2N4wySGs",
        authDomain: "dwplanning-fd04c.firebaseapp.com",
        databaseURL: "https://dwplanning-fd04c.firebaseio.com",
        projectId: "dwplanning-fd04c",
        storageBucket: "dwplanning-fd04c.appspot.com",
        messagingSenderId: "1042985627662"
    };
    firebase.initializeApp(config);
}

function loadUsersFromFB() {
    firebase.database().ref("users")
        .on("value", users => {
            usersList = users;
        });
}

function loadProjectsFromFB() {
    firebase.database().ref("projects")
        .on("value", projects => {
            projectsList = projects;
            newProjectIndex = "project_" + getNewIndex(projectsList.val());
            showProjectsList();
            if (actualProject) {
                selectProject(actualProjectKey);
            }
        });
}

function loadChatFromFB() {
    if (actualProject) {
        firebase.database().ref("projects/" + actualProject.key + "/chat")
            .on("value", messages => {
                updateChatFromFB(messages.val());
            });
    }
}

function loadNotificationsFromFB() {
    if (actualProject) {
        firebase.database().ref("projects/" + actualProject.key + "/tasks")
            .on("child_added", task => {
                launchNotifications(task);
            });
    }
}

function spawnNotification(theBody, theIcon, theTitle) {
    let options = {
        body: theBody,
        icon: theIcon
    }
    let n = new Notification(theTitle, options);
}

function setFileUploadEvent() {
    document.getElementById('fileLoad').addEventListener('change', function (event) {
        let taskKey = document.getElementById("key").value;
        let fileList = document.getElementById("fileList").value;
        event.preventDefault();
        let file = event.target.files[0];
        loadFileToFB(file, taskKey, fileList);
    });
}

function loadFileToFB(file, taskKey, fileList) {
    let refStorage = firebase.storage().ref(actualProject.key + '/' + taskKey).child(file.name);
    let uploadTask = refStorage.put(file);
    uploadTask.on('state_changed', null,
        function (error) {
            alert('Error loading file: ', error);
        },
        function () {
            alert('File loading successful');
            fileList += file.name + ',';
            updateTaskFileList(actualProject.key, taskKey, fileList);
        }
    );
}

function updateTaskFileList(projectKey, taskKey, fileList) {
    firebase.database().ref(projectKey + "/tasks/" + taskKey + "/fileList/").set(fileList);
}

// #endregion

// #region Menu

function toggleUserOptions() {
    optionsSideBarStatus = (document.getElementById('optionsSideBar').style.display == 'none') ? 'block' : 'none';
    document.getElementById('optionsSideBar').style.display = optionsSideBarStatus;
    if (actualProject) {
        document.getElementById('projectOptionsSideBar').style.display = optionsSideBarStatus;
    }
}

// #endregion

// #region Login

function pswKeyPressed() {
    if (event.keyCode == 13) {
        btnLogin();
    }
}

function btnLogin() {
    let userMail = document.getElementById('userMail').value;
    let userPassword = document.getElementById('userPassword').value;
    login(userMail, userPassword);
}

function login(userMail, userPassword) {
    authUser = null;
    usersList.forEach(user => {
        let actualUser = user.val();
        if (actualUser.mail == userMail && actualUser.password == userPassword) {
            authUser = actualUser;
            authUser.key = user.key;
        }
    });
    if (authUser) {
        let avatar = (authUser.picture && authUser.picture != '') ? "<img id='userAvatar' src='" + authUser.picture + "' class='avatar'>" : "<i class='fa fa-user-circle-o fa-2x' style='color:white'></i>";
        document.getElementById('userOptions').innerHTML = "<span id='userName'>" + authUser.name.split(' ')[0] + " </span>" + avatar;
        showProjectSelector();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function register() {
    let setUserName = document.getElementById("setUserName").value;
    let setUserMail = document.getElementById("setUserMail").value;
    let setUserPassword = document.getElementById("setUserPassword").value;
    let confirmUserPassword = document.getElementById("confirmUserPassword").value;
    let setUserRole = document.getElementById("setUserRole").value;
    if (setUserPassword == confirmUserPassword && setUserMail.includes("@") && setUserMail.includes(".")) {
        let newUser = {
            name: setUserName,
            mail: setUserMail,
            password: setUserPassword,
            position: setUserRole,
            active: true
        };
        createNewUserInFB(newUser);
    } else {
        document.getElementById('registerError').style.display = 'block';
    }
}

function createNewUserInFB(newUser) {
    let userKey = newUser.mail.replace(/\./g, '-');
    firebase.database().ref("users/" + userKey).set(newUser);
    login(newUser.mail, newUser.password);
}

function showInvitationWindow() {
    closeAllWindows();
    document.getElementById('invitation').style.display = 'block';
}

function sendUserInvitation() {
    let invitedUserMail = document.getElementById('invitedUserMail').value.replace(/\./g, '-');
    if (actualProject) {
        if (!actualProject.team.includes(invitedUserMail)) {
            actualProject.team += "," + invitedUserMail;
            createNewProjectInFB(actualProject.key, actualProject);
        }
        alert(document.getElementById('invitedUserMail').value + " is already in project team");
        selectView();
    } else {
        document.getElementById('invitationError').style.display = 'block';
    }
}

// #endregion

// #region Projects

function selectView() {
    closeAllWindows();
    switch (viewIndex) {
        case 1:
            showSelectedProject();
            break;
        case 2:
            showProjectTaskList();
            break;
        default:
            showProjectSelector();
    }
}

function closeAllWindows() {
    document.getElementById('login').style.display = 'none';
    document.getElementById('register').style.display = 'none';
    document.getElementById('projectSelector').style.display = 'none';
    document.getElementById('projectData').style.display = 'none';
    document.getElementById('projectBoard').style.display = 'none';
    document.getElementById('projectTaskList').style.display = 'none';
    document.getElementById('taskWindow').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('optionsButtons').style.display = 'none';
    document.getElementById('newProjectWindow').style.display = 'none';
    document.getElementById('invitation').style.display = 'none';
    document.getElementById('invitationError').style.display = 'none';
    document.getElementById('optionsSideBar').style.display = 'none';
}

function initializeUI() {
    closeAllWindows();
    document.getElementById('login').style.display = 'block';
}

function showProjectSelector() {
    closeAllWindows();
    showProjectsList();
    document.getElementById('projectSelector').style.display = 'block';
}

function showProjectsList() {
    //showProjectSelector();
    let projectTiles = `
        <div id="project_0" class="projectBox">
            <div class="projectBoxName" onclick="showNewProjectWindow()"><span
                    style="font-size: 7em; margin-top: -30px;">+</span></div>
        </div>
    `;
    projectsList.forEach(project => {
        let actProject = project.val();
        actProject.key = project.key;
        if (authUser && (actProject.leader == authUser.key || actProject.team.includes(authUser.key))) {
            projectTiles += createProjectTile(actProject);
        }
    });
    document.getElementById('projectList').innerHTML = projectTiles;
}

function createProjectTile(project) {
    let html = `
        <div class="projectBox" onclick="selectProject('${project.key}')">
            <div class="projectBoxName">${project.name}</div>
        `;
    if (project.leader == authUser.key) {
        html += `
            <div>
                <i class="fa fa-trash-o deleteProjectIcon" aria-hidden="true" onclick="deleteProject('${project.key}', '${project.name}')" title="Delete project"></i>
            </div>
        `;
    }
    html += `
        </div>
    `;
    return html;
}

function deleteProject(projectKey, projectName) {
    if (actualProject.team.includes(authUser.key)) {
        let confirmDelete = confirm(`The project "${projectName}" will be deleted`);
        if (confirmDelete == true) {
            firebase.database().ref("projects/" + projectKey).remove();
        }
        alert("Project was removed successfully");
    } else {
        alert("You don't have permission for this operation");
    }
}

function selectProject(projectKey) {
    projectsList.forEach(project => {
        let actProject = project.val();
        actProject.key = project.key;
        if (actProject.key == projectKey) {
            actualProjectKey = projectKey;
            actualProject = actProject;
            tasksList = actProject.tasks;
            newTaskIndex = "task_" + getNewIndex(tasksList);
        }
    });
    setProjectData();
    setProjectBoard();
    setProjectTaskList();
    drawChartTasks(tasksList);
    drawChartUsers(tasksList, usersList);
    //showSelectedProject();
    selectView();
    //loadNotificationsFromFB();
}

function getNewIndex(list) {
    let result = 0;
    for (let key in list) {
        let id = parseInt(key.split('_')[1]);
        if (id > result) {
            result = id;
        }
    }
    result++;
    return (result < 10) ? "0" + result : result;
}

function setProjectData() {
    document.getElementById('projectName').innerHTML = actualProject.name;
    document.getElementById('projectLeader').innerHTML = actualProject.leader;
    document.getElementById('projectStart').innerHTML = actualProject.startDate;
    document.getElementById('projectEnd').innerHTML = actualProject.endDate;
    document.getElementById('projectStatus').innerHTML = actualProject.status;
    document.getElementById('projectType').innerHTML = actualProject.type;
    showProjectUsers();
}

function setProjectBoard() {
    for (let column = 0; column < 5; column++) {
        let html = '';
        for (let task in tasksList) {
            let actTask = tasksList[task];
            if (actTask.status == column || (column == 0 && actTask.status == "")) {
                let taskStatusClass = (actTask.status == 4) ? "taskCanceled" : (actTask.status == 2) ? "taskOverdue" : (actTask.status == 3) ? "taskDone" : (actTask.status == 1) ? "taskOnSchedule" : "";
                let taskComment = (actTask.comments != "") ? '<i class="fa fa-comment-o" aria-hidden="true" title="Task has comments"></i>&nbsp;&nbsp;' : '';
                let taskImportant = (actTask.important == "true") ? '<i class="fa fa-flag" aria-hidden="true" title="Important"></i>&nbsp;&nbsp;' : '';
                let taskFavorite = (actTask.favorite == "true") ? '<i class="fa fa-star" aria-hidden="true" title="Favorite"></i>&nbsp;&nbsp;' : '';
                html += '<div id="board-' + task + '" class="taskTile ' + taskStatusClass + '" onclick="editTask(\'' + task + '\')" draggable="true" ondragstart="drag(event)">';
                html += '   <div class="taskTitle"><b>' + task.split('_')[1] + '.-</b> ' + actTask.task + '</div>';
                html += '   <div class="taskBar" draggable="false">';
                html += '       <div class="taskDates" draggable="false" style="margin-top: 7px;">' + taskComment + taskImportant + taskFavorite + ' <i class="fa fa-calendar" aria-hidden="true"></i> ' + actTask.startDate + ' &nbsp;&nbsp;&nbsp;<b>' + getTaskCheckLitStatus(actTask.checkList) + '</b></div>';
                html += '       <div class="taskResponsibles" draggable="false">' + getTaskResponsibleAvatars(actTask.responsible) + '</div>';
                html += '   </div>';
                html += '</div>';
            }
        }
        document.getElementById('columnTitle_' + column).innerHTML = actualProject.columns[column];
        document.getElementById('columnContent_' + column).innerHTML = html;
    }
}

function setProjectTaskList() {
    let html = '';
    for (let task in tasksList) {
        let actTask = tasksList[task];
        let taskStatusClass = (actTask.status == "4") ? "taskCanceled" : (actTask.status == "2") ? "taskOverdue" : (actTask.status == "3") ? "taskDone" : (actTask.status == "1") ? "taskOnSchedule" : "";
        let taskComment = (actTask.comments != "") ? '<i class="fa fa-comment-o" aria-hidden="true" title="Task has comments"></i>&nbsp;&nbsp;' : '';
        let taskStatus = '<i class="fa ' + ((actTask.status == "1") ? 'fa-pencil-square-o' : (actTask.status == "2") ? 'fa-square-o' : (actTask.status == "3") ? 'fa-check-square-o' : (actTask.status == "4") ? 'fa-window-close-o' : 'fa-clone') + '" aria-hidden="true" title="' + ((actTask.status != '') ? actualProject.columns[actTask.status] : 'To-do') + '"></i>';
        let taskImportant = (actTask.important == "true") ? '<i class="fa fa-flag" aria-hidden="true" title="Important"></i>&nbsp;&nbsp;' : '';
        let taskFavorite = (actTask.favorite == "true") ? '<i class="fa fa-star" aria-hidden="true" title="Favorite"></i>&nbsp;&nbsp;' : '';
        html += '<div id="taskList-' + task + '" class="taskTile ' + taskStatusClass + '" onclick="editTask(\'' + task + '\')">';
        html += '   <div class="taskTitle">' + task.split('_')[1] + '.- ' + actTask.task + '</div>';
        html += '   <div class="taskChechList">';
        html += getCheckListHTML(task, actTask.checkList);
        html += '   </div>';
        html += '   <div class="taskBar">';
        html += '       <div class="taskDates" style="margin-top: 7px;">' + taskStatus + '&nbsp;&nbsp;&nbsp;<b>' + taskComment + taskImportant + taskFavorite + ' <i class="fa fa-calendar" aria-hidden="true"></i> ' + actTask.startDate + '&nbsp;&nbsp;&nbsp;</b>' + getTaskCheckLitStatus(actTask.checkList) + '</b></div>';
        html += '       <div class="taskResponsibles">' + getTaskResponsibleAvatars(actTask.responsible) + '</div>';
        html += '   </div>';
        html += '</div>';
    }
    document.getElementById('tasksList').innerHTML = html;
}

function filterTask(filter) {
    for (let task in tasksList) {
        let actTask = tasksList[task];
        let display = (filter == "All") ? 'block' : (actTask.status == filter) ? 'block' : (actTask.status == "" && filter == "0") ? 'block' : (actTask.important == "true" && filter == "Important") ? 'block' : (actTask.favorite == "true" && filter == "Favorite") ? 'block' : 'none';
        document.getElementById('taskList-' + task).style.display = display;
    }
}

function getTaskCheckLitStatus(checkList) {
    let sum = 0;
    let result = "";
    if (checkList) {
        for (let i in checkList) {
            if (checkList[i].status) {
                sum++;
            }
        }
        result = '<i class="fa fa-check-square-o" aria-hidden="true" style="font-weight: 900;"></i> ' + sum + '/' + checkList.length + '';
    }
    return result;
}

function getTaskResponsibleAvatars(taskReponsibles) {
    let avatars = [];
    let responsibles = taskReponsibles.trim().split(',');
    responsibles.forEach(responsible => {
        usersList.forEach(user => {
            if (responsible == user.key) {
                avatars.push("<img src='" + user.val().picture + "' class='avatar' style='width: 20px;'>");
            }
        });
    });
    return avatars;
}

function showSelectedProject() {
    closeAllWindows();
    viewIndex = 1;
    document.getElementById('projectBoard').style.display = 'grid';
    document.getElementById('optionsButtons').style.display = 'block';
}

function showProjectTaskList() {
    closeAllWindows();
    viewIndex = 2;
    document.getElementById('projectTaskList').style.display = 'block';
    document.getElementById('optionsButtons').style.display = 'block';
}

function showNewProjectWindow() {
    closeAllWindows();
    document.getElementById('newProjectWindow').style.display = 'block';
    document.getElementById('newProjectLeader').value = authUser.key;
    document.getElementById('newProjectLeaderName').innerHTML = authUser.name;
    document.getElementById('newProjectStart').value = getActualDate();
}

function createNewProject() {
    let project = {
        name: document.getElementById('newProjectName').value,
        leader: document.getElementById('newProjectLeader').value,
        startDate: document.getElementById('newProjectStart').value,
        endDate: document.getElementById('newProjectEnd').value,
        status: document.getElementById('newProjectStatus').value,
        type: document.getElementById('newProjectType').value,
        team: document.getElementById('newProjectLeader').value
    }
    let projectKey = newProjectIndex;
    createNewProjectInFB(projectKey, project);
    addProjectMetadata(projectKey);
    showProjectSelector();
}

function createNewProjectInFB(projectKey, project) {
    firebase.database().ref("projects/" + projectKey).set(project);
}

function addProjectMetadata(projectKey) {
    let projectType = document.getElementById('newProjectType').value;
    let projectColumns = getTaskByProjectType(projectType)[0];
    let projectTasks = getTaskByProjectType(projectType)[1];
    firebase.database().ref("projects/" + projectKey + "/columns/").set(projectColumns);
    firebase.database().ref("projects/" + projectKey + "/tasks/").set(projectTasks);
}

function getTaskByProjectType(projectType) {
    let tasks;
    switch (projectType) {
        case "General project":
        case "Daily work":
            tasks = getGeneralTasks();
            break;
        case "Business plan":
            tasks = getBusinessTasks();
            break;
        case "Research plan":
            tasks = getResearchTasks();
            break;
        case "Thesis organization":
            tasks = getThesisTasks();
            break;
        case "Software management":
            tasks = getSoftwareTasks();
            break;
        case "Meeting organization":
            tasks = getMeetingTasks();
            break;
        case "Party organization":
            tasks = getPartyTasks();
            break;
    }
    return tasks;
}

function getGeneralTasks() {
    let columns = ["To-do/Tareas", "Doing/Haciendo", "Overdue/Atrasadas", "Done/Completadas", "Canceled/Canceladas"];
    let tasks = {
        task_01: {
            task: "Task 1",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        },
        task_02: {
            task: "Task 2",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        }
    };
    return [columns, tasks];
}

function getBusinessTasks() {
    let columns = ["To-do/Tareas", "Doing/Haciendo", "Overdue/Atrasadas", "Done/Completadas", "Canceled/Canceladas"];
    let tasks = {
        task_01: {
            task: "Project and Objectives / Proyecto y objetivos",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "The business / El negocio",
                "status": false
            }, {
                "item": "Why this business? / Por qué este negocio?",
                "status": false
            }, {
                "item": "The promoters / Los promotores",
                "status": false
            }, {
                "item": "Mission / Misión",
                "status": false
            }, {
                "item": "Vision / Visión",
                "status": false
            }, {
                "item": "Objectives / Objetivos",
                "status": false
            }, {
                "item": "Key points for success / Puntos claves para el éxito",
                "status": false
            }, {
                "item": "Risks / Riesgos",
                "status": false
            }]
        },
        task_02: {
            task: "Situation and perspectives of the sector / Situación y perspectivas del sector",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Situation of the market and the sector / Situación del mercado y del sector",
                "status": false
            }, {
                "item": "Three great opportunities / Tres grandes oportunidades",
                "status": false
            }]
        },
        task_03: {
            task: "Market and competition / Mercado y competencia",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "The potential market / El merado potencial",
                "status": false
            }, {
                "item": "Competition: overview / Copetencia: visión general",
                "status": false
            }, {
                "item": "The real competition / La competencia real",
                "status": false
            }, {
                "item": "Análisis de la competencia / Análisis de la competencia",
                "status": false
            }, {
                "item": "Main competitors / Princiales competidores",
                "status": false
            }]
        },
        task_04: {
            task: "Services and products / Servicios y productos",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Our service offer / Nuestra oferta de servicios",
                "status": false
            }, {
                "item": "Own and outsourced services / Servicios propios y subcontratados",
                "status": false
            }, {
                "item": "Collaborators and alliances / Colaboradores y alianzas",
                "status": false
            }]
        },
        task_05: {
            task: "Marjeting / Mercadotecnia",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "D.A.F.O. Analysis / Análisis D.A.F.O.",
                "status": false
            }, {
                "item": "Competitiveness analysis / Análisis de competitividad",
                "status": false
            }, {
                "item": "Keys to the future / Claves de futuro",
                "status": false
            }, {
                "item": "Target audiences / Público objetivo",
                "status": false
            }, {
                "item": "Sources / Fuentes",
                "status": false
            }, {
                "item": "Service and product policy / Poítica de servicio y producto",
                "status": false
            }, {
                "item": "Pricing, budgets and competitions policy / Política de precios, presupuestos y concursos",
                "status": false
            }, {
                "item": "Service and customer service policy / Política de servicio y atención al cliente",
                "status": false
            }, {
                "item": "Communication strategy / Estrategia de comunicación",
                "status": false
            }, {
                "item": "Market penetration strategy / Estrategia de penetración en el mercado",
                "status": false
            }, {
                "item": "Advertising and Promotion (media) / Publicidad y Promoción (medios)",
                "status": false
            }, {
                "item": "Marketing Plan - Summary / Plan de Marketing - Resumen",
                "status": false
            }]
        },
        task_06: {
            task: "Ventas",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Sales strategy / Estrategia de ventas",
                "status": false
            }, {
                "item": "The sales team / El equipo de ventas",
                "status": false
            }, {
                "item": "First year sales plan (summary) / Plan de ventas de primer año (resumen)",
                "status": false
            }, {
                "item": "Estimation of sale / Estimación de venta",
                "status": false
            }]
        },
        task_07: {
            task: "Business organization / Organizaión de la empresa",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Dirección de la empresa",
                "status": false
            }, {
                "item": "Dirección de la empresa / Equipo directivo y asesores",
                "status": false
            }, {
                "item": "Key people of the project / Personas clave del proyecto",
                "status": false
            }, {
                "item": "Functional organization of the company / Organización funcional de la empresa",
                "status": false
            }, {
                "item": "Working and remunerative conditions / Condiciones de trabajo y remunerativas",
                "status": false
            }, {
                "item": "Human Resources Forecast / Previsión de Recursos Humanos",
                "status": false
            }]
        },
        task_08: {
            task: "Legal and corporate aspects / Aspectos legales y societarios",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Society / La sociedad",
                "status": false
            }, {
                "item": "Managers / Administradores",
                "status": false
            }, {
                "item": "Social and operational headquarters / Sede social y operativa",
                "status": false
            }, {
                "item": "Brand / Marca",
                "status": false
            }, {
                "item": "Licenses and rights / Licencias y derechos",
                "status": false
            }, {
                "item": "Legal obligations /Obligaciones legales",
                "status": false
            }, {
                "item": "Permits and limitations / Permisos y limitaciones",
                "status": false
            }]
        },
        task_09: {
            task: "Establishment and investments / Establecimiento e inversiones",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Establishment plan / Plan de establecimiento",
                "status": false
            }, {
                "item": "Investment plan / Plan de inversiones",
                "status": false
            }]
        },
        task_10: {
            task: "Forecast of results / Previsión de resultados",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Important premises / Premisas importantes",
                "status": false
            }, {
                "item": "Breakeven analysis / Análisis del punto de equilibrio",
                "status": false
            }, {
                "item": "Five-year results / Resultados a cinco años",
                "status": false
            }, {
                "item": "Treasury / Tesorería",
                "status": false
            }, {
                "item": "Most relevant ratios / Ratios más relevantes",
                "status": false
            }]
        },
        task_11: {
            task: "Financing plan / Plan de financiación",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Financial needs / Necesidades financieras",
                "status": false
            }, {
                "item": "Financing plan / Plan de financiación",
                "status": false
            }]
        }
    };
    return [columns, tasks];
}

function getResearchTasks() {
    let columns = ["To-do/Tareas", "Doing/Haciendo", "Overdue/Atrasadas", "Done/Completadas", "Canceled/Canceladas"];
    let tasks = {
        task_01: {
            task: "Research problem definition / Definición del problema de Investigación",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Selection of a broad topic concerning to some topic or a research question / Selección de un tópico amplio relacionado con un tema o una pregunta de investigación",
                "status": false
            }, {
                "item": "Bibliografical review / Revisión bibliográfica",
                "status": false
            }]
        },
        task_02: {
            task: "Hypothesis formulation / Formulación de la hipótesis",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Hypothesis / Hipótesis",
                "status": false
            }, {
                "item": "Variables definition and operationalization / Definición de variables y operacionalización",
                "status": false
            }, {
                "item": "Objectives definition / Definición de los objetivos",
                "status": false
            }]
        },
        task_03: {
            task: "Choose the research method / Selección del método de investigación",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        },
        task_04: {
            task: "Experimental design / Diseño experimental",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Variables definition and sample space / Definición de las variables y del espacio muestral",
                "status": false
            }, {
                "item": "Factors definition and their levels / Definición de los factores y sus niveles",
                "status": false
            }, {
                "item": "Identifying the type of experiment / Identificar el tipo de experimento",
                "status": false
            }]
        },
        task_05: {
            task: "Data analysis / Análisis de los datos",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Perform enough replications to create a representative body of data / Realizar múltiples réplicas para lograr representatividad",
                "status": false
            }, {
                "item": "Record observations and analyze what the data means / Registrar las observaciones y analizar lo que significan los datos",
                "status": false
            }, {
                "item": "Prepare tables and/or graphs of the data / Preparar tablas y/o gráficas de los datos",
                "status": false
            }, {
                "item": "Understand the likely distribution of your data / Analizar la distribución de los datos",
                "status": false
            }, {
                "item": "Employ the exploratory and inferential analysis used in your field of science / Emplee el análisis exploratorio e inferencial utilizado en su campo de la ciencia",
                "status": false
            }]
        },
        task_06: {
            task: "Results analysis and draw conclusions / Análisis de los resultados y llegar a conclusiones",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Experimental results analysis and evaluation / Análisis y evaluación de resultados experimentales.",
                "status": false
            }, {
                "item": "Compare the results both to the original hypothesis and the conclusions of previous experiments by other researchers / Compare los resultados tanto con la hipótesis original como con las conclusiones de experimentos anteriores realizados por otros investigadores",
                "status": false
            }, {
                "item": "Explain what the results mean and how to view them in the context of the scientific field or real-world environment / Explicar qué significan los resultados y cómo verlos en el contexto del campo científico o del entorno del mundo real",
                "status": false
            }, {
                "item": "Make suggestions for future research / Hacer sugerencias para investigaciones futuras",
                "status": false
            }]
        },
        task_07: {
            task: "Write the results / Escribir los resultados",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        }
    };
    return [columns, tasks];
}

function getThesisTasks() {
    let columns = ["To-do/Tareas", "Doing/Haciendo", "Overdue/Atrasadas", "Done/Completadas", "Review/Revisión"];
    let tasks = {
        task_01: {
            task: "Title / Título",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "This is one of the most important points in a thesis or scientific-technical report. It must contain the problem to be solved or objective, as well as the solution and, until the object of action is specified, if possible. However, it should NOT be that long. It is suggested that it does not exceed 12 words. / Este es uno de los puntos más importantes en una tesis o informe científico-técnico. Debe contener el problema a resolver u objetivo, así como la solución y, hasta especificar el objeto de acción si fuere posible. Sin embargo NO debe ser tan largo. Se sugiere que no pase de 12 palabras.",
            responsible: "",
            repeat: "",
            status: ""
        },
        task_02: {
            task: "Abstract / Resumen",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "It must contain between 200 and 500 characters and includes the following topics: • Problematic, is the problem to solve, be it theoretical or practical, that is, the object of investigation (1 or 2 sentences). • Scientific problem, is the real problem that you are going to affect with your solution, that is, the field of action (1 sentence). • Objective, it answers three fundamental questions: what? how? for what? (how? may be optional) (1 sentence). • Proposed solution (the necessary prayers). • Main results (the necessary prayers). • Scope, that is, for what else could the proposed solution be used (1 sentence). / Debe contener entre 200 y 500 caracteres e incluye los siguientes tópicos: • Problemática, que no es más que el problema a resolver ya sea teórico o práctico, o sea el objeto de investigación (1 ó 2 oraciones). • Problema científico, que es el problema real en el que vas a incidir con tu solución, o sea el campo de acción (1 oración). • Objetivo, no deben olvidar que éste responde a tres preguntas fundamentales: qué? cómo? para qué? (el cómo? pudiera no estar) (1 oración). • Solución propuesta (las oraciones necesarias). • Resultados principales (las oraciones necesarias). • Alcance, o sea, para qué más podría ser empleada la solución propuesta (1 oración).",
            responsible: "",
            repeat: "",
            status: ""
        },
        task_03: {
            task: "Introduction / Introducción",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Problematic (customer problem) / Problemática (problema del cliente)",
                "status": false
            }, {
                "item": "Scientific problem / Problema científico",
                "status": false
            }, {
                "item": "Objective / Objetivo",
                "status": false
            }, {
                "item": "Scope / Alcance",
                "status": false
            }, {
                "item": "Organization of the article / Organización del artículo",
                "status": false
            }]
        },
        task_04: {
            task: "Materials and methods / Materiales y métodos",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "General requirements / Requerimientos generales",
                "status": false
            }]
        },
        task_05: {
            task: "Experimental design / Diseño experimental",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Variables definition and sample space / Definición de las variables y del espacio muestral",
                "status": false
            }, {
                "item": "Factors definition and their levels / Definición de los factores y sus niveles",
                "status": false
            }, {
                "item": "Identifying the type of experiment / Identificar el tipo de experimento",
                "status": false
            }]
        },
        task_06: {
            task: "Data analysis / Análisis de los datos",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Perform enough replications to create a representative body of data / Realizar múltiples réplicas para lograr representatividad",
                "status": false
            }, {
                "item": "Record observations and analyze what the data means / Registrar las observaciones y analizar lo que significan los datos",
                "status": false
            }, {
                "item": "Prepare tables and/or graphs of the data / Preparar tablas y/o gráficas de los datos",
                "status": false
            }, {
                "item": "Understand the likely distribution of your data / Analizar la distribución de los datos",
                "status": false
            }, {
                "item": "Employ the exploratory and inferential analysis used in your field of science / Emplee el análisis exploratorio e inferencial utilizado en su campo de la ciencia",
                "status": false
            }]
        },
        task_07: {
            task: "Results analysis and draw conclusions / Análisis de los resultados y llegar a conclusiones",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Experimental results analysis and evaluation / Análisis y evaluación de resultados experimentales.",
                "status": false
            }, {
                "item": "Compare the results both to the original hypothesis and the conclusions of previous experiments by other researchers / Compare los resultados tanto con la hipótesis original como con las conclusiones de experimentos anteriores realizados por otros investigadores",
                "status": false
            }, {
                "item": "Explain what the results mean and how to view them in the context of the scientific field or real-world environment / Explicar qué significan los resultados y cómo verlos en el contexto del campo científico o del entorno del mundo real",
                "status": false
            }, {
                "item": "Make suggestions for future research / Hacer sugerencias para investigaciones futuras",
                "status": false
            }]
        },
        task_08: {
            task: "Conclusions / Conclusiones",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        },
        task_09: {
            task: "Bibliographic references / Referencias bibliográficas",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        }
    };
    return [columns, tasks];
}

function getSoftwareTasks() {
    let columns = ["Backlog/Requerimientos", "Doing/Haciendo", "Overdue/Pendientes", "Review/Revisión", "Delivery/Entrega"];
    let tasks = {
        task_01: {
            task: "Task 1",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        },
        task_02: {
            task: "Task 2",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        }
    };
    return [columns, tasks];
}

function getMeetingTasks() {
    let columns = ["To-do/Tareas", "Doing/Haciendo", "Overdue/Atrasadas", "Done/Completadas", "Canceled/Canceladas"];
    let tasks = {
        task_01: {
            task: "Meeteing preparation / Preparación de la reunión",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Objective definition / Definir los objetivos",
                "status": false
            }, {
                "item": "Meeteing agenda / Agenda de la reunión",
                "status": false
            }, {
                "item": "Define place, date and time / Definir lugar, fecha y hora",
                "status": false
            }, {
                "item": "Send call / Enviar convocatoria",
                "status": false
            }]
        },
        task_02: {
            task: "Meeteing organization / Organización de la reunión",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Define time controller / Definir controlador de tiempo",
                "status": false
            }, {
                "item": "Define who writes the memory of the meeting / Definir quién escribe la memoria de la reunión",
                "status": false
            }]
        },
        task_03: {
            task: "Informations / Informaciones",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Analyze agreements of the previous meeting / Analizar acuerdos de la reunión anterior",
                "status": false
            }, {
                "item": "Discussion / Discusión",
                "status": false
            }, {
                "item": "Making agreements / Toma de acuerdos",
                "status": false
            }]
        }
    };
    return [columns, tasks];
}

function getPartyTasks() {
    let columns = ["To-do/Tareas", "Doing/Haciendo", "Overdue/Atrasadas", "Done/Completadas", "Canceled/Canceladas"];
    let tasks = {
        task_01: {
            task: "Invitations / Invitaciones",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Guest List / Lista de invitados",
                "status": false
            }, {
                "item": "Print invitations / Imprimir invitaciones",
                "status": false
            }, {
                "item": "Deliver invitations / Entregar invitaciones",
                "status": false
            }]
        },
        task_02: {
            task: "Food and drink / Comidas y bebidas",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        },
        task_03: {
            task: "Music and entertainment / Música y entretenimiento",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: ""
        },
        task_04: {
            task: "Budget / Presupuesto",
            area: "",
            startDate: "",
            endDate: "",
            percentage: "0",
            comments: "",
            responsible: "",
            repeat: "",
            status: "",
            checkList: [{
                "item": "Rental / Alquiler ",
                "status": false
            }, {
                "item": "Decoration / Decoración",
                "status": false
            }, {
                "item": "Food and drink / Comidas y bebidas",
                "status": false
            }, {
                "item": "Others / Otros",
                "status": false
            }]
        }
    };
    return [columns, tasks];
}

// #endregion

// #region Project Data

function showProjectUsers() {
    let element = document.getElementById('projectUsers');
    let usersPicture = "";
    usersList.forEach(user => {
        let actUser = user.val();
        if (actualProject.team.includes(user.key)) {
            let picture = (actUser.picture) ? "<img src='" + actUser.picture + "' class='avatar'></img>" : "<i class='fa fa-user-circle-o avatar' aria-hidden='true' style='font-size: 1.9em;'></i>";
            usersPicture += "<div class='userPicture'>" + picture + "</div><div class='userInfo'><span class='userName'> " + actUser.name + "</span><br><span class='userPosition'> " + actUser.position + "</span></div>";
        }
    });
    element.innerHTML = usersPicture;
}

function getUsersAvatars(responsible) {
    let avatars = [];
    usersList.forEach(user => {
        if (responsible.includes(user.key)) {
            avatars.push("<img src='" + user.val().picture + "' class='avatar'>");
        }
    });
    return avatars;
}

function openProjectInfo() {
    closeAllWindows();
    document.getElementById('projectData').style.display = 'grid';
    document.getElementById('optionsButtons').style.display = 'block';
}

// #endregion

// #region Task

function getTask(id) {
    let result = null;
    for (let i = 0; i < tasksList.length; i++) {
        if (tasksList[i].id == id) {
            result = tasksList[i];
        }
    };
    return result;
}

function addNewTask() {
    let task = {
        task: "",
        responsible: "",
        startDate: getActualDate(),
        endDate: "",
        percentage: "",
        comments: "",
        area: "",
        status: "",
        //repeat: "",
        important: 'false',
        favorite: 'false'
    }
    showFrom(task, newTaskIndex, false);
}

function getActualDate() {
    let date = new Date();
    let year = date.getFullYear();
    let month = (date.getMonth() < 10) ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
    let day = (date.getDate() < 10) ? "0" + date.getDate() : date.getDate();
    return year + "-" + month + "-" + day;
}

function editTask(taskKey) {
    for (let task in tasksList) {
        if (task == taskKey) {
            showFrom(tasksList[task], taskKey, true);
        }
    }
}

function showFrom(task, taskKey, showDeleteButton) {
    closeAllWindows();
    document.getElementById('optionsButtons').style.display = 'block';
    document.getElementById("taskWindow").style.display = "block";
    document.getElementById("deleteTaskButton").style.display = (showDeleteButton) ? "inline" : "none";
    document.getElementById("key").value = taskKey;
    document.getElementById("task").innerHTML = task.task;
    document.getElementById("responsible").value = task.responsible;
    document.getElementById("responsibleAvatar").innerHTML = getTaskResponsibleAvatars(task.responsible);
    document.getElementById("startDate").value = task.startDate;
    document.getElementById("endDate").value = task.endDate;
    document.getElementById("percentage").innerHTML = task.percentage;
    document.getElementById("comments").innerHTML = task.comments;
    document.getElementById("area").value = task.area;
    document.getElementById("status").value = task.status;
    //document.getElementById("repeat").value = task.repeat;
    document.getElementById("checkList").innerHTML = getCheckListHTML(taskKey, task.checkList);
    document.getElementById("fileList").value = task.fileList;
    document.getElementById("fileListUI").value = sowFileList(task.fileList);
    document.getElementById("important").value = task.important;
    document.getElementById("favorite").favorite = task.favorite;
    let taskImportant = (task.important == 'true') ? 'fa fa-flag' : 'fa fa-flag-o';
    document.getElementById('taskImportant').setAttribute('class', taskImportant);
    let taskFavorite = (task.favorite == 'true') ? 'fa fa-star' : 'fa fa-star-o';
    document.getElementById('taskFavorite').setAttribute('class', taskFavorite);
}

function showResponsibleWindow() {
    document.getElementById("team").style.display = "block";
    let responsibles = document.getElementById("responsible").value;
    let teamHTML = "";
    usersList.forEach(user => {
        if (actualProject.team.includes(user.key)) {
            let status = (responsibles.includes(user.key)) ? "checked" : "";
            teamHTML += "<div>";
            teamHTML += "   <input type='checkbox' value='" + user.key + "' " + status + " class='checkListChecked' style='width: 20px; transform: scale(1.2);'>";
            teamHTML += "   <img src='" + user.val().picture + "' class='avatar' style='width: 20px;'> " + user.val().name + "</div>";
            teamHTML += "</div>";
        }
    });
    document.getElementById('teamList').innerHTML = teamHTML;
}

function addNewResponsible() {
    let team = "";
    teamObjects = document.getElementById("teamList").getElementsByTagName("input");
    for (let i in teamObjects) {
        if (teamObjects[i].checked) {
            team += teamObjects[i].value + ",";
        }
    }
    team = team.substr(0, team.length - 1);
    document.getElementById("responsible").value = team;
    document.getElementById("responsibleAvatar").innerHTML = getTaskResponsibleAvatars(team);
    document.getElementById("team").style.display = "none";
}

function markTaskAsImportant() {
    if (document.getElementById('important').value == 'true') {
        document.getElementById('important').value = 'false';
        document.getElementById('taskImportant').setAttribute('class', 'fa fa-flag-o');
    } else {
        document.getElementById('important').value = 'true';
        document.getElementById('taskImportant').setAttribute('class', 'fa fa-flag');
    }
}

function markTaskAsFavorite() {
    if (document.getElementById('favorite').value == 'true') {
        document.getElementById('favorite').value = 'false';
        document.getElementById('taskFavorite').setAttribute('class', 'fa fa-star-o');
    } else {
        document.getElementById('favorite').value = 'true';
        document.getElementById('taskFavorite').setAttribute('class', 'fa fa-star');
    }
}

function getCheckListHTML(taskKey, checkList) {
    let result = "";
    for (let index in checkList) {
        let status = (checkList[index].status) ? "checked" : "";
        result += `
            <table class="checkItemTable">
                <tr class="checkItem">
                    <td valign="top" width="5%">
                        <input type="checkbox" class="checkboxControl" onclick="calculatePercentage()" ${status}>
                    </td>
                    <td valign="top" width="85%" align="justify">
                        <span class="checkListItem" type="text" contenteditable="true">${checkList[index].item}</span>
                    </td>
                    <td valign="top" width="10%" align="right">
                        <!--<i class="fa fa-id-card-o checkItemOptions" aria-hidden="true" onclick="convetCheckItemToTask('${taskKey}','${index}')" title="Convert to task..."></i>-->
                        <b><span onclick="deleteCheckItem('${taskKey}','${index}')" class="checkItemOptions" title="Delete...">&nbsp;&times;&nbsp;</span></b>
                    </td>
                </tr>
            </table>
        `;
    }
    return result;
}

function sowFileList(fileList) {
    let result = "";
    let fileArray = fileList.split(",");
    fileArray.forEach (file => {
        if (file) {
            result += `
                <div style="float: left; text-align: center;" title="View ${file}">
                    <span><i class="fa fa-file"></i><br>${file}</span>
                </div>
            `;
        }
    });
}

function convetCheckItemToTask(taskKey, checkListKey) {
    calculatePercentage();
    //firebase.database().ref("projects/" + actualProject.key + "/tasks/" + taskKey + "/checkList/" + checkListKey).remove();
}

function deleteCheckItem(taskKey, checkListKey) {
    calculatePercentage();
    // Mecanismo para mantener abierta la ventana activa durante la actualización
    firebase.database().ref("projects/" + actualProject.key + "/tasks/" + taskKey + "/checkList/" + checkListKey).remove();
}

function calculatePercentage() {
    let sum = 0;
    let result = 0;
    let checkList = getTaskCheckList();
    let endDate = new Date(document.getElementById("endDate").value);
    if (checkList) {
        for (let i in checkList) {
            if (checkList[i].status) {
                sum++;
            }
        }
        result = sum * 100 / checkList.length;
    }
    document.getElementById("percentage").innerHTML = parseInt(result);
    if (parseInt(result) == 100) {
        document.getElementById("status").value = "3";
    } else if (endDate < new Date()) {
        document.getElementById("status").value = "2";
    } else {
        document.getElementById("status").value = "1";
    }
}

function updateTask() {
    selectView();
    let taskKey = document.getElementById("key").value;
    let task = {
        task: document.getElementById("task").innerHTML,
        responsible: document.getElementById("responsible").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        percentage: document.getElementById("percentage").innerHTML,
        comments: document.getElementById("comments").innerHTML,
        area: document.getElementById("area").value,
        status: document.getElementById("status").value,
        //repeat: document.getElementById("repeat").value,
        checkList: getTaskCheckList(),
        important: document.getElementById("important").value,
        favorite: document.getElementById("favorite").value,
        fileList: document.getElementById("fileList").value
    }
    updateTaskInFB(task, taskKey);
}

function getTaskCheckList() {
    let checkList = [];
    let checkListCheckeds = document.getElementById('checkList').getElementsByClassName('checkboxControl');
    let checkListItems = document.getElementById('checkList').getElementsByClassName('checkListItem');
    for (let i = 0; i < checkListItems.length; i++) {
        let item = {
            item: checkListItems[i].innerHTML,
            status: checkListCheckeds[i].checked
        };
        checkList.push(item);
    }
    return checkList;
}

function updateTaskInFB(task, taskKey) {
    firebase.database().ref("projects/" + actualProject.key + "/tasks/" + taskKey).set(task);
}

function deleteTask() {
    let taskKey = document.getElementById("key").value;
    let task = document.getElementById("task").value;
    let confirmDelete = confirm("The task \"" + task + "\"will be eliminated");
    if (confirmDelete == true) {
        deleteTaskInFB(taskKey);
    }
}

function deleteTaskInFB(taskKey) {
    firebase.database().ref("projects/" + actualProject.key + "/tasks/" + taskKey).remove();
}

function newCheckListItemPressed() {
    if (event.keyCode == 13) {
        addNewCheckListItem();
        calculatePercentage()
    }
}

function addNewCheckListItem() {
    let taskKey = document.getElementById("key").value;
    let newItem = document.getElementById('newCheckListItem').value;
    let index = document.getElementsByClassName('checkItemTable').length;
    //let itemHTML = '<input type="checkbox" class="checkListChecked" value="' + newItem + '" style="width:20px;"> <span type="text" class="checkListItem inputData" contenteditable="true">' + newItem + '</span><br>';
    let itemHTML = `
        <table class="checkItemTable">
            <tr class="checkItem">
                <td valign="top" width="5%">
                    <input type="checkbox" class="checkboxControl" onclick="calculatePercentage()" value="${newItem}">
                </td>
                <td valign="top" width="85%" align="justify">
                    <span class="checkListItem" type="text" contenteditable="true">${newItem}</span>
                </td>
                <td valign="top" width="10%" align="right">
                    <!--<i class="fa fa-id-card-o checkItemOptions" aria-hidden="true" onclick="convetCheckItemToTask('${taskKey}','${index}')" title="Convert to task..."></i>-->
                    <b><span onclick="deleteCheckItem('${taskKey}','${index}')" class="checkItemOptions" title="Delete...">&nbsp;&times;&nbsp;</span></b>
                </td>
            </tr>
        </table>
    `;

    document.getElementById('checkList').innerHTML += itemHTML;
    document.getElementById('newCheckListItem').value = "";
}

function searchTask() {
    let search = document.getElementById('searchTask').value;
    for (let task in tasksList) {
        let taskText = tasksList[task].task.toUpperCase();
        let display = (taskText.includes(search.toUpperCase()) || search == "") ? 'block' : 'none';
        document.getElementById('taskList-' + task).style.display = display;
    }
}

// #endregion

// #region Drag&Dro

function allowDrop(ev) {
    ev.preventDefault();
    ev.target.style.backgroundColor = "rgba(195, 241, 222, .35)";
}

function leaveDrop(ev) {
    ev.preventDefault();
    ev.target.style.backgroundColor = "";
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function ondrag(obj) {
    obj.className = "taskTile taskDrag";
}

function drop(ev, status) {
    ev.preventDefault();
    let taskId = ev.dataTransfer.getData("text");
    let target = ev.target;
    switch (target.getAttribute("class")) {
        case "taskTitle":
        case "taskBar":
            target = target.parentElement.parentElement;
            break;
        case "taskDates":
        case "taskResponsibles":
            target = target.parentElement.parentElement.parentElement;
            break;
    }
    document.getElementById(taskId).className = "taskTile";
    target.appendChild(document.getElementById(taskId));
    updateTaskStatus(taskId, status)
    target.style.backgroundColor = "";
}

function updateTaskStatus(taskId, status) {
    let taskKey = taskId.split('-')[1];
    let actualTask = tasksList[taskKey];
    actualTask.status = status;
    updateTaskInFB(actualTask, taskKey);
}

// #endregion

// #region Chart

function drawChartTasks(tasksList) {
    let data = getChartData(tasksList);
    Highcharts.chart('chartTasks', {
        chart: {
            type: 'column'
        },
        title: {
            text: 'Project status chart'
        },
        subtitle: {
            text: 'DW Planning'
        },
        xAxis: {
            categories: actualProject.columns,
            crosshair: true
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Amount of tasks'
            }
        },
        legend: {
            align: 'right',
            verticalAlign: 'middle',
            layout: 'vertical'
        },
        tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y}</b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
        },
        plotOptions: {
            column: {
                pointPadding: 0,
                borderWidth: 0
            }
        },
        series: [{
            name: 'Tasks status',
            data: data
        }],
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 640
                },
                chartOptions: {
                    legend: {
                        align: 'center',
                        verticalAlign: 'bottom',
                        layout: 'horizontal'
                    },
                    subtitle: {
                        text: null
                    },
                }
            }]
        }
    });
}

function drawChartUsers(tasksList, usersList) {
    let users = getUsers(usersList);
    Highcharts.chart('chartUsers', {
        chart: {
            type: 'column'
        },
        title: {
            text: 'Team behavior'
        },
        subtitle: {
            text: 'DW Planning'
        },
        legend: {
            align: 'right',
            verticalAlign: 'middle',
            layout: 'vertical'
        },
        xAxis: {
            categories: users,
            crosshair: true
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Tasks'
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y}</b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
        },
        plotOptions: {
            column: {
                pointPadding: 0,
                borderWidth: 0
            }
        },
        series: getTaskStatusByUser(),
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 640
                },
                chartOptions: {
                    legend: {
                        align: 'center',
                        verticalAlign: 'bottom',
                        layout: 'horizontal'
                    },
                    subtitle: {
                        text: null
                    },
                }
            }]
        }
    });
}

function getChartData(tasksList) {
    let result = [0, 0, 0, 0, 0];
    for (let task in tasksList) {
        switch (tasksList[task].status) {
            case "":
                result[0]++;
                break;
            case "1":
                result[1]++;
                break;
            case "2":
                result[2]++;
                break;
            case "3":
                result[3]++;
                break;
            case "4":
                result[4]++;
                break;
        }
    }
    return result;
}

function getUsers(usersList) {
    let result = [];
    usersList.forEach(user => {
        result.push(user.val().name.split(' ')[0]);
    });
    return result;
}

function getTaskStatusByUser() {
    let result = [{
        name: actualProject.columns[0],
        data: getUserTasks('')
    }, {
        name: actualProject.columns[1],
        data: getUserTasks('1')
    }, {
        name: actualProject.columns[2],
        data: getUserTasks('2')
    }, {
        name: actualProject.columns[3],
        data: getUserTasks('3')
    }, {
        name: actualProject.columns[4],
        data: getUserTasks('4')
    }];
    return result;
}

function getUserTasks(status) {
    let result = [];
    usersList.forEach(user => {
        let taskNumber = 0;
        for (let taskId in tasksList) {
            if (tasksList[taskId].status == status && tasksList[taskId].responsible.includes(user.key)) {
                taskNumber++;
            }
        }
        result.push(taskNumber);
    });
    return result;
}

// #endregion

// #region Notifications

/*Notification.requestPermission().then(function (result) {
    console.log(result);
});*/

function launchNotifications(task) {
    let notificationTitle = task.val().task;
    let notificationOptions = {
        'body': 'Responsibles: ' + task.val().task + '\n Status: ' + +task.val().status,
        'icon': '',
        'tag': task.key
    };
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
        var notification = new Notification(notificationTitle, notificationOptions);
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
            if (permission === "granted") {
                var notification = new Notification(notificationTitle, notificationOptions);
            }
        });
    }
}

// #endregion

// #region Communications

function showVideoChat() {
    let chatIndex = "0000001";
    window.open("https://appr.tc/r/" + chatIndex, "Video chat", "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=300,left=300,width=300,height=300");
}

function showMessenger() {
    showChat = !showChat;
    let display = (showChat) ? "block" : "none";
    if (actualProject) {
        document.getElementById("chatWindow").style.display = display;
        loadChatFromFB();
    }
}

function updateChatFromFB(messages) {
    let chatList = document.getElementById("chatList");
    let html = "";
    for (let i in messages) {
        html += "<div><b>" + messages[i].name + ":</b><br>" + messages[i].message + "</div>";
    }
    chatList.innerHTML = html;
    chatList.scrollIntoView(false);
}

function keyPressed(event) {
    if (event.keyCode == 13) {
        sendMsg();
    }
}

function sendMsg() {
    let name = authUser.name;
    let message = document.getElementById("textMsg");
    if (message.value) {
        firebase.database().ref("projects/" + actualProject.key + "/chat").push({
            name: name,
            message: message.value
        });
    }
    message.value = "";
}

// #endregion