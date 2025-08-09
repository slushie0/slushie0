let data = {};
Papa.parse("airport-codes.csv", {
    download: true,
    header: true,
    complete: function(results) {
        data = results.data.map(element => ({ident: element.ident, type:element.type, name: element.name, municipality: element.municipality}))
        //console.log("Finished:", data);
    }
});

window.addEventListener('click', function(e){
    let div = document.querySelector("#search-results");
    if (document.getElementById('query').contains(e.target)) {
        div.classList.remove("visually-hidden");
    } else {
        div.classList.add("visually-hidden");
    }
});

const sizeOrder = {
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
    const regex = new RegExp(query.value, 'i');
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
        item.innerHTML = '<span>'+ident+'</span> - <span>'+name+'</span> - <span>'+municipality+'</span>';
        item.className = "list-group-item list-group-item-action";
        item.href = "#";
        item.onclick = () => {
            query.value = ident;
            getMetar();
        }
        searchResults.appendChild(item);
    }
}

let latestMetar = null;

function triggerSearch() {
  if (!document.body.classList.contains('search-active')) {
    getMetar();
    document.body.classList.add('search-active');
  } else {
    getMetar();
  }
}

function showError(message) {
  const errorBox = document.getElementById('error');
  if (message) {
    errorBox.textContent = message;
    errorBox.classList.remove('visually-hidden');
  } else {
    errorBox.classList.add('visually-hidden');
  }
}

function getMetar() {
  let airport = document.querySelector("#query").value.trim();

  if (!airport) {
    showError("Please enter an airport identifier.");
    return;
  }

  fetch(`https://api.checkwx.com/metar/${airport}/decoded?x-api-key=2ca75acd9f4f4b35846b89c8cf`)
    .then((response) => response.json())
    .then((data) => {
      if (data.results === 0) {
        showError("This airport has no METAR. Nearest METAR is:");
        $("#raw-metar").text("");
        $.ajax({
          url: `https://api.checkwx.com/metar/${airport}/nearest/decoded`,
          method: "GET",
          headers: { "X-API-Key": "2ca75acd9f4f4b35846b89c8cf" },
        }).done((res2) => {
          $("#raw-metar").text(res2.data[0]);
        });
        return;
      }

      showError("");
      latestMetar = data.data[0];
      document.querySelector("#raw-metar").textContent = latestMetar.raw_text;
      updateDisplayedValues();
    })
    .catch(() => {
      showError("Failed to fetch METAR data. Please try again.");
    });
}

function updateDisplayedValues() {
  if (!latestMetar) return;

  // TIME
  document.querySelector("#time").textContent =
    new Date(latestMetar.observed + "Z").toUTCString();

  // Mappings for unit keys and labels
  const tempUnitMap = {
    "option-celsius": ["temperature", "celsius", "°C"],
    "option-fahrenheit": ["temperature", "fahrenheit", "°F"],
  };
  const altimeterUnitMap = {
    "option-hg": ["barometer", "hg", "inHg"],
    "option-mb": ["barometer", "mb", "mb"],
    "option-hpa": ["barometer", "hpa", "hPa"],
  };
  const windUnitMap = {
    "option-kts": ["speed_kts", "kts"],
    "option-kph": ["speed_kph", "kph"],
    "option-mph": ["speed_mph", "mph"],
  };

  // Helper to get selected radio id by group name
  const getSelectedRadioId = (name) => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.id : null;
  };

  // Temperature
  let tempId = getSelectedRadioId("temp");
  let [tempObjKey, tempValKey, tempLabel] = tempUnitMap[tempId] || tempUnitMap["option-celsius"];
  document.querySelector("#temp").textContent = `${latestMetar[tempObjKey][tempValKey]} ${tempLabel}`;

  // altimeter
  let altimId = getSelectedRadioId("altimeter");
  let [altimObjKey, altimValKey, altimLabel] = altimeterUnitMap[altimId] || altimeterUnitMap["option-hg"];
  document.querySelector("#altimeter").textContent = `${latestMetar[altimObjKey][altimValKey]} ${altimLabel}`;

  // Winds
  let windId = getSelectedRadioId("winds");
  let [windSpeedKey, windLabel] = windUnitMap[windId] || windUnitMap["option-kts"];
  let degrees = latestMetar.wind.degrees;
  let speed = latestMetar.wind[windSpeedKey];
  document.querySelector("#winds").textContent = `${degrees}° / ${speed} ${windLabel}`;

 
}

// Attach event listeners once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('input[type=radio]').forEach((input) => {
    input.addEventListener("change", updateDisplayedValues);
  });
});
