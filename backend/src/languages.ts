// Languages supported by BOTH Cartesia voice cloning and ink-whisper STT
// (clone `language` enum ∩ ink-whisper `language` enum, Cartesia-Version 2026-08-14).
// Odia (`or`) is cloneable but not in ink-whisper, so it's excluded.
// zh = Mandarin only: Cartesia cloning/TTS has no Cantonese, so Cantonese speakers aren't supported end to end.
// `accent` = default native accent id passed at clone time (required later for PATCH /voices/{id}/accents).

export interface Lang {
  code: string;
  name: string; // English name
  native: string; // endonym for the dropdown
  accent: string;
}

export const LANGUAGES: Lang[] = [
  { code: "zh", name: "Chinese (Mandarin)", native: "中文", accent: "mandarin" },
  // English: for cloning a parent's voice, which then gets a native "mandarin" accent added.
  { code: "en", name: "English", native: "English", accent: "general-american" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", accent: "southern-vietnamese" },
  { code: "es", name: "Spanish", native: "Español", accent: "mexican" },
  { code: "tl", name: "Tagalog", native: "Tagalog", accent: "manila" },
  { code: "ko", name: "Korean", native: "한국어", accent: "korean" },
  { code: "hi", name: "Hindi", native: "हिन्दी", accent: "standard-hindi" },
  { code: "ar", name: "Arabic", native: "العربية", accent: "modern-standard-arabic" },
  { code: "ru", name: "Russian", native: "Русский", accent: "russian" },
  { code: "pt", name: "Portuguese", native: "Português", accent: "brazilian-portuguese" },
  { code: "fr", name: "French", native: "Français", accent: "parisian" },
  { code: "ja", name: "Japanese", native: "日本語", accent: "standard-japanese" },
  { code: "de", name: "German", native: "Deutsch", accent: "standard-german" },
  { code: "it", name: "Italian", native: "Italiano", accent: "standard-italian" },
  { code: "uk", name: "Ukrainian", native: "Українська", accent: "kyiv" },
  { code: "pl", name: "Polish", native: "Polski", accent: "polish" },
  { code: "tr", name: "Turkish", native: "Türkçe", accent: "istanbul" },
  { code: "th", name: "Thai", native: "ไทย", accent: "central-thai" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", accent: "standard-indonesian" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", accent: "malay" },
  { code: "bn", name: "Bengali", native: "বাংলা", accent: "indian-bengali" },
  { code: "ur", name: "Urdu", native: "اردو", accent: "urdu" },
  { code: "ta", name: "Tamil", native: "தமிழ்", accent: "central-tamil" },
  { code: "te", name: "Telugu", native: "తెలుగు", accent: "telangana" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", accent: "parsi" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", accent: "southern-karnataka" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", accent: "north-kerala" },
  { code: "mr", name: "Marathi", native: "मराठी", accent: "konkani" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", accent: "powadhi" },
  { code: "he", name: "Hebrew", native: "עברית", accent: "israeli" },
  { code: "el", name: "Greek", native: "Ελληνικά", accent: "thessaloniki" },
  { code: "nl", name: "Dutch", native: "Nederlands", accent: "randstad" },
  { code: "sv", name: "Swedish", native: "Svenska", accent: "stockholm" },
  { code: "no", name: "Norwegian", native: "Norsk", accent: "oslo" },
  { code: "da", name: "Danish", native: "Dansk", accent: "danish" },
  { code: "fi", name: "Finnish", native: "Suomi", accent: "finnish" },
  { code: "cs", name: "Czech", native: "Čeština", accent: "czech" },
  { code: "sk", name: "Slovak", native: "Slovenčina", accent: "slovak" },
  { code: "hu", name: "Hungarian", native: "Magyar", accent: "budapest" },
  { code: "ro", name: "Romanian", native: "Română", accent: "romanian" },
  { code: "bg", name: "Bulgarian", native: "Български", accent: "bulgarian" },
  { code: "hr", name: "Croatian", native: "Hrvatski", accent: "zagreb" },
  { code: "ka", name: "Georgian", native: "ქართული", accent: "tbilisi" },
];

export const getLang = (code: string) => LANGUAGES.find((l) => l.code === code);
