from google import genai
from config import config_obj
import json

client = genai.Client(api_key=config_obj.gemini_api_key)


def get_answer_from_gemini(prompt: str):
    system_prompt = """Ты — лучший фронтенд-разработчик.

Пользователь просит создать UI-компонент (кнопка, карточка, форма, модалка и т.д.).

Ответь **ТОЛЬКО** валидным JSON (без ```json, без лишнего текста):

{
  "description": "Краткое описание на русском, что ты сделал",
  "code": "ПОЛНЫЙ САМОДОСТАТОЧНЫЙ HTML-код. Обязательно вставь в <head> Tailwind CDN: <script src=\"https://cdn.tailwindcss.com\"></script>. Сделай современный, красивый дизайн. Компонент должен быть по центру страницы с приятными отступами."
}

Никогда ничего не добавляй кроме этого JSON."""

    full_prompt = f"{system_prompt}\n\nЗапрос пользователя: {prompt}"

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=full_prompt
    )

    raw = response.text.strip()

    # Очищаем возможные markdown-обёртки от Gemini
    if raw.startswith("```json"):
        raw = raw.split("```json", 1)[1].split("```", 1)[0].strip()
    elif raw.startswith("```"):
        raw = raw.split("```", 1)[1].split("```", 1)[0].strip()

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict) and "description" in parsed and "code" in parsed:
            return parsed
    except:
        pass

    # Fallback
    return {
        "description": "Gemini вернул невалидный формат. Вот что получилось:",
        "code": raw
    }
