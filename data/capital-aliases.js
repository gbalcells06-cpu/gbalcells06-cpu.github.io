// Grafías alternativas de capitales que se aceptan como respuesta correcta,
// además de la grafía "oficial" que ya vive en los datos de cada país
// (properties.capital / las tablas de data/i18n-names-<lang>.js).
//
// Por qué existe este fichero: normalize() en script.js solo quita mayúsculas
// y tildes, así que "Reykiavik" no coincidía con la única grafía aceptada
// para Islandia, "Reikiavik" (la de la RAE) — un jugador que sabe la
// respuesta pero la escribe con otra transliteración habitual la veía
// marcada como fallo. Este fichero añade, país a país (por ISO 3166-1
// alpha-3), una lista de grafías adicionales que también deben darse por
// buenas. No hace falta incluir la grafía oficial: ya se acepta siempre.
//
// No es (ni pretende ser) una lista exhaustiva de las ~195 capitales del
// mundo: cubre los casos más habituales de doble grafía en español (nombres
// castellanizados frente al nombre original/inglés) para no penalizar a
// quien conoce la respuesta.
const CAPITAL_ALIASES = {
  ISL: ["Reykiavik", "Reykjavik"],
  UKR: ["Kiev", "Kyiv"],
  CHN: ["Pekin", "Beijing"],
  IDN: ["Yakarta", "Jakarta"],
  ETH: ["Adis Abeba", "Addis Abeba", "Addis Ababa"],
  TCD: ["Yamena", "Ndjamena", "N'Djamena"],
  MNG: ["Ulan Bator", "Ulaanbaatar"],
  NPL: ["Katmandu", "Kathmandu"],
  SAU: ["Riad", "Riyadh"],
  IRQ: ["Bagdad", "Baghdad"],
  EGY: ["El Cairo", "Cairo"],
  RUS: ["Moscu", "Moscow"],
  POL: ["Varsovia", "Warsaw"],
  CZE: ["Praga", "Prague"],
  AUT: ["Viena", "Vienna"],
  GRC: ["Atenas", "Athens"],
  BEL: ["Bruselas", "Brussels"],
  DNK: ["Copenhague", "Copenhagen"],
  SWE: ["Estocolmo", "Stockholm"],
  SRB: ["Belgrado", "Belgrade"],
  ROU: ["Bucarest", "Bucharest"],
  SVN: ["Liubliana", "Ljubljana"],
  MKD: ["Skopie", "Skopje"],
  MDA: ["Chisinau", "Kishinev"],
  JPN: ["Tokio", "Tokyo"],
  KOR: ["Seul", "Seoul"],
  IND: ["Nueva Delhi", "New Delhi"],
  MUS: ["Puerto Luis", "Port Louis"],
  GBR: ["Londres", "London"],
  PRT: ["Lisboa", "Lisbon"],
  ITA: ["Roma", "Rome"],
  CHE: ["Berna", "Bern", "Berne"],
  EST: ["Tallin", "Tallinn"],
  TUN: ["Tunez", "Tunis"],
  ARE: ["Abu Dabi", "Abu Dhabi"],
  OMN: ["Mascate", "Muscat"],
  JOR: ["Aman", "Amman"],
  SYR: ["Damasco", "Damascus"],
  ISR: ["Jerusalen", "Jerusalem"],
  PSE: ["Ramala", "Ramallah"],
  ARM: ["Erevan", "Yerevan"],
  GEO: ["Tiflis", "Tbilisi"],
  KAZ: ["Astana", "Nur-Sultan", "Nursultan"],
  UZB: ["Taskent", "Tashkent"],
  TKM: ["Asjabad", "Ashgabat"],
  KGZ: ["Biskek", "Bishkek"],
  TJK: ["Dusambe", "Dushanbe"],
  BGD: ["Daca", "Dhaka"],
  LKA: ["Colombo", "Sri Jayawardenepura Kotte"],
  MEX: ["Ciudad de Mexico", "Mexico City", "CDMX", "DF"],
  USA: ["Washington", "Washington D.C.", "Washington DC"],
  HTI: ["Puerto Principe", "Port-au-Prince"],
  CUB: ["La Habana", "Havana"],
  AUS: ["Camberra", "Canberra"],
  COD: ["Kinsasa", "Kinshasa"],
  CIV: ["Yamusukro", "Yamoussoukro"],
  SDN: ["Jartum", "Khartoum"],
  SSD: ["Yuba", "Juba"],
  LUX: ["Luxemburgo", "Luxembourg"],
  MLT: ["La Valeta", "Valeta", "Valletta"],
  VAT: ["Ciudad del Vaticano", "Vatican City"],
  LTU: ["Vilna", "Vilnius"],
};
