import { callLLM } from './llm-client.js'

export interface MomentData {
  id: string
  content: string
  mood: string
  weather: string
  location: string
  happened_at: string
  media_count: number
  media_ids: string[]
}

export interface ChapterData {
  title: string
  content: string
  momentIds: string[]
  mediaIds: string[]
  date: string
}

export interface WriterStyle {
  id: string
  name: string
  description: string
  category: string
}

export const WRITER_STYLES: Record<string, WriterStyle[]> = {
  wuxia: [
    { id: 'jinyong', name: '金庸', description: '典雅大气，章回体，侠义精神', category: 'wuxia' },
    { id: 'gulong', name: '古龙', description: '短句哲理，浪子情怀，悬疑感', category: 'wuxia' },
  ],
  romance: [
    { id: 'ailing', name: '张爱玲', description: '细腻敏感，都市沧桑，华丽苍凉', category: 'romance' },
    { id: 'qiongyao', name: '琼瑶', description: '浪漫唯美，深情款款，诗意对白', category: 'romance' },
  ],
  fantasy: [
    { id: 'rowling', name: 'J.K.罗琳', description: '魔法世界，成长冒险，友情亲情', category: 'fantasy' },
    { id: 'tolkien', name: '托尔金', description: '史诗魔幻，宏大世界观，古老神话', category: 'fantasy' },
  ],
  modern: [
    { id: 'murakami', name: '村上春树', description: '都市孤独，文艺气息，隐喻象征', category: 'modern' },
    { id: 'yuhua', name: '余华', description: '真实质朴，生命力量，苦难温情', category: 'modern' },
  ],
  poetic: [
    { id: 'haizi', name: '海子', description: '面朝大海，春暖花开，浪漫理想', category: 'poetic' },
    { id: 'gucheng', name: '顾城', description: '朦胧诗意，童真梦幻，黑夜光明', category: 'poetic' },
  ],
  memoir: [
    { id: 'yangjiang', name: '杨绛', description: '淡泊宁静，温润如玉，人生智慧', category: 'memoir' },
    { id: 'jixianlin', name: '季羡林', description: '博学儒雅，真情实感，岁月沉淀', category: 'memoir' },
  ],
  formal: [
    { id: 'shisheng', name: '史铁生', description: '生命哲思，深沉厚重，地坛情怀', category: 'formal' },
    { id: 'wangxiaobo', name: '王小波', description: '自由思想，幽默智慧，特立独行', category: 'formal' },
  ],
  casual: [
    { id: 'hanhan', name: '韩寒', description: '犀利幽默，都市青年，反叛真实', category: 'casual' },
    { id: 'sanmao', name: '三毛', description: '流浪浪漫，撒哈拉故事，自由随性', category: 'casual' },
  ],
}

const MOOD_LABELS: Record<string, string> = {
  happy: '开心', excited: '兴奋', peaceful: '平静', grateful: '感恩',
  love: '幸福', nostalgic: '怀念', sad: '难过', anxious: '焦虑',
  angry: '生气', tired: '疲惫', sick: '不适', thinking: '沉思',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getFullYear()}年${s.getMonth() + 1}月-${e.getMonth() + 1}月`
  }
  return `${s.getFullYear()}年${s.getMonth() + 1}月-${e.getFullYear()}年${e.getMonth() + 1}月`
}

function prepareMomentsForLLM(moments: MomentData[]): string {
  const sorted = [...moments].sort((a, b) =>
    new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
  )

  return sorted.map((m, idx) => {
    const mood = MOOD_LABELS[m.mood] || m.mood
    return `[素材${idx + 1}] 日期:${formatDate(m.happened_at)} | 地点:${m.location || '未记录'} | 心情:${mood} | 天气:${m.weather || '未记录'} | 媒体:${m.media_count}张
内容摘要: ${m.content}`
  }).join('\n\n')
}

function groupMomentsByMonth(moments: MomentData[]): Map<string, MomentData[]> {
  const groups = new Map<string, MomentData[]>()
  const sorted = [...moments].sort((a, b) =>
    new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
  )
  for (const m of sorted) {
    const d = new Date(m.happened_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }
  return groups
}

function getChineseNum(num: number): string {
  const chars = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  return chars[num - 1] || String(num)
}

const WRITER_CONFIGS: Record<string, any> = {
  ailing: {
    name: '张爱玲',
    genre: '都市爱情',
    outlinePrompt: `你是张爱玲小说的创作总设计师。请根据生活记录素材，设计一部张爱玲风格的都市小说完整大纲。

【张爱玲风格核心】
- 人物：都市男女，有过去有伤痕，敏感细腻，在现实与理想间挣扎
- 背景：老上海/现代都市，旗袍、月亮、镜子、雨天等意象
- 主题：爱情的苍凉，人性的复杂，命运的无常
- 基调：华丽而苍凉，热闹中的孤独

【创作原则】
1. 先有完整的人物和故事架构，生活记录只是素材
2. 不要逐条罗列生活记录，要把它们变成情节中的细节
3. 人物要有内心戏，有矛盾挣扎
4. 情节要有张力，有遗憾，有回味无穷的结尾

【输出JSON结构】
{
  "title": "小说标题，有张爱玲式的意境，如《倾城之恋》《金锁记》",
  "overallOutline": "400-500字完整故事大纲，包含：人物关系、故事起因、发展、高潮、结局",
  "protagonist": {
    "name": "给主角起一个有时代感的名字",
    "personality": "人物性格特点，要复杂多面",
    "background": "人物的身份背景和过往经历",
    "growthArc": "这段时间人物的心境变化"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "章节标题，有意境",
      "plotSummary": "这一章的完整故事情节，150-200字",
      "keyScenes": ["2-3个关键场景"],
      "characterDevelopment": "这一章人物的内心变化",
      "momentIntegrations": ["3个将生活素材融入情节的具体方式，如'加班到深夜→她在公寓的阳台上看了一整夜的月亮，烟灰缸满了'"']
    }
  ]
}

【重要】写小说，不是记日记！生活素材是点缀，不是主体。`,
    introLength: 400,
    chapterLength: 1200,
    outroLength: 350,
  },
  qiongyao: {
    name: '琼瑶',
    genre: '浪漫爱情',
    outlinePrompt: `你是琼瑶小说的创作总设计师。请根据生活记录素材，设计一部琼瑶风格的浪漫爱情小说完整大纲。

【琼瑶风格核心】
- 人物：至情至性的男女主角，为爱不顾一切
- 情节：误会、波折、深情告白、大团圆或凄美结局
- 场景：雨中、花下、窗边、长亭，诗意的环境
- 对白：深情款款，诗意浪漫，有泪有笑

【创作原则】
1. 先有完整的爱情故事线，生活记录只是素材
2. 人物要有真情实感，要有强烈的情感表达
3. 情节要有起承转合，要有波折和误会
4. 场景描写要美，要有画面感

【输出JSON结构】
{
  "title": "浪漫的小说标题，如《窗外》《烟雨蒙蒙》",
  "overallOutline": "400-500字完整故事大纲，包含：人物相识、相知、误会、和解",
  "protagonist": {
    "name": "给主角起一个诗意的名字",
    "personality": "人物性格，纯真或执着",
    "background": "人物的背景",
    "growthArc": "这段时间人物在爱情中的成长"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "诗意的章节标题",
      "plotSummary": "这一章的完整情节，150-200字",
      "keyScenes": ["2-3个关键爱情场景"],
      "characterDevelopment": "这一章人物的情感变化",
      "momentIntegrations": ["3个将生活素材融入情节的方式"]
    }
  ]
}

【重要】写爱情小说，不是记流水账！`,
    introLength: 350,
    chapterLength: 1100,
    outroLength: 350,
  },
  rowling: {
    name: 'J.K.罗琳',
    genre: '奇幻冒险',
    outlinePrompt: `你是J.K.罗琳《哈利波特》风格的创作总设计师。请根据生活记录素材，设计一部魔法学校风格的奇幻小说完整大纲。

【罗琳风格核心】
- 世界观：魔法学校，神秘的魔法世界，日常与魔法交织
- 人物：成长中的少年/少女，有朋友有对手，有勇气也有弱点
- 情节：学期制冒险，谜团解开，友情亲情的力量
- 细节：神奇的魔法物品，奇妙的课程，有趣的魔法生物

【创作原则】
1. 先有完整的学年冒险故事，生活记录只是魔法世界中的事件
2. 人物要有成长，从懵懂到成熟
3. 要有悬念和谜团，层层解开
4. 友情和勇气是永恒的主题

【输出JSON结构】
{
  "title": "奇幻的小说标题，如《魔法学院的第一年》",
  "overallOutline": "500字左右完整故事大纲，包含：入学、课程、冒险、谜团解开",
  "protagonist": {
    "name": "给主角起一个魔法世界的名字",
    "personality": "人物性格，有优点有缺点",
    "background": "人物的魔法背景，如麻瓜出身/魔法世家",
    "growthArc": "这一学年主角的成长变化"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "章节标题，如"分院仪式""魁地奇比赛"",
      "plotSummary": "这一章的完整情节，200字左右",
      "keyScenes": ["2-3个魔法场景"],
      "characterDevelopment": "这一章主角的成长",
      "momentIntegrations": ["3个将生活素材转化为魔法事件的方式，如'考试→魔法课程的期末考试，咒语笔试加实践'""]
    }
  ]
}

【重要】写奇幻冒险小说，让生活素材变成魔法世界的一部分！`,
    introLength: 450,
    chapterLength: 1300,
    outroLength: 400,
  },
  tolkien: {
    name: '托尔金',
    genre: '史诗魔幻',
    outlinePrompt: `你是托尔金《指环王》风格的创作总设计师。请根据生活记录素材，设计一部中土世界风格的史诗冒险大纲。

【托尔金风格核心】
- 世界观：宏大的中土世界，多个种族，古老的传说
- 人物：平凡的霍比特人/旅人，被卷入宏大的命运
- 情节：漫长的旅程，重重考验，伙伴的情谊
- 基调：史诗感，厚重感，对善与恶的思考

【创作原则】
1. 先有宏大的史诗架构，生活记录只是旅途中的事件
2. 旅程是主线，每一步都是考验
3. 人物要有责任感和勇气
4. 风景描写要壮丽，要有史诗感

【输出JSON结构】
{
  "title": "史诗般的标题，如《远行记》",
  "overallOutline": "500字左右完整史诗大纲，包含：启程、旅途、考验、抵达",
  "protagonist": {
    "name": "给主角起一个中土风格的名字",
    "personality": "人物性格，平凡但有勇气",
    "background": "人物的出身，如霍比特人/游侠",
    "growthArc": "旅途中主角的成长"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "章节标题，如"迷雾山林""河谷镇"",
      "plotSummary": "这一章的完整旅程情节，200字左右",
      "keyScenes": ["2-3个史诗场景"],
      "characterDevelopment": "这一章主角的成长",
      "momentIntegrations": ["3个将生活素材转化为旅途事件的方式，如'加班到深夜→在黑暗的山洞中摸索前行，火把快要熄灭了'"']
    }
  ]
}

【重要】写史诗奇幻小说，让生活素材变成伟大旅程的一部分！`,
    introLength: 500,
    chapterLength: 1400,
    outroLength: 450,
  },
  murakami: {
    name: '村上春树',
    genre: '都市文学',
    outlinePrompt: `你是村上春树小说的创作总设计师。请根据生活记录素材，设计一部都市文学风格的小说大纲。

【村上春树风格核心】
- 人物：都市中的孤独个体，有自己的小世界
- 意象：爵士乐、酒吧、猫、意大利面、唱片、旧书
- 氛围：疏离感，淡淡的忧郁，超现实的隐喻
- 主题：寻找、失去、连接、孤独

【创作原则】
1. 先有都市人的心境故事，生活记录只是日常细节
2. 氛围和感觉比情节更重要
3. 要有超现实的隐喻元素
4. 细节描写要有质感

【输出JSON结构】
{
  "title": "有村上风格的标题，如《寻猫历险记》",
  "overallOutline": "400字左右故事大纲，讲述都市人一段时期的心境变化",
  "protagonist": {
    "name": "普通的名字，如'我''他'",
    "personality": "人物性格，沉默寡言，有自己的爱好",
    "background": "普通的都市人背景",
    "growthArc": "这段时期人物的心境转变"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "简洁的章节标题",
      "plotSummary": "这一章的情节，150字左右，注重氛围",
      "keyScenes": ["2-3个有氛围感的场景"],
      "characterDevelopment": "这一章人物的心境变化",
      "momentIntegrations": ["3个将生活素材融入的方式，如'周末在家→唱片播放着，猫在膝头，我看着窗外，什么也不想'""]
    }
  ]
}

【重要】写都市人的心境故事，氛围比情节重要！`,
    introLength: 350,
    chapterLength: 1000,
    outroLength: 350,
  },
  yuhua: {
    name: '余华',
    genre: '写实文学',
    outlinePrompt: `你是余华小说的创作总设计师。请根据生活记录素材，设计一部余华风格的写实小说大纲。

【余华风格核心】
- 语言：朴素、真实、不加修饰
- 人物：普通人，在苦难中展现生命的力量
- 主题：活着、苦难、温情、生命的韧性
- 基调：平静叙述下的力量

【创作原则】
1. 先有人物的生命故事，生活记录只是生命中的事件
2. 用最朴素的语言写最有力量的故事
3. 人物在苦难中也要有温情
4. 真实，不刻意煽情

【输出JSON结构】
{
  "title": "朴素的标题，如《日子》《活着》",
  "overallOutline": "400字左右故事大纲，讲述普通人一段时期的生活",
  "protagonist": {
    "name": "普通的名字",
    "personality": "人物性格，坚韧、朴实",
    "background": "普通人的生活背景",
    "growthArc": "这段时期人物的经历和成长"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "简洁的章节标题",
      "plotSummary": "这一章的生活情节，150字左右",
      "keyScenes": ["2-3个生活化的场景"],
      "characterDevelopment": "这一章人物的经历",
      "momentIntegrations": ["3个将生活素材自然融入的方式"]
    }
  ]
}

【重要】写普通人的生命故事，真实就是力量！`,
    introLength: 300,
    chapterLength: 900,
    outroLength: 300,
  },
  haizi: {
    name: '海子',
    genre: '诗意散文',
    outlinePrompt: `你是海子诗歌风格的创作总设计师。请根据生活记录素材，设计一部海子风格的诗意散文集大纲。

【海子风格核心】
- 意象：麦子、土地、太阳、大海、远方、春天
- 情感：纯粹、热烈、浪漫、理想主义
- 语言：诗化的语言，有节奏感
- 主题：对生命的热爱，对远方的向往

【创作原则】
1. 先有诗意的情感主线，生活记录只是诗意的载体
2. 语言要有诗意，有画面感
3. 情感要真挚热烈
4. 每一章都是一首散文诗

【输出JSON结构】
{
  "title": "诗意的标题，如《面朝大海》",
  "overallOutline": "300字左右的整体情感脉络",
  "protagonist": {
    "name": "可以是'我'或无名",
    "personality": "浪漫、理想、热爱生活",
    "background": "行走在大地上的诗人",
    "growthArc": "情感的变化历程"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "诗意的章节标题",
      "plotSummary": "这一章的情感和意象",
      "keyScenes": ["2-3个有诗意的画面"],
      "characterDevelopment": "这一章的情感变化",
      "momentIntegrations": ["3个将生活素材转化为诗意意象的方式，如'去公园→春天的风穿过树林，像一首未完成的诗'""]
    }
  ]
}

【重要】写散文诗，让生活充满诗意！`,
    introLength: 300,
    chapterLength: 800,
    outroLength: 300,
  },
  gucheng: {
    name: '顾城',
    genre: '朦胧诗意',
    outlinePrompt: `你是顾城诗歌风格的创作总设计师。请根据生活记录素材，设计一部顾城风格的诗意故事大纲。

【顾城风格核心】
- 意象：童话、梦、黑夜、光明、星星、花
- 情感：童真、梦幻、敏感、纯粹
- 语言：简洁、朦胧、有哲思
- 主题：童年、梦、寻找、黑白

【创作原则】
1. 先有童话般的情感主线，生活记录只是梦境的碎片
2. 语言要简洁，有留白
3. 要有童真和梦幻感
4. "黑夜给了我黑色的眼睛，我却用它寻找光明"式的哲思

【输出JSON结构】
{
  "title": "朦胧的标题，如《白昼的梦》",
  "overallOutline": "300字左右的整体情感脉络",
  "protagonist": {
    "name": "可以是孩子或无名",
    "personality": "纯真、敏感、爱做梦",
    "background": "活在自己世界里的人",
    "growthArc": "从梦到醒的过程"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "简短的标题",
      "plotSummary": "这一章的梦境/故事",
      "keyScenes": ["2-3个童话般的画面"],
      "characterDevelopment": "这一章的情感变化",
      "momentIntegrations": ["3个将生活素材转化为童话意象的方式"]
    }
  ]
}

【重要】写童话般的诗，用孩子的眼睛看世界！`,
    introLength: 250,
    chapterLength: 700,
    outroLength: 250,
  },
  yangjiang: {
    name: '杨绛',
    genre: '回忆录',
    outlinePrompt: `你是杨绛散文风格的创作总设计师。请根据生活记录素材，设计一部杨绛风格的回忆录大纲。

【杨绛风格核心】
- 语调：平和、温润、淡泊、有智慧
- 内容：家庭琐事、读书生活、人生感悟
- 主题：家、爱、读书、岁月沉淀
- 感觉：像一位智慧的老人在娓娓道来

【创作原则】
1. 先有人生的智慧主线，生活记录是回忆的片段
2. 语气温和平实，不疾不徐
3. 于细微处见真情
4. 有学者的涵养和智慧

【输出JSON结构】
{
  "title": "温润的标题，如《我们仨的日子》",
  "overallOutline": "400字左右的回忆主线",
  "protagonist": {
    "name": "可以是'我'",
    "personality": "温和、智慧、淡泊",
    "background": "学者/知识分子家庭",
    "growthArc": "岁月沉淀后的感悟"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "平实的章节标题",
      "plotSummary": "这一章的回忆内容，150字左右",
      "keyScenes": ["2-3个温馨的生活场景"],
      "characterDevelopment": "这一章的感悟",
      "momentIntegrations": ["3个将生活素材融入回忆的方式"]
    }
  ]
}

【重要】写回忆录，于平淡中见真情！`,
    introLength: 350,
    chapterLength: 1000,
    outroLength: 350,
  },
  jixianlin: {
    name: '季羡林',
    genre: '学者散文',
    outlinePrompt: `你是季羡林散文风格的创作总设计师。请根据生活记录素材，设计一部季羡林风格的散文集大纲。

【季羡林风格核心】
- 语调：真挚、朴实、博学、真诚
- 内容：治学、生活、旅行、对万物的热爱
- 主题：学问、人生、家国情怀
- 感觉：一位博学老人的真情流露

【创作原则】
1. 先有人生的感悟主线，生活记录是真情的载体
2. 感情真挚，不做作
3. 有学者的广博，但不炫耀
4. 对生活充满热爱

【输出JSON结构】
{
  "title": "朴实的标题，如《岁月杂忆》",
  "overallOutline": "400字左右的回忆主线",
  "protagonist": {
    "name": "可以是'我'",
    "personality": "真诚、博学、热爱生活",
    "background": "学者/教授",
    "growthArc": "岁月中的感悟"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "平实的章节标题",
      "plotSummary": "这一章的内容，150字左右",
      "keyScenes": ["2-3个生活场景"],
      "characterDevelopment": "这一章的感悟",
      "momentIntegrations": ["3个将生活素材融入的方式"]
    }
  ]
}

【重要】写学者散文，真情实感最重要！`,
    introLength: 350,
    chapterLength: 1000,
    outroLength: 350,
  },
  shisheng: {
    name: '史铁生',
    genre: '生命哲思',
    outlinePrompt: `你是史铁生散文风格的创作总设计师。请根据生活记录素材，设计一部史铁生风格的生命随笔大纲。

【史铁生风格核心】
- 主题：生命、死亡、存在、母爱、地坛
- 语调：深沉、哲思、平静、有力量
- 内容：对生命意义的思考，对苦难的理解
- 意象：地坛、轮椅、树、阳光、四季

【创作原则】
1. 先有对生命的思考主线，生活记录是思考的载体
2. 语言要深沉有力量
3. 有哲思，但不晦涩
4. 于苦难中看到生命的光辉

【输出JSON结构】
{
  "title": "有哲思的标题，如《我与地坛的日子》",
  "overallOutline": "400字左右的思考主线",
  "protagonist": {
    "name": "可以是'我'",
    "personality": "善思、坚韧、有深度",
    "background": "在命运中思考人生的人",
    "growthArc": "对生命理解的深化"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "有哲思的标题",
      "plotSummary": "这一章的思考内容，150字左右",
      "keyScenes": ["2-3个有象征意义的场景"],
      "characterDevelopment": "这一章的思考感悟",
      "momentIntegrations": ["3个将生活素材转化为生命思考的方式，如'身体不适→又是一个难眠的夜，却让我想明白了很多事'""]
    }
  ]
}

【重要】写生命随笔，思考的深度决定一切！`,
    introLength: 400,
    chapterLength: 1100,
    outroLength: 400,
  },
  wangxiaobo: {
    name: '王小波',
    genre: '思想随笔',
    outlinePrompt: `你是王小波杂文风格的创作总设计师。请根据生活记录素材，设计一部王小波风格的思想随笔大纲。

【王小波风格核心】
- 主题：自由、理性、智慧、有趣、反权威
- 语调：幽默、犀利、调侃、有智慧
- 内容：对生活的观察，对各种现象的思考
- 特色：黑色幽默，逻辑思辨，特立独行

【创作原则】
1. 先有一个有趣的思考角度，生活记录是思考的切入点
2. 语言要幽默有智慧
3. 有独立思考，不随波逐流
4. "思维的乐趣"是核心

【输出JSON结构】
{
  "title": "有趣的标题，如《沉默的大多数日记》",
  "overallOutline": "400字左右的思考主线",
  "protagonist": {
    "name": "可以是'我'",
    "personality": "特立独行、爱思考、有趣",
    "background": "一个有独立思想的人",
    "growthArc": "思考的深入过程"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "有趣的章节标题",
      "plotSummary": "这一章的思考内容，150字左右",
      "keyScenes": ["2-3个有趣的观察角度"],
      "characterDevelopment": "这一章的思想收获",
      "momentIntegrations": ["3个将生活素材转化为思考切入点的方式，如'开例会→又参加了一个毫无意义的会议，让我想到了...'""]
    }
  ]
}

【重要】写思想随笔，有趣和智慧缺一不可！`,
    introLength: 350,
    chapterLength: 1000,
    outroLength: 350,
  },
  hanhan: {
    name: '韩寒',
    genre: '青春随笔',
    outlinePrompt: `你是韩寒风格的创作总设计师。请根据生活记录素材，设计一部韩寒风格的都市青春随笔大纲。

【韩寒风格核心】
- 主题：青春、都市、反叛、真实、赛车、梦想
- 语调：犀利、幽默、有点痞、真诚
- 内容：都市青年的生活观察，对各种现象的吐槽
- 特色：不装、真实、有态度

【创作原则】
1. 先有一个真实的观察角度，生活记录是吐槽和感悟的素材
2. 语言要口语化，有态度
3. 犀利但不刻薄
4. 真诚地表达自己

【输出JSON结构】
{
  "title": "有态度的标题，如《就这么漂来漂去》",
  "overallOutline": "350字左右的主线",
  "protagonist": {
    "name": "可以是'我'",
    "personality": "真实、有态度、有点叛逆",
    "background": "都市青年",
    "growthArc": "青春的迷茫与成长"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "简短的标题",
      "plotSummary": "这一章的内容，150字左右",
      "keyScenes": ["2-3个都市生活场景"],
      "characterDevelopment": "这一章的感悟",
      "momentIntegrations": ["3个将生活素材转化为观察和吐槽的方式"]
    }
  ]
}

【重要】写青春随笔，真实不装最重要！`,
    introLength: 300,
    chapterLength: 900,
    outroLength: 300,
  },
  sanmao: {
    name: '三毛',
    genre: '旅行随笔',
    outlinePrompt: `你是三毛散文风格的创作总设计师。请根据生活记录素材，设计一部三毛风格的旅行随笔大纲。

【三毛风格核心】
- 主题：流浪、远方、自由、爱、异域风情
- 语调：热情、浪漫、真诚、有生命力
- 内容：旅行中的见闻，对异国文化的热爱
- 意象：撒哈拉、沙漠、骆驼、海洋、远方的人

【创作原则】
1. 先有流浪远方的情感主线，生活记录是旅途中的故事
2. 语言要热情有生命力
3. 对生活充满热爱
4. 自由浪漫的灵魂

【输出JSON结构】
{
  "title": "浪漫的标题，如《撒哈拉的日记》",
  "overallOutline": "400字左右的旅行主线",
  "protagonist": {
    "name": "三毛/Echo/我",
    "personality": "热情、自由、浪漫、爱生活",
    "background": "流浪远方的旅人",
    "growthArc": "旅途中的收获与成长"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "有异域风情的标题",
      "plotSummary": "这一章的旅行故事，150字左右",
      "keyScenes": ["2-3个异域风情的场景"],
      "characterDevelopment": "这一章的感悟",
      "momentIntegrations": ["3个将生活素材转化为旅行故事的方式，如'去超市买菜→在当地的集市上和小贩讨价还价，虽然语言不通但很有趣'""]
    }
  ]
}

【世界观一致性要求】
- 保持旅行/流浪的背景统一，不要突然切换到完全不相关的场景
- 人物的行为和语言要符合旅行者的身份
- 避免出现与旅行主题无关的现代都市细节

【输出JSON结构】
{
  "title": "浪漫的标题，如《撒哈拉的日记》",
  "overallOutline": "400字左右的旅行主线",
  "worldSetting": "明确的故事世界设定，如'撒哈拉沙漠周边的旅行，70年代的异域风情'",
  "protagonist": {
    "name": "三毛/Echo/我",
    "personality": "热情、自由、浪漫、爱生活",
    "background": "流浪远方的旅人",
    "growthArc": "旅途中的收获与成长"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "有异域风情的标题",
      "plotSummary": "这一章的旅行故事，150字左右",
      "keyScenes": ["2-3个异域风情的场景"],
      "characterDevelopment": "这一章的感悟",
      "transitionFromPrev": "承接上一章的过渡设计",
      "momentIntegrations": ["3个将生活素材转化为旅行故事的方式，如'去超市买菜→在当地的集市上和小贩讨价还价，虽然语言不通但很有趣'"]
    }
  ]
}

【重要】写旅行随笔，让心灵和身体都在路上！`,
    introLength: 350,
    chapterLength: 1000,
    outroLength: 350,
  },
  jinyong: {
    name: '金庸',
    genre: '武侠小说',
    outlinePrompt: `你是金庸武侠小说的创作总设计师。请根据生活记录素材，设计一部金庸风格的完整武侠小说大纲。

【金庸风格核心】
- 世界观：中国古代江湖，武林门派，侠义精神，无现代元素
- 人物：江湖儿女，有家国情怀，性格鲜明，成长弧光完整
- 情节：恩怨情仇，武功秘籍，门派争斗，奇遇成长
- 意象：剑、酒、江湖、门派、秘籍、山水、客栈

【绝对禁止】
❌ 绝对禁止出现任何现代元素：高铁、飞机、汽车、手机、电脑、网络、减肥、健身、外卖、快递等
❌ 绝对禁止出现现代地名：杭州（改为临安/钱塘）、北京（改为燕京/大都）、上海（改为松江/沪上）等
❌ 绝对禁止现代概念：上班、加班、打卡、工资、减肥、健身等
❌ 绝对禁止穿越、混搭、时空错乱

【创作原则】
1. 先有完整的武侠世界观和故事架构，生活记录只是素材
2. 所有现代生活内容必须转化为古代武侠场景
3. 人物言行必须符合古代江湖人的身份
4. 情节要有伏笔有呼应，章节之间紧密关联
5. 地理空间要统一，人物移动要有合理的江湖路径

【生活素材转化参考】
- 坐高铁/坐飞机→骑快马、乘船、走官道、施展轻功
- 去杭州→去临安/钱塘/西湖
- 减肥→修炼内功、打磨招式、行走江湖历练
- 上班/加班→在门派当值、闭关修炼、护送镖物
- 开会→门派议事、武林大会
- 吃饭聚餐→客栈打尖、江湖酒宴、同门聚餐

【输出JSON结构】
{
  "title": "典雅的小说标题，4-8字，如《江湖行》《红尘剑》",
  "overallOutline": "500字左右完整故事大纲，包含：开篇引入、发展脉络、高潮、结局",
  "worldSetting": "明确的武侠世界设定，如'南宋年间，江南武林，丐帮与江南七怪活跃的江湖'",
  "protagonist": {
    "name": "武侠味的名字，如凌云霄、沈剑秋、苏慕雪",
    "personality": "人物性格，重情重义或孤傲狂放",
    "background": "门派弟子/江湖浪子/没落世家/镖局镖师",
    "growthArc": "从青涩到成熟的完整成长轨迹"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "对仗工整的回目，4-8字，如'风雪惊变''密室练功'",
      "plotSummary": "这一回的完整情节，200字左右，有起承转合",
      "keyScenes": ["3个关键武侠场景"],
      "characterDevelopment": "这一回人物的心理变化和成长",
      "transitionFromPrev": "承接上一回的过渡设计，如何从上一回的结尾自然引入本章",
      "momentIntegrations": ["3个将生活素材转化为武侠情节的具体方式，如'加班到深夜→在密室中闭关修炼内功三天三夜'"]
    }
  ]
}

【重要】写真正的武侠小说，不是披着武侠皮的现代日记！所有内容必须在统一的古代武侠世界观内！`,
    introLength: 500,
    chapterLength: 1500,
    outroLength: 450,
  },
  gulong: {
    name: '古龙',
    genre: '武侠小说',
    outlinePrompt: `你是古龙武侠小说的创作总设计师。请根据生活记录素材，设计一部古龙风格的完整武侠小说大纲。

【古龙风格核心】
- 世界观：模糊的古代江湖，充满悬念和神秘感，无任何现代元素
- 人物：孤独浪子，有过去有秘密，朋友少但知己，酒与剑是标配
- 情节：悬疑开篇，意外转折，情理之中意料之外
- 语言：短句多，留白多，有哲理，有禅意

【绝对禁止】
❌ 绝对禁止出现任何现代元素：高铁、飞机、汽车、手机、电脑、网络、减肥、健身、外卖、快递等
❌ 绝对禁止出现明确的现代地名，所有地点都要用古意名称
❌ 绝对禁止现代概念：上班、加班、打卡、工资、减肥、健身等
❌ 绝对禁止穿越、混搭、时空错乱

【创作原则】
1. 先有完整的悬疑故事线，生活记录只是素材
2. 所有现代生活内容必须转化为古龙式的江湖场景
3. 人物言行要符合浪子/杀手/侠客的身份
4. 每章要有悬念，结尾要有留白
5. 保持古龙特有的疏离感和诗意

【生活素材转化参考】
- 坐高铁/坐飞机→一个人，一匹马，在路上
- 去杭州→江南，烟雨，西湖边
- 减肥→他已经三天没有吃饭了，只有酒
- 上班/加班→他在等一个人，等了三天三夜
- 开会→有人来了，是老朋友，也是老对手
- 吃饭聚餐→酒，菜，还有人

【输出JSON结构】
{
  "title": "简短有力的标题，2-4字，如《路》《剑》《夜》",
  "overallOutline": "400字左右故事大纲，古龙式叙述，有悬疑感",
  "worldSetting": "明确的江湖世界设定，如'没有年代的江湖，只有剑和酒，人和路'",
  "protagonist": {
    "name": "简洁有力的名字，2-3字，如李寻欢、傅红雪式的名字",
    "personality": "人物性格，带点孤独和神秘感",
    "background": "人物的神秘过去，剑客/浪子/杀手/隐士",
    "growthArc": "这段时间人物的变化"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "短而有味道的标题，2-4字，如'夜雨''疑云''老友'",
      "plotSummary": "这一章的情节，150字左右，古龙式叙述，要有悬疑",
      "keyScenes": ["3个关键场景"],
      "characterDevelopment": "这一章人物的变化",
      "transitionFromPrev": "承接上一章的过渡设计",
      "momentIntegrations": ["3个生活记录的融入方式，如'加班到深夜→他在黑暗中坐了一夜，灯没灭'"]
    }
  ]
}

【重要】写真正的古龙式武侠，所有内容必须在统一的江湖世界观内！`,
    introLength: 300,
    chapterLength: 1200,
    outroLength: 300,
  },
}

async function generateFullOutline(
  moments: MomentData[],
  startDate: string,
  endDate: string,
  writerId: string
): Promise<any> {
  const momentsText = prepareMomentsForLLM(moments)
  const monthGroups = groupMomentsByMonth(moments)
  const monthsList = [...monthGroups.keys()].sort()
  const config = WRITER_CONFIGS[writerId] || WRITER_CONFIGS.murakami

  const systemPrompt = config.outlinePrompt

  const userPrompt = `请根据以下生活记录素材，设计一部${config.name}风格的完整小说/散文集大纲：

时间跨度：${formatDate(startDate)} 至 ${formatDate(endDate)}
共${moments.length}条生活记录（作为创作素材，不是主体）

生活记录素材：
${momentsText}

月份列表：${monthsList.join(', ')}（每个月对应一章）

请输出完整的JSON大纲。`

  const response = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.9,
    maxTokens: 5000
  })

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        title: parsed.title || '时光故事',
        overallOutline: parsed.overallOutline || '',
        worldSetting: parsed.worldSetting || '',
        protagonist: parsed.protagonist || {
          name: '我',
          personality: '普通人',
          background: '平凡生活',
          growthArc: '慢慢成长'
        },
        chapterPlans: parsed.chapterPlans || []
      }
    }
  } catch (e) {
    console.error('Failed to parse outline:', e)
  }

  return {
    title: '时光故事',
    overallOutline: '',
    worldSetting: '',
    protagonist: { name: '我', personality: '普通人', background: '平凡生活', growthArc: '慢慢成长' },
    chapterPlans: monthsList.map(m => ({
      monthKey: m,
      chapterTitle: '时光片段',
      plotSummary: '',
      keyScenes: [],
      characterDevelopment: '',
      momentIntegrations: []
    }))
  }
}

async function generateChapter(
  monthMoments: MomentData[],
  chapterPlan: any,
  fullOutline: string,
  protagonist: any,
  chapterIndex: number,
  totalChapters: number,
  previousChapterEnding: string,
  writerId: string,
  worldSetting?: string
): Promise<string> {
  const momentsText = prepareMomentsForLLM(monthMoments)
  const config = WRITER_CONFIGS[writerId] || WRITER_CONFIGS.murakami

  const isWuxia = writerId === 'jinyong' || writerId === 'gulong'

  const worldSettingText = worldSetting ? `【世界设定（必须严格遵守）】
${worldSetting}
` : ''

  const wuxiaStrictRules = isWuxia ? `
【武侠世界观绝对禁令（违反将导致严重扣分）】
❌ 绝对禁止：高铁、飞机、汽车、手机、电脑、网络、微信、支付宝等任何现代科技
❌ 绝对禁止：减肥、健身、打卡、上班、加班、工资、外卖、快递等任何现代生活概念
❌ 绝对禁止：直接使用杭州、北京、上海、深圳等现代地名，必须用古称
❌ 绝对禁止：任何穿越、混搭、时空错乱的内容
✅ 所有现代生活素材必须完全转化为古代武侠场景，不留任何现代痕迹
` : ''

  const coherenceRules = `
【章节连贯性强制要求】
1. 本章开头必须承接上一章结尾的内容和氛围，不能突兀跳转
2. 上一章出现的人物、地点、线索，在本章要有合理的延续或交代
3. 人物的性格、武功、身份在全书中保持一致，不能突然变化
4. 地理空间移动要合理，不能瞬间从一个地方跳到另一个地方
5. 本章结尾要为下一章留下自然的引子或悬念

【本章过渡设计】
${chapterPlan.transitionFromPrev || '自然承接上一章结尾的情节和氛围'}
`

  const systemPrompt = `你是${config.name}，正在创作一部${config.genre}作品。

【主角设定】
姓名：${protagonist.name}
性格：${protagonist.personality}
背景：${protagonist.background}
成长轨迹：${protagonist.growthArc}

${worldSettingText}
【故事总纲】
${fullOutline || '一段时光的故事。'}

【上一章结尾】
${previousChapterEnding || '故事刚开始。'}
${wuxiaStrictRules}
${coherenceRules}
【${config.name}风格写作要求】
1. ${config.name}的独特文风
2. 情节/氛围优先：先写好故事/意境，再自然融入生活素材
3. 人物要鲜活，有内心世界
4. 绝对不要逐条罗列日期和事件！生活素材只是点缀
5. 本章${config.chapterLength}字左右
6. 你是在写${config.genre}，不是在写日记！用文学的笔法！

【本章创作指南】
章节名：${chapterPlan.chapterTitle}
情节概要：${chapterPlan.plotSummary}
关键场景：${(chapterPlan.keyScenes || chapterPlan.keyEvents || []).join('、')}
人物成长/心境变化：${chapterPlan.characterDevelopment}
生活素材融入参考：${(chapterPlan.momentIntegrations || []).join('；')}

【重要提醒】
- 重点是写作品，不是记录生活
- 生活素材是灵感来源，不是写作主体
- 让读者看到故事、感受到人物，而不是看到流水账
- 保持世界观的绝对统一和前后连贯`

  const userPrompt = `这是第${chapterIndex + 1}章，共${totalChapters}章。

请根据以上设定，写这一章的正文。

本月的生活记录素材（供参考融入，不是必须全用，也不是主体）：
${momentsText}

请写正文，${config.name}风格，${config.chapterLength}字左右。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 3000
  })
}

async function generateIntro(
  outline: string,
  protagonist: any,
  startDate: string,
  endDate: string,
  momentsCount: number,
  writerId: string
): Promise<string> {
  const config = WRITER_CONFIGS[writerId] || WRITER_CONFIGS.murakami

  const systemPrompt = `你是${config.name}，为这部作品写一篇序章/开篇。

【主角设定】
姓名：${protagonist.name}
性格：${protagonist.personality}
背景：${protagonist.background}

【故事大纲】
${outline}

【写作要求】
1. ${config.name}风格
2. ${config.introLength}字左右
3. 引入故事，设定基调，介绍主角初登场
4. 有文学性，不是简单的介绍`

  const userPrompt = `故事时间：${formatDate(startDate)} 至 ${formatDate(endDate)}
共记录：${momentsCount}段时光片段

主角：${protagonist.name}

请为这部作品写一篇序章，${config.name}风格。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 1500
  })
}

async function generateOutro(
  outline: string,
  protagonist: any,
  momentsCount: number,
  writerId: string
): Promise<string> {
  const config = WRITER_CONFIGS[writerId] || WRITER_CONFIGS.murakami

  const systemPrompt = `你是${config.name}，为这部作品写一篇尾声/结尾。

【主角设定】
姓名：${protagonist.name}
成长轨迹：${protagonist.growthArc}

【故事大纲】
${outline}

【写作要求】
1. ${config.name}风格
2. ${config.outroLength}字左右
3. 回顾这段经历，展望未来
4. 余韵悠长，有文学性`

  const userPrompt = `故事共${momentsCount}段时光经历。

主角：${protagonist.name}

请为这部作品写一篇尾声，${config.name}风格。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 1500
  })
}

export async function generateBiographyWithWriter(
  moments: MomentData[],
  style: string,
  writerId?: string
): Promise<{
  title: string
  chapters: ChapterData[]
}> {
  if (moments.length === 0) {
    return { title: '', chapters: [] }
  }

  const sorted = [...moments].sort((a, b) =>
    new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
  )
  const startDate = sorted[0].happened_at
  const endDate = sorted[sorted.length - 1].happened_at
  const monthGroups = groupMomentsByMonth(sorted)

  if (!writerId) {
    const writers = WRITER_STYLES[style]
    if (writers && writers.length > 0) {
      writerId = writers[Math.floor(Math.random() * writers.length)].id
    } else {
      writerId = 'murakami'
    }
  }

  console.log(`[LLM] Generating full outline with writer: ${writerId}`)

  const outlineResult = await generateFullOutline(moments, startDate, endDate, writerId)
  const { title, overallOutline, protagonist, chapterPlans, worldSetting } = outlineResult
  console.log(`[LLM] Outline generated, title: ${title}, protagonist: ${protagonist.name}`)

  const chapters: ChapterData[] = []

  const intro = await generateIntro(overallOutline, protagonist, startDate, endDate, moments.length, writerId)
  chapters.push({
    title: '序章',
    content: intro,
    momentIds: [],
    mediaIds: [],
    date: startDate,
  })

  let previousChapterEnding = ''

  for (let i = 0; i < chapterPlans.length; i++) {
    const plan = chapterPlans[i]
    const monthMoments = monthGroups.get(plan.monthKey) || []
    if (monthMoments.length === 0) continue

    console.log(`[LLM] Generating chapter ${i + 1}/${chapterPlans.length}: ${plan.chapterTitle}`)

    const chapterContent = await generateChapter(
      monthMoments,
      plan,
      overallOutline,
      protagonist,
      i,
      chapterPlans.length,
      previousChapterEnding,
      writerId,
      worldSetting
    )

    previousChapterEnding = chapterContent.slice(-300)

    const chapterDate = monthMoments[0]?.happened_at || startDate
    const momentIds = monthMoments.map(m => m.id)
    const mediaIds = monthMoments.flatMap(m => m.media_ids || [])

    chapters.push({
      title: `第${getChineseNum(i + 1)}章　${plan.chapterTitle}`,
      content: chapterContent,
      momentIds,
      mediaIds,
      date: chapterDate,
    })

    await new Promise(resolve => setTimeout(resolve, 800))
  }

  const outro = await generateOutro(overallOutline, protagonist, moments.length, writerId)
  chapters.push({
    title: '尾声',
    content: outro,
    momentIds: [],
    mediaIds: [],
    date: endDate,
  })

  const fullTitle = `《${title}·${formatDateRange(startDate, endDate)}》`

  console.log('[LLM] Biography generation complete!')
  return { title: fullTitle, chapters }
}

export async function continueBiography(
  existingChapters: ChapterData[],
  newMoments: MomentData[],
  style: string,
  writerId?: string
): Promise<{
  chapters: ChapterData[]
}> {
  if (newMoments.length === 0) {
    return { chapters: existingChapters }
  }

  const sortedNew = [...newMoments].sort((a, b) =>
    new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
  )
  const startDate = sortedNew[0].happened_at
  const endDate = sortedNew[sortedNew.length - 1].happened_at
  const monthGroups = groupMomentsByMonth(sortedNew)

  if (!writerId) {
    const writers = WRITER_STYLES[style]
    if (writers && writers.length > 0) {
      writerId = writers[Math.floor(Math.random() * writers.length)].id
    } else {
      writerId = 'murakami'
    }
  }

  const config = WRITER_CONFIGS[writerId] || WRITER_CONFIGS.murakami

  const existingContent = existingChapters
    .filter(c => c.title !== '尾声')
    .map(c => `【${c.title}】\n${c.content}`)
    .join('\n\n')

  console.log(`[LLM] Continuing biography with writer: ${writerId}`)

  const momentsText = prepareMomentsForLLM(newMoments)
  const monthsList = [...monthGroups.keys()].sort()

  const continueSystemPrompt = `你是${config.name}，正在续写之前的${config.genre}作品。

【续写原则】
1. 保持${config.name}的独特文风
2. 承接前文的内容、人物、风格，保持叙事连贯性
3. 续写部分也要有完整的情节/氛围，不只是流水账
4. 新的生活记录是续写的素材，不是主体
5. 人物性格和故事线要延续

请以JSON格式返回续写大纲：
{
  "continueOutline": "续写部分的整体思路",
  "protagonist": {
    "name": "主角名字（要和前文一致）",
    "growthArc": "续写部分的成长变化"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "章节标题",
      "plotSummary": "这一章的情节，150字左右",
      "keyScenes": ["2-3个关键场景"],
      "characterDevelopment": "人物的变化",
      "momentIntegrations": ["3个将新生活素材融入的方式"]
    }
  ]
}`

  const continueUserPrompt = `这是已经写完的内容（最后4000字）：
${existingContent.slice(-4000)}

现在要续写新的内容，请基于以上内容，保持风格和人物一致。

续写时间范围：${formatDate(startDate)} 至 ${formatDate(endDate)}
新增${newMoments.length}条生活记录素材

新生活记录素材：
${momentsText}

月份列表：${monthsList.join(', ')}

请返回续写大纲JSON。`

  const outlineResponse = await callLLM([
    { role: 'system', content: continueSystemPrompt },
    { role: 'user', content: continueUserPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 3000
  })

  let continueOutline = ''
  let protagonist = { name: '我', growthArc: '' }
  let chapterPlans: any[] = []

  try {
    const jsonMatch = outlineResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      continueOutline = parsed.continueOutline || ''
      protagonist = parsed.protagonist || { name: '我', growthArc: '' }
      chapterPlans = parsed.chapterPlans || []
    }
  } catch (e) {
    console.error('Failed to parse continue outline:', e)
  }

  if (chapterPlans.length === 0) {
    chapterPlans = monthsList.map(m => ({
      monthKey: m,
      chapterTitle: '续篇',
      plotSummary: '',
      keyScenes: [],
      characterDevelopment: '',
      momentIntegrations: []
    }))
  }

  const newChapters: ChapterData[] = []
  const existingChapterCount = existingChapters.filter(c => !['序章', '尾声'].includes(c.title)).length
  const lastChapterEnding = existingChapters[existingChapters.length - 2]?.content?.slice(-300) || ''

  for (let i = 0; i < chapterPlans.length; i++) {
    const plan = chapterPlans[i]
    const monthMoments = monthGroups.get(plan.monthKey) || []
    if (monthMoments.length === 0) continue

    console.log(`[LLM] Generating continue chapter ${i + 1}/${chapterPlans.length}: ${plan.chapterTitle}`)

    const chapterContent = await generateChapter(
      monthMoments,
      plan,
      continueOutline,
      protagonist,
      existingChapterCount + i,
      existingChapterCount + chapterPlans.length,
      i === 0 ? lastChapterEnding : '',
      writerId,
      ''
    )

    const chapterDate = monthMoments[0]?.happened_at || startDate
    const momentIds = monthMoments.map(m => m.id)
    const mediaIds = monthMoments.flatMap(m => m.media_ids || [])

    newChapters.push({
      title: `第${getChineseNum(existingChapterCount + i + 1)}章　${plan.chapterTitle}`,
      content: chapterContent,
      momentIds,
      mediaIds,
      date: chapterDate,
    })

    await new Promise(resolve => setTimeout(resolve, 800))
  }

  const resultChapters = existingChapters.filter(c => c.title !== '尾声')
  resultChapters.push(...newChapters)

  const allMomentsCount = [...existingChapters.flatMap(c => c.momentIds || []), ...newMoments.map(m => m.id)].length
  const outro = await generateOutro(continueOutline, protagonist, allMomentsCount, writerId)

  resultChapters.push({
    title: '尾声',
    content: outro,
    momentIds: [],
    mediaIds: [],
    date: endDate,
  })

  console.log('[LLM] Biography continuation complete!')
  return { chapters: resultChapters }
}
