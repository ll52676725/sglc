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

function prepareMomentsForLLM(moments: MomentData[]): string {
  const sorted = [...moments].sort((a, b) => 
    new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
  )
  
  return sorted.map((m, idx) => {
    const mood = MOOD_LABELS[m.mood] || m.mood
    return `[记录${idx + 1}] 日期:${formatDate(m.happened_at)} | 地点:${m.location || '未记录'} | 心情:${mood} | 天气:${m.weather || '未记录'} | 媒体:${m.media_count}张
内容: ${m.content}`
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

async function generateJinYongOutline(
  moments: MomentData[],
  startDate: string,
  endDate: string
): Promise<{
    title: string
    outline: string
    chapterPlans: Array<{
      monthKey: string
      chapterTitle: string
      keyMoments: string[]
      plotPoint: string
    }>
  }> {
  const momentsText = prepareMomentsForLLM(moments)
  const monthGroups = groupMomentsByMonth(moments)
  const monthsList = [...monthGroups.keys()].sort()
  
  const systemPrompt = `你是一位精通金庸武侠小说风格的创作大师。你的任务是根据用户提供的一系列生活记录，创作一部精彩的武侠小说大纲。

金庸小说特点：
1. 章回体结构，每回有对仗工整的回目名
2. 人物有成长弧光，从青涩到成熟
3. 情节有伏笔、有呼应、有起伏
4. 融入诗词歌赋点缀其间
5. 侠义精神贯穿始终
6. 场景描写细腻，情感真挚动人

请将这些生活记录转化为武侠情节：
- 工作/加班 → 修炼武功/处理门派事务/闭关练功
- 吃饭/美食 → 江湖宴席/客栈打尖/英雄聚饮
- 散步/逛公园/旅行 → 游走江湖/游历名山大川/寻访秘境
- 朋友聚会 → 英雄聚会/把酒言欢/知音相逢
- 家人团聚 → 师门团聚/共享天伦/归家探亲
- 生病/休息 → 调息养伤/真气调理/闭关休养
- 运动健身 → 打磨筋骨/修炼外功/强身健体
- 读书学习 → 研读秘籍/参悟武学/博览群书
- 生日/纪念日 → 寿诞之喜/江湖贺寿/重要里程碑
- 心情好 → 神清气爽/意气风发/心旷神怡
- 心情不好 → 黯然神伤/心绪不宁/愁肠百结

请以JSON格式返回结果：
{
  "title": "小说总标题，如《江湖行》",
  "outline": "300字左右的故事总纲，讲述主角这段时间的江湖历程主线",
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM格式",
      "chapterTitle": "这一回的回目名，对仗工整，4-8字",
      "keyMoments": ["引用的2-3个关键记录内容摘要"],
      "plotPoint": "这一回的核心情节发展，比如"主角遇到什么人、经历什么事、有什么成长"
    }
  ]
}

注意：
- 月份列表：${monthsList.join(', ')}
- 每个月对应一回
- 情节要有起伏，不能平铺直叙
- 人物要有成长线
- 把生活记录巧妙融入武侠情节中，不要生硬罗列`

  const userPrompt = `以下是这段时间的生活记录，请创作金庸风格的武侠小说大纲：

时间范围：${formatDate(startDate)} 至 ${formatDate(endDate)}
共${moments.length}条记录

生活记录：
${momentsText}`

  const response = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 3000
  })

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        title: parsed.title || `江湖奇侠传`,
        outline: parsed.outline || '',
        chapterPlans: parsed.chapterPlans || []
      }
    }
  } catch (e) {
    console.error('Failed to parse outline:', e)
  }

  return {
    title: '江湖奇侠传',
    outline: '',
    chapterPlans: monthsList.map(m => ({
      monthKey: m,
      chapterTitle: '江湖历练',
      keyMoments: [],
      plotPoint: '主角在江湖中历练'
    }))
  }
}

async function generateGuLongOutline(
  moments: MomentData[],
  startDate: string,
  endDate: string
): Promise<{
    title: string
    outline: string
    chapterPlans: Array<{
      monthKey: string
      chapterTitle: string
      keyMoments: string[]
      plotPoint: string
    }>
  }> {
  const momentsText = prepareMomentsForLLM(moments)
  const monthGroups = groupMomentsByMonth(moments)
  const monthsList = [...monthGroups.keys()].sort()
  
  const systemPrompt = `你是一位精通古龙武侠小说风格的创作大师。你的任务是根据用户提供的一系列生活记录，创作一部精彩的武侠小说大纲。

古龙小说特点：
1. 短句、断句，节奏感强
2. 悬疑开篇，哲理思辨
3. 浪子情怀，孤独感
4. 意外转折，情理之中意料之外
5. 惜字如金，意在言外
6. 酒、剑、朋友、敌人是永恒主题

请将这些生活记录转化为武侠情节：
- 工作/加班 → 接了一桩生意/做一件不得不做的事
- 吃饭/美食 → 喝酒/小酒馆/独酌
- 散步/逛公园/旅行 → 走路/远行/在路上
- 朋友聚会 → 朋友/重逢/有人的人
- 家人团聚 → 回家/有人等他/温暖的地方
- 生病/休息 → 受伤/病了/总要休息的
- 运动健身 → 练剑/活动筋骨
- 读书学习 → 想/思考/一个人
- 生日/纪念日 → 特别的日子/这一天
- 心情好 → 笑了/他笑了
- 心情不好 → 沉默/他没说话

请以JSON格式返回结果：
{
  "title": "小说总标题，古龙风格，如《路》《人在江湖》",
  "outline": "200字左右的故事总纲，古龙式的叙述",
  "chapterPlans": [
    {
      "monthKey": "YYYY-MM格式",
      "chapterTitle": "这一章的标题，短而有味道，2-6字",
      "keyMoments": ["引用的2-3个关键记录内容摘要"],
      "plotPoint": "这一章的核心，古龙式的情节"
    }
  ]
}

注意：
- 月份列表：${monthsList.join(', ')}
- 每个月对应一章
- 要有悬疑感
- 人物要有孤独感和哲理性
- 把生活记录融入情节中，不要生硬`

  const userPrompt = `以下是这段时间的生活记录，请创作古龙风格的武侠小说大纲：

时间范围：${formatDate(startDate)} 至 ${formatDate(endDate)}
共${moments.length}条记录

生活记录：
${momentsText}`

  const response = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 3000
  })

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        title: parsed.title || '江湖路',
        outline: parsed.outline || '',
        chapterPlans: parsed.chapterPlans || []
      }
    }
  } catch (e) {
    console.error('Failed to parse outline:', e)
  }

  return {
    title: '江湖路',
    outline: '',
    chapterPlans: monthsList.map(m => ({
      monthKey: m,
      chapterTitle: '路',
      keyMoments: [],
      plotPoint: '他在走路'
    }))
  }
}

async function generateJinYongChapter(
  monthMoments: MomentData[],
  chapterPlan: { chapterTitle: string; keyMoments: string[]; plotPoint: string },
  overallOutline: string,
  chapterIndex: number,
  totalChapters: number
): Promise<string> {
  const momentsText = prepareMomentsForLLM(monthMoments)
  const monthName = `${new Date(monthMoments[0].happened_at).getMonth() + 1}月`

  const systemPrompt = `你是金庸武侠小说创作大师，正在写一部金庸风格的武侠小说。

写作要求：
1. 用中文写作，每段开头空两格
2. 金庸文风：典雅、大气、有底蕴
3. 融入诗词、典故、武学描写
4. 人物要成长、情节要起伏
5. 把生活记录巧妙融入武侠情节中：
   - 不要逐条罗列记录
   - 用隐喻、事件触发、场景描写的方式融入
   - 比如"加班到深夜"可以写成"这一夜，他在书房中坐到三更，案头的油灯换了三次灯花，丹田中的真气却越来越纯"
6. 每回800-1200字左右
7. 要有场景描写、心理描写、动作描写
8. 结尾可以留一点悬念或引出下一回

每回的结构：
- 开头：过渡，承接上回，开启本回
- 发展：2-3个主要情节段
- 结尾：小结，人物有所感悟或成长
- 不要用"话说""且说""话休絮烦"等说书人口吻`

  const userPrompt = `这是第${chapterIndex + 1}回，共${totalChapters}回。

回目名：${chapterPlan.chapterTitle}

本回核心情节：${chapterPlan.plotPoint}

本回要融入的关键记录：
${chapterPlan.keyMoments.map(k => `- ${k}`).join('\n')}

故事总纲：${overallOutline || '主角在江湖中历练成长的故事'}

本月的所有生活记录（供参考，不必全部使用，选择关键的融入）：
${momentsText}

请写这一回的正文内容，金庸风格，800-1200字。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 2000
  })
}

async function generateGuLongChapter(
  monthMoments: MomentData[],
  chapterPlan: { chapterTitle: string; keyMoments: string[]; plotPoint: string },
  overallOutline: string,
  chapterIndex: number,
  totalChapters: number
): Promise<string> {
  const momentsText = prepareMomentsForLLM(monthMoments)

  const systemPrompt = `你是古龙武侠小说创作大师，正在写一部古龙风格的武侠小说。

写作要求：
1. 古龙文风：
- 大量短句，独立成段
- 惜字如金
- 有哲理，有思辨
- 浪子情怀，孤独感
2. 把生活记录巧妙融入情节中：
- 不要逐条罗列
- 用意象、隐喻的方式表达
- 比如"加班到深夜"可以写成"夜。
很深的夜。
灯还亮着。
他还没有睡。
有些事，总是要做完的。"
3. 每章600-1000字左右
4. 要有酒、有剑、有朋友、有孤独
5. 多换行，多留白
6. 每句可以有一句有味道的话

古龙式哲理句：
- "人在江湖，身不由己。
- 天下没有不散的宴席。
- 只有酒，才是最忠实的朋友。
- 有些事，你不去做，就永远不会知道结果。
- 孤独，本就是人生的一部分。`

  const userPrompt = `这是第${chapterIndex + 1}章，共${totalChapters}章。

章节名：${chapterPlan.chapterTitle}

本章核心：${chapterPlan.plotPoint}

本章要融入的关键记录：
${chapterPlan.keyMoments.map(k => `- ${k}`).join('\n')}

故事总纲：${overallOutline || '一个人，一条路，走下去。'}

本月的所有生活记录（供参考，选择关键的融入）：
${momentsText}

请写这一章的正文，古龙风格，600-1000字。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.85,
    maxTokens: 2000
  })
}

async function generateJinYongIntro(
  outline: string,
  startDate: string,
  endDate: string,
  momentsCount: number
): Promise<string> {
  const systemPrompt = `你是金庸武侠小说的作者，为这部小说写一篇序章/楔子。

要求：
1. 金庸风格，典雅大气
2. 可以有诗词开头
3. 古诗或
4. 引入故事，设定基调
5. 300-500字
6. 每段开头空两格`

  const userPrompt = `故事时间：${formatDate(startDate)} 至 ${formatDate(endDate)}
共记录：${momentsCount}段江湖轶事

故事大纲：${outline}

请为这部武侠小说写一篇序章，金庸风格。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.8,
    maxTokens: 1000
  })
}

async function generateGuLongIntro(
  outline: string,
  startDate: string,
  endDate: string,
  momentsCount: number
): Promise<string> {
  const systemPrompt = `你是古龙武侠小说的作者，为这部小说写一篇开篇。

要求：
1. 古龙风格
2. 短句，有悬疑感
3. 有哲理
4. 短，有味道
5. 200-400字
6. 多换行`

  const userPrompt = `故事时间：${formatDate(startDate)} 至 ${formatDate(endDate)}
共${momentsCount}天。

故事大纲：${outline}

请为这部武侠小说写一篇开篇，古龙风格。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.8,
    maxTokens: 800
  })
}

async function generateJinYongOutro(
  outline: string,
  momentsCount: number
): Promise<string> {
  const systemPrompt = `你是金庸武侠小说的作者，为这部小说写一篇尾声。

要求：
1. 金庸风格，余韵悠长
2. 有诗词收尾
3. 回顾这段经历，展望未来
4. 300-500字
5. 有"欲知后事如何，且听下回分解"或类似收尾
6. 每段开头空两格`

  const userPrompt = `故事共${momentsCount}段江湖经历。

故事大纲：${outline}

请为这部武侠小说写一篇尾声，金庸风格。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.8,
    maxTokens: 1000
  })
}

async function generateGuLongOutro(
  outline: string,
  momentsCount: number
): Promise<string> {
  const systemPrompt = `你是古龙武侠小说的作者，为这部小说写一篇结尾。

要求：
1. 古龙风格
2. 有哲理，有余味
3. 短，有留白
4. 200-400字
5. 多换行`

  const userPrompt = `故事共${momentsCount}天。

故事大纲：${outline}

请为这部武侠小说写一篇结尾，古龙风格。`

  return await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.8,
    maxTokens: 800
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

  console.log(`[LLM] Generating outline for ${style} style...`)
  
  let outlineResult
  if (style === 'jinyong') {
    outlineResult = await generateJinYongOutline(moments, startDate, endDate)
  } else {
    outlineResult = await generateGuLongOutline(moments, startDate, endDate)
  }

  const { title, outline, chapterPlans } = outlineResult
  console.log(`[LLM] Outline generated, title:`, title)

  const chapters: ChapterData[] = []

  const intro = style === 'jinyong'
    ? await generateJinYongIntro(outline, startDate, endDate, moments.length)
    : await generateGuLongIntro(outline, startDate, endDate, moments.length)

  chapters.push({
    title: '序章',
    content: intro,
    momentIds: [],
    mediaIds: [],
    date: startDate,
  })

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
        outline,
        i,
        chapterPlans.length
      )
    } else {
      chapterContent = await generateGuLongChapter(
        monthMoments,
        plan,
        outline,
        i,
        chapterPlans.length
      )
    }

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

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const outro = style === 'jinyong'
    ? await generateJinYongOutro(outline, moments.length)
    : await generateGuLongOutro(outline, moments.length)

  chapters.push({
    title: '尾声',
    content: outro,
    momentIds: [],
    mediaIds: [],
    date: endDate,
  })

  const fullTitle = style === 'jinyong'
    ? `《${title}·${formatDateRange(startDate, endDate)}》`
    : `《${title}·${formatDateRange(startDate, endDate)}》`

  console.log('[LLM] Biography generation complete!')
  return { title: fullTitle, chapters }
}

function getChineseNum(num: number): string {
  const chars = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  return chars[num - 1] || String(num)
}
