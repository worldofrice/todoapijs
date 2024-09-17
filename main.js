let tasks = [];

let typingTimeout;
let headers = {
	"Content-Type": "application/json",
};
let token;
let taskList;
let addTask;
let logOut;
let loginButton;
let registerButton;
let welcome;

async function displayTasks() {
	loginview.style.display = "none";
	tasksList.style.display = "";

	welcome.innerText = `Welcome, ${sessionStorage.getItem("username")}!`;

	tasks = (await getTasks(token)) ?? [];

	console.log(tasks);
	if (Array.isArray(tasks)) {
		tasks.forEach(renderTask);
	}

	// kui nuppu vajutatakse siis lisatakse uus task
	addTask.addEventListener("click", async function handleAddTask() {
		const task = await createTask(token); // Teeme kõigepealt lokaalsesse "andmebaasi" uue taski
		const taskRow = createTaskRow(task); // Teeme uue taski HTML elementi mille saaks lehe peale listi lisada
		taskList.appendChild(taskRow); // Lisame taski lehele
	});

	logOut.addEventListener("click", async function handleLogOut() {
		token = null;
		sessionStorage.removeItem("token");
		headers.Authorization = `Bearer ${token}`;
    taskList.replaceChildren();

		addTask.removeEventListener("click", addTask.handleAddTask);
		this.removeEventListener("click", handleLogOut);

		tasks = [];
		displayLogin();
	});
}

async function displayLogin() {
	tasksList.style.display = "none";
	loginview.style.display = "";

	loginButton.addEventListener("click", async function handleLoginSubmit() {
		if (!login_username.value && !login_password.value) return;

		const result = await getAuthToken(
			login_username.value,
			login_password.value,
		);

		if (result) {
			token = result;
			sessionStorage.setItem("token", token);
			sessionStorage.setItem("username", login_username.value);
			headers.Authorization = `Bearer ${token}`;
			loginview.style.display = "none";
			this.removeEventListener("click", handleLoginSubmit);
			displayTasks();
			return;
		}
	});

	registerButton.addEventListener(
		"click",
		async function handleRegisterSubmit() {
			if (!login_username.value && !login_password.value) return;

			const result = await createUser(
				login_username.value,
				login_password.value,
			);

			if (result) {
				token = result;
				sessionStorage.setItem("token", token);
				sessionStorage.setItem("username", login_username.value);
				headers.Authorization = `Bearer ${token}`;
				loginview.style.display = "none";
				this.removeEventListener("click", handleRegisterSubmit);
				displayTasks();
				return;
			}
		},
	);
}

// kui leht on brauseris laetud siis lisame esimesed taskid lehele
window.addEventListener("load", async () => {
	loginButton = document.querySelector("#login");
	registerButton = document.querySelector("#register");
	welcome = document.querySelector("#welcome");
	tasksContainer = document.querySelector("#taskscontainer");
	loginview = document.querySelector("#loginview");
	logOut = document.querySelector("#logout");
	login_username = document.querySelector("#login_username");
	login_password = document.querySelector("#login_password");
	taskList = document.querySelector("#task-list");
	addTask = document.querySelector("#add-task");
	tasksList = document.querySelector("#tasks");

	token = sessionStorage.getItem("token");
	if (token) {
		console.log("token found");
		headers.Authorization = `Bearer ${token}`;

		// check if token works
		if (!getTasks()) {
			displayLogin();
			return;
		}

		displayTasks();
		return;
	}
	displayLogin();
});

function renderTask(task) {
	const taskRow = createTaskRow(task);
	taskList.appendChild(taskRow);
}

async function createTask() {
	let response;
	try {
		response = await fetch(`https://demo2.z-bit.ee/tasks`, {
			method: "POST",
			headers: headers,
			body: JSON.stringify({
				title: "New Task",
				desc: "",
			}),
		})
			.then((res) => res.json())
			.then((data) => {
				console.log(data.message);
				if (data.message) {
					alert(data.message);
					return null;
				}

				return data;
			});
	} catch (error) {
		return null;
	}
	const task = {
		id: response.id,
		name: response.title,
		completed: response.marked_as_done,
	};
	tasks.push(task);

	return task;
}

function createTaskRow(task) {
	let taskRow = document
		.querySelector('[data-template="task-row"]')
		.cloneNode(true);
	taskRow.removeAttribute("data-template");

	// Täidame vormi väljad andmetega
	const name = taskRow.querySelector("[name='name']");
	name.value = task.name;
	name.addEventListener("input", () => {
		clearTimeout(typingTimeout);
		if (!name.value) return false;

		typingTimeout = setTimeout(async () => {
			task.name = await updateTaskTitle(task.id, name.value);
		}, 500);
	});

	console.log(task);

	const checkbox = taskRow.querySelector("[name='completed']");
	checkbox.checked = task.completed;
	checkbox.addEventListener("click", async () => {
		task.completed = await updateTaskChecked(task.id, checkbox.checked);
	});

	const deleteButton = taskRow.querySelector(".delete-task");
	deleteButton.addEventListener("click", async () => {
		taskList.removeChild(taskRow);
		await deleteTask(task.id);
		tasks.splice(tasks.indexOf(task), 1);
	});

	// Valmistame checkboxi ette vajutamiseks
	hydrateAntCheckboxes(taskRow);

	return taskRow;
}

async function updateTaskChecked(taskId, checked) {
	try {
		let data = await fetch(`https://demo2.z-bit.ee/tasks/${taskId}`, {
			method: "PUT",
			headers: headers,
			body: JSON.stringify({
				marked_as_done: checked,
			}),
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.message) {
					console.log(data.message);
					alert(data.message);
					return null;
				}

				return data;
			});

		return data.marked_as_done;
	} catch (error) {}
}

async function updateTaskTitle(taskId, title) {
	try {
		let data = await fetch(`https://demo2.z-bit.ee/tasks/${taskId}`, {
			method: "PUT",
			headers: headers,
			body: JSON.stringify({
				title: title,
			}),
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.message) {
					console.log(data.message);
					alert(data.message);
					return null;
				}

				return data;
			});

		return data.title;
	} catch (error) {}
}

async function getAuthToken(username, password) {
	try {
		let data = await fetch("https://demo2.z-bit.ee/users/get-token", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: username,
				password: password,
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.message) {
					console.log(data.message);
					alert(data.message);
					return null;
				}

				return data;
			});
		return data ? data.access_token : null;
	} catch (error) {
		console.log(error);
	}
	return null;
}

async function createUser(username, password) {
	try {
		let data = await fetch("https://demo2.z-bit.ee/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: username,
				firstname: "",
				lastname: "",
				newPassword: password,
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				console.log(data);
				if (Array.isArray(data)) {
					let message = "";
					for (const error in data) {
						if (Object.prototype.hasOwnProperty.call(data, error)) {
							message += data[error].message + "\n";
						}
					}
					alert(message);
					return null;
				}
				if (data.message) {
					console.log(data.message);
					alert(data.message);
					return null;
				}

				return data;
			});
		return data ? data.access_token : null;
	} catch (error) {}
}

async function deleteTask(taskId) {
	try {
		await fetch(`https://demo2.z-bit.ee/tasks/${taskId}`, {
			method: "DELETE",
			headers: headers,
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.message) {
					console.log(data.message);
					alert(data.message);
					return null;
				}

				return data;
			});

		return true;
	} catch (error) {
		// TODO: Error handling
		console.log(error);
	}
	return false;
}

async function getTasks() {
	let results = [];
	try {
		let data = await fetch("https://demo2.z-bit.ee/tasks", {
			headers: headers,
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.message) {
					console.log(data.message);
					alert(data.message);
					return null;
				}

				return data;
			});

		if (data.length > 0) {
			data.forEach((task) => {
				results.push({
					id: task.id,
					name: task.title,
					completed: task.marked_as_done,
				});
			});
			return results;
		}

		return null;
	} catch (error) {
		return null;
	}
}

function createAntCheckbox() {
	const checkbox = document
		.querySelector('[data-template="ant-checkbox"]')
		.cloneNode(true);
	checkbox.removeAttribute("data-template");
	hydrateAntCheckboxes(checkbox);
	return checkbox;
}

/**
 * See funktsioon aitab lisada eridisainiga checkboxile vajalikud event listenerid
 * @param {HTMLElement} element Checkboxi wrapper element või konteiner element mis sisaldab mitut checkboxi
 */
function hydrateAntCheckboxes(element) {
	const elements = element.querySelectorAll(".ant-checkbox-wrapper");
	for (let i = 0; i < elements.length; i++) {
		let wrapper = elements[i];

		// Kui element on juba töödeldud siis jäta vahele
		if (wrapper.__hydrated) continue;
		wrapper.__hydrated = true;

		const checkbox = wrapper.querySelector(".ant-checkbox");

		// Kontrollime kas checkbox peaks juba olema checked, see on ainult erikujundusega checkboxi jaoks
		const input = wrapper.querySelector(".ant-checkbox-input");
		if (input.checked) {
			checkbox.classList.add("ant-checkbox-checked");
		}

		// Kui inputi peale vajutatakse siis uuendatakse checkboxi kujundust
		input.addEventListener("change", () => {
			checkbox.classList.toggle("ant-checkbox-checked");
		});
	}
}
