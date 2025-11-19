export function getCountryName(code) {
  if (!code) return "Unknown";

  const lookup = {
    US: "United States",
    CA: "Canada",
    MX: "Mexico",

    BR: "Brazil",
    AR: "Argentina",
    CL: "Chile",
    CO: "Colombia",
    PE: "Peru",
    VE: "Venezuela",

    UK: "United Kingdom",
    EN: "England",
    IE: "Ireland",
    SC: "Scotland",
    WA: "Wales",

    FR: "France",
    DE: "Germany",
    ES: "Spain",
    IT: "Italy",
    PT: "Portugal",
    NL: "Netherlands",
    BE: "Belgium",
    SE: "Sweden",
    NO: "Norway",
    FI: "Finland",
    DK: "Denmark",
    PL: "Poland",
    UA: "Ukraine",
    RU: "Russia",
    GE: "Georgia",
    AM: "Armenia",
    KZ: "Kazakhstan",
    UZ: "Uzbekistan",
    TJ: "Tajikistan",
    BG: "Bulgaria",
    RO: "Romania",
    GR: "Greece",
    HR: "Croatia",
    RS: "Serbia",
    BA: "Bosnia & Herzegovina",
    MK: "North Macedonia",

    AU: "Australia",
    NZ: "New Zealand",

    JP: "Japan",
    KR: "South Korea",
    CN: "China",
    TW: "Taiwan",
    TH: "Thailand",
    VN: "Vietnam",
    PH: "Philippines",
    SG: "Singapore",
    MY: "Malaysia",
    IN: "India",

    ZA: "South Africa",
    NG: "Nigeria",
    GH: "Ghana",
    CM: "Cameroon",
    SN: "Senegal",
    EG: "Egypt",
    MA: "Morocco",

    TR: "Turkey",
    IL: "Israel",
    SA: "Saudi Arabia",
    AE: "United Arab Emirates",

    // Oceania / island regions used in combat sports
    FIJ: "Fiji",
    TON: "Tonga",
    SAM: "Samoa",

    // Common alternative or shorthand codes fighters sometimes use
    ENG: "England",
    SCO: "Scotland",
    WAL: "Wales",
    NIR: "Northern Ireland",
  };

  return lookup[code.toUpperCase()] || code.toUpperCase();
}
