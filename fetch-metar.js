let data = {};
Papa.parse("airport-codes.csv", {
    download: true,
    header: true,
    complete: function(results) {
        data = results.data.map(element => ({ident: element.ident, name: element.name, municipality: element.municipality}))
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

function search() {
    let query = document.querySelector("#query");
    let searchResults = document.querySelector("#search-results");
    searchResults.innerHTML = "";
    if (query.value.length < 1) {
        return;
    }
    const regex = new RegExp(query.value, 'i');
    let newdata = data.filter((item) => Object.values(item).find((value) => regex.test(value)));

    for (let i in newdata) {
        if (i > 20) { return; }
        let ident = newdata[i].ident;
        let name = newdata[i].name;
        let municipality = newdata[i].municipality;
        let item = document.createElement("a");
        item.innerHTML = '<span>'+ident+'</span> - <span>'+name+'</span> - <span>'+municipality+'</span>';
        item.className = "list-group-item list-group-item-action";
        item.href = "#";
        item.onclick = () => {
            query.value = ident;
        }
        searchResults.appendChild(item);
    }
}

function getMetar() {
    let airport = document.querySelector("#query").value;

    fetch("https://api.checkwx.com/metar/"+airport+"?x-api-key=2ca75acd9f4f4b35846b89c8cf")
        .then((response) => response.json())
        .then((data) => {
            if (data.results == 0) {
                $("#error").text("This airport has no METAR. Nearest metar is: ");
                $("#metar").text("");
                var settings2 = {
                    "url": "https://api.checkwx.com/metar/"+airport+"/nearest",
                    "method": "GET",
                    "timeout": 0,
                    "headers": { "X-API-Key": "2ca75acd9f4f4b35846b89c8cf" },
                };
                //console.log("hi")
                $.ajax(settings2).done(function (res2) {
                    //console.log(res2);
                    $("#metar").text(res2.data[0]);
                });
                return;
            }
            document.querySelector("#error").textContent="";
            document.querySelector("#metar").textContent=data.data[0];
        });
}
