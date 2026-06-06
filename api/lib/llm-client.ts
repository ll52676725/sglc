const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const API_KEY = 'sk-735c6ef155ca4690b9bdb1c2d054e240'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callLLM(
  messages: LLMMessage[],
  options: {
    temperature?: number
    maxTokens?: number
    model?: string
  } = {}
): Promise<string> {
  const {
    temperature = 0.8,
    maxTokens = 4000,
    model = 'deepseek-chat'
  } = options

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LLM API error:', response.status, errorText)
      throw new Error(`LLM API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('LLM call failed:', error)
    throw error
  }
}
