async function toggleDetails(itemId) {
  const prod = document.getElementById('prod' + itemId);
  const details = document.getElementById('details' + itemId);
  if (details) {
    prod.removeChild(details);
  } else {
    const url = "/sure/details/" + itemId;
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

function toggleEdit(itemId) {
  const edit = document.getElementById('edit' + itemId).style;
  const metainfo = document.getElementById('metainfo' + itemId).style;
  if (edit.display === "none") {
    edit.display = "block";
    metainfo.position = "static";
  } else {
    edit.display = "none";
    metainfo.position = "absolute";
  }
}

async function getCategory(id) {
  const response = await fetch("/sure/category/" + parseInt(id));

  if (response.status === 200) {
    const data = await response.json();
    document.getElementById('category_id').value = data.category.id;
    document.getElementById('category_name').innerHTML = data.category.name;
    const prodlist = document.getElementById("prodlist");
    prodlist.innerHTML = "";
    for (let item of data.products) {
      const response = await fetch("/sure/head/" + item.id);

      if (response.status === 200) {
        const data = await response.json();
        prodlist.insertAdjacentHTML("beforeend", data.html);
      } else {
        alert(response.statusText + " (#" + response.status + ")");
        return;
      }
    }
  }
  else {
    alert(response.statusText + " (#" + response.status + ")");
    return;
  }
  hideMenues();
}

async function newProdukt() {
  const prodName = prompt("Name des Produkts:")
  if (prodName && prodName.trim().length != 0) {
    const response = await fetch("/sure/pro/" + encodeURI(prodName.trim()) + "/" + document.getElementById("category_id").value);

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
}

async function rename(itemId) {
  const nameElement = document.getElementById("name" + itemId);
  const oldName = nameElement.innerHTML;
  const newName = prompt("Neuer Produktname:", oldName);
  if (newName && newName.trim().length != 0) {
    const response = await fetch("/sure/nam/" + itemId + "/" + encodeURI(newName));

    if (response.status === 200) {
      const data = await response.json();
      nameElement.innerHTML = data.name;
      document.getElementById("timestamp" + itemId).innerHTML = data.timestamp;
    } else {
      alert(response.statusText + " (#" + response.status + ")");
      return;
    }
  }
}

async function deleteItem(itemId) {
  const name = document.getElementById("name" + itemId).innerHTML;
  if (confirm('"' + name + '" löschen?')) {
    const response = await fetch("/sure/del/" + itemId);

    if (response.status === 200) {
      const prodlist = document.getElementById("prodlist");
      const prod = document.getElementById('prod' + itemId);
      prodlist.removeChild(prod);
    } else {
      alert(response.statusText + " (#" + response.status + ")");
      return;
    }
  }
}

async function delete_category() {
  if (document.getElementsByClassName('prod').length === 0) {
    const id = document.getElementById('category_id').value;
    const response = await fetch("/sure/del/cat/" + id);

    if (response.status === 200) {
      getCategory();
      const category_list = document.getElementById("category_list");
      const category = document.getElementById('category_list' + id);
      category_list.removeChild(category);
    } else {
      alert(response.statusText + " (#" + response.status + ")");
      return;
    }
  } else {
    alert("Zum Löschen müssen zunächst alle Produkte dieser Kategorie entfernt werden.")
  }
  hideMenues();
}

function handleGetEntry(itemId, year, month) {
  if (document.getElementById('edit' + itemId).style.display === "none") {
    document.getElementById('edit' + itemId).style.display = "block";
  }
  document.getElementById("year" + itemId).value = year;
  document.getElementById("month" + itemId).value = month;
  document.getElementById("count" + itemId).value = 1;
}

async function updateItemEntry(itemId, action) {
  const year = document.getElementById("year" + itemId).value;
  const month = document.getElementById("month" + itemId).value;
  let count = parseInt(document.getElementById("count" + itemId).value, 10);
  if (year === "-" || month === "-" || isNaN(count)) {
    alert("Eingaben unvollständig");
    return;
  }
  if (action === "sub") count *= -1;

  const response = await fetch("/sure/upd/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "id": itemId, "year": year, "month": month, "count": count })
  });

  if (response.status == 200) {
    const data = await response.json();
    document.getElementById('sum' + itemId).innerHTML = data.sum;
    document.getElementById('details' + itemId).outerHTML = data.html;
  } else {
    alert(response.statusText + " (#" + response.status + ")");
    return;
  }
}

function select_category() {
  document.getElementById('select_category').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
}

function new_category() {
  document.getElementById('new_category').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
  document.getElementById('select_category').style.display = 'none';
}

async function save_new_category() {
  const catName = document.getElementById("new_category_name").value;
  if (catName && catName.trim().length != 0) {
    const response = await fetch("/sure/cat/" + encodeURI(catName.trim()));

    if (response.status === 201) {
      const data = await response.json();
      document.getElementById('category_id').value = data.category.id;
      document.getElementById('category_name').innerHTML = data.category.name;
      const prodlist = document.getElementById("prodlist");
      prodlist.innerHTML = "";
      const categorylist = document.getElementById("category_list");
      categorylist.innerHTML = "";
      for (let item of data.allCategories) {
        const html = `<p onClick = "getCategory(" + item.id + ")" title = "Auswahl der Category" style = "padding: 10px; margin: 5px">` + item.name + "</p>";
        categorylist.insertAdjacentHTML("beforeend", html);
      }
      hideMenues();

    } else {
      alert(response.statusText + " (#" + response.status + ")");
      return;
    }
  }
}

function edit_category() {
  document.getElementById('edit_category_name').value = document.getElementById('category_name').innerHTML
  document.getElementById('edit_category').style.display = 'block';
  document.getElementById('transparent').style.display = 'block';
}

async function save_edited_category() {
  const response = await fetch("/sure/cat/" + document.getElementById('edit_category_name').value + "/" + document.getElementById('category_id').value);

  if (response.status === 200) {
    document.getElementById('category_name').innerHTML = document.getElementById('edit_category_name').value 
    hideMenues();
  } else {
    alert(response.statusText + " (#" + response.status + ")");
    return;
  }
}

function hideMenues() {
  document.getElementById('transparent').style.display = 'none';
  document.getElementById('select_category').style.display = 'none';
  document.getElementById('new_category').style.display = 'none';
  document.getElementById('edit_category').style.display = 'none';
  document.getElementById("new_category_name").value = "";
  document.getElementById('edit_category_name').value = "";
}

async function appReady() {
  const prods = document.getElementsByClassName("prod");
  for (let i = 0; i < prods.length; i++) {
    if (prods[i].attributes["index"]) {
      const itemId = prods[i].attributes["index"].value;
      const response = await fetch("/sure/head/" + itemId);

      if (response.status === 200) {
        const data = await response.json();
        prods[i].outerHTML = data.html;
      } else {
        alert(response.statusText + " (#" + response.status + ")");
        return;
      }
    }
  };

}

