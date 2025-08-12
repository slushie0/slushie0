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

let cloudDesc = {
  FEW: "Few",
  SCT: "Scattered",
  BKN: "Broken",
  OVC: "Overcast",
  CLR: "Clear",
  SKC: "Sky Clear",
  VV: "Vertical Visibility"
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
let latestAirports = []

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

async function getMetar() {
  let airports = document.querySelector("#query").value
    .split(/\s+/)
    .filter(code => /^[A-Za-z0-9]{4}$/.test(code))
    .join();

  if (airports === "") {
    showError("Please enter a valid airport identifier");
    return;
  }

  let airport_response = await fetch(`https://wx-backend.vercel.app/airport/${airports}`).catch((err) => {
    console.error("Error fetching airport data:", err);
    showError("Failed to fetch airport data. Please try again");
  });
  let airport_data = await airport_response.json();
  let metar_response = await fetch(`https://wx-backend.vercel.app/metar/${airports}`).catch((err) => {
    console.error("Error fetching METAR data:", err);
    showError("Failed to fetch METAR data. Please try again");
  });
  metar_data = await metar_response.json();
  if (metar_data.results === 0) {
    showError("This airport has no METAR");
    return;
  }
  showError("");
  latestMetars = await metar_data.data;
  displayMetarCards();
}

function displayMetarCards() {
  let container = document.querySelector(".results");

  while (container.children.length > 0) {
    container.removeChild(container.lastChild);
  }

  latestMetars.forEach((metar) => {

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

    // Prepare all list items
    let items = [];

    // Time
    let liTime = document.createElement("li");
    liTime.className = "list-group-item";
    liTime.innerHTML = `<span class="badge text-bg-primary rounded-pill">DATE</span> <span>${new Date(metar.observed + "Z").toUTCString()}</span>`;
    items.push(liTime);

    // Winds (with gusts)
    let windId = getSelectedRadioId("winds");
    let windUnitMap = {
      "option-kts": ["speed_kts", "kts"],
      "option-kph": ["speed_kph", "kph"],
      "option-mph": ["speed_mph", "mph"],
    };
    let [windSpeedKey, windLabel] = windUnitMap[windId] || windUnitMap["option-kts"];
    let windDegrees = metar.wind.degrees;
    let windSpeed = metar.wind[windSpeedKey];
    let windGust = metar.wind[`gust_${windLabel}`];
    let gustText = windGust ? ` (gusts ${windGust} ${windLabel})` : "";
    let liWinds = document.createElement("li");
    liWinds.className = "list-group-item";
    liWinds.innerHTML = `<span class="badge text-bg-success rounded-pill">WINDS</span> <span>${windDegrees}° / ${windSpeed} ${windLabel}${gustText}</span>`;
    items.push(liWinds);

    // Temperature
    let tempId = getSelectedRadioId("temp");
    let tempUnitMap = {
      "option-celsius": ["temperature", "celsius", "°C"],
      "option-fahrenheit": ["temperature", "fahrenheit", "°F"],
    };
    let [tempObjKey, tempValKey, tempLabel] = tempUnitMap[tempId] || tempUnitMap["option-celsius"];
    let temperature = metar.temperature ? (metar.temperature[tempValKey] + " " + tempLabel) : "N/A";
    let liTemp = document.createElement("li");
    liTemp.className = "list-group-item";
    liTemp.innerHTML = `<span class="badge text-bg-warning rounded-pill">TEMPERATURE</span> <span>${temperature}</span>`;
    items.push(liTemp);

    // Dewpoint
    let dewpoint = metar.dewpoint ? (metar.dewpoint[tempValKey] + " " + tempLabel) : "N/A";
    let liDew = document.createElement("li");
    liDew.className = "list-group-item";
    liDew.innerHTML = `<span class="badge text-bg-danger rounded-pill">DEWPOINT</span> <span>${dewpoint}</span>`;
    items.push(liDew);

    // Visibility
    let visId = getSelectedRadioId("vis");
    let visUnitMap = {
      "option-vis-sm": ["miles", "sm"],
      "option-vis-m": ["meters", "m"],
    };
    let [visKey, visLabel] = visUnitMap[visId] || visUnitMap["option-vis-sm"];
    let visValue = metar.visibility && metar.visibility[visKey] !== undefined ? metar.visibility[visKey] : "N/A";
    let liVis = document.createElement("li");
    liVis.className = "list-group-item";
    liVis.innerHTML = `<span class="badge text-bg-dark rounded-pill">VISIBILITY</span> <span>${visValue} ${visValue !== "N/A" ? visLabel : ""}</span>`;
    items.push(liVis);

    // Clouds
    let liClouds = document.createElement("li");
    liClouds.className = "list-group-item";
    liClouds.innerHTML = `<span class="badge text-bg-light rounded-pill">CLOUDS</span>`;
    let cloudUnitId = getSelectedRadioId("height");
    let cloudUnitMap = {
      "option-ft": ["base_feet_agl", "ft"],
      "option-m": ["base_meters_agl", "m"],
    };
    let [cloudBaseKey, cloudBaseLabel] = cloudUnitMap[cloudUnitId] || cloudUnitMap["option-ft"];
    if (Array.isArray(metar.clouds) && metar.clouds.length > 0) {
      let sortedClouds = [...metar.clouds].sort((a, b) => {
        let aVal = a[cloudBaseKey] ?? Infinity;
        let bVal = b[cloudBaseKey] ?? Infinity;
        return bVal - aVal;
      });
      let cloudsHtml = sortedClouds.map(cloud => {
        let desc = cloudDesc[cloud.code] || cloud.code;
        let base = (cloud[cloudBaseKey] !== undefined && cloud[cloudBaseKey] !== null) ? `${cloud[cloudBaseKey]} ${cloudBaseLabel}` : "";
        let type = cloud.type ? ` (${cloud.type})` : "";
        let isCeiling = cloud.code === "BKN" || cloud.code === "OVC";
        return `<div class="cloud-layer${isCeiling ? " cloud-ceiling" : ""}">
          <span class="cloud-text">${desc}${base ? " " + base : ""}${type}</span>
          <span class="cloud-underline"></span>
        </div>`;
      }).join("");
      liClouds.innerHTML += `<div>${cloudsHtml}</div>`;
    } else {
      liClouds.innerHTML += `<span>Clear</span>`;
    }
    items.push(liClouds);

    // Altimeter
    let altimId = getSelectedRadioId("altimeter");
    let altimeterUnitMap = {
      "option-hg": ["barometer", "hg", "Hg"],
      "option-mb": ["barometer", "mb", "mb"],
      "option-hpa": ["barometer", "hpa", "hPa"],
    };
    let [altimObjKey, altimValKey, altimLabel] = altimeterUnitMap[altimId] || altimeterUnitMap["option-hg"];
    let liAltim = document.createElement("li");
    liAltim.className = "list-group-item";
    liAltim.innerHTML = `<span class="badge text-bg-info rounded-pill">ALTIMETER</span> <span>${metar[altimObjKey][altimValKey]} ${altimLabel}</span>`;
    items.push(liAltim);

    // Pressure Altitude
    let densityAlt = "N/A";
    let pressureAlt = "N/A";
    if (metar.elevation && metar.elevation.feet && metar.barometer && metar.barometer.hg) {
      let pa = Math.round(
        Number(metar.elevation.feet) + (29.92 - Number(metar.barometer.hg)) * 1000
      );
      pressureAlt = pa + " ft";
    }
    if (
      metar.elevation && metar.elevation.feet &&
      metar.barometer && metar.barometer.hg &&
      metar.temperature && typeof metar.temperature.celsius === "number"
    ) {
      let pa = Number(metar.elevation.feet) + (29.92 - Number(metar.barometer.hg)) * 1000;
      let isa = 15 - (2 * Number(metar.elevation.feet) / 1000);
      let da = Math.round(pa + 120 * (Number(metar.temperature.celsius) - isa));
      densityAlt = da + " ft";
    }
    let liPA = document.createElement("li");
    liPA.className = "list-group-item";
    liPA.innerHTML = `<span class="badge text-bg-secondary rounded-pill">PRESSURE ALT</span> <span>${pressureAlt}</span>`;
    items.push(liPA);

    let liDA = document.createElement("li");
    liDA.className = "list-group-item";
    liDA.innerHTML = `<span class="badge text-bg-secondary rounded-pill">DENSITY ALT</span> <span>${densityAlt}</span>`;
    items.push(liDA);

    // Split into two columns
    let col1 = document.createElement("ul");
    col1.className = "list-group";
    let col2 = document.createElement("ul");
    col2.className = "list-group";

    // Adjust the split as you like; here, half and half
    let mid = Math.ceil(items.length / 2);
    items.slice(0, mid).forEach(item => col1.appendChild(item));
    items.slice(mid).forEach(item => col2.appendChild(item));

    let row = document.createElement("div");
    row.className = "row";
    let colDiv1 = document.createElement("div");
    colDiv1.className = "col-12 col-md-6";
    let colDiv2 = document.createElement("div");
    colDiv2.className = "col-12 col-md-6";
    colDiv1.appendChild(col1);
    colDiv2.appendChild(col2);
    row.appendChild(colDiv1);
    row.appendChild(colDiv2);

    body.appendChild(row);

    // Raw METAR
    let raw = document.createElement("div");
    raw.className = "alert alert-light mt-3";
    raw.textContent = metar.raw_text;
    body.appendChild(raw);

    card.appendChild(body);
    container.appendChild(card);
  });
}

// Helper to get selected radio id by group name
function getSelectedRadioId(name) {
  let el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.id : null;
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
      displayMetarCards();
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

