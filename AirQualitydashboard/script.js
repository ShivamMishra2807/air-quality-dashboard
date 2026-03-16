let chart;
let gaugeChart;
let map;

function createGauge(aqi) {
    const ctx = document.getElementById("gaugeChart");

    let color;
    if (aqi <= 50) color = "green";
    else if (aqi <= 100) color = "yellow";
    else if (aqi <= 150) color = "orange";
    else if (aqi <= 200) color = "red";
    else color = "purple";

    if (gaugeChart) {
    gaugeChart.destroy();
    }

    gaugeChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            datasets: [{
                data: [Math.min(aqi, 300), Math.max(300 - Math.min(aqi, 300), 0)],
                backgroundColor: [color, "#eaeaea"],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            rotation: -90,
            circumference: 180,
            cutout: "65%",
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

async function getData() {
    const city = document.getElementById("city").value.trim();

    if (!city) {
        alert("Please enter a city name");
        return;
    }
    const token = "5d2f2667f7540ba5facd2e6d4de9d2f4fe347cae";
    const response = await fetch(`https://api.waqi.info/feed/${city}/?token=${token}`);
    const data = await response.json();
    if (data.status !== "ok") {
        alert("City not found");
        return;
    }
    updateDashboard(data.data);
    loadWeather(city);
}
function updateDashboard(data) {
    const aqi = data.aqi;
    document.getElementById("aqi").innerText = aqi;
    document.getElementById("quality").innerText = getQuality(aqi);
    document.getElementById("station").innerText = "Station: " + data.city.name;
    document.getElementById("updated").innerText = "Updated: " + data.time.s;

    const pollutants = data.iaqi || {};
    document.getElementById("pm25").innerText = pollutants.pm25 ? pollutants.pm25.v : "N/A";
    document.getElementById("pm10").innerText = pollutants.pm10 ? pollutants.pm10.v : "N/A";
    document.getElementById("co").innerText = pollutants.co ? pollutants.co.v : "N/A";
    document.getElementById("no2").innerText = pollutants.no2 ? pollutants.no2.v : "N/A";

    const percent = Math.min((aqi / 300) * 100, 100);
    document.getElementById("indicator").style.left = percent + "%";
    createGauge(aqi);
    createChart(aqi);
    updateSummary(aqi, pollutants);
    if (data.city.geo && data.city.geo.length >= 2) {
        const lat = data.city.geo[0];
        const lon = data.city.geo[1];
        initMap(lat, lon, aqi);
    }
}

async function loadWeather(city) {
    const key = "4903d81f7f5136164bee930d0cdc416f";

    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`);
        const data = await res.json();

        if (!data.main || !data.wind) return;

        document.getElementById("temp").innerText = data.main.temp;
        document.getElementById("humidity").innerText = data.main.humidity;
        document.getElementById("wind").innerText = data.wind.speed;
    } catch (error) {
        console.log("Weather data error:", error);
    }
}

function createChart(aqi) {
    const ctx = document.getElementById("aqiChart");

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: ["1 hr", "2 hr", "3 hr", "4 hr", "5 hr"],
            datasets: [{
                label: "AQI Trend",
                data: [
                    Math.max(aqi - 20, 0),
                    Math.max(aqi - 10, 0),
                    aqi,
                    aqi + 5,
                    aqi + 10
                ],
                borderColor: "#ff4d4d",
                backgroundColor: "rgba(255,77,77,0.2)",
                tension: 0.4,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#ffffff"
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#ffffff" },
                    grid: { color: "rgba(255,255,255,0.2)" }
                },
                y: {
                    ticks: { color: "#ffffff" },
                    grid: { color: "rgba(255,255,255,0.2)" }
                }
            }
        }
    });
}

function initMap(lat, lon, aqi) {
    if (map) {
        map.remove();
    }

    map = L.map("map").setView([lat, lon], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    L.marker([lat, lon])
        .addTo(map)
        .bindPopup("AQI: " + aqi)
        .openPopup();
}

function detectLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const token = "5d2f2667f7540ba5facd2e6d4de9d2f4fe347cae";

        try {
            const res = await fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`);
            const data = await res.json();

            if (data.status !== "ok") {
                alert("Unable to fetch location AQI");
                return;
            }

            updateDashboard(data.data);

            const cityName = data.data.city && data.data.city.name ? data.data.city.name.split(",")[0] : "";
            if (cityName) {
                loadWeather(cityName);
            }
        } catch (error) {
            console.log("Location AQI error:", error);
        }
    }, () => {
        alert("Unable to access your location");
    });
}

function updateSummary(aqi, pollutants) {
    let airStatus = "--";
    let mainConcern = "--";
    let outdoorAdvice = "--";
    let maskAdvice = "--";

    const pm25 = pollutants.pm25 ? pollutants.pm25.v : null;
    const pm10 = pollutants.pm10 ? pollutants.pm10.v : null;
    const no2 = pollutants.no2 ? pollutants.no2.v : null;
    const co = pollutants.co ? pollutants.co.v : null;

    if (aqi <= 50) {
        airStatus = "Good";
        outdoorAdvice = "Safe for normal outdoor activity";
        maskAdvice = "Not necessary";
    } else if (aqi <= 100) {
        airStatus = "Moderate";
        outdoorAdvice = "Okay, but sensitive people should be careful";
        maskAdvice = "Optional for sensitive people";
    } else if (aqi <= 150) {
        airStatus = "Unhealthy for Sensitive";
        outdoorAdvice = "Reduce long outdoor activity";
        maskAdvice = "Recommended";
    } else if (aqi <= 200) {
        airStatus = "Unhealthy";
        outdoorAdvice = "Limit outdoor exposure";
        maskAdvice = "Recommended";
    } else if (aqi <= 300) {
        airStatus = "Very Unhealthy";
        outdoorAdvice = "Avoid outdoor activity";
        maskAdvice = "Strongly recommended";
    } else {
        airStatus = "Hazardous";
        outdoorAdvice = "Stay indoors";
        maskAdvice = "Necessary if going outside";
    }

    const pollutantValues = [
        { name: "PM2.5", value: pm25 || 0 },
        { name: "PM10", value: pm10 || 0 },
        { name: "NO₂", value: no2 || 0 },
        { name: "CO", value: co || 0 }
    ];

    pollutantValues.sort((a, b) => b.value - a.value);
    mainConcern = pollutantValues[0].value > 0 ? pollutantValues[0].name : "No major pollutant data";

    document.getElementById("airStatus").innerText = airStatus;
    document.getElementById("mainConcern").innerText = mainConcern;
    document.getElementById("outdoorAdvice").innerText = outdoorAdvice;
    document.getElementById("maskAdvice").innerText = maskAdvice;
}

function getQuality(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
}



document.getElementById("city").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        getData();
    }
});