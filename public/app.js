
'use strict';

let CATEGORY_ID;
let PRODUCT_ID;
let PRODUCT_SORT = 'date';
let TOKEN = localStorage.getItem('token');


// Helper functions ==========================================================
const responseFail_Handler = (functionName, response, msg) => {
  msg = msg || (functionName + ": " + response.statusText + " (#" + response.status + ")");
  console.log(msg);
  displayMessage(msg, 8);
};

const error_Handler = (functionName, error, msg) => {
  msg = msg || (functionName + ": " + 'Error fetching data: ' + error);
  console.error(msg);
  displayMessage(msg, 8);
};

const displayMessage = (msg, sec) => {
  document.getElementById('message').innerHTML = "<p>" + msg + "</p>";
  if (displayMessageTimeoutHandler) clearTimeout(displayMessageTimeoutHandler);
  if (sec) {
    displayMessageTimeoutHandler = setTimeout(() => {
      document.getElementById('message').innerHTML = "";
    }, sec * 1000);
  }
};

let displayMessageTimeoutHandler;

// login ===================================================================

async function validate() {
  try {
    const response = await fetch("/verify", { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    const data = await response.json();
    switch (response.status) {
      case 200: {
        console.log("verifyUser: Valid token - user=" + data.user.username + ", expire in: " + data.user.exp);
        displayMessage(': Login "' + data.user.username + '" gültig bis ' + (new Date(data.user.exp * 1000).toLocaleDateString()), 5);
        break;
      }
      case 401: {
        console.log(data.error);
        document.getElementById('login').innerHTML = data.html;
        document.querySelectorAll('.right').forEach(el => el.style.display = 'none');
        break;
      }
      default: {
        responseFail_Handler("verifyUser", response);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function login(first_login) {
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData.entries());

    if (first_login) {
      if (data.password !== data.password2) {
        displayMessage('Passwords do not match. Try again!', 5);
        return;
      }
    }

    try {
      const response = await fetch("/login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        TOKEN = result.token;
        localStorage.setItem('token', result.token);
        document.querySelectorAll('.right').forEach(el => el.style.display = 'block');
        document.getElementById('login').innerHTML = "";
        getCategory();
      } else {
        responseFail_Handler("login", response, 'Credentials not valid. Try again!');
      }
    } catch (error) {
      error_Handler("login", error);
    }
  }
}

// Category Actions ===================================================================

async function getCategory(id) {
  const response = await fetch("/app/get/" + (parseInt(id) || ""), { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  if (response.status === 200) {
    const data = await response.json();

    CATEGORY_ID = data.categoryId;  //falls ohne id aufgerufen
    const container = document.getElementById('swipe-container')
    let currentPage = container.querySelector('.current');
    if (!currentPage) {
      currentPage = document.createElement('div');
      container.appendChild(currentPage); currentPage.innerHTML = data.html;
      currentPage.classList.add('swipe-page');
      currentPage.classList.add('current');
    }
    currentPage.innerHTML = data.html;
    currentPage.classList.add('swipe-page');
    currentPage.classList.add('current');

    updateCategoryList('category_list', 'get');
    displayMessage(data.appInfo.version + ", " + location.protocol + "//" + location.host, 4);
  } else if (response.status === 204) {
    // nothing to do
  } else {
    responseFail_Handler("getCategory", response);
  }
  hidePanels();
}

async function createNextCategory() {
  const response = await fetch("/app/next/" + (parseInt(CATEGORY_ID) || ""), { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  let page;
  if (response.status === 200) {
    const data = await response.json();
    CATEGORY_ID = data.categoryId;
    page = data.html;
  } else {
    if (response.status === 204) {
      displayMessage("Keine weiteren Daten", 3);
    } else {
      responseFail_Handler("getCategory", response);
    }
  }
  hidePanels();
  return page;
}

async function createPrevCategory() {
  const response = await fetch("/app/prev/" + (parseInt(CATEGORY_ID) || ""), { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  let page;
  if (response.status === 200) {
    const data = await response.json();
    CATEGORY_ID = data.categoryId;
    page = data.html;
  } else {
    if (response.status === 204) {
      displayMessage("Keine weiteren Daten", 3);
    } else {
      responseFail_Handler("getCategory", response);
    }
  }
  hidePanels();
  return page;
}

let working = false;

async function transitionToCategory(direction) {
  if (!working) {
    working = true;
    const container = document.getElementById('swipe-container');
    const currentPage = container.querySelector('.current');
    const newPage = await createCategoryPage(direction);

    if (!newPage) { working = false; return; }

    currentPage.classList.remove('current');
    currentPage.classList.add(direction === 'prev' ? 'next' : 'prev');

    setTimeout(() => {
      currentPage.remove();

      // Vorbereitung für Animation
      container.appendChild(newPage);
      newPage.classList.add(direction);

      // Trigger Reflow
      void newPage.offsetWidth;

      // Animation starten
      newPage.classList.remove('prev', 'next');
      newPage.classList.add('current');
    }, 350);


    // Nach Animation aufräumen
    setTimeout(() => {
      working = false;
      newPage.scrollIntoView();
    }, 700);
  }
}

async function createCategoryPage(direction) {
  const content = (direction === 'next') ? await createNextCategory() : await createPrevCategory();

  if (!content) return null;

  const page = document.createElement('div');
  page.innerHTML = content;
  page.classList.add('swipe-page');
  return page;
}

function changeSort() {
  if (PRODUCT_SORT === 'date') {
    PRODUCT_SORT = 'name';
  } else {
    PRODUCT_SORT = 'date';
  }
  updateCategoryProducts(CATEGORY_ID);
  hidePanels();
}

async function updateCategoryList(elementName, functionName) {
  const response = await fetch("/app/list" + "/" + functionName + "/", { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  if (response.status === 200) {
    const data = await response.json();
    document.getElementById(elementName).outerHTML = data.html;
  } else {
    responseFail_Handler("updateCategoryList", response);
  }
}

async function updateCategoryProducts(categoryId) {
  const response = await fetch("/app/heads/" + categoryId + "/" + PRODUCT_SORT, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  if (response.status === 200) {
    const data = await response.json();
    document.getElementById("prodlist").outerHTML = data.html;
  } else {
    responseFail_Handler("updateCategoryProducts", response);
  }
}

async function toggleDetails(id) {
  const prod = document.getElementById('prod' + id);
  const details = document.getElementById('details' + id);
  if (details) {
    prod.removeChild(details);
  } else {
    const response = await fetch("/app/details/" + id, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    if (response.status === 200) {
      const data = await response.json();
      prod.insertAdjacentHTML("beforeend", data.html);
      if (document.getElementById('sum' + id).innerHTML == "0") {
        const edit = document.getElementById('edit' + id).style;
        edit.display = "block";
        document.getElementById('details' + id).scrollIntoView();
      }
    } else {
      responseFail_Handler("toggleDetails", response);
    }
    document.getElementById('edit' + id).scrollIntoView();
  }
}

function toggleEdit(id) {
  const edit = document.getElementById('edit' + id).style;
  if (edit.display === "block") {
    edit.display = "none";
  } else {
    edit.display = "block";
    document.getElementById('info' + id).scrollIntoView();
  }
}

function toggleNotes(id) {
  const notes = document.getElementById('notes' + id).style;
  if (notes.display === "block") {
    notes.display = "none";
  } else {
    notes.display = "block";
    document.getElementById('info' + id).scrollIntoView();
  }
}

// Categories
async function renameCategory() {
  const catName = document.getElementById("edit_category_name").value;
  if (catName && catName.trim().length !== 0) {
    const response = await fetch(
      "/app/cat/" + encodeURIComponent(catName.trim()) + "/" + CATEGORY_ID,
      { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );

    if (response.status === 200) {
      const data = await response.json();
      document.getElementById('category_head').outerHTML = data.html;
      updateCategoryList('category_list', 'get');
      hidePanels();
    } else {
      responseFail_Handler("renameCategory", response);
    }
  }
  hidePanels();
}

async function createCategory() {
  const catName = document.getElementById("new_category_name").value;
  if (catName && catName.trim().length !== 0) {
    const response = await fetch("/app/cat/" + encodeURIComponent(catName.trim()), { headers: { 'Authorization': `Bearer ${TOKEN}` } });

    if (response.status === 200) {
      const data = await response.json();
      CATEGORY_ID = data.categoryId;
      document.getElementById('category_head').outerHTML = data.html;
      document.getElementById('prodlist').innerHTML = "";
      updateCategoryList('category_list', 'get');
      hidePanels();
    } else {
      responseFail_Handler("createCategory", response);
    }
  }
}

async function deleteCategory() {
  if (!document.getElementsByClassName('prod')[0]) {
    const response = await fetch("/app/cat/del/" + CATEGORY_ID + "/", { headers: { 'Authorization': `Bearer ${TOKEN}` } });

    if (response.status === 200) {
      const data = await response.json();
      CATEGORY_ID = data.categoryId;
      document.getElementById('category_head').outerHTML = data.category_html;
      document.getElementById("prodlist").outerHTML = data.products_html;
      updateCategoryList('category_list', 'get');
    } else {
      responseFail_Handler("deleteCategory", response);
    }
  } else {
    alert("Zum Löschen müssen zunächst alle Produkte dieser Kategorie entfernt werden.");
  }
  hidePanels();
}

async function toggleCategoryPrio() {
  const response = await fetch("/app/cat/star/" + CATEGORY_ID, { headers: { 'Authorization': `Bearer ${TOKEN}` } });

  if (response.status === 200) {
    const data = await response.json();
    document.getElementById('category_head').outerHTML = data.html;
    updateCategoryList('category_list', 'get');
  } else {
    responseFail_Handler("toggleCategoryPrio", response);
  }
  hidePanels();
}

// Products
async function renameProduct() {
  const prodName = document.getElementById("edit_product_name").value;
  if (prodName && prodName.trim().length !== 0) {
    const response = await fetch(
      "/app/pro/ren/" + encodeURIComponent(prodName.trim()) + "/" + PRODUCT_ID,
      { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );

    if (response.status === 200) {
      const data = await response.json();
      document.getElementById("product_name" + PRODUCT_ID).innerHTML = data.name;
      if (document.getElementById("timestamp" + PRODUCT_ID)) document.getElementById("timestamp" + PRODUCT_ID).innerHTML = data.timestamp;
    } else {
      responseFail_Handler("renameProduct", response);
    }
  }
  hidePanels(PRODUCT_ID);
}

async function moveToCategory(catId) {
  const response = await fetch("/app/move/" + PRODUCT_ID + "/" + catId, { headers: { 'Authorization': `Bearer ${TOKEN}` } });

  if (response.status === 200) {
    const data = await response.json();
    CATEGORY_ID = data.categoryId;
    document.getElementById('category_head').outerHTML = data.category_html;;
    document.getElementById("prodlist").outerHTML = data.products_html;
    updateCategoryList('category_list', 'get');
  } else if (response.status === 204) {
    // nothing to do
  } else {
    responseFail_Handler("getCategory", response);
  }
  hidePanels();
}

async function createProduct() {
  const prodName = document.getElementById("new_product_name").value;
  if (prodName && prodName.trim().length !== 0) {
    const response = await fetch(
      "/app/pro/" + CATEGORY_ID + "/" + encodeURIComponent(prodName.trim()),
      { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );

    if (response.status === 200) {
      const data = await response.json();
      const prodlist = document.getElementById("prodlist");
      prodlist.insertAdjacentHTML("beforeend", data.html);
      const newProd = document.querySelector("div.prod:last-child");
      if (newProd) newProd.scrollIntoView();
    } else {
      responseFail_Handler("createProduct", response);
    }
  }
  hidePanels();
}

async function deleteProduct() {
  const prodName = document.getElementById("product_name" + PRODUCT_ID).innerHTML;
  if (confirm('"' + prodName + '" löschen?')) {
    const response = await fetch("/app/pro/del/" + PRODUCT_ID, { headers: { 'Authorization': `Bearer ${TOKEN}` } });

    if (response.status === 200) {
      const prodlist = document.getElementById("prodlist");
      const prod = document.getElementById('prod' + PRODUCT_ID);
      prodlist.removeChild(prod);
    } else {
      responseFail_Handler("deleteProduct", response);
    }
  }
  hidePanels(PRODUCT_ID);
}

// Entry list
function transferEntry(id, year, month, day) {
  if (document.getElementById('edit' + id).style.display === "none") {
    document.getElementById('edit' + id).style.display = "block";
  }
  document.getElementById("year" + id).value = year;
  document.getElementById("month" + id).value = month;
  document.getElementById("day" + id).value = isNaN(day) ? "-" : day;
  document.getElementById("count" + id).value = 1;
}

function isValidDate(year, month, day) {
  try {
    // Monat im Date-Objekt ist 0-basiert (0 = Januar, 11 = Dezember)
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() == year &&
      date.getMonth() == month - 1 &&
      date.getDate() == day
    );
  } catch (error) {
    return true;
  }
}

async function updateEntry(id, action) {
  const year = document.getElementById("year" + id).value;
  const month = document.getElementById("month" + id).value;
  const day = document.getElementById("day" + id).value;

  let count = parseInt(document.getElementById("count" + id).value, 10);
  if (year === "-" || month === "-" || isNaN(count)) {
    alert("Unvollständige Eingaben.");
    return;
  }
  if (!isNaN(day) && !isValidDate(year, month, day)) {
    alert("Kein gültiges Datum: " + year + "-" + month + "-" + day);
    return;
  }

  if (action === "sub") count *= -1;

  const response = await fetch("/app/upd/", {
    method: "POST",
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify({ "id": id, "year": year, "month": month, "day": day, "count": count })
  });

  if (response.status === 200) {
    const data = await response.json();
    document.getElementById('sum' + id).innerHTML = data.product.sum;
    document.getElementById('next_date' + id).innerHTML = (data.product.next_date) ? (data.product.next_date) : "";
    document.getElementById('details' + id).outerHTML = data.html;
    if (document.getElementById('state' + id)) document.getElementById('state' + id).style.color = data.product.state;
  } else {
    responseFail_Handler("updateEntry", response);
  }
}

// Page functions
function selectGoToCategoryPanel() {
  document.getElementById('new_category').style.display = 'block';
  document.getElementById('select_category').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
}

function selectMoveToCategoryPanel() {
  updateCategoryList('category_list2', 'moveTo');
  document.getElementById('select_category2').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
}

function createCategoryPanel() {
  document.getElementById('new_category').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('select_category').style.display = 'none';
  document.getElementById('new_category_name').focus();
}

function editCategoryPanel(oldName) {
  document.getElementById('edit_category_name').value = oldName;
  document.getElementById('edit_category').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('edit_category_name').focus();
}

function createProductPanel() {
  document.getElementById('new_product').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('select_category').style.display = 'none';
  document.getElementById('new_product_name').focus();
}

function editProductPanel(productId) {
  PRODUCT_ID = productId;
  document.getElementById('edit_product_name').value = document.getElementById("product_name" + productId).innerHTML;
  document.getElementById('edit_product').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('edit_product_name').focus();
}
function hidePanels() {
  document.getElementById('select_category').style.display = 'none';
  document.getElementById('select_category2').style.display = 'none';

  document.getElementById('new_category').style.display = 'none';
  document.getElementById('edit_category').style.display = 'none';
  document.getElementById('new_product').style.display = 'none';
  document.getElementById('edit_product').style.display = 'none';

  document.getElementById("new_category_name").value = "";
  document.getElementById('edit_category_name').value = "";
  document.getElementById("new_product_name").value = "";
  document.getElementById("edit_product_name").value = "";

  document.getElementById('transparent').style.display = 'none';
}

function pageRefresh() {
  localStorage.removeItem('token');
  location.reload(true);
}

// Swipe handling
let startX = 0;
let endX = 0;
let startY = 0;
let endY = 0;

function handleSwipe() {
  const diffX = endX - startX;
  const diffY = endY - startY;
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) { // Mindest-Swipe-Distanz
    if (diffX > 0) {
      transitionToCategory('prev');
    } else {
      transitionToCategory('next');
    }
  }
}

function initSwipe() {
  let isMouseDown = false;

  const swipeArea = document.getElementById("app");

  // TOUCH-EVENTS (für mobile Geräte)
  swipeArea.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  swipeArea.addEventListener("touchend", (e) => {
    endX = e.changedTouches[0].clientX;
    endY = e.changedTouches[0].clientY;
    handleSwipe();
  });

  // MAUS-EVENTS (klassische Maus)
  swipeArea.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    isMouseDown = true;
  });

  swipeArea.addEventListener("mouseup", (e) => {
    if (!isMouseDown) return;
    endX = e.clientX;
    endY = e.clientY;
    isMouseDown = false;
    handleSwipe();
  });

  swipeArea.addEventListener("mouseleave", () => {
    isMouseDown = false; // Falls die Maus das Element verlässt
  });

  let wheelrunning = false;

  swipeArea.addEventListener("wheel", (e) => {
    if (wheelrunning) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 50) { // Prüfen, ob es eine horizontale Bewegung ist
      if (e.deltaX < 0) {
        wheelrunning = true;
        transitionToCategory('prev');
      } else {
        wheelrunning = true;
        transitionToCategory('next');
      }
    }
    setTimeout(() => (wheelrunning = false), 300);
  });
}

// Initialization
async function docReady() {
  initSwipe();
  getCategory();
}

validate();