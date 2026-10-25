// Approved vocabulary. The cloned voice may ONLY speak lines from this list —
// the server looks up text by id, so the client can never make grandma's voice say arbitrary text.
// Objects chosen to be (a) easy to find at home for the camera, (b) cover sounds Mandarin speakers find hard
// in English: "th" in every "This is…", r/l, v, final consonants.

export interface Word {
  id: string;
  emoji: string;
  en: string; // the word
  enLine: string; // English sentence spoken in the cloned voice
  zh: string; // the word in Chinese characters
  pinyin: string;
  zhLine: string; // Mandarin sentence spoken in the cloned voice
}

const w = (id: string, emoji: string, en: string, article: string, zh: string, pinyin: string): Word => ({
  id,
  emoji,
  en,
  enLine: `This is ${article} ${en}.`,
  zh,
  pinyin,
  zhLine: `这是${zh}。`,
});

export const VOCAB: Word[] = [
  w("apple", "🍎", "apple", "an", "苹果", "píngguǒ"),
  w("banana", "🍌", "banana", "a", "香蕉", "xiāngjiāo"),
  w("orange", "🍊", "orange", "an", "橙子", "chéngzi"),
  w("cup", "🥤", "cup", "a", "杯子", "bēizi"),
  w("spoon", "🥄", "spoon", "a", "勺子", "sháozi"),
  w("book", "📖", "book", "a", "书", "shū"),
  w("shoe", "👟", "shoe", "a", "鞋子", "xiézi"),
  w("ball", "⚽", "ball", "a", "球", "qiú"),
  w("chair", "🪑", "chair", "a", "椅子", "yǐzi"),
  w("clock", "🕰️", "clock", "a", "钟", "zhōng"),
  w("pencil", "✏️", "pencil", "a", "铅笔", "qiānbǐ"),
  w("bottle", "🍼", "bottle", "a", "瓶子", "píngzi"),
  w("toothbrush", "🪥", "toothbrush", "a", "牙刷", "yáshuā"),
  w("teddy-bear", "🧸", "teddy bear", "a", "玩具熊", "wánjù xióng"),
  w("flower", "🌸", "flower", "a", "花", "huā"),
];

export const getWord = (id: string) => VOCAB.find((v) => v.id === id);
