
let TOKEN = localStorage.getItem('token');

//validate
async function validate() {
  try {
    const response = await fetch("/verify", { headers: { 'Authorization': TOKEN } });
    const data = await response.json();
    switch (response.status) {
      case 200: {
        console.log("verifyUser: Valid token - user=" + data.user.loginname + ", expire in: " + data.user.exp);
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

  } catch (error) { console.error('Error:', error); }
}

async function login() {
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData.entries());

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
        responseFail_Handler("login", response, 'Credentials not valid. Try again!')
      }
    } catch (error) {
      error_Handler("login", error)
    }
  }
}


function responseFail_Handler(functionName, response, msg) {
  msg = msg || (functionName + ": " + response.statusText + " (#" + response.status + ")");
  console.log(msg);
  document.getElementById('message').innerHTML = "<p>" + msg + "</p";
  setTimeout(() => { document.getElementById('message').innerHTML = "" }, 7000);
}

function error_Handler(functionName, error, msg) {
  msg = msg || (functionName + ": " + 'Error fetching data: ' + error);
  console.error(msg);
  document.getElementById('message').innerHTML = "<p>" + msg + "</p>";
  setTimeout(() => { document.getElementById('message').innerHTML = "" }, 7000);
}

//read database
async function getCategory(id) {
  const response = await fetch("/app/get/" + parseInt(id) + "/" + TOKEN);
  if (response.status === 200) {
    const data = await response.json();
    document.getElementById('category_id').value = data.categoryId;
    document.getElementById('category_head').outerHTML = data.html;
    updateProductList(data.products);
    updateCategoryList();
  }
  else {
    responseFail_Handler("getCategory", response);
    return;
  }
  hidePanels();
}

async function updateCategoryList() {
  const response = await fetch("/app/list" + "/" + TOKEN);
  if (response.status === 200) {
    const data = await response.json();
    document.getElementById('category_list').outerHTML = data.html;
  } else {
    responseFail_Handler("updateCategoryList", response);
    return;
  }
}

async function updateProductList(products) {
  const prodlist = document.getElementById("prodlist");
  prodlist.innerHTML = "";
  for (let product of products) {
    const response = await fetch("/app/head/" + product.id + "/" + TOKEN);

    if (response.status === 200) {
      const data = await response.json();
      prodlist.insertAdjacentHTML("beforeend", data.html);
    } else {
      responseFail_Handler("updateProductList", response);
      return;
    }
  }
}

async function toggleDetails(id) {
  const prod = document.getElementById('prod' + id);
  const details = document.getElementById('details' + id);
  if (details) {
    prod.removeChild(details);
  } else {
    const response = await fetch("/app/details/" + id + "/" + TOKEN);
    if (response.status === 200) {
      const data = await response.json();
      prod.insertAdjacentHTML("beforeend", data.html);
    } else {
      responseFail_Handler("toggleDetails", response);
      return;
    }
  }
}

function toggleEdit(id) {
  const edit = document.getElementById('edit' + id).style;
  if (edit.display === "none") {
    edit.display = "block";
  } else {
    edit.display = "none";
  }
}

// read/write database 

// Categories

async function renameCategory() {
  const catName = document.getElementById("edit_category_name").value;
  if (catName && catName.trim().length != 0) {
    const response = await fetch("/app/cat/" + encodeURIComponent(catName.trim()) + "/" + document.getElementById('category_id').value + "/" + TOKEN);

    if (response.status === 200) {
      const data = await response.json();

      document.getElementById('category_head').outerHTML = data.html;
      updateCategoryList();
      hidePanels();
    } else {
      responseFail_Handler("renameCategory", response);
      return;
    }
  }
  hidePanels();
}

async function createCategory() {
  const catName = document.getElementById("new_category_name").value;
  if (catName && catName.trim().length != 0) {
    const response = await fetch("/app/cat/" + encodeURIComponent(catName.trim()) + "/" + TOKEN);

    if (response.status === 200) {
      const data = await response.json();

      document.getElementById('category_id').value = data.categoryId;
      document.getElementById('category_head').outerHTML = data.html;
      document.getElementById('prodlist').innerHTML = "";
      updateCategoryList();
      hidePanels();

    } else {
      responseFail_Handler("createCategory", response);
      return;
    }
  }
}

async function deleteCategory() {
  if (!document.getElementsByClassName('prod')[0]) {
    const id = document.getElementById('category_id').value;
    const response = await fetch("/app/cat/del/" + id + "/" + TOKEN);

    if (response.status === 200) {
      const data = await response.json();
      document.getElementById('category_head').outerHTML = data.html;

      updateProductList(data.products);
      updateCategoryList();
      hidePanels();

    } else {
      responseFail_Handler("deleteCategory", response);
      return;
    }
  } else {
    alert("Zum Löschen müssen zunächst alle Produkte dieser Kategorie entfernt werden.")
  }
  hidePanels();
}

async function toggleCategoryPrio() {
  const response = await fetch("/app/cat/star/" + document.getElementById('category_id').value + "/" + TOKEN);

  if (response.status === 200) {
    const data = await response.json();
    document.getElementById('category_head').outerHTML = data.html;
    updateCategoryList();
    hidePanels();
  } else {
    responseFail_Handler("toggleCategoryPrio", response);
    return;
  }
}

// Products

async function renameProduct() {
  const id = document.getElementById('product_id').value;
  const prodName = document.getElementById("edit_product_name").value;
  if (prodName && prodName.trim().length != 0) {
    const response = await fetch("/app/pro/" + document.getElementById("category_id").value + "/" + encodeURIComponent(prodName.trim()) + "/" + id + "/" + TOKEN);

    if (response.status === 200) {
      const data = await response.json();
      document.getElementById("product_name" + id).innerHTML = data.name;
      if (document.getElementById("timestamp" + id)) document.getElementById("timestamp" + id).innerHTML = data.timestamp;
    } else {
      responseFail_Handler("renameProduct", response);
      return;
    }
  }
  hidePanels(id);
}

async function createProduct() {
  const prodName = document.getElementById("new_product_name").value;
  if (prodName && prodName.trim().length !== 0) {
    const response = await fetch("/app/pro/" + document.getElementById("category_id").value + "/" + encodeURIComponent(prodName.trim()) + "/" + TOKEN);

    if (response.status === 200) {
      const data = await response.json();
      const prodlist = document.getElementById("prodlist");
      prodlist.insertAdjacentHTML("beforeend", data.html);
      const newProd = document.querySelector("div.prod:last-child");
      if (newProd) newProd.scrollIntoView();
    } else {
      responseFail_Handler("createProduct", response);
      return;
    }
  }
  hidePanels();
}

async function deleteProduct() {
  const id = document.getElementById('product_id').value;
  const prodName = document.getElementById("product_name" + id).innerHTML;
  if (confirm('"' + prodName + '" löschen?')) {
    const response = await fetch("/app/pro/del/" + id + "/" + TOKEN);

    if (response.status === 200) {
      const prodlist = document.getElementById("prodlist");
      const prod = document.getElementById('prod' + id);
      prodlist.removeChild(prod);
    } else {
      responseFail_Handler("deleteProduct", response);
      return;
    }
  }
  hidePanels(id);
}

// Entry list

function transferEntry(id, year, month) {
  if (document.getElementById('edit' + id).style.display === "none") {
    document.getElementById('edit' + id).style.display = "block";
  }
  document.getElementById("year" + id).value = year;
  document.getElementById("month" + id).value = month;
  document.getElementById("count" + id).value = 1;
}

async function updateEntry(id, action) {
  const year = document.getElementById("year" + id).value;
  const month = document.getElementById("month" + id).value;
  let count = parseInt(document.getElementById("count" + id).value, 10);
  if (year === "-" || month === "-" || isNaN(count)) {
    alert("Eingaben unvollständig");
    return;
  }
  if (action === "sub") count *= -1;

  const response = await fetch("/app/upd/" + TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "id": id, "year": year, "month": month, "count": count })
  });

  if (response.status == 200) {
    const data = await response.json();
    document.getElementById('sum' + id).innerHTML = data.sum;
    document.getElementById('details' + id).outerHTML = data.html;
  } else {
    responseFail_Handler("updateEntry", response);
    return;
  }
}

// on Page
function selectCategoryPanel() {
  document.getElementById('select_category').style.display = 'block';
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

function editProductPanel(productId, oldName) {
  document.getElementById('product_id').value = productId;
  document.getElementById('edit_product_name').value = oldName;
  document.getElementById('edit_product').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('edit_product_name').focus();
}

function hidePanels() {
  document.getElementById('select_category').style.display = 'none';

  document.getElementById('new_category').style.display = 'none';
  document.getElementById('edit_category').style.display = 'none';
  document.getElementById('new_product').style.display = 'none';
  document.getElementById('new_product').style.display = 'none';
  document.getElementById('edit_product').style.display = 'none';

  document.getElementById("new_category_name").value = "";
  document.getElementById('edit_category_name').value = "";
  document.getElementById("new_product_name").value = "";
  document.getElementById("edit_product_name").value = "";

  document.getElementById('transparent').style.display = 'none';
}

//===================================================================

async function docReady() {
  getCategory();
}

validate();

