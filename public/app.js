async function toggleDetails(itemId) {
  const prod = document.getElementById('prod' + itemId);
  const details = document.getElementById('details' + itemId);
  if (details) {
    prod.removeChild(details);
  } else {
    const url = "/sure/details/" + itemId;
    const response = await fetch(url);
    const data = await response.json();
    prod.insertAdjacentHTML("beforeend", data.html);
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

async function newProdukt() {
  const prodName = prompt("Name des Produkts:")
  if (prodName && prodName.trim().length != 0) {
    const response = await fetch("/sure/new/" + encodeURI(prodName.trim()));
    const data = await response.json();

    const prodlist = document.getElementById("prodlist");
    prodlist.insertAdjacentHTML("beforeend", data.html);
    const newProd = document.querySelector("div.prod:last-child");
    if (newProd) newProd.scrollIntoView();
  }
}

async function rename(itemId) {
  const nameElement = document.getElementById("name" + itemId);
  const oldName = nameElement.innerHTML;
  const newName = prompt("Neuer Produktname:", oldName);
  if (newName && newName.trim().length != 0) {
    const response = await fetch("/sure/nam/" + itemId + "/" + encodeURI(newName));
    const data = await response.json();
    nameElement.innerHTML = data.name;
    document.getElementById("timestamp" + itemId).innerHTML = data.timestamp;
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
    }
  }
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
  try {
    const response = await fetch("/sure/upd/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "id": itemId, "year": year, "month": month, "count": count })
    });

    if (response.status !== 200) {
      alert(response.statusText + " (#" + response.status + ")");
    } else {
      const data = await response.json();
      document.getElementById('sum' + itemId).innerHTML = data.sum;
      document.getElementById('details' + itemId).outerHTML = data.html;
    }

  } catch (error) {
    alert("Fehler: " + error.message);
  }
}

async function appReady() {
  const prods = document.getElementsByClassName("prod");
  for (let i = 0; i < prods.length; i++) {
    if (prods[i].attributes["index"]) {
      const itemId = prods[i].attributes["index"].value;
      const response = await fetch("/sure/head/" + itemId);
      const data = await response.json();
      prods[i].outerHTML = data.html;
    }
  };
}

