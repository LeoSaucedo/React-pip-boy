import Battery from "./device/battery.js";
import Language from "./device/language.js";

import Coordinates from "./position/coordinates.js";
import Timezone from "./position/timezone.js";

export default {
  categories: [
    {
      name: "STAT",
      active: true,
      items: [
        {
          displayName: "STATUS",
          dataDescription: "General status overview.",
          active: true,
          generateData() {
            const b = new Battery();
            const getDate = () => {
              const now = new Date();
              return now.toLocaleDateString([], {
                year: "numeric",
                month: "short",
                day: "2-digit",
              });
            };
            const getTime = () => {
              const now = new Date();
              return now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              });
            };
            const getBattery = () => b.generateData();
            const wmoText = (code) => {
              const map = {
                0: "Clear sky",
                1: "Mainly clear",
                2: "Partly cloudy",
                3: "Overcast",
                45: "Fog",
                48: "Depositing rime fog",
                51: "Light drizzle",
                53: "Moderate drizzle",
                55: "Dense drizzle",
                56: "Freezing drizzle: light",
                57: "Freezing drizzle: dense",
                61: "Slight rain",
                63: "Moderate rain",
                65: "Heavy rain",
                66: "Freezing rain: light",
                67: "Freezing rain: heavy",
                71: "Slight snow",
                73: "Moderate snow",
                75: "Heavy snow",
                77: "Snow grains",
                80: "Rain showers: slight",
                81: "Rain showers: moderate",
                82: "Rain showers: violent",
                85: "Snow showers: slight",
                86: "Snow showers: heavy",
                95: "Thunderstorm",
                96: "Thunderstorm with slight hail",
                99: "Thunderstorm with heavy hail",
              };
              return map[code] || `WMO ${code}`;
            };
            const getWeather = () =>
              new Promise((resolve) => {
                if (!navigator.geolocation) {
                  resolve("Weather: N/A");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const { latitude, longitude } = pos.coords;
                    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
                    fetch(url)
                      .then((r) => r.json())
                      .then((json) => {
                        const curr = (json && json.current) || {};
                        const temp = curr.temperature_2m;
                        const code = curr.weather_code;
                        const text =
                          typeof code !== "undefined" ? wmoText(code) : "N/A";
                        resolve(
                          `Temp: ${
                            typeof temp !== "undefined" ? temp + "°F" : "N/A"
                          }\nWeather: ${text}`
                        );
                      })
                      .catch(() => resolve("Temp: N/A"));
                  },
                  () => resolve("Temp: N/A")
                );
              });

            return new Promise((resolve) => {
              Promise.all([getBattery(), getWeather()])
                .then(([battery, weather]) => {
                  const date = getDate();
                  resolve(`${date}\nBattery: ${battery}\n${weather}`);
                })
                .catch(() => {
                  const date = getDate();
                  resolve(`${date}\nBattery: N/A\nWeather: N/A`);
                });
            });
          },
        },
        {
          displayName: "S.P.E.C.I.A.L.",
          dataDescription: "Primary attributes.",
          active: false,
          generateData() {
            return new Promise((resolve) => resolve("Not implemented"));
          },
        },
        {
          displayName: "PERKS",
          dataDescription: "Acquired perks.",
          active: false,
          generateData() {
            return new Promise((resolve) => resolve("Not implemented"));
          },
        },
      ],
    },
    {
      name: "INV",
      active: false,
      items: [
        {
          displayName: "WEAP",
          dataDescription: "Weapons.",
          active: true,
          generateData() {
            return new Promise((r) => r("Empty"));
          },
        },
        {
          displayName: "APP",
          dataDescription: "Apparel.",
          active: false,
          generateData() {
            return new Promise((r) => r("Empty"));
          },
        },
        {
          displayName: "AID",
          dataDescription: "Aid items.",
          active: false,
          generateData() {
            return new Promise((r) => r("Empty"));
          },
        },
        {
          displayName: "MISC",
          dataDescription: "Misc items.",
          active: false,
          generateData() {
            return new Promise((r) => r("Empty"));
          },
        },
        {
          displayName: "JUNK",
          dataDescription: "Junk.",
          active: false,
          generateData() {
            return new Promise((r) => r("Empty"));
          },
        },
        {
          displayName: "MOD",
          dataDescription: "Mods.",
          active: false,
          generateData() {
            return new Promise((r) => r("Empty"));
          },
        },
        {
          displayName: "AMMO",
          dataDescription: "Ammunition.",
          active: false,
          generateData() {
            return new Promise((r) => r("Empty"));
          },
        },
      ],
    },
    {
      name: "DATA",
      active: false,
      items: [
        {
          displayName: "SCHEDULE",
          dataDescription: "Event schedule overview.",
          active: true,
          generateData() {
            return new Promise((resolve) => {
              const text = [
                "Please Note: Schedule is subject to change up until and including during the event itself.",
                "",
                "FRIDAY - November 14th",
                "- 9am til Dark: Vendor Village",
                "- 9:30am - 11am: Fallout For Hope Goodsprings Walk",
                "- 10am - 10:45am: The Gearstore - Panel",
                "- 11am - 11:45am: The Wand Company Panel",
                "- 12pm: Caravan on the Deck",
                "- 12pm - 1:30pm: Travel to Real World Locations Panel",
                "- 12pm - 4pm: B-Side Band Live",
                "- 2pm - 3:30pm: Meet The Modders: A Fallout Mod Creator Roundtable",
                "- 4pm - 5:30pm: Fallout: New Vegas Speedrun w/ Zehl Sketch",
                "- 4pm - 6pm: Fallout Family Feud",
                "- 4:15pm - 5:45pm: Wes Johnson VoiceAPalooza Panel",
                "- 6pm - 10pm: Fallout Karaoke",
                "",
                "SATURDAY - November 15th",
                "- 9am til Dark: Vendor Village",
                "- 10am - 12pm: Wheel of Fortune Game Show",
                "- 10am - 11:30am: Fallout: New Vegas 15th Anniversary - Panel",
                "- 11:30am - 12:30pm: Radiation King Refurbishing - Panel",
                "- 12pm: Poker on the Deck",
                "- 12pm - 1:30pm: Nuka Break Behind the Scenes",
                "- 12pm - 4pm: High Blue Cactus Live",
                "- 1pm - 3pm: 3D Printing Workshop",
                "- 2pm - 3:30pm: Podcast Creator Panel",
                "- 4pm - 6pm: Fallout Family Feud",
                "- 4:15pm - 5:45pm: The Making of Amazon Prime’s “Fallout” Season 1 (special guests include cast and crew from the series with Q&A)",
                "- 5pm - 6pm: Independent Fallout Wiki Panel",
                "- 6pm - 7:30pm: Independent Fallout Wiki Trivia",
                "- 6pm - 10pm: Fallout Karaoke",
                "",
                "SUNDAY - November 16th",
                "- Mojave Mayhem at Sandy Valley Ranch (9am - 9pm)",
                "- 9am til Dark: Vendor Village",
                "- 9am - 10:30am: Audio Drama Panel",
                "- 10am - 12pm: Craftable Souvenirs Workshop",
                "- 10am - 11:30am: Fallout 4 10th Anniversary - Panel",
                "- 10am - 12pm: The Caps are Right Game Show",
                "- 12pm: Poker on the Deck",
                "- 12pm - 4pm: Sonic Shakers Live",
                "- 4pm - 6pm: Fallout Family Feud",
                "- 6pm - 7:30pm: Independent Fallout Wiki Trivia",
              ].join("\n");
              resolve(text);
            });
          },
        },
        {
          displayName: "QUESTS",
          dataDescription: "Active quests.",
          active: false,
          generateData() {
            return new Promise((resolve) => {
              const text = [
                "Fallout Fan Celebration 2025 - Goodsprings, NV (Nov 14-16)",
                "",
                "[ ] Buy Tickets - $45 (advance online)",
                "[ ] Check Schedule & Guests",
                "[ ] Ride Wasteland Express - Buffalo Bills ⇄ Pioneer Saloon (Days 1-2) + Sandy Valley (Day 3: Mojave Mayhem)",
                "[ ] Read S.P.E.C.I.A.L. PSAs - Sunscreen, Parking, Emergency, Caution, Identification, Avoid, Liquids",
                "[ ] Explore: Extra Tours, Culinary Gauntlet",
                "[ ] Enter: Cosplay Contest",
                "[ ] Attend: Film Festival",
                "[ ] Review: Code of Conduct",
              ].join("\n");
              resolve(text);
            });
          },
        },
        {
          displayName: "SHUTTLES",
          dataDescription: "Event shuttle routes and hubs.",
          active: false,
          generateData() {
            return new Promise((resolve) => {
              const text = [
                "Shuttle: Wasteland Express (included with event ticket)",
                "Primm - Buffalo Bills (Lodging & Shuttle Hub)",
                "Goodsprings - Pioneer Saloon (Main venue)",
                "Sandy Valley - Mojave Mayhem (Day 3)",
                "",
                "Routes:",
                "- Buffalo Bills ⇄ Pioneer Saloon (Fri-Sat)",
                "- Pioneer Saloon ⇄ Sandy Valley Ranch (Sun)",
              ].join("\n");
              resolve(text);
            });
          },
        },
        {
          displayName: "STATS",
          dataDescription: "Various statistics.",
          active: false,
          generateData() {
            return new Promise((resolve) => {
              const text = [
                "Dates: Nov 14-16, 2025 (Fri-Sun)",
                "Location: Goodsprings, NV",
                "Ticket: $45 (age 5+)",
                "Shuttle: Included (Buffalo Bills ⇄ Pioneer Saloon; + Sandy Valley Day 3)",
                "Organizers: Pioneer Saloon & Buttered Popcorn Entertainment",
                "",
                "Activities: Extra Tours, Mojave Mayhem, Culinary Gauntlet, Cosplay Contest, Film Festival",
                "Info: About • Guests • Schedule • FAQ • Newsreels • Code of Conduct",
              ].join("\n");
              resolve(text);
            });
          },
        },
      ],
    },
    {
      name: "MAP",
      active: false,
      items: [
        {
          displayName: "LOCAL MAP",
          dataDescription: "Local vicinity.",
          active: true,
          generateData() {
            const t = new Timezone();
            return t.generateData();
          },
        },
        {
          displayName: "WORLD MAP",
          dataDescription: "World overview.",
          active: false,
          generateData() {
            const c = new Coordinates();
            return c.generateData();
          },
        },
      ],
    },
    {
      name: "RADIO",
      active: false,
      items: [
        {
          displayName: "RADIO",
          dataDescription: "Tune to stations.",
          active: true,
          generateData() {
            return new Promise((r) => r("No stations"));
          },
        },
      ],
    },
  ],
};
