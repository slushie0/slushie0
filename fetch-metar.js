let data = {};
Papa.parse("airport-codes.csv", {
  download: true,
  header: true,
  complete: function (results) {
    data = results.data.map(element => ({ ident: element.ident, type: element.type, name: element.name, municipality: element.municipality }))
    //console.log("Finished:", data);
  }
});

window.addEventListener('click', function (e) {
  let div = document.querySelector("#search-results");
  if (document.getElementById('query').contains(e.target)) {
    div.classList.remove("visually-hidden");
  } else {
    div.classList.add("visually-hidden");
  }
});

let sizeOrder = {
  large_airport: 0,
  medium_airport: 1,
  small_airport: 2,
  seaplane_base: 3,
  heliport: 4,
  closed: 5,
};

function search() {
  let query = document.querySelector("#query");
  let searchResults = document.querySelector("#search-results");
  searchResults.innerHTML = "";
  if (query.value.length < 1) {
    return;
  }
  let regex = new RegExp(query.value, 'i');
  let newdata = data.filter((item) => Object.values(item).find((value) => regex.test(value)));
  newdata.sort((a, b) => sizeOrder[a.type] - sizeOrder[b.type]);

  //newdata = newdata.slice(0, 20);
  for (let i = 0; i < 20; i++) {
    if (newdata.length <= i) { return; }
    console.log(newdata[i].type);
    let ident = newdata[i].ident;
    let name = newdata[i].name;
    let municipality = newdata[i].municipality;
    let item = document.createElement("a");
    item.innerHTML = '<span>' + ident + '</span> - <span>' + name + '</span> - <span>' + municipality + '</span>';
    item.className = "list-group-item list-group-item-action";
    item.href = "#";
    item.onclick = () => {
      query.value = ident;
      getMetar();
    }
    searchResults.appendChild(item);
  }
}

let latestMetars = [];

function submit() {
  document.body.classList.add('search-active');
  if (!document.body.classList.contains('results-active')) {
    document.body.classList.add('results-active');
  }
  getMetar();
}

function showError(message) {
  let errorBox = document.getElementById('error');
  if (message) {
    errorBox.textContent = message;
    errorBox.classList.remove('visually-hidden');
  } else {
    errorBox.classList.add('visually-hidden');
  }
}

function getMetar() {
  let airports = document.querySelector("#query").value
    .split(/\s+/)
    .filter(code => /^[A-Za-z0-9]{4}$/.test(code));

  if (airports.length == 0) {
    showError("Please enter a valid airport identifier");
    return;
  }

  fetch(`https://api.checkwx.com/metar/${airports.join()}/decoded?x-api-key=2ca75acd9f4f4b35846b89c8cf`)
    .then((response) => response.json())
    .then((data) => {
      if (data.results === 0) {
        showError("This airport has no METAR");
        return;
      }

      showError("");
      latestMetars = data.data;
      displayMetarCards();
    })
    .catch((err) => {
      console.error("Error fetching METAR data:", err);
      showError("Failed to fetch METAR data. Please try again");
    });
}

// Helper to create a card for each METAR
function displayMetarCards() {
  let container = document.querySelector(".results-container");//<-PROBLEM HERE
  // Remove old cards except the flex-item (first child)
  while (container.children.length > 1) {
    container.removeChild(container.lastChild);
  }

  latestMetars.forEach((metar, idx) => {
    // Card container
    let card = document.createElement("div");
    card.className = "card mb-3";

    // Card header
    let header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `<strong>${metar.icao || metar.station || "Unknown"}</strong> &mdash; ${metar.station ? metar.station.name || "" : ""}`;
    card.appendChild(header);

    // Card body
    let body = document.createElement("div");
    body.className = "card-body";

    // Decoded list
    let ul = document.createElement("ul");
    ul.className = "list-group";
    // Time
    let liTime = document.createElement("li");
    liTime.className = "list-group-item";
    liTime.innerHTML = `<span class="badge text-bg-primary rounded-pill">DATE</span> <span>${new Date(metar.observed + "Z").toUTCString()}</span>`;
    ul.appendChild(liTime);

    // Winds
    let windId = getSelectedRadioId("winds");
    let windUnitMap = {
      "option-kts": ["speed_kts", "kts"],
      "option-kph": ["speed_kph", "kph"],
      "option-mph": ["speed_mph", "mph"],
    };
    let [windSpeedKey, windLabel] = windUnitMap[windId] || windUnitMap["option-kts"];
    let windDegrees = metar.wind.degrees;
    let windSpeed = metar.wind[windSpeedKey];
    let liWinds = document.createElement("li");
    liWinds.className = "list-group-item";
    liWinds.innerHTML = `<span class="badge text-bg-success rounded-pill">WINDS</span> <span>${windDegrees}° / ${windSpeed} ${windLabel}</span>`;
    ul.appendChild(liWinds);

    // Temperature
    let tempId = getSelectedRadioId("temp");
    let tempUnitMap = {
      "option-celsius": ["temperature", "celsius", "°C"],
      "option-fahrenheit": ["temperature", "fahrenheit", "°F"],
    };
    let [tempObjKey, tempValKey, tempLabel] = tempUnitMap[tempId] || tempUnitMap["option-celsius"];
    let liTemp = document.createElement("li");
    liTemp.className = "list-group-item";
    liTemp.innerHTML = `<span class="badge text-bg-warning rounded-pill">TEMPERATURE</span> <span>${metar[tempObjKey][tempValKey]} ${tempLabel}</span>`;
    ul.appendChild(liTemp);
    // Altimeter
    let altimId = getSelectedRadioId("altimeter");
    let altimeterUnitMap = {
      "option-hg": ["barometer", "hg", "inHg"],
      "option-mb": ["barometer", "mb", "mb"],
      "option-hpa": ["barometer", "hpa", "hPa"],
    };
    let [altimObjKey, altimValKey, altimLabel] = altimeterUnitMap[altimId] || altimeterUnitMap["option-hg"];
    let liAltim = document.createElement("li");
    liAltim.className = "list-group-item";
    liAltim.innerHTML = `<span class="badge text-bg-info rounded-pill">ALTIMETER</span> <span>${metar[altimObjKey][altimValKey]} ${altimLabel}</span>`;
    ul.appendChild(liAltim);

    // Raw METAR
    let raw = document.createElement("div");
    raw.className = "alert alert-light";
    raw.textContent = metar.raw_text;
    body.appendChild(raw);

    body.appendChild(ul);
    card.appendChild(body);
    container.appendChild(card);
  });
}

// Helper to get selected radio id by group name
function getSelectedRadioId(name) {
  let el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.id : null;
}

function updateDisplayedValues() {
  if (!Array.isArray(latestMetars) || latestMetars.length === 0) return;

  // For each METAR, update the corresponding card if it exists
  // (Assumes cards are re-rendered with displayMetarCards, but this will update in-place if needed)
  const cards = document.querySelectorAll(".results-container .card");
  latestMetars.forEach((metar, idx) => {
    const card = cards[idx];
    if (!card) return;

    // Update time
    const timeElem = card.querySelector(".list-group-item:nth-child(1) span:last-child");
    if (timeElem) {
      timeElem.textContent = new Date(metar.observed + "Z").toUTCString();
    }

    // Update winds
    const windId = getSelectedRadioId("winds");
    const windUnitMap = {
      "option-kts": ["speed_kts", "kts"],
      "option-kph": ["speed_kph", "kph"],
      "option-mph": ["speed_mph", "mph"],
    };
    const [windSpeedKey, windLabel] = windUnitMap[windId] || windUnitMap["option-kts"];
    const windDegrees = metar.wind.degrees;
    const windSpeed = metar.wind[windSpeedKey];
    const windElem = card.querySelector(".list-group-item:nth-child(2) span:last-child");
    if (windElem) {
      windElem.textContent = `${windDegrees}° / ${windSpeed} ${windLabel}`;
    }

    // Update temperature
    const tempId = getSelectedRadioId("temp");
    const tempUnitMap = {
      "option-celsius": ["temperature", "celsius", "°C"],
      "option-fahrenheit": ["temperature", "fahrenheit", "°F"],
    };
    const [tempObjKey, tempValKey, tempLabel] = tempUnitMap[tempId] || tempUnitMap["option-celsius"];
    const tempElem = card.querySelector(".list-group-item:nth-child(3) span:last-child");
    if (tempElem) {
      tempElem.textContent = `${metar[tempObjKey][tempValKey]} ${tempLabel}`;
    }

    // Update altimeter
    const altimId = getSelectedRadioId("altimeter");
    const altimeterUnitMap = {
      "option-hg": ["barometer", "hg", "inHg"],
      "option-mb": ["barometer", "mb", "mb"],
      "option-hpa": ["barometer", "hpa", "hPa"],
    };
    const [altimObjKey, altimValKey, altimLabel] = altimeterUnitMap[altimId] || altimeterUnitMap["option-hg"];
    const altimElem = card.querySelector(".list-group-item:nth-child(4) span:last-child");
    if (altimElem) {
      altimElem.textContent = `${metar[altimObjKey][altimValKey]} ${altimLabel}`;
    }
  });
}

function blurSearch() {
  if (!document.body.classList.contains('results-active') && document.getElementById('query').innerHTML == "") {
    document.body.classList.remove('search-active');
  }
}

// Attach event listeners once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('input[type=radio]').forEach((input) => {
    input.addEventListener("change", () => {
      if (latestMetars.length > 1) {
        displayMetarCards();
      } else {
        updateDisplayedValues();
      }
    });
  });

  let searchBox = document.getElementById('query');
  searchBox.addEventListener("keypress", function (event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
      // Cancel the default action, if needed
      event.preventDefault();
      // Trigger the button element with a click
      document.getElementById("submit-btn").click();
    }
  });

  let settingsBtn = document.getElementById("settings-btn");
  let settingsModal = document.getElementById("settingsModal");

  // Toggle active class on modal show/hide
  settingsModal.addEventListener('show.bs.modal', () => {
    settingsBtn.classList.add('active');
  });

  settingsModal.addEventListener('hide.bs.modal', () => {
    settingsBtn.classList.remove('active');
  });
});

