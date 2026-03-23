# Telegram Aimfox Agent

A Telegram bot powered by Claude AI that lets you check how your human agents are performing in Aimfox — right from a chat.

Ask questions in plain English like:
- "How are my agents doing?"
- "Show me campaign stats"
- "Which agent has the most leads?"
- "Review the latest conversations for [agent name]"

## How It Works

1. You send a message in Telegram
2. Claude AI interprets your question and decides which Aimfox API calls to make
3. The bot fetches live data from your Aimfox workspace
4. Claude analyzes the data and responds with insights

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token

### 2. Get Your Aimfox API Key

1. Go to your Aimfox dashboard
2. Navigate to **Workspace Settings > Integrations**
3. Click **Create API Key**
4. Give it a name and set permission to **Read-only** (sufficient for monitoring)
5. Copy the API key

### 3. Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Copy it

### 4. Configure Environment

```bash
cd telegram-aimfox-agent
cp .env.example .env
```

Edit `.env` with your keys:

```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
AIMFOX_API_KEY=your-aimfox-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
ALLOWED_USER_IDS=123456789
```

**ALLOWED_USER_IDS** is optional. Add your Telegram user ID to restrict access. Leave empty to allow anyone.

To find your Telegram user ID, message [@userinfobot](https://t.me/userinfobot) on Telegram.

### 5. Install & Run

```bash
pip install -r requirements.txt
python bot.py
```

## Bot Commands

- `/start` — Welcome message and usage examples
- `/clear` — Reset conversation history

## What You Can Ask

The bot can pull data from these Aimfox resources:

| Resource | What it tells you |
|---|---|
| **Accounts** | All LinkedIn accounts (your agents), their status |
| **Account Limits** | Weekly interaction limits and usage |
| **Campaigns** | Campaign status, stats, progress per agent |
| **Leads** | Lead counts, filters by campaign/agent/label |
| **Conversations** | Message threads, response activity |
| **Labels** | Lead categorization labels |

## Architecture

```
telegram-aimfox-agent/
├── bot.py              # Telegram bot + Claude AI agent loop
├── aimfox_client.py    # Aimfox REST API client
├── requirements.txt    # Python dependencies
├── .env.example        # Environment template
└── .gitignore
```

The bot uses Claude's [tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) feature. Claude decides which Aimfox API calls to make based on your question, executes them, then analyzes the results to give you a clear answer.
