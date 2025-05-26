// StarWars API Code
// This code intentionally violates clean code principles for refactoring practice

const http = require("http");
const https = require("https");


const cache = {};
let debug_mode = true;
let timeout = 5000;
let err_count = 0;

function getFromCache(endpoint){
    if (cache[endpoint]) {
        if (debug_mode) { 
            console.log("Using cached data for", endpoint);
        }
        return cache[endpoint];
    }
    return  false;
}

// const timeout = 5000;
// const err_count = 0;
// async function fetchFromSwapi(endpoint) {
//     const debug_mode = true;
//     const cache = getFromCache(endpoint); 
//     if (cache[endpoint]) {
//         if (debug_mode) console.log(`Using cached data for ${endpoint}`);
//         return cache[endpoint];
//     }
//     return null;
// }

function storeInCache(endpoint, data) {
    cache[endpoint] = data;
    console.log(
        `Dados para ${endpoint} armazenados no cache. Tamanho do cache: ${Object.keys(cache).length} itens.`
    ); 
}

async function fetchFromSwapi(endpoint) {
    const cached = getFromCache(endpoint);
    const codeError = 400;
    
    if (cached) {
        return cached;
    }
    
    const url = `https://swapi.dev/api/${endpoint}`;
    
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = "";
            if (res.statusCodeOk >= codeError) {
                err_count++;
                return reject(new Error(`Request failed with status code ${res.statusCodeOk}`));
            }
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const parsedData = JSON.parse(data);
                    storeInCache(endpoint, parsedData);
                    // cache[endpoint] = parsed;
                    resolve(parsedData);
                    if (debug_mode) {
                        console.log(`Fetched and cached: ${endpoint}`);
                        console.log(`Cache size: ${Object.keys(cache).length}`);
                    }
                } catch (err) {
                    err_count++;
                    reject(new Error(`JSON parse error for ${endpoint}: ${err.message}`));
                }
            });
        });
        req.on("error", (err) => {
            err_count++;
            reject(new Error(`Network error for ${endpoint}: ${err.message}`));
        });

        req.setTimeout(timeout, () => {
            req.abort();
            err_count++;
            reject(new Error(`Request timeout after ${timeout}ms for ${endpoint}`));
        });
    });
};


// Global variables for tracking state
let lastId = 1;
let fetch_count = 0;
let total_size = 0;

function printStarship(starship, index) {
    console.log(`\nStarship ${index + 1}:`);
    console.log("Name:", starship.name);
    console.log("Model:", starship.model);
    console.log("Manufacturer:", starship.manufacturer);
    console.log("Cost:", starship.cost_in_credits !== "unknown" ? `${starship.cost_in_credits} credits` : "unknown");
    console.log("Speed:", starship.max_atmosphering_speed);
    console.log("Hyperdrive Rating:", starship.hyperdrive_rating);
}

const starshipSize = 3;

function printFirst3Starships(StarshipsList) {
    for (let i = 0; i < Math.min(starshipSize, StarshipsList.results.length); i++) {
        const starship = StarshipsList.results[i];
        printStarship(starship, i);
        if (starship.pilots && starship.pilots.length > 0) {
            console.log("Pilots:", starship.pilots.length);
        }
    }
}

function planetAppearsInMovie(planet) {
    if (planet.films && planet.films.length > 0) {
        console.log(`  Appears in ${planet.films.length} films`);
        return true;
    }
    return false;
}

async function findPlanetPopulation() {
    const planets = await fetchFromSwapi("planets/?page=1");
    const minimumPopulation = 1000000000;
    const minimumDiameter = 10000;
    total_size += JSON.stringify(planets).length;
    console.log("\nLarge populated planets:");
    for (let i = 0; i < planets.results.length; i++) {
        const planet = planets.results[i];
        if (planet.population !== "unknown" && parseInt(planet.population) > minimumPopulation &&
            planet.diameter !== "unknown" && parseInt(planet.diameter) > minimumDiameter) {
            console.log(`${planet.name} - Pop: ${planet.population} - Diameter: ${planet.diameter} - Climate: ${planet.climate}`);
            if (planetAppearsInMovie(planet)) {
                return planet;
            }
        }
    }
    return null;
}

async function getFilmsAndSearchDate() {
    const films = await fetchFromSwapi("films/");
    total_size += JSON.stringify(films).length;
    const filmList = films.results;
    filmList.sort((film1, film2) => new Date(film1.release_date) - new Date(film2.release_date));
    return filmList;
}

const MAX_VEHICLE_ID_TO_FETCH = 4; // Define o número máximo de veículos a serem buscados

async function getVehicleAndDisplay() {
    if (lastId <= MAX_VEHICLE_ID_TO_FETCH) {
        const vehicle = await fetchFromSwapi(`vehicles/${lastId}`);
        total_size += JSON.stringify(vehicle).length;
        console.log("\nFeatured Vehicle:");
        console.log("Name:", vehicle.name);
        console.log("Model:", vehicle.model);
        console.log("Manufacturer:", vehicle.manufacturer);
        console.log(`Cost: ${vehicle.cost_in_credits} credits`);
        console.log("Length:", vehicle.length);
        console.log("Crew Required:", vehicle.crew);
        console.log("Passengers:", vehicle.passengers);
        lastId++;
    }

}

async function person() {
    try {
        if (debug_mode) console.log("Starting data fetch...");
        fetch_count++;

        const person1 = await fetchFromSwapi(`people/${lastId}`);
        total_size += JSON.stringify(person1).length;
        console.log("Character:", person1.name);
        console.log("Height:", person1.height);
        console.log("Mass:", person1.mass);
        console.log("Birthday:", person1.birth_year);

        if (person1.films && person1.films.length > 0) {
            console.log("Appears in", person1.films.length, "films");
        }

        const s1 = await fetchFromSwapi("starships/?page=1");
        total_size += JSON.stringify(s1).length;
        console.log("\nTotal Starships:", s1.count);
        printFirst3Starships(s1);

        const planetInFilm = await findPlanetPopulation();
        if (planetInFilm) {
            console.log("Planet found appearing in film:", planetInFilm.name);
        }

        const filmList = await getFilmsAndSearchDate();

        await getVehicleAndDisplay();

        console.log("\nStar Wars Films in chronological order:");
        for (let i = 0; i < filmList.length; i++) {
            const film = filmList[i];
            console.log(`${i + 1}. ${film.title} (${film.release_date})`);
            console.log(`   Director: ${film.director}`);
            console.log(`   Producer: ${film.producer}`);
            console.log(`   Characters: ${film.characters.length}`);
            console.log(`   Planets: ${film.planets.length}`);
        }

        if (debug_mode) {
            console.log("\nStats:");
            console.log("API Calls:", fetch_count);
            console.log("Cache Size:", Object.keys(cache).length);
            console.log("Total Data Size:", total_size, "bytes");
            console.log("Error Count:", err_count);
        }
        
    } catch (e) {
        console.error("Error:", e.message);
        err_count++;
    }
}
        
// Print stats
if (debug_mode) {
    console.log("\nStats:");
    console.log("API Calls:", fetch_count || 0);
    console.log("Cache Size:", cache ? Object.keys(cache).length : 0);
    console.log("Total Data Size:", total_size || 0, "bytes");
    console.log("Error Count:", err_count || 0);
}
        
// Process command line arguments com validação
const COMMAND_LINE_ARG_START_INDEX = 2; // Índice onde os argumentos de linha de comando úteis começam
const FLAG_NO_DEBUG = "--no-debug";
const FLAG_TIMEOUT = "--timeout";
const RADIX_DECIMAL = 10; //Base numérica para parseInt (decimal)
const MIN_TIMEOUT_VALUE = 0; // Valor mínimo permitido para o timeout (maior que 0)

const args = process.argv.slice(COMMAND_LINE_ARG_START_INDEX);

if (args.includes(FLAG_NO_DEBUG)) {
    debug_mode = false;
}
if (args.includes(FLAG_TIMEOUT)) {
    const index = args.indexOf(FLAG_TIMEOUT);

    // Verifica se há um valor após a flag --timeout
    if (index < args.length - 1) {
        const timeoutValueStr = args[index + 1];  // Pega a string do valor
        const parsedTimeout = parseInt(timeoutValueStr, RADIX_DECIMAL);
        // const val = parseInt(args[index + 1], 10);
        
        if (!isNaN(parsedTimeout) && parsedTimeout > MIN_TIMEOUT_VALUE) {
            timeout = parsedTimeout;
        } else {
            console.warn("Invalid timeout value; using default.");
        }
    }
}
        
const statusCodeOk = 200;
const internalError = 500;
const errorNotFound = 404;

const server = http.createServer(async (req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(statusCodeOk, { "Content-Type": "text/html" });
        res.end(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>Star Wars API Demo</title>
                            <style>
                                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                                h1 { color: #FFE81F; background-color: #000; padding: 10px; }
                                button { background-color: #FFE81F; border: none; padding: 10px 20px; cursor: pointer; }
                                .footer { margin-top: 50px; font-size: 12px; color: #666; }
                                pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
                            </style>
                        </head>
                        <body>
                            <h1>Star Wars API Demo</h1>
                            <p>This page demonstrates fetching data from the Star Wars API.</p>
                            <p>Check your console for the API results.</p>
                            <button onclick="fetchData()">Fetch Star Wars Data</button>
                            <div id="results"></div>
                            <script>
                                function fetchData() {
                                    document.getElementById('results').innerHTML = '<p>Loading data...</p>';
                                    fetch('/api')
                                        .then(res => res.json())
                                        .then(data => {
                                            document.getElementById('results').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                                        })
                                        .catch(err => {
                                            document.getElementById('results').innerHTML = '<p>Error: ' + err.message + '</p>';
                                        });
                                }
                            </script>
                            <div class="footer">
                                <p>API calls: ${fetch_count} | Cache entries: ${Object.keys(cache).length} | Errors: ${err_count}</p>
                                <pre>Debug mode: ${debug_mode ? "ON" : "OFF"} | Timeout: ${timeout}ms</pre>
                            </div>
                        </body>
                    </html>
                `);
    } else if (req.url === "/api") {
        try {
            const result = await person();
            res.writeHead(statusCodeOk, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "Success", result }));
        } catch (err) {
            res.writeHead(internalError, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
        }
    } else if (req.url === "/stats") {
        res.writeHead(statusCodeOk, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            api_calls: fetch_count,
            cache_size: Object.keys(cache).length,
            data_size: total_size,
            errors: err_count,
            debug: debug_mode,
            timeout: timeout
        }));
    } else {
        res.writeHead(errorNotFound, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
});

const DEFAULT_PORT = 3000; // Porta padrão para o servidor
const PORT = process.env.PORT || DEFAULT_PORT;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    if (debug_mode) {
        console.log("Debug mode: ON");
        console.log("Timeout:", timeout, "ms");
    }
});
