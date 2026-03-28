import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';

interface GeminiResponse {
  description: string;
  code: string;
}

function App() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [prompt, setPrompt] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [loading, setLoading] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Прокрутка чата вниз при новых сообщениях
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (role: 'user' | 'ai', content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading) return;

    // Добавляем сообщение пользователя в чат
    addMessage('user', trimmedPrompt);
    const currentPrompt = trimmedPrompt;

    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      const data: GeminiResponse = await res.json();

      // Показываем результат
      addMessage('ai', data.description);
      setCurrentCode(data.code);

    } catch (err) {
      addMessage('ai', 'Ошибка соединения с сервером. Проверь, запущен ли backend.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!currentCode) return;
    await navigator.clipboard.writeText(currentCode);
    alert('✅ Код успешно скопирован в буфер обмена!');
  };

  const clearChat = () => {
    if (!confirm('Очистить весь чат и историю?')) return;
    setMessages([]);
    setCurrentCode('');
    fetch('/requests', { method: 'DELETE' }).catch(() => {});
  };

  return (
    <div className="bg-slate-950 text-slate-200 h-screen flex overflow-hidden font-sans">
      {/* Левая панель — Чат */}
      <div className="w-2/5 border-r border-slate-800 flex flex-col h-full overflow-hidden">
        <header className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-2xl">
              ✦
            </div>
            <h1 className="text-2xl font-bold">AI Bridge</h1>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-950 rounded-2xl text-sm transition-colors"
          >
            <i className="fas fa-trash"></i> Очистить
          </button>
        </header>

        {/* Сообщения чата */}
        <div
          ref={chatRef}
          className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-slate-950 scroll-panel"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="text-6xl mb-6 opacity-40">✦</div>
              <p className="text-xl text-slate-400 mb-2">Добро пожаловать в AI Bridge</p>
              <p className="text-slate-500">Опишите UI-компонент, и я сразу создам его для вас</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`message max-w-[85%] px-5 py-4 rounded-3xl text-[15px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'user-message bg-blue-600 text-white border-b-4 border-blue-700'
                      : 'ai-message bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  <div className="text-xs opacity-75 mb-1.5">
                    {msg.role === 'user' ? 'Вы' : 'Gemini'}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="ai-message px-5 py-4 rounded-3xl bg-slate-800 text-slate-400">
                Генерирую компонент...
              </div>
            </div>
          )}
        </div>

        {/* Поле ввода */}
        <div className="p-6 border-t border-slate-800 bg-slate-900">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              className="flex-1 bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-3xl px-6 py-4 outline-none text-base transition placeholder-slate-400"
              placeholder="Например: современная тёмная карточка товара с рейтингом и кнопкой «В корзину»..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 w-14 h-14 flex items-center justify-center rounded-3xl text-white transition-all active:scale-95"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>

      {/* Правая панель — Код и Превью */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Код компонента */}
          <div className="flex-1 flex flex-col border-b border-slate-800 min-h-0">
            <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-sm font-medium">
              <div className="flex items-center gap-2">
                <i className="fas fa-code text-emerald-400"></i>
                <span>Код компонента</span>
              </div>
              {currentCode && (
                <button
                  onClick={copyCode}
                  className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs transition-colors"
                >
                  <i className="fas fa-copy"></i> Скопировать
                </button>
              )}
            </div>
            <pre className="flex-1 min-h-0 p-6 overflow-auto bg-slate-950 text-emerald-300 font-mono text-sm whitespace-pre leading-relaxed scroll-panel">
              {currentCode || '// Здесь появится сгенерированный код после первого запроса'}
            </pre>
          </div>

          {/* Живое превью */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2 text-sm font-medium">
              <i className="fas fa-eye text-sky-400"></i>
              <span>Живое превью</span>
            </div>
            <div className="flex-1 min-h-0 p-8 bg-slate-100 overflow-auto flex items-center justify-center">
              <iframe
                srcDoc={currentCode || `
                  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-family:system-ui">
                    Превью появится здесь после генерации компонента
                  </div>
                `}
                className="w-full max-w-4xl h-full border-2 border-slate-300 shadow-2xl rounded-3xl bg-white"
                frameBorder="0"
                title="Preview"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;