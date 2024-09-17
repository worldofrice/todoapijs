let tasks = [];
let lastTaskId = 2;

let token;
let taskList;
let addTask;

// kui leht on brauseris laetud siis lisame esimesed taskid lehele
window.addEventListener("load", async () => {
  taskList = document.querySelector("#task-list");
  addTask = document.querySelector("#add-task");

  token = getAuthToken("username", "password");

  tasks = await getTasks(token);

  tasks.forEach(renderTask);

  // kui nuppu vajutatakse siis lisatakse uus task
  addTask.addEventListener("click", async () => {
    const task = await createTask(token); // Teeme kõigepealt lokaalsesse "andmebaasi" uue taski
    const taskRow = createTaskRow(task); // Teeme uue taski HTML elementi mille saaks lehe peale listi lisada
    taskList.appendChild(taskRow); // Lisame taski lehele
  });
});

function renderTask(task) {
  const taskRow = createTaskRow(task);
  taskList.appendChild(taskRow);
}

async function createTask(token) {
  lastTaskId++;
  let response = await fetch(`https://demo2.z-bit.ee/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "Task",
      desc: "",
    }),
  }).then((res) => res.json());
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

  const checkbox = taskRow.querySelector("[name='completed']");
  checkbox.checked = task.completed;

  const deleteButton = taskRow.querySelector(".delete-task");
  deleteButton.addEventListener("click", async () => {
    taskList.removeChild(taskRow);
    console.log(task.id);
    await deleteTask(token, task.id);
    tasks.splice(tasks.indexOf(task), 1);
  });

  // Valmistame checkboxi ette vajutamiseks
  hydrateAntCheckboxes(taskRow);

  return taskRow;
}

async function getAuthToken(username, password) {
  let token = null;
  await fetch("http://demo2.z-bit.ee/users/get-token", {
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
    .then((data) => (token = data.access_token ?? null));
  return token;
}

async function deleteTask(token, taskId) {
  await fetch(`https://demio2.z-bit.ee/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function getTasks(token) {
  let results = [];

  const data = await fetch("https://demo2.z-bit.ee/tasks", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((response) => response.json())
    .then((data) => data);
  if (data) {
    data.forEach((task) => {
      results.push({
        id: task.id,
        name: task.title,
        completed: task.marked_as_done,
      });
      lastTaskId = task.id;
    });
  }
  return results;
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
