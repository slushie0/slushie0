let data = {};
Papa.parse("airport-codes.csv", {
    download: true,
    header: true,
    complete: function(results) {
        data = results.data.map(element => ({ident: element.ident, name: element.name, municipality: element.municipality}))
        console.log("Finished:", data);
    }
});

function search() {
    let query = document.querySelector("#query");
    const regex = new RegExp(query.value, 'i');
    let newdata = data.filter((item) => Object.values(item).find((value) => regex.test(value)));

    let searchResults = document.querySelector("#search-results");
    searchResults.innerHTML = "";
    for (let i in newdata) {
        if (i > 20) { return; }
        let ident = newdata[i].ident;
        let name = newdata[i].name;
        let municipality = newdata[i].municipality;
        let li = document.createElement("li");
        li.innerHTML = '<a class="dropdown-item search-item" href="#"><span>'+ident+'</span> - <span>'+name+'</span> - <span>'+municipality+'</span></a>';
        li.onclick = () => {
            query.value = ident;
        }
        searchResults.appendChild(li);
    }
}

function getMetar() {
    let airport = $("#airport").val();
    
    var settings = {
        "url": "https://api.checkwx.com/metar/"+airport,
        "method": "GET",
        "timeout": 0,
        "headers": { "X-API-Key": "2ca75acd9f4f4b35846b89c8cf" },
    };
    $.ajax(settings).done(function (res) {
        //console.log(res);
        if (res.results == 0) {
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
        $("#error").text("");
        $("#metar").text(res.data[0]);
    });
}
