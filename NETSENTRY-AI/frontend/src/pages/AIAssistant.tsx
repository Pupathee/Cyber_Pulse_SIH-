import { FormEvent, useState } from 'react'
import { Bot, Send, ShieldAlert, Sparkles } from 'lucide-react'
import { askAssistant } from '../services/api'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const starter: Message = {
  role: 'assistant',
  text: 'NETSENTRY AI is ready. Ask about attack classification, risk triage, containment, or incident response.',
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([starter])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const send = async (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || loading) return
    setInput('')
    setError('')
    setMessages((current) => [...current, { role: 'user', text: message }])
    setLoading(true)
    try {
      const response = await askAssistant(message)
      setMessages((current) => [...current, { role: 'assistant', text: response.reply }])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Assistant request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen cyber-grid scanlines pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-6 space-y-6">
        <header className="pt-6">
          <div className="text-xs text-cyber-muted tracking-widest uppercase mb-1">Cyber Operations Copilot</div>
          <h1 className="text-3xl font-black tracking-wider text-cyber-cyan glow-cyan">AI ASSISTANT</h1>
          <p className="text-sm text-cyber-muted mt-1">Gemini-powered defensive analysis for the NETSENTRY threat pipeline.</p>
        </header>

        <div className="grid grid-cols-1 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyber-cyan">
              <Bot className="w-4 h-4" /> DEFENSIVE ANALYST
            </div>
            <p className="text-xs text-cyber-muted mt-2 leading-relaxed">Ask for triage guidance, explain a detected attack, or prepare an investigation checklist. Gemini only receives the prompt and live telemetry requested by this app.</p>
          </div>
        </div>

        <section className="glass-card overflow-hidden">
          <div className="p-4 border-b border-cyber-cyan/10 flex items-center gap-2 text-sm font-bold text-cyber-text">
            <Sparkles className="w-4 h-4 text-cyber-blue" />
            Cyber Security Assistant
          </div>
          <div className="p-5 space-y-4 min-h-[360px] max-h-[560px] overflow-y-auto">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && <div className="w-8 h-8 shrink-0 rounded-lg border border-cyber-cyan/30 bg-cyber-cyan/10 flex items-center justify-center"><Bot className="w-4 h-4 text-cyber-cyan" /></div>}
                <div className={`max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed rounded-xl px-4 py-3 ${message.role === 'user' ? 'bg-cyber-blue/15 border border-cyber-blue/30 text-cyber-text' : 'bg-white/5 border border-white/10 text-cyber-muted'}`}>
                  {message.text}
                </div>
                {message.role === 'user' && <ShieldAlert className="w-4 h-4 text-cyber-blue mt-3 shrink-0" />}
              </div>
            ))}
            {loading && <div className="text-xs text-cyber-muted animate-pulse">Analyzing telemetry...</div>}
          </div>
          <form onSubmit={send} className="p-4 border-t border-cyber-cyan/10 flex gap-2">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a defensive cyber security question..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/50" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send message" className="px-4 rounded-lg bg-cyber-cyan text-cyber-bg disabled:opacity-40"><Send className="w-4 h-4" /></button>
          </form>
        </section>
        {error && <div className="glass-card p-4 border-cyber-red/30 text-cyber-red text-sm">{error}</div>}
      </div>
    </div>
  )
}
