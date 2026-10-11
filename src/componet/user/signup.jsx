import React, { useState, useEffect, useRef } from "react";
import supabase from "../../supabase";
import { sendWelcomeEmail } from "../../email/welcomeEmail";
import regDocUrl from "../../doc/reg.pdf";


const STORAGE_KEY = "tf_lang";

const LANGUAGES = [
  { code:"en",    label:"English",    flag:"🇬🇧" },
  { code:"fr",    label:"Français",   flag:"🇫🇷" },
  { code:"es",    label:"Español",    flag:"🇪🇸" },
  { code:"de",    label:"Deutsch",    flag:"🇩🇪" },
  { code:"pt",    label:"Português",  flag:"🇵🇹" },
  { code:"ar",    label:"العربية",    flag:"🇸🇦" },
  { code:"zh-CN", label:"中文",        flag:"🇨🇳" },
  { code:"ru",    label:"Русский",    flag:"🇷🇺" },
  { code:"ja",    label:"日本語",      flag:"🇯🇵" },
  { code:"ko",    label:"한국어",      flag:"🇰🇷" },
  { code:"hi",    label:"हिन्दी",     flag:"🇮🇳" },
  { code:"sw",    label:"Kiswahili",  flag:"🇰🇪" },
  { code:"ha",    label:"Hausa",      flag:"🇳🇬" },
  { code:"yo",    label:"Yorùbá",     flag:"🇳🇬" },
  { code:"ig",    label:"Igbo",       flag:"🇳🇬" },
  { code:"am",    label:"አማርኛ",      flag:"🇪🇹" },
];

// Initialisation callback required by the Google Translate script
window.googleTranslateElementInit = () => {
  new window.google.translate.TranslateElement(
    { pageLanguage:"en", autoDisplay:false },
    "tf-translate-el"
  );
};

const applyGoogleTranslate = (langCode) => {
  // Set the cookie Google Translate reads on every page load
  const val = langCode === "en" ? "/en/en" : `/en/${langCode}`;
  document.cookie = `googtrans=${val}; path=/`;
  localStorage.setItem(STORAGE_KEY, langCode);
  // Trigger the hidden select that Google Translate exposes
  const sel = document.querySelector(".goog-te-combo");
  if (sel) {
    sel.value = langCode;
    sel.dispatchEvent(new Event("change"));
  } else {
    // Script not ready yet — reload with cookie set will apply it
    window.location.reload();
  }
};

const useGoogleTranslate = () => {
  useEffect(() => {
    // Restore saved language on mount
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== "en") {
      document.cookie = `googtrans=/en/${saved}; path=/`;
    }
    // Inject script once
    if (!document.getElementById("gt-script")) {
      const s = document.createElement("script");
      s.id  = "gt-script";
      s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);
};

const useChatwayWidget = () => {
  useEffect(() => {
    if (document.getElementById("chatway-widget-script")) return;
    const script = document.createElement("script");
    script.id = "chatway-widget-script";
    script.src = "https://cdn.chatway.app/widget.js?id=rES12jPIPPNO";
    script.async = true;
    document.body.appendChild(script);
  }, []);
};

const ChevronDown = () => (
  <svg className="tf-chevron" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);

const LanguagePicker = () => {
  const [open,    setOpen]    = useState(false);
  const [current, setCurrent] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "en"
  );
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (code) => {
    setCurrent(code);
    setOpen(false);
    applyGoogleTranslate(code);
  };

  const active = LANGUAGES.find(l => l.code === current) || LANGUAGES[0];

  return (
    <div className="tf-lang-wrap" ref={wrapRef}>
      {/* Hidden Google Translate mount point */}
      <div id="tf-translate-el" style={{display:"none"}}/>

      <button className={`tf-lang-btn${open?" open":""}`} onClick={() => setOpen(o => !o)}>
        <GlobeIcon/>
        <span>{active.flag}</span>
        <span>{active.label}</span>
        <ChevronDown/>
      </button>

      {open && (
        <div className="tf-lang-menu">
          {LANGUAGES.map(lang => (
            <div
              key={lang.code}
              className={`tf-lang-opt${lang.code===current?" active":""}`}
              onClick={() => select(lang.code)}
            >
              <span className="tf-lang-flag">{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === current && (
                <span style={{marginLeft:"auto", fontSize:"11px", opacity:.7}}>✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   DESIGN TOKENS  (match ProfitGainSignal landing page —
   "Institutional" navy & emerald, light-cool)
───────────────────────────────────────────── */
const C = {
  bg:         "#EEF2F7",
  surface:    "#FFFFFF",
  surfaceAlt: "#F4F7FB",
  border:     "#D5DDE8",
  borderFocus:"#C9933160",
  borderHover:"#B7C3D3",
  accent:     "#8A5E0F",
  accentDim:  "rgba(226,174,74,0.14)",
  accentGlow: "rgba(226,174,74,0.45)",
  text:       "#0B1628",
  textMid:    "#4A5970",
  textDim:    "#8090A6",
  red:        "#C8373F",
  green:      "#0F8F5F",
  blue:       "#3D6FE0",
};

/* ─────────────────────────────────────────────
   COUNTRIES (full list with dial codes)
───────────────────────────────────────────── */
const COUNTRIES = [
  { code:"AF", name:"Afghanistan", dial:"+93", currency:"AFN" },
  { code:"AL", name:"Albania", dial:"+355", currency:"ALL" },
  { code:"DZ", name:"Algeria", dial:"+213", currency:"DZD" },
  { code:"AD", name:"Andorra", dial:"+376", currency:"EUR" },
  { code:"AO", name:"Angola", dial:"+244", currency:"AOA" },
  { code:"AG", name:"Antigua and Barbuda", dial:"+1-268", currency:"XCD" },
  { code:"AR", name:"Argentina", dial:"+54", currency:"ARS" },
  { code:"AM", name:"Armenia", dial:"+374", currency:"AMD" },
  { code:"AU", name:"Australia", dial:"+61", currency:"AUD" },
  { code:"AT", name:"Austria", dial:"+43", currency:"EUR" },
  { code:"AZ", name:"Azerbaijan", dial:"+994", currency:"AZN" },
  { code:"BS", name:"Bahamas", dial:"+1-242", currency:"BSD" },
  { code:"BH", name:"Bahrain", dial:"+973", currency:"BHD" },
  { code:"BD", name:"Bangladesh", dial:"+880", currency:"BDT" },
  { code:"BB", name:"Barbados", dial:"+1-246", currency:"BBD" },
  { code:"BY", name:"Belarus", dial:"+375", currency:"BYN" },
  { code:"BE", name:"Belgium", dial:"+32", currency:"EUR" },
  { code:"BZ", name:"Belize", dial:"+501", currency:"BZD" },
  { code:"BJ", name:"Benin", dial:"+229", currency:"XOF" },
  { code:"BT", name:"Bhutan", dial:"+975", currency:"BTN" },
  { code:"BO", name:"Bolivia", dial:"+591", currency:"BOB" },
  { code:"BA", name:"Bosnia and Herzegovina", dial:"+387", currency:"BAM" },
  { code:"BW", name:"Botswana", dial:"+267", currency:"BWP" },
  { code:"BR", name:"Brazil", dial:"+55", currency:"BRL" },
  { code:"BN", name:"Brunei", dial:"+673", currency:"BND" },
  { code:"BG", name:"Bulgaria", dial:"+359", currency:"BGN" },
  { code:"BF", name:"Burkina Faso", dial:"+226", currency:"XOF" },
  { code:"BI", name:"Burundi", dial:"+257", currency:"BIF" },
  { code:"CV", name:"Cabo Verde", dial:"+238", currency:"CVE" },
  { code:"KH", name:"Cambodia", dial:"+855", currency:"KHR" },
  { code:"CM", name:"Cameroon", dial:"+237", currency:"XAF" },
  { code:"CA", name:"Canada", dial:"+1", currency:"CAD" },
  { code:"CF", name:"Central African Republic", dial:"+236", currency:"XAF" },
  { code:"TD", name:"Chad", dial:"+235", currency:"XAF" },
  { code:"CL", name:"Chile", dial:"+56", currency:"CLP" },
  { code:"CN", name:"China", dial:"+86", currency:"CNY" },
  { code:"CO", name:"Colombia", dial:"+57", currency:"COP" },
  { code:"KM", name:"Comoros", dial:"+269", currency:"KMF" },
  { code:"CG", name:"Congo", dial:"+242", currency:"XAF" },
  { code:"CD", name:"Congo (DRC)", dial:"+243", currency:"CDF" },
  { code:"CR", name:"Costa Rica", dial:"+506", currency:"CRC" },
  { code:"CI", name:"Cote d'Ivoire", dial:"+225", currency:"XOF" },
  { code:"HR", name:"Croatia", dial:"+385", currency:"EUR" },
  { code:"CU", name:"Cuba", dial:"+53", currency:"CUP" },
  { code:"CY", name:"Cyprus", dial:"+357", currency:"EUR" },
  { code:"CZ", name:"Czech Republic", dial:"+420", currency:"CZK" },
  { code:"DK", name:"Denmark", dial:"+45", currency:"DKK" },
  { code:"DJ", name:"Djibouti", dial:"+253", currency:"DJF" },
  { code:"DM", name:"Dominica", dial:"+1-767", currency:"XCD" },
  { code:"DO", name:"Dominican Republic", dial:"+1-809", currency:"DOP" },
  { code:"EC", name:"Ecuador", dial:"+593", currency:"USD" },
  { code:"EG", name:"Egypt", dial:"+20", currency:"EGP" },
  { code:"SV", name:"El Salvador", dial:"+503", currency:"USD" },
  { code:"GQ", name:"Equatorial Guinea", dial:"+240", currency:"XAF" },
  { code:"ER", name:"Eritrea", dial:"+291", currency:"ERN" },
  { code:"EE", name:"Estonia", dial:"+372", currency:"EUR" },
  { code:"SZ", name:"Eswatini", dial:"+268", currency:"SZL" },
  { code:"ET", name:"Ethiopia", dial:"+251", currency:"ETB" },
  { code:"FJ", name:"Fiji", dial:"+679", currency:"FJD" },
  { code:"FI", name:"Finland", dial:"+358", currency:"EUR" },
  { code:"FR", name:"France", dial:"+33", currency:"EUR" },
  { code:"GA", name:"Gabon", dial:"+241", currency:"XAF" },
  { code:"GM", name:"Gambia", dial:"+220", currency:"GMD" },
  { code:"GE", name:"Georgia", dial:"+995", currency:"GEL" },
  { code:"DE", name:"Germany", dial:"+49", currency:"EUR" },
  { code:"GH", name:"Ghana", dial:"+233", currency:"GHS" },
  { code:"GR", name:"Greece", dial:"+30", currency:"EUR" },
  { code:"GD", name:"Grenada", dial:"+1-473", currency:"XCD" },
  { code:"GT", name:"Guatemala", dial:"+502", currency:"GTQ" },
  { code:"GN", name:"Guinea", dial:"+224", currency:"GNF" },
  { code:"GW", name:"Guinea-Bissau", dial:"+245", currency:"XOF" },
  { code:"GY", name:"Guyana", dial:"+592", currency:"GYD" },
  { code:"HT", name:"Haiti", dial:"+509", currency:"HTG" },
  { code:"HN", name:"Honduras", dial:"+504", currency:"HNL" },
  { code:"HU", name:"Hungary", dial:"+36", currency:"HUF" },
  { code:"IS", name:"Iceland", dial:"+354", currency:"ISK" },
  { code:"IN", name:"India", dial:"+91", currency:"INR" },
  { code:"ID", name:"Indonesia", dial:"+62", currency:"IDR" },
  { code:"IR", name:"Iran", dial:"+98", currency:"IRR" },
  { code:"IQ", name:"Iraq", dial:"+964", currency:"IQD" },
  { code:"IE", name:"Ireland", dial:"+353", currency:"EUR" },
  { code:"IL", name:"Israel", dial:"+972", currency:"ILS" },
  { code:"IT", name:"Italy", dial:"+39", currency:"EUR" },
  { code:"JM", name:"Jamaica", dial:"+1-876", currency:"JMD" },
  { code:"JP", name:"Japan", dial:"+81", currency:"JPY" },
  { code:"JO", name:"Jordan", dial:"+962", currency:"JOD" },
  { code:"KZ", name:"Kazakhstan", dial:"+7", currency:"KZT" },
  { code:"KE", name:"Kenya", dial:"+254", currency:"KES" },
  { code:"KI", name:"Kiribati", dial:"+686", currency:"AUD" },
  { code:"KW", name:"Kuwait", dial:"+965", currency:"KWD" },
  { code:"KG", name:"Kyrgyzstan", dial:"+996", currency:"KGS" },
  { code:"LA", name:"Laos", dial:"+856", currency:"LAK" },
  { code:"LV", name:"Latvia", dial:"+371", currency:"EUR" },
  { code:"LB", name:"Lebanon", dial:"+961", currency:"LBP" },
  { code:"LS", name:"Lesotho", dial:"+266", currency:"LSL" },
  { code:"LR", name:"Liberia", dial:"+231", currency:"LRD" },
  { code:"LY", name:"Libya", dial:"+218", currency:"LYD" },
  { code:"LI", name:"Liechtenstein", dial:"+423", currency:"CHF" },
  { code:"LT", name:"Lithuania", dial:"+370", currency:"EUR" },
  { code:"LU", name:"Luxembourg", dial:"+352", currency:"EUR" },
  { code:"MG", name:"Madagascar", dial:"+261", currency:"MGA" },
  { code:"MW", name:"Malawi", dial:"+265", currency:"MWK" },
  { code:"MY", name:"Malaysia", dial:"+60", currency:"MYR" },
  { code:"MV", name:"Maldives", dial:"+960", currency:"MVR" },
  { code:"ML", name:"Mali", dial:"+223", currency:"XOF" },
  { code:"MT", name:"Malta", dial:"+356", currency:"EUR" },
  { code:"MH", name:"Marshall Islands", dial:"+692", currency:"USD" },
  { code:"MR", name:"Mauritania", dial:"+222", currency:"MRU" },
  { code:"MU", name:"Mauritius", dial:"+230", currency:"MUR" },
  { code:"MX", name:"Mexico", dial:"+52", currency:"MXN" },
  { code:"FM", name:"Micronesia", dial:"+691", currency:"USD" },
  { code:"MD", name:"Moldova", dial:"+373", currency:"MDL" },
  { code:"MC", name:"Monaco", dial:"+377", currency:"EUR" },
  { code:"MN", name:"Mongolia", dial:"+976", currency:"MNT" },
  { code:"ME", name:"Montenegro", dial:"+382", currency:"EUR" },
  { code:"MA", name:"Morocco", dial:"+212", currency:"MAD" },
  { code:"MZ", name:"Mozambique", dial:"+258", currency:"MZN" },
  { code:"MM", name:"Myanmar", dial:"+95", currency:"MMK" },
  { code:"NA", name:"Namibia", dial:"+264", currency:"NAD" },
  { code:"NR", name:"Nauru", dial:"+674", currency:"AUD" },
  { code:"NP", name:"Nepal", dial:"+977", currency:"NPR" },
  { code:"NL", name:"Netherlands", dial:"+31", currency:"EUR" },
  { code:"NZ", name:"New Zealand", dial:"+64", currency:"NZD" },
  { code:"NI", name:"Nicaragua", dial:"+505", currency:"NIO" },
  { code:"NE", name:"Niger", dial:"+227", currency:"XOF" },
  { code:"NG", name:"Nigeria", dial:"+234", currency:"NGN" },
  { code:"MK", name:"North Macedonia", dial:"+389", currency:"MKD" },
  { code:"NO", name:"Norway", dial:"+47", currency:"NOK" },
  { code:"OM", name:"Oman", dial:"+968", currency:"OMR" },
  { code:"PK", name:"Pakistan", dial:"+92", currency:"PKR" },
  { code:"PW", name:"Palau", dial:"+680", currency:"USD" },
  { code:"PA", name:"Panama", dial:"+507", currency:"PAB" },
  { code:"PG", name:"Papua New Guinea", dial:"+675", currency:"PGK" },
  { code:"PY", name:"Paraguay", dial:"+595", currency:"PYG" },
  { code:"PE", name:"Peru", dial:"+51", currency:"PEN" },
  { code:"PH", name:"Philippines", dial:"+63", currency:"PHP" },
  { code:"PL", name:"Poland", dial:"+48", currency:"PLN" },
  { code:"PT", name:"Portugal", dial:"+351", currency:"EUR" },
  { code:"QA", name:"Qatar", dial:"+974", currency:"QAR" },
  { code:"RO", name:"Romania", dial:"+40", currency:"RON" },
  { code:"RU", name:"Russia", dial:"+7", currency:"RUB" },
  { code:"RW", name:"Rwanda", dial:"+250", currency:"RWF" },
  { code:"KN", name:"Saint Kitts and Nevis", dial:"+1-869", currency:"XCD" },
  { code:"LC", name:"Saint Lucia", dial:"+1-758", currency:"XCD" },
  { code:"VC", name:"Saint Vincent and the Grenadines", dial:"+1-784", currency:"XCD" },
  { code:"WS", name:"Samoa", dial:"+685", currency:"WST" },
  { code:"SM", name:"San Marino", dial:"+378", currency:"EUR" },
  { code:"ST", name:"Sao Tome and Principe", dial:"+239", currency:"STN" },
  { code:"SA", name:"Saudi Arabia", dial:"+966", currency:"SAR" },
  { code:"SN", name:"Senegal", dial:"+221", currency:"XOF" },
  { code:"RS", name:"Serbia", dial:"+381", currency:"RSD" },
  { code:"SC", name:"Seychelles", dial:"+248", currency:"SCR" },
  { code:"SL", name:"Sierra Leone", dial:"+232", currency:"SLL" },
  { code:"SG", name:"Singapore", dial:"+65", currency:"SGD" },
  { code:"SK", name:"Slovakia", dial:"+421", currency:"EUR" },
  { code:"SI", name:"Slovenia", dial:"+386", currency:"EUR" },
  { code:"SB", name:"Solomon Islands", dial:"+677", currency:"SBD" },
  { code:"SO", name:"Somalia", dial:"+252", currency:"SOS" },
  { code:"ZA", name:"South Africa", dial:"+27", currency:"ZAR" },
  { code:"SS", name:"South Sudan", dial:"+211", currency:"SSP" },
  { code:"ES", name:"Spain", dial:"+34", currency:"EUR" },
  { code:"LK", name:"Sri Lanka", dial:"+94", currency:"LKR" },
  { code:"SD", name:"Sudan", dial:"+249", currency:"SDG" },
  { code:"SR", name:"Suriname", dial:"+597", currency:"SRD" },
  { code:"SE", name:"Sweden", dial:"+46", currency:"SEK" },
  { code:"CH", name:"Switzerland", dial:"+41", currency:"CHF" },
  { code:"SY", name:"Syria", dial:"+963", currency:"SYP" },
  { code:"TW", name:"Taiwan", dial:"+886", currency:"TWD" },
  { code:"TJ", name:"Tajikistan", dial:"+992", currency:"TJS" },
  { code:"TZ", name:"Tanzania", dial:"+255", currency:"TZS" },
  { code:"TH", name:"Thailand", dial:"+66", currency:"THB" },
  { code:"TL", name:"Timor-Leste", dial:"+670", currency:"USD" },
  { code:"TG", name:"Togo", dial:"+228", currency:"XOF" },
  { code:"TO", name:"Tonga", dial:"+676", currency:"TOP" },
  { code:"TT", name:"Trinidad and Tobago", dial:"+1-868", currency:"TTD" },
  { code:"TN", name:"Tunisia", dial:"+216", currency:"TND" },
  { code:"TR", name:"Turkey", dial:"+90", currency:"TRY" },
  { code:"TM", name:"Turkmenistan", dial:"+993", currency:"TMT" },
  { code:"TV", name:"Tuvalu", dial:"+688", currency:"AUD" },
  { code:"UG", name:"Uganda", dial:"+256", currency:"UGX" },
  { code:"UA", name:"Ukraine", dial:"+380", currency:"UAH" },
  { code:"AE", name:"United Arab Emirates", dial:"+971", currency:"AED" },
  { code:"GB", name:"United Kingdom", dial:"+44", currency:"GBP" },
  { code:"US", name:"United States", dial:"+1", currency:"USD" },
  { code:"UY", name:"Uruguay", dial:"+598", currency:"UYU" },
  { code:"UZ", name:"Uzbekistan", dial:"+998", currency:"UZS" },
  { code:"VU", name:"Vanuatu", dial:"+678", currency:"VUV" },
  { code:"VE", name:"Venezuela", dial:"+58", currency:"VES" },
  { code:"VN", name:"Vietnam", dial:"+84", currency:"VND" },
  { code:"YE", name:"Yemen", dial:"+967", currency:"YER" },
  { code:"ZM", name:"Zambia", dial:"+260", currency:"ZMW" },
  { code:"ZW", name:"Zimbabwe", dial:"+263", currency:"ZWL" },
];

const CURRENCIES = [
  { code:"USD", name:"US Dollar", symbol:"$" },
  { code:"EUR", name:"Euro", symbol:"€" },
  { code:"GBP", name:"British Pound", symbol:"£" },
  { code:"JPY", name:"Japanese Yen", symbol:"¥" },
  { code:"CHF", name:"Swiss Franc", symbol:"Fr" },
  { code:"CAD", name:"Canadian Dollar", symbol:"C$" },
  { code:"AUD", name:"Australian Dollar", symbol:"A$" },
  { code:"NZD", name:"New Zealand Dollar", symbol:"NZ$" },
  { code:"CNY", name:"Chinese Yuan", symbol:"¥" },
  { code:"HKD", name:"Hong Kong Dollar", symbol:"HK$" },
  { code:"SGD", name:"Singapore Dollar", symbol:"S$" },
  { code:"SEK", name:"Swedish Krona", symbol:"kr" },
  { code:"NOK", name:"Norwegian Krone", symbol:"kr" },
  { code:"DKK", name:"Danish Krone", symbol:"kr" },
  { code:"INR", name:"Indian Rupee", symbol:"₹" },
  { code:"BRL", name:"Brazilian Real", symbol:"R$" },
  { code:"MXN", name:"Mexican Peso", symbol:"MX$" },
  { code:"ZAR", name:"South African Rand", symbol:"R" },
  { code:"NGN", name:"Nigerian Naira", symbol:"₦" },
  { code:"KES", name:"Kenyan Shilling", symbol:"KSh" },
  { code:"GHS", name:"Ghanaian Cedi", symbol:"₵" },
  { code:"EGP", name:"Egyptian Pound", symbol:"E£" },
  { code:"MAD", name:"Moroccan Dirham", symbol:"د.م." },
  { code:"AED", name:"UAE Dirham", symbol:"د.إ" },
  { code:"SAR", name:"Saudi Riyal", symbol:"ر.س" },
  { code:"QAR", name:"Qatari Riyal", symbol:"ر.ق" },
  { code:"KWD", name:"Kuwaiti Dinar", symbol:"د.ك" },
  { code:"TRY", name:"Turkish Lira", symbol:"₺" },
  { code:"RUB", name:"Russian Ruble", symbol:"₽" },
  { code:"PLN", name:"Polish Zloty", symbol:"zł" },
  { code:"CZK", name:"Czech Koruna", symbol:"Kč" },
  { code:"HUF", name:"Hungarian Forint", symbol:"Ft" },
  { code:"RON", name:"Romanian Leu", symbol:"lei" },
  { code:"ILS", name:"Israeli Shekel", symbol:"₪" },
  { code:"PHP", name:"Philippine Peso", symbol:"₱" },
  { code:"THB", name:"Thai Baht", symbol:"฿" },
  { code:"MYR", name:"Malaysian Ringgit", symbol:"RM" },
  { code:"IDR", name:"Indonesian Rupiah", symbol:"Rp" },
  { code:"KRW", name:"South Korean Won", symbol:"₩" },
  { code:"TWD", name:"Taiwan Dollar", symbol:"NT$" },
  { code:"PKR", name:"Pakistani Rupee", symbol:"₨" },
  { code:"BDT", name:"Bangladeshi Taka", symbol:"৳" },
  { code:"CLP", name:"Chilean Peso", symbol:"CLP$" },
  { code:"COP", name:"Colombian Peso", symbol:"COP$" },
  { code:"ARS", name:"Argentine Peso", symbol:"AR$" },
  { code:"PEN", name:"Peruvian Sol", symbol:"S/." },
  { code:"UAH", name:"Ukrainian Hryvnia", symbol:"₴" },
  { code:"VND", name:"Vietnamese Dong", symbol:"₫" },
];

/* ─────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,400;1,9..144,500&family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; height: 100%; }
body {
  background: ${C.bg}; color: ${C.text};
  font-family: 'Instrument Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100%; overflow-x: hidden; overflow-y: auto;
}
a { text-decoration: none; color: inherit; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes gridFade { from { opacity: 0; } to { opacity: .3; } }
@keyframes pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%     { opacity:.5; transform:scale(.9); }
}
@keyframes spinDot { to { transform: rotate(360deg); } }
@keyframes successPop {
  0%   { transform: scale(.8); opacity:0; }
  60%  { transform: scale(1.08); }
  100% { transform: scale(1); opacity:1; }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-6px); }
  40%     { transform: translateX(6px); }
  60%     { transform: translateX(-4px); }
  80%     { transform: translateX(4px); }
}

.auth-card-enter   { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) .05s both; }
.auth-header-enter { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) .15s both; }

.grid-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(${C.border} 1px, transparent 1px),
    linear-gradient(90deg, ${C.border} 1px, transparent 1px);
  background-size: 56px 56px;
  animation: gridFade 1.2s ease-out both;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 40%, black 0%, transparent 100%);
}

.tf-nav {
  height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 clamp(16px, 4vw, 40px);
  background: ${C.bg}F2; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid ${C.border};
  position: sticky; top: 0; z-index: 100;
}

/* ── iOS PWA safe area (notch / Dynamic Island) ── */
@supports (padding-top: env(safe-area-inset-top)) {
  .tf-nav {
    padding-top: env(safe-area-inset-top);
    height: calc(60px + env(safe-area-inset-top));
  }
  .tf-nav-offset {
    min-height: calc(100vh - 60px - env(safe-area-inset-top));
  }
}

.tf-input {
  width: 100%; background: ${C.surfaceAlt};
  border: 1px solid ${C.border}; border-radius: 10px;
  padding: 13px 16px; font-size: 14px; color: ${C.text};
  font-family: 'Instrument Sans', sans-serif; outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.tf-input:focus { border-color: ${C.accent}60; box-shadow: 0 0 0 3px ${C.accentDim}; }
.tf-input::placeholder { color: ${C.textDim}; }
.tf-input.error { border-color: ${C.red}70; box-shadow: 0 0 0 3px rgba(255,77,106,.08); }
.tf-input.success { border-color: ${C.accent}60; }

.tf-select {
  width: 100%; background: ${C.surfaceAlt};
  border: 1px solid ${C.border}; border-radius: 10px;
  padding: 13px 16px; font-size: 14px; color: ${C.text};
  font-family: 'Instrument Sans', sans-serif; outline: none;
  appearance: none; cursor: pointer;
  transition: border-color .2s, box-shadow .2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238C9BAC' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center; padding-right: 38px;
}
.tf-select:focus { border-color: ${C.accent}60; box-shadow: 0 0 0 3px ${C.accentDim}; }
.tf-select option { background: ${C.surface}; color: ${C.text}; }
.tf-select.error { border-color: ${C.red}70; box-shadow: 0 0 0 3px rgba(255,77,106,.08); }
.tf-select.success { border-color: ${C.accent}60; }

.pw-wrap { position: relative; }
.pw-wrap .tf-input { padding-right: 46px; }
.pw-toggle {
  position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: ${C.textDim}; cursor: pointer;
  font-size: 17px; padding: 4px; line-height: 1; transition: color .15s;
}
.pw-toggle:hover { color: ${C.textMid}; }

.tf-checkbox {
  appearance: none; -webkit-appearance: none;
  width: 16px; height: 16px; border-radius: 4px;
  border: 1px solid ${C.border}; background: ${C.surfaceAlt};
  cursor: pointer; flex-shrink: 0;
  transition: border-color .15s, background .15s; position: relative;
}
.tf-checkbox:checked { background: ${C.accent}; border-color: ${C.accent}; }
.tf-checkbox:checked::after {
  content: '\u2713'; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-52%); font-size: 10px; color: #F3FAF7; font-weight: 800;
}

.btn-primary {
  width: 100%; padding: 14px;
  background: ${C.accent}; color: #F3FAF7;
  border: none; border-radius: 10px;
  font-size: 14px; font-weight: 700;
  font-family: 'Instrument Sans', sans-serif; cursor: pointer; letter-spacing: .01em;
  transition: transform .18s, box-shadow .18s, background .18s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  position: relative; overflow: hidden;
}
.btn-primary::after {
  content:''; position:absolute; inset:0;
  background: linear-gradient(135deg,rgba(255,255,255,.16) 0%,transparent 60%);
  opacity:0; transition:opacity .2s;
}
.btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 36px ${C.accentGlow}; }
.btn-primary:hover::after { opacity:1; }
.btn-primary:disabled { opacity:.55; cursor:not-allowed; transform:none; }

.step-dots { display:flex; align-items:center; gap:6px; justify-content:center; }
.step-dot { width:7px; height:7px; border-radius:50%; background:${C.border}; transition:background .25s, transform .25s; }
.step-dot.active { background:${C.accent}; transform:scale(1.3); }
.step-dot.done   { background:${C.accent}40; }

.field-error { font-size:12px; color:${C.red}; margin-top:5px; display:flex; align-items:center; gap:4px; }

.success-icon {
  width:64px; height:64px; border-radius:50%;
  background:${C.accentDim}; border:1px solid ${C.accent}40;
  display:flex; align-items:center; justify-content:center;
  font-size:28px; margin:0 auto 20px;
  animation: successPop .5s cubic-bezier(.22,1,.36,1) both;
}

.spinner {
  width:18px; height:18px; border-radius:50%;
  border:2px solid rgba(255,255,255,.3); border-top-color:#F3FAF7;
  animation: spinDot .7s linear infinite; flex-shrink:0;
}

.strength-bar { display:flex; gap:4px; margin-top:8px; }
.strength-seg { flex:1; height:3px; border-radius:2px; background:${C.border}; transition:background .3s; }

.badge-live {
  display:inline-flex; align-items:center; gap:5px;
  background:rgba(14,124,90,.08); border:1px solid rgba(14,124,90,.2);
  border-radius:6px; padding:3px 8px;
  font-family:'Instrument Sans',system-ui,sans-serif; font-size:10px; color:${C.accent};
}
.badge-live::before {
  content:''; width:5px; height:5px; border-radius:50%;
  background:${C.accent}; animation:pulse 1.5s ease-in-out infinite; flex-shrink:0;
}

.form-two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
@media(max-width:420px) { .form-two-col { grid-template-columns:1fr; } }

.phone-row { display:grid; grid-template-columns:110px 1fr; gap:10px; }
@media(max-width:420px) { .phone-row { grid-template-columns:96px 1fr; } }

/* ── OTP inputs ── */
.otp-row { display: flex; gap: 8px; justify-content: center; }
.otp-box {
  width: 40px; height: 52px;
  background: ${C.surfaceAlt}; border: 1px solid ${C.border}; border-radius: 10px;
  font-size: 22px; font-weight: 700; color: ${C.text};
  font-family: 'IBM Plex Mono', monospace; text-align: center; outline: none;
  transition: border-color .2s, box-shadow .2s; caret-color: ${C.accent};
}
.otp-box:focus { border-color: ${C.accent}60; box-shadow: 0 0 0 3px ${C.accentDim}; }
.otp-box.filled { border-color: ${C.accent}40; }
.otp-box.error  { border-color: ${C.red}70; animation: shake .35s ease-in-out; }

.resend-btn {
  background: none; border: none; padding: 0;
  font-family: 'Instrument Sans', sans-serif; font-size: 13px; cursor: pointer; transition: color .15s;
}

::-webkit-scrollbar { width:5px; }
::-webkit-scrollbar-track { background:${C.bg}; }
::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }

/* ── Google Translate banner suppression ── */
.goog-te-banner-frame, .goog-te-balloon-frame,
.goog-te-ftab-float, #goog-gt-tt { display:none !important; }
body { top:0 !important; }
#tf-translate-el { display:none !important; }

/* ── Custom language dropdown ── */
.tf-lang-wrap { position:relative; display:inline-flex; align-items:center; }
.tf-lang-btn {
  display:flex; align-items:center; gap:6px;
  background:${C.surfaceAlt}; border:1px solid ${C.border};
  border-radius:8px; padding:6px 11px;
  font-size:12px; font-weight:600; color:${C.textMid};
  font-family:'Instrument Sans',system-ui,sans-serif; cursor:pointer;
  transition:border-color .2s, color .2s; white-space:nowrap; outline:none;
}
.tf-lang-btn:hover, .tf-lang-btn.open { border-color:${C.borderHover}; color:${C.text}; }
.tf-lang-btn .tf-chevron { width:11px; height:11px; margin-left:2px; transition:transform .2s; opacity:.6; }
.tf-lang-btn.open .tf-chevron { transform:rotate(180deg); }
.tf-lang-menu {
  position:absolute; top:calc(100% + 6px); right:0;
  background:${C.surface}; border:1px solid ${C.border};
  border-radius:10px; padding:5px; min-width:170px; z-index:999;
  box-shadow:0 16px 40px rgba(22,40,63,.16); animation:fadeUp .15s ease both;
  max-height:280px; overflow-y:auto;
}
.tf-lang-opt {
  display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:7px;
  font-size:12px; color:${C.textMid}; cursor:pointer;
  font-family:'Instrument Sans',system-ui,sans-serif; font-weight:500;
  transition:background .15s, color .15s;
}
.tf-lang-opt:hover { background:${C.surfaceAlt}; color:${C.text}; }
.tf-lang-opt.active { color:${C.accent}; background:${C.accentDim}; }
.tf-lang-opt .tf-lang-flag { font-size:15px; line-height:1; flex-shrink:0; }

@media (max-width: 767px) { .side-panel-desktop { display: none !important; } }
@media (max-width: 480px) { .auth-panel { padding: 20px 16px !important; } }
@media (max-width: 360px) { .auth-panel { padding: 16px 12px !important; } }
@media (min-width: 481px) and (max-width: 767px) { .auth-panel { padding: 28px 32px !important; } }
@media (min-width: 768px) and (max-width: 1024px) { .side-panel-desktop { max-width: 340px !important; } }
`;

/* ─────────────────────────────────────────────
   ICON HELPERS
───────────────────────────────────────────── */
const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
/* ─────────────────────────────────────────────
   FIELD with label + error
───────────────────────────────────────────── */
const Field = ({ label, error, children }) => (
  <div style={{ marginBottom: "20px" }}>
    <div style={{ marginBottom:"7px" }}>
      <label style={{ fontSize:"13px", fontWeight:"600", color:C.textMid, letterSpacing:".01em" }}>{label}</label>
    </div>
    {children}
    {error && <div className="field-error">&#9888; {error}</div>}
  </div>
);

/* ─────────────────────────────────────────────
   PASSWORD STRENGTH
───────────────────────────────────────────── */
const getStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};
const strengthColor = (score) => [C.textDim,C.red,"#D68910",C.blue,C.accent][score];
const strengthLabel = (score) => ["","Weak","Fair","Good","Strong"][score];

const StrengthBar = ({ password }) => {
  if (!password) return null;
  const score = getStrength(password);
  return (
    <div>
      <div className="strength-bar">
        {[1,2,3,4].map(i => (
          <div key={i} className="strength-seg" style={{ background: i <= score ? strengthColor(score) : C.border }}/>
        ))}
      </div>
      {score > 0 && (
        <div style={{ fontSize:"11px", color:strengthColor(score), marginTop:"5px", fontFamily:"'Instrument Sans',system-ui,sans-serif", letterSpacing:".04em" }}>
          {strengthLabel(score)}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   OTP INPUT COMPONENT
───────────────────────────────────────────── */
const OTPInput = ({ value, onChange, hasError }) => {
  const inputsRef = useRef([]);
  const digits = Array.from({length:8}, (_,i) => value[i] || "");

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g,"");
    if (!raw) return;
    if (raw.length > 1) {
      const pasted = raw.slice(0,8);
      onChange(pasted);
      inputsRef.current[Math.min(pasted.length, 7)]?.focus();
      return;
    }
    const next = [...digits]; next[i] = raw[0];
    onChange(next.join(""));
    if (i < 7) inputsRef.current[i+1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        const next = [...digits]; next[i] = ""; onChange(next.join(""));
      } else if (i > 0) {
        const next = [...digits]; next[i-1] = ""; onChange(next.join(""));
        inputsRef.current[i-1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) { inputsRef.current[i-1]?.focus(); }
    else if (e.key === "ArrowRight" && i < 7)   { inputsRef.current[i+1]?.focus(); }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,8);
    if (pasted) { onChange(pasted); inputsRef.current[Math.min(pasted.length,7)]?.focus(); }
  };

  return (
    <div className="otp-row">
      {[0,1,2,3,4,5,6,7].map(i => (
        <input
          key={i}
          ref={el => inputsRef.current[i] = el}
          className={`otp-box${hasError ? " error" : digits[i] ? " filled" : ""}`}
          type="text" inputMode="numeric" maxLength="6"
          value={digits[i]}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          autoComplete={i === 0 ? "one-time-code" : "off"}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   STEP 1 — Account details
───────────────────────────────────────────── */
const StepAccount = ({ onNext }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [show,      setShow]      = useState(false);
  const [errors,    setErrors]    = useState({});
  const [loading,   setLoading]   = useState(false);

  const validate = () => {
    const e = {};
    if (!firstName.trim())         e.firstName = "First name is required";
    if (!lastName.trim())          e.lastName  = "Last name is required";
    if (!email.includes("@"))      e.email     = "Enter a valid email address";
    if (getStrength(password) < 2) e.password  = "Password is too weak";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setLoading(true);

    try {
      // 1. Create the auth user — Supabase sends the OTP email automatically
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email:    email.toLowerCase().trim(),
        password,
        options:  { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
      });
      if (authErr) throw authErr;

      // "Confirm email" ON → Supabase returns { user: null, session: null } on success.
      // The user IS created in auth.users and the OTP email IS sent — null is not an error.
      // Only a user object with empty identities means the email is already taken.
      if (authData?.user?.identities?.length === 0) {
        throw new Error("An account with this email already exists.");
      }

      // Write to users table only if we have an id (confirm email OFF scenario).
      // When confirm email is ON, do this after OTP verification instead.
      const userId = authData?.user?.id;
      if (userId) {
        const { error: dbErr } = await supabase.from("users").upsert({
          id:            userId,
          email:         email.toLowerCase().trim(),
          password_hash: "managed_by_supabase_auth",
          first_name:    firstName.trim(),
          last_name:     lastName.trim(),
          otp_verified:  false,
        }, { onConflict: "id" });
        if (dbErr) console.error("users upsert:", dbErr.message);
      }

      setLoading(false);
      onNext({ firstName, lastName, email });
    } catch (err) {
      setLoading(false);
      setErrors({ email: err.message || "Sign-up failed. Please try again." });
    }
  };

  return (
    <div>
      <div className="form-two-col">
        <Field label="First name" error={errors.firstName}>
          <input className={`tf-input${errors.firstName?" error":firstName.trim()?" success":""}`}
            type="text" placeholder="Alex" value={firstName}
            onChange={e=>{setFirstName(e.target.value);setErrors(p=>({...p,firstName:""}));}}
            autoComplete="given-name"/>
        </Field>
        <Field label="Last name" error={errors.lastName}>
          <input className={`tf-input${errors.lastName?" error":lastName.trim()?" success":""}`}
            type="text" placeholder="Kim" value={lastName}
            onChange={e=>{setLastName(e.target.value);setErrors(p=>({...p,lastName:""}));}}
            autoComplete="family-name"/>
        </Field>
      </div>
      <Field label="Email address" error={errors.email}>
        <input className={`tf-input${errors.email?" error":email.includes("@")?" success":""}`}
          type="email" placeholder="alex@email.com" value={email}
          onChange={e=>{setEmail(e.target.value);setErrors(p=>({...p,email:""}));}}
          onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="email"/>
      </Field>
      <Field label="Password" error={errors.password}>
        <div className="pw-wrap">
          <input className={`tf-input${errors.password?" error":""}`}
            type={show?"text":"password"} placeholder="Min. 8 characters" value={password}
            onChange={e=>{setPassword(e.target.value);setErrors(p=>({...p,password:""}));}}
            onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="new-password"/>
          <button type="button" className="pw-toggle" onClick={()=>setShow(s=>!s)}>
            {show?<EyeOffIcon/>:<EyeIcon/>}
          </button>
        </div>
        <StrengthBar password={password}/>
      </Field>
      <button className="btn-primary" onClick={submit} disabled={loading}>
        {loading?<><div className="spinner"/>Creating account…</>:<>Continue <span style={{fontSize:"16px"}}>&#8594;</span></>}
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────
   STEP 2 — OTP Email Verification
───────────────────────────────────────────── */
const StepOTP = ({ email, onNext, onBack }) => {
  const [otp,      setOtp]      = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [resendCD, setResendCD] = useState(30);
  const [sent,     setSent]     = useState(false);

  useEffect(() => {
    if (resendCD <= 0) return;
    const t = setInterval(() => setResendCD(c => c-1), 1000);
    return () => clearInterval(t);
  }, [resendCD]);

  const resend = async () => {
    setResendCD(30); setOtp(""); setError("");
    try {
      await supabase.auth.resend({ type: "signup", email });
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch { /* silent — UI still resets the timer */ }
  };

  const submit = async () => {
    if (otp.length < 8) { setError("Enter the complete 8-digit code"); return; }
    setLoading(true);

    try {
      const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type:  "signup",
      });
      if (verifyErr) throw verifyErr;

      // After OTP verify the session is now active — upsert the users row.
      // This covers the "Confirm email ON" case where we had no userId at signup.
      const user = verifyData?.user;
      if (user) {
        const { error: dbErr } = await supabase.from("users").upsert({
          id:            user.id,
          email:         user.email,
          password_hash: "managed_by_supabase_auth",
          first_name:    user.user_metadata?.first_name ?? "",
          last_name:     user.user_metadata?.last_name  ?? "",
          otp_verified:  true,
        }, { onConflict: "id" });
        if (dbErr) console.error("users upsert after OTP:", dbErr.message);
      }

      setLoading(false);
      onNext();
    } catch (err) {
      setLoading(false);
      setError(err.message?.includes("expired")
        ? "Code expired. Please request a new one."
        : "Incorrect code. Please try again.");
    }
  };

  return (
    <div>
      <div style={{textAlign:"center", marginBottom:"28px"}}>
        <div style={{
          width:"58px", height:"58px", borderRadius:"14px",
          background:C.accentDim, border:`1px solid ${C.accent}30`,
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 14px", fontSize:"26px",
        }}>&#9993;</div>
        <p style={{fontSize:"13px", color:C.textMid, lineHeight:"1.7"}}>
          We sent an 8-digit code to<br/>
          <span style={{color:C.text, fontWeight:"600"}}>{email}</span>
        </p>
        {sent && <p style={{fontSize:"12px", color:C.accent, marginTop:"6px", fontWeight:"600"}}>Code resent!</p>}
      </div>

      <div style={{marginBottom:"24px"}}>
        <div style={{marginBottom:"12px"}}>
          <label style={{fontSize:"13px", fontWeight:"600", color:C.textMid, display:"block", textAlign:"center", marginBottom:"14px"}}>Verification code</label>
          <OTPInput value={otp} onChange={v=>{setOtp(v);setError("");}} hasError={!!error}/>
        </div>
        {error && <div className="field-error" style={{justifyContent:"center", marginTop:"10px"}}>&#9888; {error}</div>}
      </div>

      <button className="btn-primary" onClick={submit} disabled={loading || otp.length < 8}>
        {loading?<><div className="spinner"/>Verifying…</>:<>Verify &amp; Continue <span style={{fontSize:"16px"}}>&#8594;</span></>}
      </button>

      <div style={{textAlign:"center", marginTop:"18px", fontSize:"13px", color:C.textDim}}>
        Didn't receive it?{" "}
        {resendCD > 0
          ? <span>Resend in <span style={{color:C.textMid, fontFamily:"'Instrument Sans',system-ui,sans-serif"}}>{resendCD}s</span></span>
          : <button className="resend-btn" style={{color:C.accent, fontWeight:"600"}} onClick={resend}>Resend code</button>
        }
      </div>

      <button onClick={onBack} style={{
        width:"100%", marginTop:"16px", padding:"11px",
        background:"transparent", border:`1px solid ${C.border}`, borderRadius:"10px",
        color:C.textMid, fontSize:"13px", fontWeight:"600", fontFamily:"'Instrument Sans',system-ui,sans-serif",
        cursor:"pointer", transition:"border-color .2s, color .2s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderHover;e.currentTarget.style.color=C.text;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMid;}}
      >&#8592; Back</button>

      <p style={{textAlign:"center", fontSize:"11px", color:C.textDim, marginTop:"18px", lineHeight:"1.6"}}>
        Check your spam folder if you don't see it in your inbox.
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────
   STEP 3 — Profile preferences
───────────────────────────────────────────── */
const StepProfile = ({ onNext, onBack }) => {
  const [countryCode, setCountryCode] = useState("");
  const [phone,       setPhone]       = useState("");
  const [currency,    setCurrency]    = useState("");
  const [goal,        setGoal]        = useState("");
  const [terms,       setTerms]       = useState(false);
  const [errors,      setErrors]      = useState({});
  const [loading,     setLoading]     = useState(false);

  const handleCountryChange = (val) => {
    setCountryCode(val);
    setErrors(p=>({...p,country:""}));
    if (val && !currency) {
      const c = COUNTRIES.find(c=>c.code===val);
      if (c) setCurrency(c.currency);
    }
  };

  const selectedCountry = COUNTRIES.find(c=>c.code===countryCode);

  const validate = () => {
    const e = {};
    if (!countryCode)  e.country  = "Please select your country";
    if (!phone.trim()) e.phone    = "Phone number is required";
    if (!currency)     e.currency = "Please select your currency";
    if (!goal)         e.goal     = "Please select your trading goal";
    if (!terms)        e.terms    = "You must accept the terms to continue";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setLoading(true);

    try {
      const { data: { user }, error: sessionErr } = await supabase.auth.getUser();
      if (sessionErr || !user) throw new Error("Session expired. Please sign in again.");

      const country = COUNTRIES.find(c => c.code === countryCode);

      const { error: dbErr } = await supabase.from("users").update({
        country_code:  countryCode,
        country_name:  country?.name ?? null,
        currency:      currency      || null,
        dial_code:     country?.dial ?? null,
        phone:         phone.trim()  || null,
        trading_goal:  goal          || null,
        updated_at:    new Date().toISOString(),
      }).eq("id", user.id);
      if (dbErr) throw dbErr;

      setLoading(false);
      onNext();
    } catch (err) {
      setLoading(false);
      setErrors({ country: err.message || "Could not save your profile. Please try again." });
    }
  };

  return (
    <div>
      {/* Country */}
      <Field label="Country" error={errors.country}>
        <select className={`tf-select${errors.country?" error":countryCode?" success":""}`}
          value={countryCode} onChange={e=>handleCountryChange(e.target.value)}>
          <option value="">Select your country…</option>
          {COUNTRIES.map(c=>(
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </Field>

      {/* Phone */}
      <Field label="Phone number" error={errors.phone}>
        <div className="phone-row">
          <div style={{
            background:C.surfaceAlt, border:`1px solid ${C.border}`,
            borderRadius:"10px", padding:"13px 10px",
            fontSize:"13px", color:selectedCountry?C.textMid:C.textDim,
            fontFamily:"'Instrument Sans',system-ui,sans-serif",
            display:"flex", alignItems:"center", whiteSpace:"nowrap",
          }}>
            {selectedCountry ? selectedCountry.dial : "+???"}
          </div>
          <input
            className={`tf-input${errors.phone?" error":phone.trim()?" success":""}`}
            type="tel" placeholder="800 000 0000"
            value={phone}
            onChange={e=>{setPhone(e.target.value);setErrors(p=>({...p,phone:""}));}}
            autoComplete="tel-national"
          />
        </div>
      </Field>

      {/* Currency */}
      <Field label="Preferred currency" error={errors.currency}>
        <select className={`tf-select${errors.currency?" error":currency?" success":""}`}
          value={currency} onChange={e=>{setCurrency(e.target.value);setErrors(p=>({...p,currency:""}));}}>
          <option value="">Select currency…</option>
          {CURRENCIES.map(c=>(
            <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
          ))}
        </select>
      </Field>

      {/* Goal */}
      <Field label="I want to" error={errors.goal}>
        <select className={`tf-select${errors.goal?" error":goal?" success":""}`}
          value={goal} onChange={e=>{setGoal(e.target.value);setErrors(p=>({...p,goal:""}));}}>
          <option value="">Select your goal…</option>
          <option value="copy">Copy successful traders</option>
          <option value="hire">Hire a professional trader</option>
          <option value="independent">Trade independently</option>
          <option value="all">All of the above</option>
        </select>
      </Field>

      {/* Terms */}
      <div style={{marginBottom:"24px"}}>
        <div style={{display:"flex", alignItems:"flex-start", gap:"10px"}}>
          <input type="checkbox" className="tf-checkbox" id="terms"
            checked={terms} onChange={e=>{setTerms(e.target.checked);setErrors(p=>({...p,terms:""}));}}
            style={{marginTop:"2px"}}/>
          <label htmlFor="terms" style={{fontSize:"13px", color:C.textMid, cursor:"pointer", lineHeight:"1.6", userSelect:"none"}}>
            I agree to the{" "}
            <a href="/terms" style={{color:C.accent, fontWeight:"600"}}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" style={{color:C.accent, fontWeight:"600"}}>Privacy Policy</a>.
            {" "}I confirm I am 18+ years of age.
          </label>
        </div>
        {errors.terms && <div className="field-error" style={{marginTop:"8px"}}>&#9888; {errors.terms}</div>}
      </div>

      <button className="btn-primary" onClick={submit} disabled={loading}>
        {loading?<><div className="spinner"/>Setting up…</>:<>Create Account <span style={{fontSize:"16px"}}>&#8594;</span></>}
      </button>

      <button onClick={onBack} style={{
        width:"100%", marginTop:"12px", padding:"11px",
        background:"transparent", border:`1px solid ${C.border}`, borderRadius:"10px",
        color:C.textMid, fontSize:"13px", fontWeight:"600", fontFamily:"'Instrument Sans',system-ui,sans-serif",
        cursor:"pointer", transition:"border-color .2s, color .2s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderHover;e.currentTarget.style.color=C.text;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMid;}}
      >&#8592; Back</button>
    </div>
  );
};

/* ─────────────────────────────────────────────
   STEP 4 — Success
───────────────────────────────────────────── */
const StepSuccess = ({ name }) => {
  useEffect(() => {
    const t = setTimeout(() => { window.location.href = "/dashboard"; }, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{textAlign:"center", padding:"12px 0 8px"}}>
      <div className="success-icon">&#10003;</div>
      <h3 style={{fontFamily:"'Instrument Serif',Georgia,serif", fontSize:"20px", fontWeight:"400", color:C.text, marginBottom:"8px"}}>
        Welcome, {name}!
      </h3>
      <p style={{fontSize:"14px", color:C.textMid, lineHeight:"1.65", marginBottom:"24px"}}>
        Your account is ready. Redirecting you to your dashboard…
      </p>
      <div style={{display:"flex", justifyContent:"center"}}>
        <div style={{
          width:"36px", height:"36px", borderRadius:"50%",
          border:`2px solid ${C.border}`, borderTopColor:C.accent,
          animation:"spinDot .8s linear infinite",
        }}/>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════
   AUTH SHELL — "Global Desk" (matches the landing page)
   Left: a dark trading desk with live, drawn graphics.
   Right: a calm porcelain form column.
═════════════════════════════════════════════ */
const D = {
  night:"#07101E", night2:"#0C1A2E", porcelain:"#EEF2F7", gold:"#E2AE4A", goldDeep:"#C99331",
  onDark:"rgba(238,242,247,.74)", onDarkDim:"rgba(238,242,247,.5)", darkRule:"rgba(238,242,247,.12)",
  gainLit:"#2FD394", lossLit:"#FF6470", blue:"#5B8CFF",
};

const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap');

body { font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: ${C.bg}; color: ${C.text}; font-size: 16px; }
.grid-bg, .tf-nav { display: none !important; }
.num { font-variant-numeric: tabular-nums; }
:focus-visible { outline: 2px solid ${C.text}; outline-offset: 3px; }
.auth-desk :focus-visible { outline-color: ${D.gold}; }

/* Inputs */
.tf-input, .tf-select {
  height: 50px; padding: 0 16px; font-size: 15.5px; border-radius: 10px;
  background: #fff; border: 1px solid ${C.border}; color: ${C.text};
  font-family: 'Instrument Sans', system-ui, sans-serif;
}
.tf-input:hover, .tf-select:hover { border-color: ${C.borderHover}; }
.tf-input:focus-visible, .tf-select:focus-visible, .otp-cell:focus-visible, .otp-box:focus-visible { outline: none; }
.tf-input:focus, .tf-select:focus { border-color: ${D.goldDeep}; box-shadow: 0 0 0 4px rgba(226,174,74,.18); }
.tf-input.error, .tf-select.error { border-color: ${C.red}; box-shadow: 0 0 0 4px rgba(200,55,63,.10); }
.tf-input.success, .tf-select.success { border-color: ${C.green}80; }
.pw-toggle { color: ${C.textDim}; }
.field-error { font-size: 13px; }
.tf-checkbox { width: 18px; height: 18px; border-radius: 5px; background: #fff; border-color: ${C.borderHover}; }
.tf-checkbox:checked { background: ${C.text}; border-color: ${C.text}; }
.tf-checkbox:checked::after { color: ${D.gold}; }

/* Primary action: bullion gold, as on the landing page */
.btn-primary {
  height: 52px; padding: 0 20px; border-radius: 10px;
  background: ${D.gold}; color: ${D.night}; font-size: 15.5px; font-weight: 600;
  font-family: 'Instrument Sans', system-ui, sans-serif;
  box-shadow: 0 12px 30px -14px rgba(226,174,74,.9);
}
.btn-primary::after { display: none; }
.btn-primary:hover:not(:disabled) { background: #EDBE5F; transform: none; box-shadow: 0 16px 34px -14px rgba(226,174,74,1); }
.btn-primary:active:not(:disabled) { transform: translateY(1px); }
.spinner { border-color: rgba(7,16,30,.25); border-top-color: ${D.night}; }

/* One-time code cells */
.otp-cell, .otp-box {
  background: #fff; border: 1px solid ${C.border}; border-radius: 12px; color: ${C.text};
  font-family: 'Instrument Sans', system-ui, sans-serif; font-weight: 600; font-variant-numeric: tabular-nums;
}
.otp-cell:focus, .otp-box:focus { border-color: ${D.goldDeep}; box-shadow: 0 0 0 4px rgba(226,174,74,.18); }
.otp-cell.filled, .otp-box.filled { border-color: ${C.text}; color: ${C.text}; background: #FBF7EE; }

.success-icon { background: rgba(226,174,74,.16); border-color: rgba(226,174,74,.5); color: ${C.accent}; }
.step-dots, .step-connector { display: none !important; }

/* Language pickers (all variants) */
.lang-btn, .tf-lang-btn {
  height: 40px; padding: 0 12px; border-radius: 10px; font-size: 14px; font-weight: 500;
  background: transparent; border: 1px solid ${C.border}; color: ${C.textMid};
  font-family: 'Instrument Sans', system-ui, sans-serif;
}
.lang-btn:hover, .tf-lang-btn:hover, .tf-lang-btn.open { border-color: ${C.text}; color: ${C.text}; }
.lang-dropdown, .tf-lang-menu { border-radius: 12px; box-shadow: 0 20px 44px -12px rgba(11,22,40,.3); }
.lang-option.active, .tf-lang-opt.active { color: ${C.text}; background: rgba(226,174,74,.16); font-weight: 600; }

/* ── Layout ── */
.auth { display: grid; grid-template-columns: minmax(440px, 46%) minmax(0,1fr); min-height: 100vh; }
.auth-desk {
  position: sticky; top: 0; height: 100vh; overflow: hidden;
  display: flex; flex-direction: column; gap: 28px;
  padding: 32px clamp(28px,4vw,60px) 28px;
  background: radial-gradient(110% 80% at 80% 70%, #14294B 0%, ${D.night} 62%); color: ${C.bg};
}
.desk-logo img { height: 34px; width: auto; filter: brightness(0) invert(1); }
.desk-h {
  font-family: 'Instrument Serif', Georgia, serif; font-weight: 400;
  font-size: clamp(42px,4.2vw,64px); line-height: .98; letter-spacing: -.01em; max-width: 9em;
  animation: aRise .8s cubic-bezier(.22,1,.36,1) both;
}
.desk-p { font-size: 17px; color: ${D.onDark}; max-width: 26em; margin-top: 16px; animation: aRise .8s cubic-bezier(.22,1,.36,1) .08s both; }
.desk-art { position: relative; flex: 1; min-height: 280px; animation: aFade 1s ease .2s both; }
.desk-foot { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 13.5px; color: ${D.onDarkDim}; }
.desk-foot span { display: inline-flex; align-items: center; gap: 8px; }
.desk-foot i { width: 6px; height: 6px; border-radius: 50%; background: ${D.gold}; }

.glass {
  position: absolute; color: ${C.bg};
  background: linear-gradient(160deg, rgba(27,45,74,.94), rgba(12,26,46,.96));
  border: 1px solid rgba(238,242,247,.12); border-radius: 16px;
  box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 40px 80px -30px rgba(0,0,0,.8);
}
.g-lbl { font-size: 12.5px; color: ${D.onDarkDim}; }
.g-val { font-size: 15px; font-weight: 600; }
.float-a { animation: aFloat 7s ease-in-out infinite; }
.float-b { animation: aFloat 8s ease-in-out -3s infinite; }
.float-c { animation: aFloat 9s ease-in-out -5s infinite; }

.desk-steps { display: flex; flex-direction: column; gap: 4px; margin-top: 28px; }
.desk-step { display: flex; align-items: center; gap: 14px; padding: 10px 0; font-size: 16px; color: ${D.onDarkDim}; transition: color .3s; }
.desk-step b {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; border: 1.5px solid rgba(238,242,247,.24); transition: all .3s;
}
.desk-step.now { color: #fff; }
.desk-step.now b { background: ${D.gold}; border-color: ${D.gold}; color: ${D.night}; box-shadow: 0 0 0 6px rgba(226,174,74,.16); }
.desk-step.done b { border-color: ${D.gold}; color: ${D.gold}; }

.auth-pane { display: flex; flex-direction: column; min-height: 100vh; min-width: 0; }
.pane-top { display: flex; align-items: center; justify-content: flex-end; gap: 14px; padding: 20px clamp(20px,4vw,48px); }
.pane-logo { display: none; margin-right: auto; }
.pane-logo img { height: 30px; width: auto; }
.pane-cta-label { font-size: 14.5px; color: ${C.textMid}; white-space: nowrap; }
.pane-cta {
  display: inline-flex; align-items: center; height: 40px; padding: 0 16px; border-radius: 10px; white-space: nowrap;
  font-size: 14.5px; font-weight: 600; background: ${C.text}; color: ${C.bg}; transition: background .15s;
}
.pane-cta:hover { background: #13233B; }
.pane-body { flex: 1; display: flex; justify-content: center; padding: clamp(16px,6vh,72px) clamp(20px,4vw,48px) 48px; }
.pane-col { width: 100%; max-width: 440px; }
.auth-title { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(38px,3.6vw,50px); line-height: 1; letter-spacing: -.01em; }
.auth-sub { font-size: 16.5px; color: ${C.textMid}; margin-top: 10px; }
.auth-prog { margin: 24px 0 0; }
.auth-prog-bars { display: grid; gap: 6px; }
.auth-prog-bars span { height: 4px; border-radius: 2px; background: ${C.border}; overflow: hidden; position: relative; }
.auth-prog-bars span::after { content: ''; position: absolute; inset: 0; background: ${C.text}; transform: scaleX(0); transform-origin: left; transition: transform .5s cubic-bezier(.22,1,.36,1); }
.auth-prog-bars span.on::after { transform: scaleX(1); }
.auth-prog-bars span.now::after { background: ${D.gold}; transform: scaleX(1); }
.auth-prog-lbl { font-size: 14px; color: ${C.textMid}; margin-top: 10px; }
.auth-prog-lbl strong { color: ${C.text}; font-weight: 600; }
.auth-card {
  margin-top: 28px; background: #fff; border: 1px solid ${C.border}; border-radius: 18px;
  padding: clamp(22px,3vw,32px); box-shadow: 0 40px 70px -50px rgba(11,22,40,.55);
  animation: aRise .7s cubic-bezier(.22,1,.36,1) .05s both;
}
.auth-alt { margin-top: 24px; font-size: 15px; color: ${C.textMid}; text-align: center; }
.auth-alt a { color: ${C.text}; font-weight: 600; border-bottom: 2px solid ${D.gold}; padding-bottom: 1px; }
.auth-legal { margin-top: 18px; font-size: 13px; color: ${C.textDim}; text-align: center; line-height: 1.6; }
.auth-legal a { text-decoration: underline; }

@keyframes aRise  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes aFade  { from { opacity: 0; } to { opacity: 1; } }
@keyframes aFloat { 0%,100% { translate: 0 0; } 50% { translate: 0 -9px; } }
@keyframes aSpin  { to { transform: rotate(360deg); } }
@keyframes aArc   { from { stroke-dashoffset: 400; } to { stroke-dashoffset: 0; } }

@media (max-width: 1100px) {
  .auth { grid-template-columns: minmax(380px, 42%) minmax(0,1fr); }
  .desk-art .hide-md { display: none; }
}
@media (max-width: 900px) {
  .auth { grid-template-columns: 1fr; }
  .auth-desk { position: relative; height: auto; padding: 22px 20px 28px; gap: 0; }
  .desk-logo, .desk-art, .desk-foot, .desk-steps { display: none; }
  .desk-h { font-size: 34px; max-width: none; }
  .desk-p { font-size: 15.5px; margin-top: 8px; }
  .auth-pane { min-height: 0; }
  .pane-top { position: absolute; top: 0; left: 0; right: 0; padding: 14px 20px; }
  .auth-desk { padding-top: 78px; }
  .pane-logo { display: inline-flex; }
  .pane-logo img { filter: brightness(0) invert(1); }
  .pane-top .lang-btn, .pane-top .tf-lang-btn { color: ${D.onDark}; border-color: rgba(238,242,247,.24); }
  .pane-cta-label { display: none; }
  .pane-cta { background: ${D.gold}; color: ${D.night}; }
  .pane-body { padding: 28px 20px 48px; }
  .auth-title { font-size: 36px; }
}
@media (max-width: 420px) {
  .pane-top .lang-btn span:nth-child(2), .pane-top .tf-lang-btn span:nth-child(3) { display: none; }
}
@media (min-width: 901px) and (max-height: 820px) {
  .auth-desk.has-steps .desk-art { display: none; }
  .auth-desk.has-steps { justify-content: space-between; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
}

/* Text wordmark logo */
.brand { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; line-height: 1; letter-spacing: -.01em; white-space: nowrap; display: inline-block; }
.brand b { font-weight: 400; color: #E2AE4A; }
.desk-logo .brand { font-size: 30px; color: #EEF2F7; }
.pane-logo .brand { font-size: 26px; color: #0B1628; }
@media (max-width: 900px) { .pane-logo .brand { color: #EEF2F7; } }
`;

const authRng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* Wireframe globe with exchange pins and gold trade routes */
const AuthGlobe = ({ size = 460, style }) => {
  const R = 190, cx = 230, cy = 230;
  const pins = [{ x:128, y:196 }, { x:222, y:164 }, { x:236, y:252 }, { x:290, y:210 }, { x:352, y:196 }, { x:336, y:300 }];
  const arcs = [[0,1],[1,3],[3,4],[1,2],[4,5]];
  return (
    <svg width={size} height={size} viewBox="0 0 460 460" style={style} aria-hidden="true">
      <defs>
        <radialGradient id="authGlobe" cx=".38" cy=".32"><stop offset="0" stopColor="#1B3560" stopOpacity=".9" /><stop offset="1" stopColor={D.night} stopOpacity=".15" /></radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#authGlobe)" stroke="rgba(91,140,255,.5)" />
      {[-60,-35,-12,12,35,60].map(l => { const a = l * Math.PI / 180; return <ellipse key={l} cx={cx} cy={cy - R * Math.sin(a)} rx={R * Math.cos(a)} ry={R * Math.cos(a) * .16} fill="none" stroke="rgba(91,140,255,.24)" />; })}
      {[20,45,70].map(l => <ellipse key={l} cx={cx} cy={cy} rx={R * Math.sin(l * Math.PI / 180)} ry={R} fill="none" stroke="rgba(91,140,255,.24)" />)}
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="rgba(91,140,255,.24)" />
      {arcs.map(([a, b], i) => { const p = pins[a], q = pins[b]; return <path key={i} d={`M${p.x},${p.y} Q${(p.x + q.x) / 2},${Math.min(p.y, q.y) - 50} ${q.x},${q.y}`} fill="none" stroke={D.gold} strokeWidth="1.4" strokeDasharray="400" opacity=".75" style={{ animation:`aArc 2.4s cubic-bezier(.22,1,.36,1) ${.4 + i * .25}s both` }} />; })}
      {pins.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={D.gold}>
            <animate attributeName="r" values="3;14" dur="2.6s" begin={`${i * .45}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values=".8;0" dur="2.6s" begin={`${i * .45}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={p.x} cy={p.y} r="3.4" fill={D.gold} />
        </g>
      ))}
    </svg>
  );
};

/* Live candlestick chart */
const AuthCandles = ({ w = 340, h = 120, seed = 42 }) => {
  const [cs, setCs] = useState(() => {
    const r = authRng(seed); let p = 118; const out = [];
    for (let i = 0; i < 28; i++) { const o = p, c = o + (r() - .42) * 2.4; out.push({ o, c, h: Math.max(o, c) + r() * 1.2, l: Math.min(o, c) - r() * 1.2 }); p = c; }
    return out;
  });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t = 0;
    const id = setInterval(() => {
      if (document.hidden) return;
      t++;
      setCs(prev => {
        const next = prev.slice(); const last = { ...next[next.length - 1] };
        last.c += (Math.random() - .45) * .9; last.h = Math.max(last.h, last.c); last.l = Math.min(last.l, last.c);
        next[next.length - 1] = last;
        if (t % 6 === 0) { next.shift(); next.push({ o:last.c, c:last.c, h:last.c, l:last.c }); }
        return next;
      });
    }, 900);
    return () => clearInterval(id);
  }, []);
  const lo = Math.min(...cs.map(c => c.l)), hi = Math.max(...cs.map(c => c.h));
  const y = v => 6 + (1 - (v - lo) / (hi - lo)) * (h - 12);
  const cw = w / cs.length, last = cs[cs.length - 1].c;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {[0,1,2].map(i => <line key={i} x1="0" x2={w} y1={10 + i * (h - 20) / 2} y2={10 + i * (h - 20) / 2} stroke="rgba(238,242,247,.07)" />)}
      {cs.map((c, i) => { const up = c.c >= c.o, col = up ? D.gainLit : D.lossLit, x = i * cw + cw / 2; return (
        <g key={i}>
          <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth="1.2" />
          <rect x={x - cw * .3} width={cw * .6} y={y(Math.max(c.o, c.c))} height={Math.max(1.5, Math.abs(y(c.o) - y(c.c)))} fill={col} rx="1" />
        </g>
      ); })}
      <line x1="0" x2={w} y1={y(last)} y2={y(last)} stroke={D.gold} strokeDasharray="3 4" />
    </svg>
  );
};

/* Dusk render of a property */
const AuthPropertyArt = () => (
  <svg width="100%" height="100%" viewBox="0 0 112 76" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="authDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14264A" /><stop offset=".62" stopColor="#3B4C7A" /><stop offset="1" stopColor="#E7A95A" /></linearGradient></defs>
    <rect width="112" height="76" fill="url(#authDusk)" />
    <circle cx="84" cy="58" r="9" fill="#F4C77A" opacity=".8" />
    <path d="M0,62 h8 v-12 h6 v-8 h7 v20 h10 v-16 h6 v16 h12 v-10 h8 v10 h10 v-22 h7 v22 h12 v-14 h9 v14 h17 V76 H0 Z" fill="#1A2B4A" />
    <path d="M44,76 V14 L60,6 V76 Z" fill="#23385F" /><path d="M60,6 L70,12 V76 H60 Z" fill="#172846" />
    {Array.from({ length:12 }).map((_, r) => [0,1].map(c => <rect key={`${r}${c}`} x={47 + c * 6} y={18 + r * 4.5} width="4.4" height="2.6" fill={(r * 3 + c) % 4 ? D.gold : "#2A4166"} />))}
  </svg>
);

/* Vault dial for password recovery */
const AuthVault = () => (
  <svg width="300" height="300" viewBox="0 0 300 300" aria-hidden="true" style={{ position:"absolute", left:"50%", top:"50%", marginLeft:-150, marginTop:-150 }}>
    <circle cx="150" cy="150" r="140" fill="rgba(27,45,74,.6)" stroke="rgba(238,242,247,.12)" />
    <g style={{ transformOrigin:"150px 150px", animation:"aSpin 40s linear infinite" }}>
      {Array.from({ length:60 }).map((_, i) => (
        <line key={i} x1="150" y1="18" x2="150" y2={i % 5 ? 26 : 34} stroke={i % 5 ? "rgba(238,242,247,.25)" : D.gold} strokeWidth={i % 5 ? 1 : 2} transform={`rotate(${i * 6} 150 150)`} />
      ))}
    </g>
    <circle cx="150" cy="150" r="98" fill={D.night2} stroke="rgba(238,242,247,.14)" />
    <g style={{ transformOrigin:"150px 150px", animation:"aSpin 14s linear infinite reverse" }}>
      {[0,60,120,180,240,300].map(a => <rect key={a} x="146" y="58" width="8" height="22" rx="4" fill="rgba(238,242,247,.18)" transform={`rotate(${a} 150 150)`} />)}
    </g>
    <circle cx="150" cy="150" r="46" fill={D.gold} />
    <rect x="134" y="146" width="32" height="26" rx="5" fill={D.night} />
    <path d="M140 146v-8a10 10 0 0120 0v8" fill="none" stroke={D.night} strokeWidth="5" />
    <circle cx="150" cy="158" r="3.5" fill={D.gold} />
  </svg>
);

/* Live market sessions from the visitor's clock */
const AUTH_MARKETS = [
  { name:"New York", tz:"America/New_York", open:9.5, close:16 },
  { name:"London",   tz:"Europe/London",    open:8,   close:16.5 },
  { name:"Lagos",    tz:"Africa/Lagos",     open:10,  close:14.5 },
  { name:"Tokyo",    tz:"Asia/Tokyo",       open:9,   close:15.5 },
];
const authMarketOpen = (m) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone:m.tz, hour:"2-digit", minute:"2-digit", weekday:"short", hourCycle:"h23" }).formatToParts(new Date());
  const g = t => parts.find(p => p.type === t)?.value;
  const h = +g("hour") + +g("minute") / 60, wd = g("weekday");
  return wd !== "Sat" && wd !== "Sun" && h >= m.open && h < m.close;
};

const AuthDeskArt = ({ mode }) => {
  const [value, setValue] = useState(48291.4);
  useEffect(() => {
    if (mode !== "login") return;
    const id = setInterval(() => { if (!document.hidden) setValue(v => +(v + (Math.random() - .42) * 22).toFixed(2)); }, 1400);
    return () => clearInterval(id);
  }, [mode]);

  if (mode === "forgot") return (
    <div className="desk-art">
      <AuthVault />
      <div className="glass float-b" style={{ left:0, bottom:"6%", padding:"12px 16px", maxWidth:"260px" }}>
        <div className="g-val">Your funds stay locked</div>
        <div className="g-lbl">Resetting a password never moves money or changes your positions.</div>
      </div>
    </div>
  );

  if (mode === "signup") return (
    <div className="desk-art">
      <AuthGlobe size={420} style={{ position:"absolute", right:"-80px", top:"-10px", opacity:.8 }} />
      <div className="glass float-a" style={{ left:0, top:"4%", width:"min(300px,62%)", padding:"14px 16px 10px" }}>
        <div style={{ display:"flex", justifyContent:"space-between" }}><span className="g-val">Stock trading</span><span className="g-lbl num">NVDA</span></div>
        <AuthCandles w={300} h={78} seed={9} />
      </div>
      <div className="glass float-b" style={{ right:0, top:"20%", width:"236px", padding:"12px 14px", display:"flex", gap:"12px", alignItems:"center" }}>
        <span style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(145deg,#1C3A6E,#07101E)", color:D.gold, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 }}>MW</span>
        <div><div className="g-val">Copy trading</div><div className="g-lbl num">Mirrors Marcus in 38 ms</div></div>
      </div>
      <div className="glass float-c hide-md" style={{ left:"8%", bottom:"4%", width:"210px", overflow:"hidden" }}>
        <div style={{ height:"78px" }}><AuthPropertyArt /></div>
        <div style={{ padding:"10px 14px" }}><div className="g-val">Real estate</div><div className="g-lbl">Shares from $100</div></div>
      </div>
      <div className="glass float-a" style={{ right:"4%", bottom:"12%", width:"220px", padding:"12px 14px" }}>
        <div className="g-val">Hire a trader</div>
        <div style={{ display:"flex", height:"8px", borderRadius:"4px", overflow:"hidden", margin:"8px 0 6px" }}><span style={{ width:"80%", background:D.gainLit }} /><span style={{ width:"20%", background:D.gold }} /></div>
        <div className="g-lbl">You keep 80% of profit. No profit, no fee.</div>
      </div>
    </div>
  );

  return (
    <div className="desk-art">
      <AuthGlobe size={440} style={{ position:"absolute", right:"-60px", top:"-20px", opacity:.85 }} />
      <div className="glass float-a" style={{ left:0, top:"8%", width:"min(360px,78%)", padding:"16px 16px 10px" }}>
        <div className="g-lbl">Portfolio value</div>
        <div className="num" style={{ fontSize:"26px", fontWeight:700, lineHeight:1.25 }}>${value.toLocaleString("en-US", { minimumFractionDigits:2 })}</div>
        <div className="num" style={{ fontSize:"13.5px", fontWeight:600, color:D.gainLit, marginBottom:"8px" }}>+2.4% today</div>
        <AuthCandles w={340} h={96} />
      </div>
      <div className="glass float-b" style={{ right:0, top:"52%", width:"250px", padding:"12px 14px", display:"flex", gap:"12px", alignItems:"center" }}>
        <span style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(145deg,#1C3A6E,#07101E)", color:D.gold, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, flexShrink:0 }}>MW</span>
        <div><div className="g-val">Marcus Webb bought BTC</div><div className="g-lbl num">Copied while you were away</div></div>
      </div>
      <div className="glass float-c hide-md" style={{ left:"4%", bottom:"2%", padding:"10px 14px", display:"flex", gap:"16px", whiteSpace:"nowrap" }}>
        {AUTH_MARKETS.map(m => { const open = authMarketOpen(m); return (
          <span key={m.name} style={{ display:"inline-flex", alignItems:"center", gap:"7px", fontSize:"13px", fontWeight:600 }}>
            <i style={{ width:7, height:7, borderRadius:"50%", background: open ? D.gainLit : "rgba(238,242,247,.3)" }} />{m.name} {open ? "open" : "closed"}
          </span>
        ); })}
      </div>
    </div>
  );
};

const AUTH_COPY = {
  login:  { h:"Welcome back to your desk.", p:"Your positions, copied trades and property income are right where you left them." },
  signup: { h:"Open your account. Invest every way.", p:"Stocks, copy trading, hired traders and property shares, all from one balance." },
  forgot: { h:"Locked out? Let's get you back in.", p:"Three quick steps to a new password. Your money and positions stay untouched throughout." },
};

/* Text wordmark logo */
const Logo = () => (
  <span className="brand">Profit<b>Gain</b>Signal</span>
);

const AuthShell = ({ mode, steps, step, navRight, title, sub, progress, children, footer, legal, noTranslate }) => (
  <div className="auth">
    <aside className={"auth-desk" + (steps ? " has-steps" : "")}>
      <a href="/" className="desk-logo" aria-label="ProfitGainSignal home"><Logo /></a>
      <div>
        <h2 className="desk-h">{AUTH_COPY[mode].h}</h2>
        <p className="desk-p">{AUTH_COPY[mode].p}</p>
        {steps && (
          <ol className="desk-steps" aria-hidden="true">
            {steps.map((s, i) => (
              <li key={s} className={"desk-step" + (i + 1 === step ? " now" : i + 1 < step ? " done" : "")}>
                <b>{i + 1 < step ? "✓" : i + 1}</b>{s}
              </li>
            ))}
          </ol>
        )}
      </div>
      <AuthDeskArt mode={mode} />
      <div className="desk-foot">
        {["Segregated client funds","256-bit encryption","Two-factor sign-in"].map(t => <span key={t}><i />{t}</span>)}
      </div>
    </aside>

    <main className="auth-pane">
      <div className="pane-top">
        <a href="/" className="pane-logo" aria-label="ProfitGainSignal home"><Logo /></a>
        {navRight}
      </div>
      <div className="pane-body">
        <div className="pane-col">
          <h1 className="auth-title">{title}</h1>
          {sub && <p className="auth-sub">{sub}</p>}
          {progress && (
            <div className="auth-prog" aria-label={`Step ${progress.current} of ${progress.total}`}>
              <div className="auth-prog-bars" style={{ gridTemplateColumns:`repeat(${progress.total},1fr)` }}>
                {Array.from({ length:progress.total }).map((_, i) => <span key={i} className={i + 1 < progress.current ? "on" : i + 1 === progress.current ? "now" : ""} />)}
              </div>
              <div className="auth-prog-lbl">Step {progress.current} of {progress.total}: <strong>{progress.label}</strong></div>
            </div>
          )}
          <div className={"auth-card" + (noTranslate ? " notranslate" : "")} translate={noTranslate ? "no" : undefined}>
            {children}
          </div>
          {footer && <div className="auth-alt">{footer}</div>}
          {legal && <p className="auth-legal">{legal}</p>}
        </div>
      </div>
    </main>
  </div>
);


/* ─────────────────────────────────────────────
   REGISTRATION DOCUMENT (doc/reg.pdf)
   Loaded once and sent with the welcome email, both as a
   base64 attachment and as a public download link.
───────────────────────────────────────────── */
const REG_DOC_NAME = "ProfitGainSignal-Registration.pdf";

const loadRegDocument = async () => {
  const url = new URL(regDocUrl, window.location.origin).href;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]); // strip "data:...;base64,"
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { filename: REG_DOC_NAME, content: base64, contentType: "application/pdf", url };
  } catch (err) {
    console.warn("Could not load registration document, sending link only:", err);
    return { filename: REG_DOC_NAME, content: null, contentType: "application/pdf", url };
  }
};

/* ─────────────────────────────────────────────
   MAIN SIGNUP PAGE
───────────────────────────────────────────── */
const SignUp = () => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({});

  // Inject & persist Google Translate
  useGoogleTranslate();

  // Inject Chatway live-chat widget
  useChatwayWidget();

  const totalSteps = 3;

  const goStep2 = (info) => { setData(info); setStep(2); };
  const goStep3 = ()     => { setStep(3); };
  const welcomeSent = useRef(false);
  const goSuccess = ()   => {
    setStep(4);
    // Registration is complete: send the welcome email once (never blocks sign-up)
    if (!welcomeSent.current) {
      welcomeSent.current = true;
      loadRegDocument()
        .then(doc => sendWelcomeEmail({
          email: data.email,
          firstName: data.firstName,
          documentUrl: doc.url,                                   // link to reg.pdf
          attachments: doc.content ? [{
            filename: doc.filename,
            content: doc.content,                                 // base64
            contentType: doc.contentType,
          }] : [],
        }))
        .catch(err => console.warn("Welcome email failed:", err));
    }
  };
  const goBack    = ()   => { setStep(s => s - 1); };

  const stepLabel = { 1:"Your details", 2:"Verify email", 3:"Preferences", 4:"All set" };

  return (
    <>
      <style>{CSS}</style>
      <style>{AUTH_CSS}</style>
      <AuthShell
        mode="signup"
        steps={["Your details","Verify email","Preferences"]}
        step={step}
        navRight={<><LanguagePicker /><span className="pane-cta-label">Already a member?</span><a href="/login" className="pane-cta">Log in</a></>}
        title={step === 1 ? "Create your account" : step === 2 ? "Check your email" : step === 3 ? "Almost there" : "You're in"}
        sub={step === 1 ? "Join 280,000+ investors trading and investing on ProfitGainSignal."
           : step === 2 ? "Enter the code we sent to verify your email."
           : step === 3 ? "A few details to set up your account." : ""}
        progress={step < 4 ? { current:step, total:totalSteps, label:stepLabel[step] } : null}
        footer={step < 4 && <>Already have an account? <a href="/login">Sign in</a></>}
        legal={<>By creating an account you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</>}
      >
        {step === 1 && <StepAccount onNext={goStep2} />}
        {step === 2 && <StepOTP email={data.email} onNext={goStep3} onBack={goBack} />}
        {step === 3 && <StepProfile onNext={goSuccess} onBack={goBack} />}
        {step === 4 && <StepSuccess name={data.firstName || "Trader"} />}
      </AuthShell>
    </>
  );
};

export default SignUp;