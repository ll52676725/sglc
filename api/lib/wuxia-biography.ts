const MOOD_LABELS: Record<string, string> = {
  happy: '开心', excited: '兴奋', peaceful: '平静', grateful: '感恩',
  love: '幸福', nostalgic: '怀念', sad: '难过', anxious: '焦虑',
  angry: '生气', tired: '疲惫', sick: '不适', thinking: '沉思',
}

interface MomentData {
  id: string
  content: string
  mood: string
  weather: string
  location: string
  happened_at: string
  media_count: number
  media_ids: string[]
}

interface AnalyzedMoment extends MomentData {
  importance: number
  category: 'milestone' | 'adventure' | 'daily' | 'emotional' | 'social'
  wuxiaElements: string[]
}

interface ChapterData {
  title: string
  content: string
  momentIds: string[]
  mediaIds: string[]
  date: string
}

interface WuxiaCharacter {
  name: string
  title: string
  realm: string
  personality: string
  currentProgress: number
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function formatWuxiaDate(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']
  const months = ['孟春', '仲春', '季春', '孟夏', '仲夏', '季夏', '孟秋', '仲秋', '季秋', '孟冬', '仲冬', '季冬']
  return `${months[d.getMonth()]}${days[d.getDate() - 1] || d.getDate() + '日'}`
}

function formatMonth(monthNum: number): string {
  const lunarMonths = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
  return lunarMonths[monthNum - 1] || `${monthNum}月`
}

function analyzeMomentImportance(m: MomentData): number {
  let score = 1
  if (m.media_count > 0) score += m.media_count * 0.5
  if (m.content.length > 30) score += 1
  if (m.content.length > 60) score += 1
  if (['excited', 'love', 'sad', 'angry'].includes(m.mood)) score += 1
  if (m.location && m.location.trim()) score += 0.5
  if (m.content.includes('生日') || m.content.includes('结婚') || m.content.includes('毕业') || m.content.includes('旅行')) score += 2
  if (m.content.includes('朋友') || m.content.includes('家人') || m.content.includes('聚会')) score += 1
  return Math.min(score, 5)
}

function categorizeMoment(m: MomentData): AnalyzedMoment['category'] {
  const content = m.content
  if (content.includes('生日') || content.includes('结婚') || content.includes('毕业') || content.includes('升职') || content.includes(' anniversary')) {
    return 'milestone'
  }
  if (content.includes('旅行') || content.includes('爬山') || content.includes('探险') || content.includes('公园') || content.includes('景区')) {
    return 'adventure'
  }
  if (content.includes('朋友') || content.includes('聚会') || content.includes('聚餐') || content.includes('家人')) {
    return 'social'
  }
  if (['sad', 'love', 'nostalgic', 'grateful', 'thinking'].includes(m.mood)) {
    return 'emotional'
  }
  return 'daily'
}

function extractWuxiaElements(m: MomentData): string[] {
  const elements: string[] = []
  const content = m.content
  
  if (content.includes('工作') || content.includes('加班') || content.includes('项目')) {
    elements.push('修炼内功', '处理门派事务', '闭关练功')
  }
  if (content.includes('吃') || content.includes('餐') || content.includes('美食') || content.includes('餐厅')) {
    elements.push('享用美酒佳肴', '客栈打尖', '江湖宴席')
  }
  if (content.includes('散步') || content.includes('走') || content.includes('逛') || content.includes('公园')) {
    elements.push('游走江湖', '踏青赏景', '寻访名山')
  }
  if (content.includes('朋友') || content.includes('聚')) {
    elements.push('与江湖好友相聚', '英雄聚会', '把酒言欢')
  }
  if (content.includes('家') || content.includes('家人') || content.includes('父母')) {
    elements.push('归家探亲', '共享天伦', '师门团聚')
  }
  if (content.includes('旅行') || content.includes('旅游') || content.includes('爬山')) {
    elements.push('闯荡江湖', '游历名山大川', '寻访秘境')
  }
  if (content.includes('运动') || content.includes('跑步') || content.includes('健身')) {
    elements.push('修炼外功', '锻炼身体', '打磨筋骨')
  }
  if (content.includes('读书') || content.includes('学习') || content.includes('看书')) {
    elements.push('研读武功秘籍', '参悟武学至理', '博览群书')
  }
  if (content.includes('病') || content.includes('感冒') || content.includes('不舒服')) {
    elements.push('偶感风寒', '真气紊乱', '内力受损')
  }
  if (content.includes('生日')) {
    elements.push('寿诞之喜', '江湖同道贺寿', '生辰吉时')
  }
  
  if (elements.length === 0) {
    elements.push('江湖历练', '红尘修行', '行走江湖')
  }
  
  return elements
}

function analyzeMoments(moments: MomentData[]): AnalyzedMoment[] {
  return moments.map(m => ({
    ...m,
    importance: analyzeMomentImportance(m),
    category: categorizeMoment(m),
    wuxiaElements: extractWuxiaElements(m)
  }))
}

function generateCharacterProfile(moments: AnalyzedMoment[]): WuxiaCharacter {
  const goodMoods = moments.filter(m => ['happy', 'excited', 'love', 'grateful', 'peaceful'].includes(m.mood)).length
  const total = moments.length || 1
  const positiveRatio = goodMoods / total
  
  const personalities = [
    '侠骨柔情', '豪迈不羁', '沉稳内敛', '机敏过人', 
    '重情重义', '淡泊名利', '心高气傲', '外冷内热'
  ]
  
  const realms = [
    '初入江湖', '小有名气', '渐入佳境', '声名鹊起', 
    '名动一方', '侠名远播', '宗师风范', '隐世高人'
  ]
  
  const titles = [
    '少侠', '侠士', '游侠', '剑客', 
    '居士', '隐士', '名宿', '掌门'
  ]
  
  const realmIndex = Math.min(Math.floor(moments.length / 5), realms.length - 1)
  
  return {
    name: '少侠',
    title: randomChoice(titles),
    realm: realms[realmIndex],
    personality: randomChoice(personalities),
    currentProgress: Math.floor(positiveRatio * 100)
  }
}

const JINYONG_CHAPTER_TITLES = [
  { patterns: ['风雪', '惊变', '寒'], titles: ['风雪惊变', '寒山遇敌', '冰湖奇遇'] },
  { patterns: ['江南', '春', '花'], titles: ['江南烟雨', '春花秋月', '姑苏旧梦'] },
  { patterns: ['大漠', '沙', '风'], titles: ['大漠风沙', '狂沙万里', '塞外牛羊'] },
  { patterns: ['黑', '夜', '暗'], titles: ['黑夜伏击', '暗夜追踪', '黑影重重'] },
  { patterns: ['龙', '虎', '狮'], titles: ['神龙摆尾', '虎啸山林', '狮王争霸'] },
  { patterns: ['桃花', '岛', '花'], titles: ['桃花岛主', '落花流水', '百花错拳'] },
  { patterns: ['比武', '招亲', '战'], titles: ['比武招亲', '华山论剑', '巅峰对决'] },
  { patterns: ['各显', '神通', '奇'], titles: ['各显神通', '奇门遁甲', '怪招迭出'] },
  { patterns: ['真经', '秘籍', '武功'], titles: ['九阴真经', '九阳神功', '葵花宝典'] },
  { patterns: ['华山', '巅', '顶'], titles: ['华山之巅', '泰山极顶', '嵩山论剑'] },
  { patterns: ['烟雨', '雾', '云'], titles: ['烟雨大战', '云雾缭绕', '云开雾散'] },
  { patterns: ['情', '爱', '缘'], titles: ['情为何物', '缘定三生', '爱恨情仇'] },
]

const GU_LONG_CHAPTER_TITLES = [
  { patterns: ['夜', '风'], titles: ['夜风', '黑巷', '无月之夜'] },
  { patterns: ['剑', '刀'], titles: ['剑·花·烟雨江南', '刀锋', '七种武器'] },
  { patterns: ['人', '客'], titles: ['天涯·明月·刀', '三少爷的剑', '大人物'] },
  { patterns: ['谜', '疑'], titles: ['迷局', '疑云重重', '真相'] },
  { patterns: ['酒', '醉'], titles: ['醉里挑灯', '欢乐英雄', '把酒问青天'] },
  { patterns: ['血', '杀'], titles: ['血鹦鹉', '杀气', '一剑封喉'] },
  { patterns: ['情', '爱'], titles: ['多情剑客无情剑', '天涯明月刀', '流星蝴蝶剑'] },
  { patterns: ['风', '云'], titles: ['风云第一刀', '武林外史', '名剑风流'] },
]

function generateJinYongChapterTitle(month: string, moments: AnalyzedMoment[]): string {
  const mainMoment = moments.reduce((a, b) => a.importance > b.importance ? a : b, moments[0])
  const content = mainMoment?.content || ''
  
  for (const group of JINYONG_CHAPTER_TITLES) {
    for (const pattern of group.patterns) {
      if (content.includes(pattern)) {
        return randomChoice(group.titles)
      }
    }
  }
  
  const defaultTitles = [
    '侠影萍踪', '江湖夜雨', '剑胆琴心', '踏雪寻梅',
    '乘风破浪', '披荆斩棘', '云游四海', '笑傲江湖',
    '独行天下', '侠骨丹心', '义薄云天', '浩然正气'
  ]
  
  const monthNum = parseInt(month) || 1
  return defaultTitles[(monthNum - 1) % defaultTitles.length]
}

function generateGuLongChapterTitle(month: string, moments: AnalyzedMoment[]): string {
  const mainMoment = moments.reduce((a, b) => a.importance > b.importance ? a : b, moments[0])
  const content = mainMoment?.content || ''
  
  for (const group of GU_LONG_CHAPTER_TITLES) {
    for (const pattern of group.patterns) {
      if (content.includes(pattern)) {
        return randomChoice(group.titles)
      }
    }
  }
  
  const defaultTitles = [
    '边城浪子', '大地飞鹰', '飞刀又见飞刀', '九月鹰飞',
    '绝不低头', '孤星传', '护花铃', '剑客行',
    '剑毒梅香', '失魂引', '残金缺玉', '英雄无泪'
  ]
  
  const monthNum = parseInt(month) || 1
  return defaultTitles[(monthNum - 1) % defaultTitles.length]
}

function getWuxiaMoodDescription(mood: string, style: 'jinyong' | 'gulong'): string {
  const jinYongMap: Record<string, string[]> = {
    happy: ['心中大喜，只觉神清气爽，说不出的畅快', '不由得抚掌大笑，满心欢喜', '嘴角噙着笑意，心境豁然开朗'],
    excited: ['豪情万丈，意气风发，只觉天下无不可为之事', '热血上涌，恨不能立即长啸一声', '神采飞扬，周身仿佛都散发着光芒'],
    peaceful: ['但觉心境澄明，万念俱寂，物我两忘', '心如止水，波澜不惊，一派悠然自得', '神闲气定，说不出的平和安详'],
    grateful: ['连忙抱拳拱手，连声道谢，心中感激不尽', '铭感五内，这一份恩情，日后必当涌泉相报', '心中感念，眼眶微热'],
    love: ['心中柔情蜜意，难以自已，嘴角不自觉地泛起微笑', '柔情似水，佳期如梦，只愿这一刻永恒', '芳心暗许，情根深种，难以自拔'],
    nostalgic: ['抚今追昔，不禁感慨万千，物是人非事事休', '忆往昔峥嵘岁月稠，不禁泫然', '旧事涌上心头，恍如隔世'],
    sad: ['只觉黯然神伤，泫然欲泣，天地仿佛都失去了颜色', '悲从中来，不可断绝，一行清泪滑落脸颊', '心若死灰，万念俱灰'],
    anxious: ['心中焦急万分，坐立不安，犹如热锅上的蚂蚁', '忧心如焚，来回踱步，不知如何是好', '心乱如麻，理不出个头绪'],
    angry: ['不禁勃然大怒，怒火中烧，拍案而起', '气得浑身发抖，指节发白', '怒发冲冠，目眦欲裂'],
    tired: ['只觉身心俱疲，体力不支，恨不得倒头便睡', '筋疲力尽，连抬一根手指的力气都没有', '心力交瘁，只想找个地方好好休息'],
    sick: ['竟是偶感风寒，身体微恙，四肢酸软无力', '真气逆乱，胸口烦闷，几欲作呕', '头重脚轻，脚下虚浮'],
    thinking: ['沉吟片刻，若有所思，眼中精光一闪', '负手而立，仰望苍穹，陷入沉思', '眉头微皱，心中暗自盘算'],
  }
  
  const guLongMap: Record<string, string[]> = {
    happy: ['笑。', '他笑了。笑得很开心。', '快乐，本就是件很难得的事。'],
    excited: ['血，热的。', '心跳在加速。', '他的眼睛在发光。'],
    peaceful: ['静。', '很静。', '心静如水。'],
    grateful: ['感恩。', '他记得。', '有些恩情，永不忘。'],
    love: ['情。', '世上只有情字最磨人。', '爱，本就是没有道理的。'],
    nostalgic: ['回忆。', '往事如烟。', '有些人，有些事，总也忘不了。'],
    sad: ['痛。', '心痛。', '最痛的，是看不见的伤口。'],
    anxious: ['急。', '心急。', '越急，越容易出错。'],
    angry: ['怒。', '怒火。', '愤怒，有时比害怕更可怕。'],
    tired: ['累。', '很累。', '人活着，本就很累。'],
    sick: ['病。', '人总会生病的。', '身体的病，总比心病好治。'],
    thinking: ['想。', '在想。', '有些事，总得想明白。'],
  }
  
  const map = style === 'jinyong' ? jinYongMap : guLongMap
  const options = map[mood] || map['peaceful']
  return randomChoice(options)
}

function getWuxiaLocationDescription(location: string, style: 'jinyong' | 'gulong'): string {
  if (!location) {
    return style === 'jinyong' ? '行走江湖，浪迹天涯' : '路上。'
  }
  
  const jinYongMap: Record<string, string[]> = {
    '公园': ['于园中漫步，赏四时风光', '游园赏景，怡然自得', '在花园中信步而行'],
    '山': ['登临绝顶，一览众山小', '寻访名山，汲取天地灵气', '于深山之中修炼'],
    '公司': ['在门派中处理日常事务', '打理帮派事务，兢兢业业', '处理俗世杂务'],
    '家': ['于府中休憩，共享天伦', '回到故居，倍感温馨', '在山庄中闭门谢客'],
    '餐厅': ['在客栈中打尖用饭', '到酒楼小酌几杯', '寻一处干净的酒家'],
    '商场': ['闹市之中，人声鼎沸', '在集镇上采买物品', '混迹于市井之间'],
  }
  
  const guLongMap: Record<string, string[]> = {
    '公园': ['花园。', '有花的地方。', '春色满园。'],
    '山': ['山。', '高山。', '山在那里。'],
    '公司': ['地方。', '做事的地方。', '人总得有个地方落脚。'],
    '家': ['家。', '温暖的地方。', '有人等他回去。'],
    '餐厅': ['酒馆。', '有酒的地方。', '他常常来的地方。'],
    '商场': ['市集。', '热闹的地方。', '人多的地方。'],
  }
  
  const map = style === 'jinyong' ? jinYongMap : guLongMap
  
  for (const [key, values] of Object.entries(map)) {
    if (location.includes(key)) {
      return randomChoice(values)
    }
  }
  
  if (style === 'jinyong') {
    return `途经${location}，见此地风光不俗`
  }
  return `${location}。`
}

function generateJinYongContent(
  moment: AnalyzedMoment, 
  character: WuxiaCharacter, 
  isFirst: boolean, 
  isLast: boolean,
  idx: number,
  total: number
): string {
  const date = formatWuxiaDate(moment.happened_at)
  const moodDesc = getWuxiaMoodDescription(moment.mood, 'jinyong')
  const locDesc = getWuxiaLocationDescription(moment.location, 'jinyong')
  const element = randomChoice(moment.wuxiaElements)
  
  const transitions = {
    first: [
      `话说${date}，${character.title}${locDesc}，${moodDesc}。这一日，${element}，`,
      `时光荏苒，转眼已到${date}。这日${character.title}${locDesc}，${moodDesc}，`,
      `${date}，天朗气清，惠风和畅。${character.title}${locDesc}，${moodDesc}，正${element}，`
    ],
    middle: [
      `到得${date}，${character.title}${locDesc}，${moodDesc}，${element}。`,
      `这${date}倒是个好日子，${character.title}${locDesc}，${moodDesc}，便${element}。`,
      `诸事繁杂，匆匆已至${date}。${character.title}${locDesc}，${moodDesc}，抽空${element}。`
    ],
    last: [
      `时光飞逝，这月便到了${date}。${character.title}${locDesc}，${moodDesc}，${element}。`,
      `月末${date}，${character.title}${locDesc}，${moodDesc}，回想这一月经历，${element}。`,
      `到得${date}，这月的故事也接近尾声。${character.title}${locDesc}，${moodDesc}，${element}。`
    ]
  }
  
  const key = isFirst ? 'first' : isLast ? 'last' : 'middle'
  let content = randomChoice(transitions[key])
  
  if (moment.content.length > 10) {
    const cleanContent = moment.content.replace(/[，。！？、；：""''（）《》\s]/g, '').slice(0, 15)
    if (cleanContent.length > 5) {
      content += `正所谓"${cleanContent}"，`
    }
  }
  
  if (moment.importance >= 4) {
    const highlights = [
      '当真是一段值得铭记的江湖佳话。',
      '此事在江湖中传为美谈。',
      '至今思之，仍觉历历在目。',
      '这一段经历，对少侠日后的武道之路影响深远。'
    ]
    content += randomChoice(highlights)
  } else if (moment.importance >= 2) {
    const midlights = [
      '虽非惊天动地之事，却也别有一番风味。',
      '江湖日常，本就是如此。',
      '平平淡淡，方显真章。',
      '这便是江湖人的日常生活。'
    ]
    content += randomChoice(midlights)
  } else {
    const lowlights = [
      '不过是江湖中寻常一日。',
      '日子便这么一天天过去了。',
      '岁月静好，波澜不惊。',
      '修行之路，本就多是平淡。'
    ]
    content += randomChoice(lowlights)
  }
  
  return content
}

function generateGuLongContent(
  moment: AnalyzedMoment, 
  character: WuxiaCharacter, 
  isFirst: boolean, 
  isLast: boolean,
  idx: number,
  total: number
): string {
  const date = formatWuxiaDate(moment.happened_at)
  const moodDesc = getWuxiaMoodDescription(moment.mood, 'gulong')
  const locDesc = getWuxiaLocationDescription(moment.location, 'gulong')
  const element = randomChoice(moment.wuxiaElements)
  
  let content = ''
  
  if (isFirst) {
    content += `${date}。\n\n`
    content += `${locDesc}\n\n`
    content += `${moodDesc}\n\n`
    content += `他${element}。\n\n`
  } else if (isLast) {
    content += `${date}。夜。\n\n`
    content += `${moodDesc}\n\n`
    content += `这个月发生了很多事。\n\n`
    content += `他记得。\n`
  } else {
    content += `${date}。\n\n`
    content += `${locDesc}\n\n`
    content += `${element}。\n\n`
    content += `${moodDesc}\n`
  }
  
  return content
}

function generateJinYongIntro(moments: AnalyzedMoment[], startDate: string, endDate: string, character: WuxiaCharacter): string {
  const start = formatWuxiaDate(startDate)
  const end = formatWuxiaDate(endDate)
  const total = moments.length
  
  const introOptions = [
    `　　诗曰：

　　"天下风云出我辈，一入江湖岁月催。
　　皇图霸业谈笑中，不胜人生一场醉。"

　　话说自${start}至${end}，这${total}余日，${character.title}行走江湖，历练红尘，经历了诸般奇遇。有春风得意之时，亦有黯然销魂之日；有与知己把酒言欢之乐，亦有独行深山苦修之寂。

　　江湖子弟江湖老，红粉佳人两鬓斑。但正是这些点点滴滴，才铸就了这一段属于${character.title}的江湖传奇。

　　各位看官，且听我慢慢道来——`,
    
    `　　古语有云："人在江湖，身不由己。"然江湖之中，亦有真性情，亦有真豪杰。

　　从${start}到${end}，共计${total}个日日夜夜。${character.title}以${character.personality}之性，行侠仗义，游走于正邪之间，历练于红尘之中。虽无惊天动地之伟业，却也有不少值得一书的故事。

　　今日本座便将这些时日的江湖轶事，一一说与诸位看官。

　　——说书人拍案一声，故事便开始了。`,
    
    `　　江南烟雨，塞北风沙，江湖之大，无奇不有。

　　${character.title}，以${character.realm}之境，${character.personality}之风，于${start}至${end}间，踏遍三山五岳，结交四方豪杰。

　　这${total}段故事，或喜或悲，或平淡或离奇，却都是真实的江湖。

　　诸位，请了——`
  ]
  
  return randomChoice(introOptions)
}

function generateGuLongIntro(moments: AnalyzedMoment[], startDate: string, endDate: string, character: WuxiaCharacter): string {
  const start = formatWuxiaDate(startDate)
  const end = formatWuxiaDate(endDate)
  const total = moments.length
  
  const introOptions = [
    `江湖。

什么是江湖？

有人的地方，就有江湖。

${start}。
${end}。

${total}天。

他走过。

他记得。

故事，就这样开始了。`,
    
    `人在江湖。

身不由己？

也许。

但至少，他选择了自己的路。

从${start}，到${end}。

${total}个日夜。

有酒。有剑。有朋友。有敌人。

这就够了。`,
    
    `夜。

无星，无月。

只有风。

风吹过，带来了远方的消息。

他的故事，从${start}开始。

到${end}，暂告一段落。

${total}天，不算长，也不算短。

足以发生很多事。

足以改变一个人。`
  ]
  
  return randomChoice(introOptions)
}

function generateJinYongOutro(moments: AnalyzedMoment[], character: WuxiaCharacter): string {
  const goodDays = moments.filter(m => ['happy', 'excited', 'love', 'grateful'].includes(m.mood)).length
  const total = moments.length
  
  const outroOptions = [
    `　　这${total}段江湖往事，到此便告一段落了。

　　其中有${goodDays}日是快活的，余下的日子也各有滋味。人生不如意事十之八九，但只要心中有侠义，何处不是江湖？

　　${character.title}的武道之路还很长，${character.realm}不过是起点。他日若能参透武学至理，突破玄关，未必不能成为一代宗师。

　　江湖路远，山高水长。${character.title}的故事，还在继续……

　　正是：
　　一壶浊酒喜相逢，
　　古今多少事，
　　都付笑谈中。`,
    
    `　　书到此处，暂作停歇。

　　${total}个日夜，${character.title}从${character.realm}稳步前行，心性愈发坚定。江湖风波恶，但只要守住初心，便无惧风雨。

　　他日若有机缘，${character.title}或能名动天下，成为真正的一代大侠。

　　这正是：
　　侠之大者，为国为民。
　　虽千万人，吾往矣。`,
    
    `　　话说${character.title}这${total}日的江湖历练，虽无轰轰烈烈之大事，却也处处见真章。

　　不积跬步，无以至千里；不积小流，无以成江海。${character.personality}如${character.title}，假以时日，必成大器。

　　欲知后事如何，且听下回分解。`
  ]
  
  return randomChoice(outroOptions)
}

function generateGuLongOutro(moments: AnalyzedMoment[], character: WuxiaCharacter): string {
  const total = moments.length
  
  const outroOptions = [
    `故事完了。

${total}天。

就这么过去了。

他还在走。

路还很长。

江湖，永远都在。

——全文完——`,
    
    `结束了？

不。

这不是结束。

这只是开始。

他的路，还很长。

他的剑，还在手里。

他的血，还是热的。

所以，故事还会继续。`,
    
    `有人问他，江湖有意思吗？

他笑了笑。

有意思的不是江湖。

是活着。

是爱过，恨过，来过，走过。

${total}天，足够了。

足够记住很多事。

足够忘记一些事。

足够继续走下去。`
  ]
  
  return randomChoice(outroOptions)
}

function generateJinYongChapter(
  month: string, 
  monthMoments: AnalyzedMoment[], 
  character: WuxiaCharacter
): { title: string; content: string } {
  const sorted = [...monthMoments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
  const chapterTitle = generateJinYongChapterTitle(month, sorted)
  const monthName = formatMonth(parseInt(month))
  
  const chapterNum = getChapterNum(month)
  
  let story = `　　光阴似箭，日月如梭。转眼间便到了${monthName}间。

　　这个月，${character.title}的修行又进了一步，已隐隐有突破${character.realm}之兆。

`

  const importantMoments = sorted.filter(m => m.importance >= 3)
  const dailyMoments = sorted.filter(m => m.importance < 3)
  
  if (importantMoments.length > 0) {
    story += `　　本月有几件大事，不得不提。

`
    importantMoments.forEach((m, idx) => {
      const isFirst = idx === 0
      const isLast = idx === importantMoments.length - 1 && dailyMoments.length === 0
      story += `　　${generateJinYongContent(m, character, isFirst, isLast, idx, importantMoments.length)}

`
    })
  }
  
  if (dailyMoments.length > 0) {
    if (importantMoments.length > 0) {
      story += `　　除了这些大事，日常的修行也未曾落下。

`
    }
    
    if (dailyMoments.length <= 2) {
      dailyMoments.forEach((m, idx) => {
        const isFirst = importantMoments.length === 0 && idx === 0
        const isLast = idx === dailyMoments.length - 1
        story += `　　${generateJinYongContent(m, character, isFirst, isLast, idx, dailyMoments.length)}

`
      })
    } else {
      const sampleMoments = [dailyMoments[0], dailyMoments[Math.floor(dailyMoments.length / 2)], dailyMoments[dailyMoments.length - 1]]
      sampleMoments.forEach((m, idx) => {
        const isFirst = importantMoments.length === 0 && idx === 0
        const isLast = idx === sampleMoments.length - 1
        story += `　　${generateJinYongContent(m, character, isFirst, isLast, idx, sampleMoments.length)}

`
      })
      story += `　　其余${dailyMoments.length - 3}余日，${character.title}或打坐修炼，或研读秘籍，或打理日常事务，不必细表。

`
    }
  }
  
  const monthSummaries = [
    `　　总的来说，这${monthName}${character.personality}如${character.title}，过得倒是充实得紧。功夫不负有心人，如此修行，他日必成大器。`,
    `　　这${monthName}的经历，让${character.title}对江湖又多了几分理解。武道之路，漫漫其修远兮，上下而求索。`,
    `　　${monthName}已逝，${character.title}的修为又精进了不少。但他知道，这不过是万里长征第一步，真正的考验还在后面。`
  ]
  
  story += randomChoice(monthSummaries)
  
  return {
    title: `第${chapterNum}回　${chapterTitle}`,
    content: story
  }
}

function generateGuLongChapter(
  month: string, 
  monthMoments: AnalyzedMoment[], 
  character: WuxiaCharacter
): { title: string; content: string } {
  const sorted = [...monthMoments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
  const chapterTitle = generateGuLongChapterTitle(month, sorted)
  const monthName = formatMonth(parseInt(month))
  
  let story = `${monthName}。

这个月发生了很多事。

有些事，他记得很清楚。

有些事，他宁愿忘记。

`

  const importantMoments = sorted.filter(m => m.importance >= 3)
  const dailyMoments = sorted.filter(m => m.importance < 3)
  
  if (importantMoments.length > 0) {
    importantMoments.forEach((m, idx) => {
      const isFirst = idx === 0
      const isLast = idx === importantMoments.length - 1 && dailyMoments.length === 0
      story += `${generateGuLongContent(m, character, isFirst, isLast, idx, importantMoments.length)}\n\n`
    })
  }
  
  if (dailyMoments.length > 0) {
    if (importantMoments.length > 0) {
      story += `其他的日子。

和平常没什么两样。

`
    }
    
    const sampleCount = Math.min(dailyMoments.length, 2)
    for (let i = 0; i < sampleCount; i++) {
      const m = dailyMoments[i]
      const isFirst = importantMoments.length === 0 && i === 0
      const isLast = i === sampleCount - 1
      story += `${generateGuLongContent(m, character, isFirst, isLast, i, sampleCount)}\n\n`
    }
    
    if (dailyMoments.length > sampleCount) {
      story += `还有${dailyMoments.length - sampleCount}天。

很普通。

普通得几乎记不起了。

但他知道，那些日子他都在。

在修行。

在活着。

`
    }
  }
  
  const monthEndings = [
    `月终了。

这个月，他变了吗？

也许。

也许没有。

谁知道呢？`,
    
    `时间过得真快。

快得让人来不及反应。

一个月，就这么过去了。

他还在。

还在走。`,
    
    `月末。

他站在窗前。

看月亮。

月亮很圆。

他想起了很多事。

这个月，值得。`
  ]
  
  story += randomChoice(monthEndings)
  
  return {
    title: chapterTitle,
    content: story
  }
}

function getChapterNum(month: string): string {
  const match = month.match(/(\d{1,2})月/)
  const num = match ? parseInt(match[1]) : 1
  const chars = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  return chars[num - 1] || chars[0]
}

function groupMomentsByMonth(moments: AnalyzedMoment[]): Map<string, AnalyzedMoment[]> {
  const groups = new Map<string, AnalyzedMoment[]>()
  for (const m of moments) {
    const d = new Date(m.happened_at)
    const key = `${d.getMonth() + 1}月`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }
  return groups
}

export type WuxiaStyle = 'jinyong' | 'gulong' | 'mixed'

export function generateWuxiaBiography(
  moments: MomentData[],
  style: WuxiaStyle = 'mixed'
): { 
  title: string
  chapters: Array<{ 
    title: string
    content: string
    momentIds: string[]
    mediaIds: string[]
    date: string
  }>
} {
  if (moments.length === 0) {
    return { title: '', chapters: [] }
  }
  
  const analyzed = analyzeMoments(moments)
  const sorted = [...analyzed].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
  const character = generateCharacterProfile(sorted)
  
  const startDate = sorted[0].happened_at
  const endDate = sorted[sorted.length - 1].happened_at
  
  const actualStyle: 'jinyong' | 'gulong' = style === 'mixed' 
    ? (Math.random() > 0.5 ? 'jinyong' : 'gulong') 
    : style
  
  const titleStyle = actualStyle === 'jinyong' 
    ? `《${character.title}江湖行·${formatDateRange(startDate, endDate)}》`
    : `《江湖路·${formatDateRange(startDate, endDate)}》`
  
  const intro = actualStyle === 'jinyong'
    ? generateJinYongIntro(sorted, startDate, endDate, character)
    : generateGuLongIntro(sorted, startDate, endDate, character)
  
  const outro = actualStyle === 'jinyong'
    ? generateJinYongOutro(sorted, character)
    : generateGuLongOutro(sorted, character)
  
  const monthGroups = groupMomentsByMonth(sorted)
  const sortedMonths = [...monthGroups.keys()].sort((a, b) => parseInt(a) - parseInt(b))
  
  const chapters: ChapterData[] = []
  
  chapters.push({
    title: '序章',
    content: intro,
    momentIds: [],
    mediaIds: [],
    date: startDate,
  })
  
  for (const month of sortedMonths) {
    const monthMoments = monthGroups.get(month)!.sort((a, b) => 
      new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
    )
    
    const chapterData = actualStyle === 'jinyong'
      ? generateJinYongChapter(month, monthMoments, character)
      : generateGuLongChapter(month, monthMoments, character)
    
    const chapterDate = monthMoments[0]?.happened_at || startDate
    const momentIds = monthMoments.map(m => m.id)
    const mediaIds = monthMoments.flatMap(m => m.media_ids || [])
    
    chapters.push({
      title: chapterData.title,
      content: chapterData.content,
      momentIds,
      mediaIds,
      date: chapterDate,
    })
  }
  
  chapters.push({
    title: '尾声',
    content: outro,
    momentIds: [],
    mediaIds: [],
    date: endDate,
  })
  
  return { title: titleStyle, chapters }
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getFullYear()}年${s.getMonth() + 1}月-${e.getMonth() + 1}月`
  }
  return `${s.getFullYear()}年${s.getMonth() + 1}月-${e.getFullYear()}年${e.getMonth() + 1}月`
}
