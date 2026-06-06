import { callLLM } from './llm-client.js'

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

interface ChapterData {
  title: string
  content: string
  momentIds: string[]
  mediaIds: string[]
  date: string
}

export type WuxiaStyle = 'jinyong' | 'gulong'

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

function getChineseNum(num: number): string {
  const chars = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  return chars[num - 1] || String(num)
}

function prepareMomentsForLLM(moments: MomentData[]): string {
  const sorted = [...moments].sort((a, b) =>
    new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
  )

  return sorted.map((m, idx) => {
    const mood = MOOD_LABELS[m.mood] || m.mood
    return `[记录${idx + 1}] 日期:${formatDate(m.happened_at)} | 地点:${m.location || '未记录'} | 心情:${mood} | 天气:${m.weather || '未记录'} | 媒体:${m.media_count}张
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

function pickKeyMoments(moments: MomentData[], count: number = 3): string[] {
  if (moments.length <= count) return moments.map(m => m.content)
  const result: string[] = []
  const step = Math.floor(moments.length / count)
  for (let i = 0; i < count; i++) {
    const idx = Math.min(i * step + Math.floor(step / 2), moments.length - 1)
    result.push(moments[idx].content)
  }
  return result
}

async function generateJinYongFullOutline(
  moments: MomentData[],
  startDate: string,
  endDate: string
): Promise<{
  title: string
  overallOutline: string
  protagonist: {
    name: string
    personality: string
    background: string
    growthArc: string
  }
  chapterPlans: Array<{
    monthKey: string
    chapterTitle: string
    plotSummary: string
    keyEvents: string[]
    characterDevelopment: string
    momentIntegrations: string[]
  }>
}> {
  const momentsText = prepareMomentsForLLM(moments)
  const monthGroups = groupMomentsByMonth(moments)
  const monthsList = [...monthGroups.keys()].sort()

  const systemPrompt = `你是金庸武侠小说的创作总设计师。你的任务是根据生活记录，设计一部完整的武侠小说大纲。

【核心原则】
1. 先有完整的故事架构和人物成长线，生活记录只是融入情节的素材
2. 不要逐条罗列生活记录，要把它们变成推动情节发展的事件
3. 人物要有鲜明的性格和完整的成长弧光
4. 情节要有起承转合，有伏笔有呼应

【输出JSON结构】
{
  "title": "小说总标题，4-8字，如《江湖行》《红尘剑》",
  "overallOutline": "500字左右的完整故事大纲，包含：开篇引入、发展脉络、高潮情节、结局走向，要像真正的武侠小说一样有起承转合",
  "protagonist": {
    "name": "给主角起一个武侠味的名字，如"凌云霄""沈剑秋""苏慕雪"等",
    "personality": "主角性格特点，2-3个关键词加描述",
    "background": "主角的身份背景，如名门弟子、江湖浪子、没落世家等",
    "growthArc": "主角在这段时间的成长变化轨迹，从什么状态成长为什么状态"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "对仗工整的回目名，4-8字，如"风雪惊变""密室练功"",
      "plotSummary": "这一回的完整故事情节，200字左右，要有：场景铺垫、事件发生、冲突、解决或悬念",
      "keyEvents": ["3个这一回中的关键武侠事件，如"巧遇高人""获得秘籍""大战山贼"等"],
      "characterDevelopment": "这一回中主角的心理变化或成长",
      "momentIntegrations": ["3个将生活记录融入情节的具体方式，如"加班到深夜→在密室中闭关修炼内功三天三夜""去公园散步→在御花园中偶遇公主"]
    }
  ]
}

【重要提醒】
- 月份列表：${monthsList.join(', ')}
- 每个月对应一回
- 章节之间要有逻辑关联，情节要连贯
- 重点是写小说，不是记录生活
- 生活记录是素材，不是主体`

  const userPrompt = `请根据以下生活记录，设计一部金庸风格的武侠小说完整大纲：

时间跨度：${formatDate(startDate)} 至 ${formatDate(endDate)}
共${moments.length}条生活记录（作为创作素材）

生活记录素材：
${momentsText}

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
        title: parsed.title || '江湖奇侠传',
        overallOutline: parsed.overallOutline || '',
        protagonist: parsed.protagonist || {
          name: '凌云霄',
          personality: '重情重义，略带顽劣',
          background: '江南武林世家子弟',
          growthArc: '从青涩少年逐渐成熟'
        },
        chapterPlans: parsed.chapterPlans || []
      }
    }
  } catch (e) {
    console.error('Failed to parse Jin Yong outline:', e)
  }

  return {
    title: '江湖奇侠传',
    overallOutline: '',
    protagonist: {
      name: '凌云霄',
      personality: '重情重义，略带顽劣',
      background: '江南武林世家子弟',
      growthArc: '从青涩少年逐渐成熟'
    },
    chapterPlans: monthsList.map(m => ({
      monthKey: m,
      chapterTitle: '江湖历练',
      plotSummary: '',
      keyEvents: [],
      characterDevelopment: '',
      momentIntegrations: []
    }))
  }
}

async function generateGuLongFullOutline(
  moments: MomentData[],
  startDate: string,
  endDate: string
): Promise<{
  title: string
  overallOutline: string
  protagonist: {
    name: string
    personality: string
    background: string
    growthArc: string
  }
  chapterPlans: Array<{
    monthKey: string
    chapterTitle: string
    plotSummary: string
    keyEvents: string[]
    characterDevelopment: string
    momentIntegrations: string[]
  }>
}> {
  const momentsText = prepareMomentsForLLM(moments)
  const monthGroups = groupMomentsByMonth(moments)
  const monthsList = [...monthGroups.keys()].sort()

  const systemPrompt = `你是古龙武侠小说的创作总设计师。你的任务是根据生活记录，设计一部古龙风格的武侠小说大纲。

【古龙风格核心】
1. 人物：孤独的浪子，有过去有秘密，朋友少但知己
2. 情节：悬疑开篇，意外转折，情理之中意料之外
3. 语言：短句多，留白多，有哲理，有酒有剑
4. 主题：人性、友情、寂寞、宿命

【核心原则】
1. 先有完整的故事架构，生活记录只是素材
2. 不要逐条罗列生活记录，要把它们变成情节中的事件
3. 人物要有神秘感和孤独感
4. 每章要有悬疑感和留白

【输出JSON结构】
{
  "title": "简短有力的标题，2-4字，如《路》《剑》《夜》",
  "overallOutline": "400字左右的故事大纲，古龙式的叙述，要有悬疑感",
  "protagonist": {
    "name": "简洁有力的名字，2-3字，如"李寻欢""傅红雪""楚留香"式的名字",
    "personality": "人物性格，带点孤独和神秘感",
    "background": "人物的神秘过去",
    "growthArc": "这段时间人物的变化"
  },
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM",
      "chapterTitle": "短而有味道的标题，2-4字，如"夜雨""疑云""老友"",
      "plotSummary": "这一章的情节，150字左右，古龙式叙述，要有悬疑",
      "keyEvents": ["3个关键事件"],
      "characterDevelopment": "这一章人物的变化",
      "momentIntegrations": ["3个生活记录的融入方式，如"加班到深夜→他在黑暗中坐了一夜，灯没灭""朋友聚会→有人来了，是老朋友"]
    }
  ]
}

【重要提醒】
- 月份列表：${monthsList.join(', ')}
- 每个月对应一章
- 重点是写小说，不是记录生活`

  const userPrompt = `请根据以下生活记录，设计一部古龙风格的武侠小说完整大纲：

时间跨度：${formatDate(startDate)} 至 ${formatDate(endDate)}
共${moments.length}条生活记录（作为创作素材）

生活记录素材：
${momentsText}

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
        title: parsed.title || '江湖路',
        overallOutline: parsed.overallOutline || '',
        protagonist: parsed.protagonist || {
          name: '叶孤鸿',
          personality: '沉默寡言，外冷内热',
          background: '来历不明的剑客',
          growthArc: '逐渐敞开心扉'
        },
        chapterPlans: parsed.chapterPlans || []
      }
    }
  } catch (e) {
    console.error('Failed to parse Gu Long outline:', e)
  }

  return {
    title: '江湖路',
    overallOutline: '',
    protagonist: {
      name: '叶孤鸿',
      personality: '沉默寡言，外冷内热',
      background: '来历不明的剑客',
      growthArc: '逐渐敞开心扉'
    },
    chapterPlans: monthsList.map(m => ({
      monthKey: m,
      chapterTitle: '路',
      plotSummary: '',
      keyEvents: [],
      characterDevelopment: '',
      momentIntegrations: []
    }))
  }
}

async function generateJinYongChapter(
  monthMoments: MomentData[],
  chapterPlan: {
    chapterTitle: string
    plotSummary: string
    keyEvents: string[]
    characterDevelopment: string
    momentIntegrations: string[]
  },
  fullOutline: string,
  protagonist: any,
  chapterIndex: number,
  totalChapters: number,
  previousChapterEnding: string
): Promise<string> {
  const momentsText = prepareMomentsForLLM(monthMoments)

  const systemPrompt = `你是金庸，正在写一部武侠小说。

【主角设定】
姓名：${protagonist.name}
性格：${protagonist.personality}
背景：${protagonist.background}
成长轨迹：${protagonist.growthArc}

【故事总纲】
${fullOutline || '一个少年在江湖中历练成长的故事。'}

【上一回结尾】
${previousChapterEnding || '故事刚开始。'}

【金庸风格写作要求】
1. 典雅大气，有底蕴，可适当融入诗词典故
2. 情节为先：先写好故事，再自然融入生活素材
3. 人物要鲜活，有对话有动作有心理
4. 场景描写要细腻，让人有画面感
5. 每段开头空两格，段落长短错落
6. 本回1200-1500字
7. 绝对不要出现"话说""且说""列位看官"等说书人口吻
8. 绝对不要逐条罗列日期和事件，要用情节串联

【本回创作指南】
回目：${chapterPlan.chapterTitle}
情节概要：${chapterPlan.plotSummary}
关键事件：${chapterPlan.keyEvents?.join('、') || ''}
人物成长：${chapterPlan.characterDevelopment}
生活素材融入参考：${chapterPlan.momentIntegrations?.join('；') || ''}

【重要】你是在写小说，不是在写日记！用小说的笔法，让读者看到画面，感受到人物的喜怒哀乐。`

  const userPrompt = `这是第${chapterIndex + 1}回，共${totalChapters}回。

请根据以上设定，写这一回的正文。

本月的生活记录素材（供参考融入，不是必须全用）：
${momentsText}

请写正文，金庸风格，1200-1500字。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.9,
    maxTokens: 3000
  })
}

async function generateGuLongChapter(
  monthMoments: MomentData[],
  chapterPlan: {
    chapterTitle: string
    plotSummary: string
    keyEvents: string[]
    characterDevelopment: string
    momentIntegrations: string[]
  },
  fullOutline: string,
  protagonist: any,
  chapterIndex: number,
  totalChapters: number,
  previousChapterEnding: string
): Promise<string> {
  const momentsText = prepareMomentsForLLM(monthMoments)

  const systemPrompt = `你是古龙，正在写一部武侠小说。

【主角设定】
姓名：${protagonist.name}
性格：${protagonist.personality}
背景：${protagonist.background}
成长轨迹：${protagonist.growthArc}

【故事总纲】
${fullOutline || '一个人，一把剑，走在路上。'}

【上一章结尾】
${previousChapterEnding || '故事刚开始。'}

【古龙风格写作要求】
1. 短句！短句！大量短句！独立成段！
2. 惜字如金，意在言外，大量留白
3. 有哲理，有思辨，有人性的洞察
4. 有酒，有剑，有朋友，有寂寞
5. 多换行，多留白，节奏感强
6. 本章800-1200字
7. 绝对不要逐条罗列日期和事件
8. 用意象说话，不用直接叙述

【本回创作指南】
章节名：${chapterPlan.chapterTitle}
情节概要：${chapterPlan.plotSummary}
关键事件：${chapterPlan.keyEvents?.join('、') || ''}
人物成长：${chapterPlan.characterDevelopment}
生活素材融入参考：${chapterPlan.momentIntegrations?.join('；') || ''}

【古龙式金句参考】
- 人在江湖，身不由己。
- 天下没有不散的宴席。
- 只有酒，才是最忠实的朋友。
- 有些事，你不去做，就永远不会知道结果。
- 孤独，本就是人生的一部分。
- 夜。很深的夜。
- 灯还亮着。
- 他还没有睡。`

  const userPrompt = `这是第${chapterIndex + 1}章，共${totalChapters}章。

请根据以上设定，写这一章的正文。

本月的生活记录素材（供参考融入，不是必须全用）：
${momentsText}

请写正文，古龙风格，800-1200字。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.9,
    maxTokens: 2500
  })
}

async function generateJinYongIntro(
  outline: string,
  protagonist: any,
  startDate: string,
  endDate: string,
  momentsCount: number
): Promise<string> {
  const systemPrompt = `你是金庸，为这部武侠小说写一篇序章/楔子。

【主角设定】
姓名：${protagonist.name}
性格：${protagonist.personality}
背景：${protagonist.background}

【故事大纲】
${outline}

【写作要求】
1. 金庸风格，典雅大气
2. 可以用诗词或典故开篇
3. 引入故事，设定基调，介绍主角初登场
4. 400-600字
5. 每段开头空两格
6. 不要用说书人口吻`

  const userPrompt = `故事时间：${formatDate(startDate)} 至 ${formatDate(endDate)}
共记录：${momentsCount}段江湖轶事

请为这部武侠小说写一篇序章，金庸风格，主角名叫${protagonist.name}。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 1500
  })
}

async function generateGuLongIntro(
  outline: string,
  protagonist: any,
  startDate: string,
  endDate: string,
  momentsCount: number
): Promise<string> {
  const systemPrompt = `你是古龙，为这部武侠小说写一篇开篇。

【主角设定】
姓名：${protagonist.name}
性格：${protagonist.personality}
背景：${protagonist.background}

【故事大纲】
${outline}

【写作要求】
1. 古龙风格
2. 短句，有悬疑感
3. 有哲理，引入人物
4. 200-400字
5. 多换行，多留白`

  const userPrompt = `故事时间：${formatDate(startDate)} 至 ${formatDate(endDate)}
共${momentsCount}天。

主角：${protagonist.name}

请为这部武侠小说写一篇开篇，古龙风格。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 1000
  })
}

async function generateJinYongOutro(
  outline: string,
  protagonist: any,
  momentsCount: number
): Promise<string> {
  const systemPrompt = `你是金庸，为这部武侠小说写一篇尾声。

【主角设定】
姓名：${protagonist.name}
成长轨迹：${protagonist.growthArc}

【故事大纲】
${outline}

【写作要求】
1. 金庸风格，余韵悠长
2. 可以用诗词收尾
3. 回顾这段经历，展望未来
4. 400-600字
5. 每段开头空两格
6. 要有"欲知后事如何，且听下回分解"的余味，但不要直接用这句话`

  const userPrompt = `故事共${momentsCount}段江湖经历。

主角：${protagonist.name}

请为这部武侠小说写一篇尾声，金庸风格。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 1500
  })
}

async function generateGuLongOutro(
  outline: string,
  protagonist: any,
  momentsCount: number
): Promise<string> {
  const systemPrompt = `你是古龙，为这部武侠小说写一篇结尾。

【主角设定】
姓名：${protagonist.name}
成长轨迹：${protagonist.growthArc}

【故事大纲】
${outline}

【写作要求】
1. 古龙风格
2. 有哲理，有余味
3. 短，有留白
4. 200-400字
5. 多换行`

  const userPrompt = `故事共${momentsCount}天。

主角：${protagonist.name}

请为这部武侠小说写一篇结尾，古龙风格。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 1000
  })
}

export async function generateWuxiaBiographyDeep(
  moments: MomentData[],
  style: WuxiaStyle = 'jinyong'
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

  console.log(`[LLM] Generating full outline for ${style} style...`)

  let outlineResult
  if (style === 'jinyong') {
    outlineResult = await generateJinYongFullOutline(moments, startDate, endDate)
  } else {
    outlineResult = await generateGuLongFullOutline(moments, startDate, endDate)
  }

  const { title, overallOutline, protagonist, chapterPlans } = outlineResult
  console.log(`[LLM] Outline generated, title: ${title}, protagonist: ${protagonist.name}`)

  const chapters: ChapterData[] = []

  const intro = style === 'jinyong'
    ? await generateJinYongIntro(overallOutline, protagonist, startDate, endDate, moments.length)
    : await generateGuLongIntro(overallOutline, protagonist, startDate, endDate, moments.length)

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

    let chapterContent
    if (style === 'jinyong') {
      chapterContent = await generateJinYongChapter(
        monthMoments,
        plan,
        overallOutline,
        protagonist,
        i,
        chapterPlans.length,
        previousChapterEnding
      )
    } else {
      chapterContent = await generateGuLongChapter(
        monthMoments,
        plan,
        overallOutline,
        protagonist,
        i,
        chapterPlans.length,
        previousChapterEnding
      )
    }

    previousChapterEnding = chapterContent.slice(-300)

    const chapterDate = monthMoments[0]?.happened_at || startDate
    const momentIds = monthMoments.map(m => m.id)
    const mediaIds = monthMoments.flatMap(m => m.media_ids || [])

    chapters.push({
      title: style === 'jinyong' ? `第${getChineseNum(i + 1)}回　${plan.chapterTitle}` : plan.chapterTitle,
      content: chapterContent,
      momentIds,
      mediaIds,
      date: chapterDate,
    })

    await new Promise(resolve => setTimeout(resolve, 800))
  }

  const outro = style === 'jinyong'
    ? await generateJinYongOutro(overallOutline, protagonist, moments.length)
    : await generateGuLongOutro(overallOutline, protagonist, moments.length)

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
