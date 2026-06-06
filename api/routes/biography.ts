import { Router, type Request, type Response } from 'express'
import { v4 } from 'uuid'
import { getDb, all, get, run } from '../db.js'

const router = Router()

const MOOD_LABELS: Record<string, string> = {
  happy: '开心', excited: '兴奋', peaceful: '平静', grateful: '感恩',
  love: '幸福', nostalgic: '怀念', sad: '难过', anxious: '焦虑',
  angry: '生气', tired: '疲惫', sick: '不适', thinking: '沉思',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getFullYear()}年${s.getMonth() + 1}月-${e.getMonth() + 1}月`
  }
  return `${s.getFullYear()}年${s.getMonth() + 1}月-${e.getFullYear()}年${e.getMonth() + 1}月`
}

function getMomentSummary(m: any): string {
  const parts = []
  if (m.mood) parts.push(`心情${MOOD_LABELS[m.mood] || m.mood}`)
  if (m.weather) parts.push(`天气${m.weather}`)
  if (m.location) parts.push(`于${m.location}`)
  return parts.length > 0 ? `（${parts.join('，')}）` : ''
}

interface StoryTemplate {
  title: (startDate: string, endDate: string) => string
  intro: (moments: any[], startDate: string, endDate: string) => string
  chapter: (month: string, moments: any[]) => { title: string; content: string }
  outro: (moments: any[]) => string
}

const STORY_TEMPLATES: Record<string, StoryTemplate> = {
  wuxia: {
    title: (s, e) => `《江湖奇侠传·${formatDateRange(s, e)}》`,
    intro: (moments, s, e) => {
      return `　　古语有云：「天下风云出我辈，一入江湖岁月催。」自${formatDate(s)}至${formatDate(e)}，这${moments.length}段江湖轶事，${moments.reduce((sum, m) => sum + (m.media_count || 0), 0)}件武林秘闻，今日便由在下为诸位看官细细道来。

　　话说这位少侠，在这段时日里，行走江湖，历练红尘，经历了诸般奇遇。有春风得意之时，亦有黯然销魂之日，但正是这些点点滴滴，才铸就了这一段属于他的江湖传奇。

　　且听我慢慢道来——`
    },
    chapter: (month, moments) => {
      const sorted = [...moments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
      const mainMoment = sorted[0]
      const chapterNum = getWuxiaChapterNum(month)
      const chapterTitle = getWuxiaChapterTitle(month, mainMoment)
      
      let story = `　　光阴似箭，日月如梭。转眼间便到了${month}。

`
      if (sorted.length === 1) {
        const m = sorted[0]
        story += `　　这月间发生了一桩大事。${formatWuxiaDate(m.happened_at)}，${getWuxiaMood(m.mood)}，少侠${getWuxiaLocation(m.location)}，${getWuxiaContent(m.content)}。

　　此事虽小，却也见得少侠的性子。`
      } else {
        story += `　　这${month}，端的是热闹非凡，大大小小发生了${sorted.length}桩事。

`
        sorted.forEach((m, idx) => {
          const wuxiaDate = formatWuxiaDate(m.happened_at)
          const wuxiaMood = getWuxiaMood(m.mood)
          const wuxiaLoc = getWuxiaLocation(m.location)
          const wuxiaContent = getWuxiaContent(m.content)
          
          if (idx === 0) {
            story += `　　先是${wuxiaDate}，${wuxiaMood}，少侠${wuxiaLoc}，${wuxiaContent}。

`
          } else if (idx === sorted.length - 1) {
            story += `　　末了${wuxiaDate}，又${wuxiaMood}，少侠${wuxiaLoc}，${wuxiaContent}。

`
          } else {
            story += `　　随后${wuxiaDate}，${wuxiaMood}，少侠${wuxiaLoc}，${wuxiaContent}。

`
          }
        })
        story += `　　这${month}的故事，当真称得上是精彩纷呈，高潮迭起。`
      }
      
      return {
        title: `第${chapterNum}回　${chapterTitle}`,
        content: story
      }
    },
    outro: (moments) => {
      const goodDays = moments.filter(m => ['happy', 'excited', 'love', 'grateful'].includes(m.mood)).length
      return `　　这${moments.length}段江湖往事，到此便告一段落了。其中有${goodDays}日是快活的，余下的日子也各有滋味。

　　江湖路远，山高水长。少侠的故事，还在继续……

　　正是：
　　一壶浊酒喜相逢，
　　古今多少事，
　　都付笑谈中。`
    }
  },

  romance: {
    title: (s, e) => `《爱的时光·${formatDateRange(s, e)}》`,
    intro: (moments, s, e) => {
      const loveMoments = moments.filter(m => m.mood === 'love').length
      return `　　遇见你，是我最美丽的意外。

　　从${formatDate(s)}到${formatDate(e)}，我们一起走过了${moments.length}个日子。这其中，有${loveMoments}个特别的时刻，让我更加确信——你就是我一直在等待的那个人。

　　每一个与你相关的瞬间，都像是一颗闪耀的星星，串联起了整个银河。让我们一起，重温这段温柔的时光……`
    },
    chapter: (month, moments) => {
      const sorted = [...moments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
      const loveCount = sorted.filter(m => m.mood === 'love').length
      
      let story = `　　${month}，是一个${loveCount > 0 ? '充满爱意' : '温暖'}的月份。

`
      if (sorted.length === 1) {
        const m = sorted[0]
        const mood = getRomanceMood(m.mood)
        const loc = m.location ? `在${m.location}` : ''
        story += `　　${formatDate(m.happened_at)}，${mood}的一天。我们${loc}，${m.content}

　　那天的画面，至今仍清晰地印在我的脑海里。`
      } else {
        sorted.forEach((m, idx) => {
          const mood = getRomanceMood(m.mood)
          const loc = m.location ? `在${m.location}` : ''
          const date = formatDate(m.happened_at)
          
          if (idx === 0) {
            story += `　　月初的${date}，${mood}，我们${loc}，${m.content}

`
          } else if (idx === sorted.length - 1) {
            story += `　　月末的${date}，${mood}的我们${loc}，${m.content}

`
          } else {
            story += `　　月中的${date}，${mood}，我们${loc}，${m.content}

`
          }
        })
        story += `　　这个月的每一个瞬间，都值得被珍藏。`
      }
      
      return {
        title: `💕 ${month} · ${loveCount > 0 ? '心动时分' : '温暖时光'}`,
        content: story
      }
    },
    outro: (moments) => {
      const totalDays = moments.length
      return `　　${totalDays}天的时光，说长不长，说短不短。但每一天，因为有你，都变得特别有意义。

　　谢谢你，陪我走过这段路。未来的路还很长，让我们继续，一起走下去吧。

　　我爱你，不止今天，而是每一天。 💖`
    }
  },

  modern: {
    title: (s, e) => `《城市漂流记·${formatDateRange(s, e)}》`,
    intro: (moments, s, e) => {
      const workCount = moments.filter(m => m.content.includes('工作') || m.content.includes('加班')).length
      const playCount = moments.filter(m => m.content.includes('公园') || m.content.includes('玩') || m.mood === 'excited').length
      
      return `　　在这座钢筋水泥的森林里，我们都是追光的人。

　　从${formatDate(s)}到${formatDate(e)}，整整${moments.length}个日夜。有${workCount}天在为梦想打拼，有${playCount}天在尽情享受生活。这就是都市人的日常——在忙碌与悠闲之间寻找平衡。

　　让我们翻开这段城市生活的记录，看看那些平凡却闪光的日子……`
    },
    chapter: (month, moments) => {
      const sorted = [...moments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
      const workDays = sorted.filter(m => m.location?.includes('公司') || m.content.includes('工作')).length
      const weekend = sorted.length - workDays
      
      let story = `　　${month}，和这座城市的每个月一样，忙碌而充实。

`
      if (sorted.length <= 2) {
        sorted.forEach(m => {
          const date = formatDate(m.happened_at)
          const loc = m.location ? `${m.location}` : ''
          const mood = MOOD_LABELS[m.mood] || ''
          story += `　　${date}，${loc ? '在' + loc : ''}${mood ? '，' + mood : ''}。${m.content}

`
        })
      } else {
        story += `　　这个月共记录了${sorted.length}件事，其中${workDays || '没'}个工作日，${weekend}个休息日。

`
        const workM = sorted.find(m => m.location?.includes('公司') || m.content.includes('工作') || m.content.includes('加班'))
        if (workM) {
          story += `　　工作日的${formatDate(workM.happened_at)}，在${workM.location || '公司'}，${workM.content}

`
        }
        
        const funM = sorted.find(m => m.mood === 'happy' || m.mood === 'excited')
        if (funM && funM !== workM) {
          story += `　　最开心的是${formatDate(funM.happened_at)}，${funM.location ? '在' + funM.location : ''}，${funM.content}

`
        }
        
        const otherM = sorted.find(m => m !== workM && m !== funM)
        if (otherM) {
          story += `　　还记得${formatDate(otherM.happened_at)}那天，${MOOD_LABELS[otherM.mood] || ''}，${otherM.content}

`
        }
        
        story += `　　这就是${month}的生活，平凡中带着一丝精彩。`
      }
      
      return {
        title: `🏙️ ${month} · 城市脉搏`,
        content: story
      }
    },
    outro: (moments) => {
      return `　　${moments.length}天的城市生活，就这样画上了句点。

　　或许有些日子过得平淡，或许有些日子波澜壮阔，但无论如何，这都是我们真实的生活。在这座城市里，我们继续前行，继续寻找属于自己的光。

　　明天，又是新的一天。加油，打工人！ ✨`
    }
  },

  fantasy: {
    title: (s, e) => `《魔法编年史·${formatDateRange(s, e)}》`,
    intro: (moments, s, e) => {
      return `　　欢迎来到艾泽拉斯大陆，一位年轻的魔法师正在书写他的冒险日志。

　　从魔法历${formatDate(s)}到${formatDate(e)}，这位魔法师共记录了${moments.length}次魔法事件，收集了${moments.reduce((sum, m) => sum + (m.media_count || 0), 0)}件魔法物品。

　　让我们翻开这本充满魔力的典籍，看看这位魔法师在这段时间里经历了怎样的奇幻冒险……`
    },
    chapter: (month, moments) => {
      const sorted = [...moments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
      const magicMonth = getMagicMonth(month)
      
      let story = `　　${magicMonth}，魔力潮汐${sorted.length > 3 ? '异常活跃' : '平稳流动'}的月份。

`
      sorted.forEach((m, idx) => {
        const magicDate = getMagicDate(m.happened_at)
        const magicMood = getMagicMood(m.mood)
        const magicLoc = getMagicLocation(m.location)
        const magicContent = getMagicContent(m.content)
        
        if (idx === 0) {
          story += `　　${magicDate}，${magicMood}，魔法师${magicLoc}，${magicContent}

`
        } else {
          story += `　　${magicDate}，${magicMood}，魔法师${magicLoc}，${magicContent}

`
        }
      })
      
      story += `　　月末，魔法师的魔力等级提升了${Math.ceil(sorted.length / 3)}级，距离成为大魔导师又近了一步。`
      
      return {
        title: `✨ ${magicMonth} · 魔力涌动`,
        content: story
      }
    },
    outro: (moments) => {
      return `　　这本魔法日志记录了${moments.length}次冒险，每一次都是成长的印记。

　　从初出茅庐的魔法学徒，到日渐成熟的施法者，这段旅程充满了未知与惊喜。

　　魔法的世界永无止境，下一段冒险，即将开始……

　　——愿奥术之力与你同在 🔮`
    }
  },

  memoir: {
    title: (s, e) => `《岁月留声·${formatDateRange(s, e)}回忆录》`,
    intro: (moments, s, e) => {
      return `　　轻轻翻开这本回忆录，思绪便飘回到了${formatDate(s)}……

　　从那天到${formatDate(e)}，${moments.length}个日日夜夜，如同电影般在脑海中回放。有欢笑，有泪水，有相聚，有离别——这就是生活，这就是我们的故事。

　　有些记忆已经模糊，但有些画面，却永远清晰如昨。让我们一起，重温这段时光……`
    },
    chapter: (month, moments) => {
      const sorted = [...moments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
      
      let story = `　　${month}，现在回想起来，真是${sorted.length > 2 ? '充实' : '平静'}的一个月。

`
      sorted.forEach((m, idx) => {
        const date = formatDate(m.happened_at)
        const loc = m.location ? `在${m.location}` : ''
        const mood = MOOD_LABELS[m.mood] ? `那一天心情${MOOD_LABELS[m.mood]}，` : ''
        
        story += `　　记得${date}，${mood}${loc}。${m.content}

　　现在想起，还${m.mood === 'happy' || m.mood === 'love' ? '忍不住会心一笑' : m.mood === 'sad' ? '有些唏嘘' : '觉得很有意思'}。

`
      })
      
      story += `　　${month}的故事，就讲到这里吧。`
      
      return {
        title: `📖 ${month} · 时光印记`,
        content: story
      }
    },
    outro: (moments) => {
      return `　　${moments.length}段记忆，就这样串联成了一整本回忆录。

　　感谢这些日子，感谢这些经历，感谢出现在生命中的每一个人。

　　岁月不居，时节如流。但有些东西，永远不会改变——那就是，我们曾经一起，走过这段路。

　　愿岁月温柔，愿记忆永存。`
    }
  },

  poetic: {
    title: (s, e) => `《光阴诗卷·${formatDateRange(s, e)}》`,
    intro: (moments, s, e) => {
      return `　　岁月是一首诗，每一天都是其中的一行。

　　从${formatDate(s)}到${formatDate(e)}，${moments.length}行诗句，编织成了这卷光阴的长歌。

　　让我们轻轻吟诵，感受字里行间的温度与力量……`
    },
    chapter: (month, moments) => {
      const sorted = [...moments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
      const season = getSeason(month)
      
      let story = `　　${month}，${season}的脚步近了。

`
      sorted.forEach(m => {
        const date = formatDate(m.happened_at)
        const content = m.content.length > 15 ? m.content.slice(0, 15) + '……' : m.content
        story += `　　${date}
　　　　${content}
　　　　——${MOOD_LABELS[m.mood] || '时光静默'}

`
      })
      
      story += `　　日子如诗，岁月如歌。`
      
      return {
        title: `🌸 ${month} · 季节的低语`,
        content: story
      }
    },
    outro: (moments) => {
      return `　　${moments.length}行诗，写不尽人间烟火。

　　但每一个字，都是真心。

　　诗不尽，意无穷。
　　我们，下期再会。`
    }
  },

  formal: {
    title: (s, e) => `个人年鉴·${formatDateRange(s, e)}`,
    intro: (moments, s, e) => {
      return `　　本年鉴记录了自${formatDate(s)}至${formatDate(e)}期间的${moments.length}项重要事件，及相关媒体资料${moments.reduce((sum, m) => sum + (m.media_count || 0), 0)}份。

　　本报告旨在全面、客观地呈现这一时期内的重要活动与成果，为回顾与展望提供参考依据。`
    },
    chapter: (month, moments) => {
      const sorted = [...moments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
      
      let content = `　　一、本月概述

　　${month}共记录重要事件${sorted.length}项，涵盖工作、生活、娱乐等多个领域。

　　二、重要事件详情

`
      sorted.forEach((m, idx) => {
        content += `　　${idx + 1}. ${formatDate(m.happened_at)}事件
　　　　地点：${m.location || '未记录'}
　　　　状态：${MOOD_LABELS[m.mood] || '正常'}
　　　　内容摘要：${m.content}

`
      })
      
      content += `　　三、本月小结

　　本月各项活动顺利开展，整体态势良好。`
      
      return {
        title: `${month} 大事记`,
        content
      }
    },
    outro: (moments) => {
      return `　　综上所述，本报告期内共发生各类事件${moments.length}起，整体趋势积极向好。

　　展望未来，应继续保持良好态势，争取在各方面取得更大进步。

　　—— 报告完 ——`
    }
  },

  casual: {
    title: (s, e) => `我的小日子 ${formatDateRange(s, e)}`,
    intro: (moments, s, e) => {
      return `　　嗨～这段时间写了${moments.length}条流水账，拍了一些照片。

　　随便看看吧，反正就是普普通通的日常 👀`
    },
    chapter: (month, moments) => {
      const sorted = [...moments].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
      
      let content = `　　${month}嘛，大概是这样的：

`
      sorted.forEach(m => {
        const date = formatDate(m.happened_at)
        const mood = MOOD_EMOJIS[m.mood] || ''
        content += `　　${date} ${mood} ${m.content}

`
      })
      
      content += `　　嗯...大概就是这样啦～`
      
      return {
        title: `${month}的碎碎念`,
        content
      }
    },
    outro: (moments) => {
      return `　　${moments.length}天，就这么过去了。

　　好像没做什么特别的，但好像又做了很多。

　　害，不管了，开心最重要！✌️

　　下次再写！`
    }
  },
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', excited: '🤩', peaceful: '😌', grateful: '🙏',
  love: '🥰', nostalgic: '🥹', sad: '😢', anxious: '😰',
  angry: '😤', tired: '😩', sick: '🤒', thinking: '🤔',
}

function getWuxiaMood(mood: string): string {
  const map: Record<string, string> = {
    happy: '少侠心中大喜，只觉神清气爽',
    excited: '不由得豪情万丈，意气风发',
    peaceful: '但觉心境澄明，万念俱寂',
    grateful: '连忙抱拳拱手，连声道谢',
    love: '心中柔情蜜意，难以自已',
    nostalgic: '抚今追昔，不禁感慨万千',
    sad: '只觉黯然神伤，泫然欲泣',
    anxious: '心中焦急万分，坐立不安',
    angry: '不禁勃然大怒，怒火中烧',
    tired: '只觉身心俱疲，体力不支',
    sick: '竟是偶感风寒，身体微恙',
    thinking: '沉吟片刻，若有所思',
  }
  return map[mood] || '忽有所感'
}

function getWuxiaLocation(loc: string): string {
  if (!loc) return '行走江湖'
  if (loc.includes('公园') || loc.includes('山')) return `于${loc}游赏`
  if (loc.includes('公司') || loc.includes('工作')) return `在${loc}处理俗务`
  if (loc.includes('家')) return `于${loc}中休憩`
  return `途经${loc}`
}

function getWuxiaContent(content: string): string {
  if (content.includes('加班') || content.includes('工作')) {
    return '处理了一桩江湖俗务'
  }
  if (content.includes('吃') || content.includes('餐') || content.includes('晚餐')) {
    return '享用了一桌美酒佳肴'
  }
  if (content.includes('散步') || content.includes('走') || content.includes('逛')) {
    return '四下漫步，观赏沿途风景'
  }
  if (content.includes('朋友') || content.includes('聚')) {
    return '与几位江湖好友把酒言欢'
  }
  if (content.includes('家') || content.includes('家人')) {
    return '与家人共享天伦之乐'
  }
  return content.length > 20 ? content.slice(0, 20) + '……' : content
}

function formatWuxiaDate(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']
  return `${d.getMonth() + 1}月${days[d.getDate() - 1] || d.getDate() + '日'}`
}

function getWuxiaChapterNum(month: string): string {
  const match = month.match(/(\d{1,2})月/)
  const num = match ? parseInt(match[1]) : 1
  const chars = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  return chars[num - 1] || chars[0]
}

function getWuxiaChapterTitle(month: string, moment: any): string {
  const defaultTitles = ['风雪惊变', '江南七怪', '大漠风沙', '黑风双煞',
    '神龙摆尾', '桃花岛主', '比武招亲', '各显神通',
    '九阴真经', '华山论剑', '烟雨大战', '华山之巅']
  const match = month.match(/(\d{1,2})月/)
  const num = match ? parseInt(match[1]) : 1
  return defaultTitles[(num - 1) % defaultTitles.length]
}

function getRomanceMood(mood: string): string {
  const map: Record<string, string> = {
    happy: '阳光明媚',
    excited: '心跳加速',
    peaceful: '岁月静好',
    grateful: '满心感激',
    love: '爱意满满',
    nostalgic: '想起了你',
    sad: '有些想你',
    anxious: '想见你',
  }
  return map[mood] || '平淡的一天'
}

function getMagicMood(mood: string): string {
  const map: Record<string, string> = {
    happy: '【光明魔法·愉悦术】发动成功',
    excited: '魔力充盈，周身法力激荡',
    peaceful: '进入深度冥想状态',
    grateful: '施放【祝福术】，愿好运常伴',
    love: '【魅惑术】效果拔群',
    nostalgic: '施放【时光回溯】，追忆往昔',
    sad: '【寒冰诅咒】笼罩全身',
    anxious: '【混乱魔法】影响心智',
    angry: '【烈焰爆发】差点失控',
    tired: '魔力枯竭，需要恢复',
    sick: '【中毒状态】，需尽快解毒',
    thinking: '【智慧之眼】洞察一切',
  }
  return map[mood] || '检测到魔法波动'
}

function getMagicLocation(loc: string): string {
  if (!loc) return '在魔法塔中冥想'
  if (loc.includes('公园') || loc.includes('山')) return `探索${loc}秘境`
  if (loc.includes('公司') || loc.includes('工作')) return `在${loc}炼金工坊`
  if (loc.includes('家')) return `在${loc}魔法小屋`
  return `传送至${loc}`
}

function getMagicContent(content: string): string {
  if (content.includes('加班') || content.includes('工作')) {
    return '炼制了一炉魔法药剂'
  }
  if (content.includes('吃') || content.includes('餐')) {
    return '品尝了精灵族的美食'
  }
  return content.length > 15 ? content.slice(0, 15) + '……' : content
}

function getMagicMonth(month: string): string {
  const moons = ['银月', '血月', '蓝月', '金月', '紫月', '翠月',
    '橙月', '粉月', '青月', '白月', '黑月', '彩虹月']
  const match = month.match(/(\d{1,2})月/)
  const num = match ? parseInt(match[1]) : 1
  return moons[(num - 1) % moons.length]
}

function getMagicDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `星历第${d.getDate()}日`
}

function getSeason(month: string): string {
  const num = parseInt(month)
  if (num >= 3 && num <= 5) return '春'
  if (num >= 6 && num <= 8) return '夏'
  if (num >= 9 && num <= 11) return '秋'
  return '冬'
}

function groupMomentsByMonth(moments: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>()
  for (const m of moments) {
    const d = new Date(m.happened_at)
    const key = `${d.getMonth() + 1}月`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }
  return groups
}

function generateBiographyFromMoments(
  moments: any[],
  style: string,
): { title: string; chapters: Array<{ title: string; content: string; momentIds: string[]; mediaIds: string[]; date: string }> } {
  const template = STORY_TEMPLATES[style] || STORY_TEMPLATES.casual
  
  const sortedMoments = [...moments].sort((a, b) => 
    new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
  )
  
  const startDate = sortedMoments[0]?.happened_at || new Date().toISOString()
  const endDate = sortedMoments[sortedMoments.length - 1]?.happened_at || new Date().toISOString()
  
  const title = template.title(startDate, endDate)
  const intro = template.intro(sortedMoments, startDate, endDate)
  const outro = template.outro(sortedMoments)
  
  const monthGroups = groupMomentsByMonth(sortedMoments)
  const sortedMonths = [...monthGroups.keys()].sort((a, b) => parseInt(a) - parseInt(b))
  
  const chapters: Array<{ title: string; content: string; momentIds: string[]; mediaIds: string[]; date: string }> = []
  
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
    const chapterData = template.chapter(month, monthMoments)
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
  
  return { title, chapters }
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()

    const biographies = all<{
      id: string
      title: string
      style: string
      language: string
      start_date: string
      end_date: string
      content: string
      created_at: string
      updated_at: string
    }>(db, `SELECT * FROM biographies ORDER BY created_at DESC`, [])

    const parsedBiographies = biographies.map(b => {
      let chapters = []
      try {
        chapters = JSON.parse(b.content)
      } catch {
        chapters = [{ title: '内容', content: b.content, momentIds: [], mediaIds: [], date: b.start_date }]
      }
      return {
        id: b.id,
        title: b.title,
        style: b.style,
        language: b.language,
        startDate: b.start_date,
        endDate: b.end_date,
        chapters,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }
    })

    res.json({ success: true, data: parsedBiographies })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { startDate, endDate, style = 'casual', language = 'zh' } = req.body

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'startDate and endDate are required' })
      return
    }

    const momentRows = all<{
      id: string
      content: string
      mood: string
      weather: string
      location: string
      happened_at: string
      created_at: string
    }>(
      db,
      `SELECT m.id, m.content, m.mood, m.weather, m.location, m.happened_at, m.created_at
       FROM moments m
       WHERE m.happened_at >= ? AND m.happened_at <= ?
       ORDER BY m.happened_at ASC`,
      [startDate, endDate],
    )

    const momentsWithMedia = momentRows.map(m => {
      const media = all<{ media_id: string }>(
        db,
        `SELECT media_id FROM moment_media WHERE moment_id = ?`,
        [m.id],
      )
      return {
        ...m,
        media_count: media.length,
        media_ids: media.map(mm => mm.media_id),
      }
    })

    if (momentsWithMedia.length === 0) {
      res.status(400).json({ success: false, error: '所选时间范围内暂无时光动态，请先记录一些内容吧' })
      return
    }

    const { title, chapters } = generateBiographyFromMoments(momentsWithMedia, style)

    const id = v4()
    const contentJson = JSON.stringify(chapters)
    
    run(db, `INSERT INTO biographies (id, title, style, language, start_date, end_date, content) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      id, title, style, language, startDate, endDate, contentJson,
    ])

    res.status(201).json({
      success: true,
      data: {
        id,
        title,
        style,
        language,
        startDate,
        endDate,
        chapters,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params

    const biography = get<{
      id: string
      title: string
      style: string
      language: string
      start_date: string
      end_date: string
      content: string
      created_at: string
      updated_at: string
    }>(db, `SELECT * FROM biographies WHERE id = ?`, [id])

    if (!biography) {
      res.status(404).json({ success: false, error: 'Biography not found' })
      return
    }

    let chapters = []
    try {
      chapters = JSON.parse(biography.content)
    } catch {
      chapters = [{ title: '内容', content: biography.content, momentIds: [], mediaIds: [], date: biography.start_date }]
    }

    res.json({
      success: true,
      data: {
        id: biography.id,
        title: biography.title,
        style: biography.style,
        language: biography.language,
        startDate: biography.start_date,
        endDate: biography.end_date,
        chapters,
        createdAt: biography.created_at,
        updatedAt: biography.updated_at,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params
    const { title, style, language, chapters, startDate, endDate } = req.body

    const existing = get(db, `SELECT id FROM biographies WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Biography not found' })
      return
    }

    const content = JSON.stringify(chapters || [])

    run(db, `UPDATE biographies SET title = ?, style = ?, language = ?, content = ?, start_date = ?, end_date = ?, updated_at = datetime('now') WHERE id = ?`, [
      title, style, language, content, startDate, endDate, id,
    ])

    res.json({ success: true, data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params

    const existing = get(db, `SELECT id FROM biographies WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Biography not found' })
      return
    }

    run(db, `DELETE FROM biographies WHERE id = ?`, [id])

    res.json({ success: true, data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
