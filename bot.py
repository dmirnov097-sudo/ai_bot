import asyncio
import logging
from openai import OpenAI
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import CommandStart
from aiohttp import web
import json
import os

logging.basicConfig(level=logging.INFO)

BOT_TOKEN = "8745927128:AAFR4VfgDKVDAkd8qjiLo78mtVjR6nBxp2s"
GITHUB_TOKEN = "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"
PORT = int(os.environ.get("PORT", 8080))

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

client = OpenAI(
    api_key=GITHUB_TOKEN,
    base_url="https://models.inference.ai.azure.com"
)

MODELS = {
    "phi": {"name": "Phi-3.5 Mini", "id": "microsoft/phi-3.5-mini-128k-instruct"}
}

def ask_ai(question, model_id):
    try:
        response = client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": question}],
            max_tokens=500,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Ошибка: {e}"

def main_keyboard():
    web_app = WebAppInfo(url="https://aibot-production-5ec8.up.railway.app/webapp")
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌐 Открыть чат с ИИ", web_app=web_app)]
    ])

@dp.message(CommandStart())
async def start(message: Message):
    await message.answer(
        "🤖 Добро пожаловать!\n\nЯ бот с веб-интерфейсом для общения с ИИ.\n\nНажми на кнопку ниже, чтобы открыть чат.",
        reply_markup=main_keyboard()
    )

async def handle_ask(request):
    try:
        data = await request.json()
        question = data.get('question')
        model_key = data.get('model', 'phi')
        if not question:
            return web.json_response({'error': 'No question'}, status=400)
        model_id = MODELS.get(model_key, MODELS['phi'])['id']
        answer = ask_ai(question, model_id)
        return web.json_response({'answer': answer})
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def handle_webapp(request):
    with open('index.html', 'r', encoding='utf-8') as f:
        return web.Response(text=f.read(), content_type='text/html')

async def start_web():
    app = web.Application()
    app.router.add_post('/ask', handle_ask)
    app.router.add_get('/webapp', handle_webapp)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', PORT)
    await site.start()
    print(f"Веб-сервер запущен на порту {PORT}")

async def main():
    await start_web()
    print("Бот запущен")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
