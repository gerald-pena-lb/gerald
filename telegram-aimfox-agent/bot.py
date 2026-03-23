"""Tiffany — Telegram bot that uses Claude AI to answer questions about Aimfox agent performance."""

import json
import logging
import os
import traceback

import anthropic
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from aimfox_client import AimfoxClient

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────

TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
AIMFOX_API_KEY = os.environ["AIMFOX_API_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
ALLOWED_USER_IDS = {
    int(uid.strip())
    for uid in os.environ.get("ALLOWED_USER_IDS", "").split(",")
    if uid.strip()
}

aimfox = AimfoxClient(AIMFOX_API_KEY)
claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ── Tool definitions for Claude ───────────────────────────────────────

TOOLS = [
    {
        "name": "list_accounts",
        "description": "List all LinkedIn accounts (agents) in the Aimfox workspace. Returns account names, IDs, and status.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_account_limits",
        "description": "Get the weekly interaction limits for a specific LinkedIn account (connection requests, messages, InMails, etc).",
        "input_schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "The account ID to get limits for.",
                }
            },
            "required": ["account_id"],
        },
    },
    {
        "name": "list_campaigns",
        "description": "List campaigns. Optionally filter by account ID to see campaigns for a specific agent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "Optional account ID to filter campaigns.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_campaign",
        "description": "Get detailed information about a specific campaign including stats, steps, and status.",
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {
                    "type": "string",
                    "description": "The campaign ID.",
                }
            },
            "required": ["campaign_id"],
        },
    },
    {
        "name": "list_leads",
        "description": "List leads with optional filters. Use to check how many leads an agent has, filter by campaign or label.",
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {
                    "type": "string",
                    "description": "Optional campaign ID filter.",
                },
                "account_id": {
                    "type": "string",
                    "description": "Optional account ID filter.",
                },
                "label": {
                    "type": "string",
                    "description": "Optional label filter.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 50).",
                },
            },
            "required": [],
        },
    },
    {
        "name": "list_conversations",
        "description": "List conversations (LinkedIn messages). Filter by account to see a specific agent's conversations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "Optional account ID filter.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 50).",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_conversation",
        "description": "Get a specific conversation including all messages. Use to review the quality of an agent's outreach.",
        "input_schema": {
            "type": "object",
            "properties": {
                "conversation_id": {
                    "type": "string",
                    "description": "The conversation ID.",
                }
            },
            "required": ["conversation_id"],
        },
    },
    {
        "name": "list_labels",
        "description": "List all labels in the workspace. Labels are used to categorize leads.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_workspace_overview",
        "description": "Get a high-level overview of the entire workspace: all accounts, campaigns, and lead summary. Good starting point for general questions.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_account_performance",
        "description": "Get comprehensive performance data for a specific account (agent): their campaigns, leads, conversations, and limits.",
        "input_schema": {
            "type": "object",
            "properties": {
                "account_id": {
                    "type": "string",
                    "description": "The account ID to get performance for.",
                }
            },
            "required": ["account_id"],
        },
    },
]

SYSTEM_PROMPT = """You are Tiffany, an AI assistant that helps monitor and analyze the performance of human agents using Aimfox (a LinkedIn outreach automation platform).

You have access to the Aimfox API through tools. Use them to answer the user's questions about:
- How agents (LinkedIn accounts) are performing
- Campaign statistics and progress
- Lead generation numbers and quality
- Conversation activity and response rates
- Outreach limits and usage

When answering:
- Be concise and data-driven
- Highlight key metrics and trends
- Flag any concerns (low activity, accounts at limits, stale campaigns)
- Compare agents when asked
- Always start by listing accounts if the user asks a general question so you know who the agents are
- Format numbers and stats clearly

If an API call fails, tell the user what went wrong and suggest alternatives."""


async def execute_tool(name: str, args: dict) -> str:
    """Execute an Aimfox API tool call and return the JSON result."""
    try:
        if name == "list_accounts":
            result = await aimfox.list_accounts()
        elif name == "get_account_limits":
            result = await aimfox.get_account_limits(args["account_id"])
        elif name == "list_campaigns":
            result = await aimfox.list_campaigns(args.get("account_id"))
        elif name == "get_campaign":
            result = await aimfox.get_campaign(args["campaign_id"])
        elif name == "list_leads":
            result = await aimfox.list_leads(
                campaign_id=args.get("campaign_id"),
                account_id=args.get("account_id"),
                label=args.get("label"),
                limit=args.get("limit", 50),
            )
        elif name == "list_conversations":
            result = await aimfox.list_conversations(
                account_id=args.get("account_id"),
                limit=args.get("limit", 50),
            )
        elif name == "get_conversation":
            result = await aimfox.get_conversation(args["conversation_id"])
        elif name == "list_labels":
            result = await aimfox.list_labels()
        elif name == "get_workspace_overview":
            result = await aimfox.get_workspace_overview()
        elif name == "get_account_performance":
            result = await aimfox.get_account_performance(args["account_id"])
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})

        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def is_authorized(user_id: int) -> bool:
    """Check if user is allowed to use the bot."""
    if not ALLOWED_USER_IDS:
        return True
    return user_id in ALLOWED_USER_IDS


# ── Conversation history per user ─────────────────────────────────────

user_histories: dict[int, list[dict]] = {}
MAX_HISTORY = 20


def get_history(user_id: int) -> list[dict]:
    if user_id not in user_histories:
        user_histories[user_id] = []
    return user_histories[user_id]


def trim_history(user_id: int):
    history = user_histories.get(user_id, [])
    if len(history) > MAX_HISTORY:
        user_histories[user_id] = history[-MAX_HISTORY:]


# ── Handlers ──────────────────────────────────────────────────────────


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_user.id):
        await update.message.reply_text("You are not authorized to use this bot.")
        return

    user_histories.pop(update.effective_user.id, None)
    await update.message.reply_text(
        "Hey! I'm Tiffany, your Aimfox performance assistant.\n\n"
        "Ask me anything about your agents, campaigns, leads, or conversations. "
        "For example:\n"
        '- "How are my agents doing?"\n'
        '- "Show me campaign stats for [agent name]"\n'
        '- "Which agent has the most leads this week?"\n'
        '- "Review the latest conversations for [agent]"\n\n'
        "Use /clear to reset our conversation."
    )


async def clear(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_histories.pop(update.effective_user.id, None)
    await update.message.reply_text("Conversation cleared.")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if not is_authorized(user_id):
        await update.message.reply_text("You are not authorized to use this bot.")
        return

    user_text = update.message.text
    history = get_history(user_id)
    history.append({"role": "user", "content": user_text})

    await context.bot.send_chat_action(
        chat_id=update.effective_chat.id, action="typing"
    )

    try:
        messages = list(history)
        while True:
            response = claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            )

            if response.stop_reason == "tool_use":
                # Collect all tool use blocks and execute them
                assistant_content = response.content
                tool_results = []

                for block in assistant_content:
                    if block.type == "tool_use":
                        logger.info(f"Tool call: {block.name}({block.input})")
                        result = await execute_tool(block.name, block.input)
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": result,
                            }
                        )

                messages.append({"role": "assistant", "content": assistant_content})
                messages.append({"role": "user", "content": tool_results})

                await context.bot.send_chat_action(
                    chat_id=update.effective_chat.id, action="typing"
                )
            else:
                # Final text response
                text_parts = [
                    block.text
                    for block in response.content
                    if hasattr(block, "text")
                ]
                reply = "\n".join(text_parts) if text_parts else "No response."

                history.append({"role": "assistant", "content": reply})
                trim_history(user_id)

                # Telegram has a 4096 char limit per message
                for i in range(0, len(reply), 4096):
                    await update.message.reply_text(
                        reply[i : i + 4096], parse_mode=None
                    )
                break

    except Exception as e:
        logger.error(f"Error: {traceback.format_exc()}")
        await update.message.reply_text(
            f"Something went wrong: {e}\n\nPlease try again or /clear the conversation."
        )


OWNER_CHAT_ID = 8500642642


async def greet_owner(app: Application):
    """Send a greeting to the owner when the bot starts."""
    try:
        await app.bot.send_message(
            chat_id=OWNER_CHAT_ID,
            text="Hey! Tiffany here. I'm online and ready to help. What do you need?",
        )
        logger.info(f"Sent startup greeting to {OWNER_CHAT_ID}")
    except Exception as e:
        logger.warning(f"Could not send startup greeting: {e}")


def main():
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("clear", clear))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    app.post_init = greet_owner

    logger.info("Bot starting...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
