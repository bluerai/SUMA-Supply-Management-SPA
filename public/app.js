
// read database 

async function docReady() {
  getCategory();
}

async function getCategory(id) {
  const response = await fetch("/app/get/" + parseInt(id));

  if (response.status === 200) {
    const data = await response.json();
    document.getElementById('category_id').value = data.categoryId;
    document.getElementById('category_head').outerHTML = data.html;
    updateProductList(data.products);
    updateCategoryList();
  }
  else {
    alert(response.statusText + " (#" + response.status + ")");
    return;
  }
  hidePanels();
}

async function updateCategoryList() {
  const response = await fetch("/app/list");
  if (response.status === 200) {
    const data = await response.json();
    document.getElementById('category_list').outerHTML = data.html;
  } else {
    alert(response.statusText + " (#" + response.status + ")");
    return;
  }
}

async function updateProductList(products) {
  const prodlist = document.getElementById("prodlist");
  prodlist.innerHTML = "";
  for (let product of products) {
    const response = await fetch("/app/head/" + product.id);

    if (response.status === 200) {
      const data = await response.json();
      prodlist.insertAdjacentHTML("beforeend", data.html);
    } else {
      alert(response.statusText + " (#" + response.status + ")");
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
    const url = "/app/details/" + id;
    const response = await fetch(url);

    if (response.status === 200) {
      const data = await response.json();
      prod.insertAdjacentHTML("beforeend", data.html);
    } else {
      alert(response.statusText + " (#" + response.status + ")");
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
    const response = await fetch("/app/cat/" + encodeURIComponent(catName.trim()) + "/" + document.getElementById('category_id').value);

    if (response.status === 200) {
      const data = await response.json();

      document.getElementById('category_head').outerHTML = data.html;
      updateCategoryList();
      hidePanels();
    } else {
      alert(response.statusText + " (#" + response.status + ")");
      return;
    }
  }
  hidePanels();
}

async function createCategory() {
  const catName = document.getElementById("new_category_name").value;
  if (catName && catName.trim().length != 0) {
    const response = await fetch("/app/cat/" + encodeURIComponent(catName.trim()));

    if (response.status === 200) {
      const data = await response.json();

      document.getElementById('category_id').value = data.categoryId;
      document.getElementById('category_head').outerHTML = data.html;
      document.getElementById('prodlist').innerHTML = "";
      updateCategoryList();
      hidePanels();

    } else {
      alert(response.statusText + " (#" + response.status + ")");
      return;
    }
  }
}

async function deleteCategory() {
  if (!document.getElementsByClassName('prod')[0]) {
    const id = document.getElementById('category_id').value;
    const response = await fetch("/app/cat/del/" + id);

    if (response.status === 200) {
      const data = await response.json();
      document.getElementById('category_head').outerHTML = data.html;

      updateProductList(data.products);
      updateCategoryList();
      hidePanels();

    } else {
      alert(response.statusText + " (#" + response.status + ")");
      return;
    }
  } else {
    alert("Zum Löschen müssen zunächst alle Produkte dieser Kategorie entfernt werden.")
  }
  hidePanels();
}

async function toggleCategoryPrio() {
  const response = await fetch("/app/cat/star/" + document.getElementById('category_id').value);

  if (response.status === 200) {
    const data = await response.json();
    document.getElementById('category_head').outerHTML = data.html;
    updateCategoryList();
    hidePanels();
  } else {
    alert(response.statusText + " (#" + response.status + ")");
    return;
  }
}

// Products

async function renameProduct() {
  const id = document.getElementById('product_id').value;
  const prodName = document.getElementById("edit_product_name").value;
  if (prodName && prodName.trim().length != 0) {
    const response = await fetch("/app/pro/" + document.getElementById("category_id").value + "/" + encodeURIComponent(prodName.trim()) + "/" + id);

    if (response.status === 200) {
      const data = await response.json();
      document.getElementById("product_name" + id).innerHTML = data.name;
      if (document.getElementById("timestamp" + id)) document.getElementById("timestamp" + id).innerHTML = data.timestamp;
    } else {
      alert(response.statusText + " (#" + response.status + ")");
      return;
    }
  }
  hidePanels(id);
}

async function createProduct() {
  const prodName = document.getElementById("new_product_name").value;
  if (prodName && prodName.trim().length !== 0) {
    const response = await fetch("/app/pro/" + document.getElementById("category_id").value + "/" + encodeURIComponent(prodName.trim()));

    if (response.status === 200) {
      const data = await response.json();
      const prodlist = document.getElementById("prodlist");
      prodlist.insertAdjacentHTML("beforeend", data.html);
      const newProd = document.querySelector("div.prod:last-child");
      if (newProd) newProd.scrollIntoView();
    } else {
      alert(response.statusText + " (#" + response.status + ")");
      return;
    }
  }
  hidePanels();
}

async function deleteProduct() {
  const id = document.getElementById('product_id').value;
  const prodName = document.getElementById("product_name" + id).innerHTML;
  if (confirm('"' + prodName + '" löschen?')) {
    const response = await fetch("/app/pro/del/" + id);

    if (response.status === 200) {
      const prodlist = document.getElementById("prodlist");
      const prod = document.getElementById('prod' + id);
      prodlist.removeChild(prod);
    } else {
      alert(response.statusText + " (#" + response.status + ")");
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

  const response = await fetch("/app/upd/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "id": id, "year": year, "month": month, "count": count })
  });

  if (response.status == 200) {
    const data = await response.json();
    document.getElementById('sum' + id).innerHTML = data.sum;
    document.getElementById('details' + id).outerHTML = data.html;
  } else {
    alert(response.statusText + " (#" + response.status + ")");
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

