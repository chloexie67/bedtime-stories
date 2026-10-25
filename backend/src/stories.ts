// Approved bedtime stories. Original texts written for this app (no copyrighted books).
// The cloned voice may only read lines from this library; the client sends storyId + line index, never text.
// In a real deployment, new stories (e.g. drafted by Claude) would be added here only after a parent approves them.

export interface StoryLine {
  zh: string;
  pinyin: string;
  en: string; // gloss for parents
  emotion?: "calm" | "happy" | "curious" | "affectionate";
}

export interface Story {
  id: string;
  title: string;
  titlePinyin: string;
  titleEn: string;
  emoji: string;
  keyWords: { zh: string; pinyin: string; en: string }[]; // for the morning "do you remember?" recap
  lines: StoryLine[];
}

export const STORIES: Story[] = [
  {
    id: "little-moon",
    title: "小月亮睡觉了",
    titlePinyin: "Xiǎo yuèliang shuìjiào le",
    titleEn: "Little Moon Goes to Sleep",
    emoji: "🌙",
    keyWords: [
      { zh: "月亮", pinyin: "yuèliang", en: "moon" },
      { zh: "小猫", pinyin: "xiǎo māo", en: "kitten" },
      { zh: "小狗", pinyin: "xiǎo gǒu", en: "puppy" },
      { zh: "睡觉", pinyin: "shuìjiào", en: "to sleep" },
    ],
    lines: [
      { zh: "天黑了，小月亮出来了。", pinyin: "Tiān hēi le, xiǎo yuèliang chūlái le.", en: "It got dark, and the little moon came out.", emotion: "calm" },
      { zh: "小月亮看见一只小猫。", pinyin: "Xiǎo yuèliang kànjiàn yì zhī xiǎo māo.", en: "The little moon saw a little cat.", emotion: "curious" },
      { zh: "“小猫，小猫，你累了吗？”", pinyin: "“Xiǎo māo, xiǎo māo, nǐ lèi le ma?”", en: "“Little cat, little cat, are you tired?”", emotion: "curious" },
      { zh: "小猫说：“我累了，我要睡觉了。”", pinyin: "Xiǎo māo shuō: “Wǒ lèi le, wǒ yào shuìjiào le.”", en: "The little cat said, “I'm tired. I'm going to sleep.”", emotion: "calm" },
      { zh: "小月亮又看见一只小狗。", pinyin: "Xiǎo yuèliang yòu kànjiàn yì zhī xiǎo gǒu.", en: "Then the little moon saw a little dog.", emotion: "curious" },
      { zh: "小狗也说：“晚安，小月亮！”", pinyin: "Xiǎo gǒu yě shuō: “Wǎn'ān, xiǎo yuèliang!”", en: "The little dog said, “Good night, little moon!”", emotion: "happy" },
      { zh: "小月亮笑了：“宝宝，你也睡觉吧。”", pinyin: "Xiǎo yuèliang xiào le: “Bǎobao, nǐ yě shuìjiào ba.”", en: "The little moon smiled: “Baby, you go to sleep too.”", emotion: "affectionate" },
      { zh: "晚安，宝宝。{who}爱你。", pinyin: "Wǎn'ān, bǎobao. {Who} ài nǐ.", en: "Good night, baby. {whoEn} loves you.", emotion: "affectionate" },
    ],
  },
  {
    id: "three-apples",
    title: "三个红苹果",
    titlePinyin: "Sān ge hóng píngguǒ",
    titleEn: "Three Red Apples",
    emoji: "🍎",
    keyWords: [
      { zh: "苹果", pinyin: "píngguǒ", en: "apple" },
      { zh: "红", pinyin: "hóng", en: "red" },
      { zh: "三", pinyin: "sān", en: "three" },
      { zh: "刷牙", pinyin: "shuā yá", en: "brush teeth" },
    ],
    lines: [
      { zh: "{who}的院子里有一棵苹果树。", pinyin: "{Who} de yuànzi li yǒu yì kē píngguǒ shù.", en: "In {whoEn}'s yard there is an apple tree.", emotion: "calm" },
      { zh: "树上有三个红苹果。", pinyin: "Shù shang yǒu sān ge hóng píngguǒ.", en: "There are three red apples on the tree.", emotion: "happy" },
      { zh: "一个给爸爸，一个给妈妈。", pinyin: "Yí ge gěi bàba, yí ge gěi māma.", en: "One for Dad, one for Mom.", emotion: "happy" },
      { zh: "还有一个给谁呢？", pinyin: "Hái yǒu yí ge gěi shéi ne?", en: "Who is the last one for?", emotion: "curious" },
      { zh: "给你！因为你是{who}的宝贝。", pinyin: "Gěi nǐ! Yīnwèi nǐ shì {who} de bǎobèi.", en: "For you! Because you are {whoEn}'s treasure.", emotion: "affectionate" },
      { zh: "吃了苹果，我们刷牙，上床睡觉。", pinyin: "Chī le píngguǒ, wǒmen shuā yá, shàng chuáng shuìjiào.", en: "After the apple, we brush our teeth and get into bed.", emotion: "calm" },
      { zh: "晚安，做个好梦。", pinyin: "Wǎn'ān, zuò ge hǎo mèng.", en: "Good night. Sweet dreams.", emotion: "affectionate" },
    ],
  },
];

// Who is reading: the story says "Grandma loves you" or "Mom loves you" to match the cloned voice.
export const RELATIONS = {
  nainai: { zh: "奶奶", pinyin: "nǎinai", en: "Grandma" },
  waipo: { zh: "外婆", pinyin: "wàipó", en: "Grandma" },
  yeye: { zh: "爷爷", pinyin: "yéye", en: "Grandpa" },
  waigong: { zh: "外公", pinyin: "wàigōng", en: "Grandpa" },
  mama: { zh: "妈妈", pinyin: "māma", en: "Mom" },
  baba: { zh: "爸爸", pinyin: "bàba", en: "Dad" },
} as const;
export type Relation = keyof typeof RELATIONS;
export const isRelation = (r: unknown): r is Relation => typeof r === "string" && r in RELATIONS;

const fill = (text: string, rel: Relation) => {
  const r = RELATIONS[rel];
  return text
    .replaceAll("{who}", r.zh)
    .replaceAll("{Who}", r.pinyin[0].toUpperCase() + r.pinyin.slice(1))
    .replaceAll("{whoEn}", r.en);
};

export function personalize(story: Story, rel: Relation): Story {
  return {
    ...story,
    lines: story.lines.map((l) => ({
      ...l,
      zh: fill(l.zh, rel),
      pinyin: fill(l.pinyin.replaceAll("{who}", RELATIONS[rel].pinyin), rel),
      en: fill(l.en, rel),
    })),
  };
}

export const getStory = (id: string, rel: Relation = "nainai") => {
  const s = STORIES.find((s) => s.id === id);
  return s && personalize(s, rel);
};
