// Approved vocabulary. The cloned voice may ONLY speak lines from this list —
// the server looks up text by id, so the client can never make the cloned voice say arbitrary text.
// Mostly things a child finds in their bedroom, for the "say goodnight to your room" ritual.

export interface Word {
  id: string;
  emoji: string;
  en: string; // the word in English (shown to parents)
  enLine: string; // English sentence (unused in the Mandarin flow; kept for an English mode)
  zh: string; // the word in Chinese characters
  pinyin: string;
  zhLine: string; // "这是…。" — "This is …"
  gnLine: string; // "晚安，…。" — "Good night, …"
  gnPinyin: string;
}

const w = (
  id: string,
  emoji: string,
  en: string,
  article: string,
  zh: string,
  pinyin: string,
  // what grandma calls it when saying goodnight, if different (e.g. 小熊 rather than 玩具熊)
  gn?: { zh: string; pinyin: string },
): Word => ({
  id,
  emoji,
  en,
  enLine: `This is ${article} ${en}.`,
  zh,
  pinyin,
  zhLine: `这是${zh}。`,
  gnLine: `晚安，${gn?.zh ?? zh}。`,
  gnPinyin: `Wǎn'ān, ${gn?.pinyin ?? pinyin}.`,
});

export const VOCAB: Word[] = [
  // bedroom
  w("bed", "🛏️", "bed", "a", "床", "chuáng", { zh: "小床", pinyin: "xiǎo chuáng" }),
  w("pillow", "🛌", "pillow", "a", "枕头", "zhěntou"),
  w("blanket", "🧣", "blanket", "a", "被子", "bèizi"),
  w("lamp", "💡", "lamp", "a", "台灯", "táidēng"),
  w("teddy-bear", "🧸", "teddy bear", "a", "玩具熊", "wánjù xióng", { zh: "小熊", pinyin: "xiǎo xióng" }),
  w("doll", "🪆", "doll", "a", "娃娃", "wáwa"),
  w("toy-car", "🚗", "toy car", "a", "小汽车", "xiǎo qìchē"),
  w("book", "📖", "book", "a", "书", "shū", { zh: "小书", pinyin: "xiǎo shū" }),
  w("slippers", "🩴", "slippers", "some", "拖鞋", "tuōxié"),
  w("window", "🪟", "window", "a", "窗户", "chuānghu"),
  w("door", "🚪", "door", "a", "门", "mén", { zh: "小门", pinyin: "xiǎo mén" }),
  w("clock", "🕰️", "clock", "a", "钟", "zhōng", { zh: "小钟", pinyin: "xiǎo zhōng" }),
  w("ball", "⚽", "ball", "a", "球", "qiú", { zh: "小球", pinyin: "xiǎo qiú" }),
  w("cup", "🥤", "cup", "a", "杯子", "bēizi"),
  w("toothbrush", "🪥", "toothbrush", "a", "牙刷", "yáshuā"),
  // a few kitchen things that often turn up in a demo
  w("apple", "🍎", "apple", "an", "苹果", "píngguǒ"),
  w("banana", "🍌", "banana", "a", "香蕉", "xiāngjiāo"),
  w("flower", "🌸", "flower", "a", "花", "huā", { zh: "小花", pinyin: "xiǎo huā" }),
];

export const getWord = (id: string) => VOCAB.find((v) => v.id === id);
