import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

interface GeminiResponse {
  description: string;
  code: string;
}

interface MeResponse {
  id: number;
  email: string;
}

const TOKEN_KEY = 'ai_bridge_token';

function App() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [prompt, setPrompt] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [me, setMe] = useState<MeResponse | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);

  const isAuthorized = useMemo(() => Boolean(token && me), [token, me]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }

    fetch('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('token invalid');
        }
        return res.json();
      })
      .then((data: MeResponse) => setMe(data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setMe(null);
      });
  }, [token]);

  const addMessage = (role: 'user' | 'ai', content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const saveToken = (value: string) => {
    localStorage.setItem(TOKEN_KEY, value);
    setToken(value);
  };

  const auth = async (path: '/auth/login' | '/auth/register') => {
    if (!email.trim() || !password.trim()) {
      alert('Введите email и пароль.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || 'Ошибка авторизации');
      }

      saveToken(data.access_token);
      setPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка авторизации';
      alert(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setMe(null);
    setMessages([]);
    setCurrentCode('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading || !token) return;

    addMessage('user', trimmedPrompt);
    const currentPrompt = trimmedPrompt;

    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      if (res.status === 401) {
        logout();
        throw new Error('Сессия истекла. Войдите снова.');
      }

      const data: GeminiResponse = await res.json();
      addMessage('ai', data.description);
      setCurrentCode(data.code);
    } catch (err) {
      addMessage('ai', err instanceof Error ? err.message : 'Ошибка соединения с сервером.');
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
    if (!confirm('Очистить весь чат и историю?') || !token) return;
    setMessages([]);
    setCurrentCode('');
    fetch('/requests', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  if (!isAuthorized) {
    return (
      <div className="bg-slate-950 text-slate-200 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-2">AI Bridge</h1>
          <p className="text-slate-400 mb-6">Войдите или зарегистрируйтесь, чтобы использовать генерацию UI.</p>

          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-violet-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль (минимум 8 символов)"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => auth('/auth/login')}
              disabled={authLoading}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 rounded-2xl py-3 font-medium"
            >
              Войти
            </button>
            <button
              onClick={() => auth('/auth/register')}
              disabled={authLoading}
              className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 rounded-2xl py-3 font-medium"
            >
              Регистрация
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-200 h-screen flex overflow-hidden font-sans">
      <div className="w-2/5 border-r border-slate-800 flex flex-col h-full overflow-hidden">
        <header className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-2xl">
              ✦
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-none">AI Bridge</h1>
              <p className="text-xs text-slate-400 truncate">{me?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="px-3 py-2 text-red-400 hover:bg-red-950 rounded-2xl text-sm transition-colors"
            >
              Очистить
            </button>
            <button
              onClick={logout}
              className="px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-2xl text-sm transition-colors"
            >
              Выйти
            </button>
          </div>
        </header>

        <div ref={chatRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-slate-950 scroll-panel">
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
                  <div className="text-xs opacity-75 mb-1.5">{msg.role === 'user' ? 'Вы' : 'Gemini'}</div>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="ai-message px-5 py-4 rounded-3xl bg-slate-800 text-slate-400">Генерирую компонент...</div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
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

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
