"""Aimfox API client for fetching workspace data."""

import httpx

BASE_URL = "https://api.aimfox.com/v1"


class AimfoxClient:
    """Async client for the Aimfox REST API."""

    def __init__(self, api_key: str):
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def _get(self, path: str, params: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{BASE_URL}{path}", headers=self.headers, params=params
            )
            resp.raise_for_status()
            return resp.json()

    async def _post(self, path: str, body: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{BASE_URL}{path}", headers=self.headers, json=body
            )
            resp.raise_for_status()
            return resp.json()

    # ── Accounts ──────────────────────────────────────────────────────

    async def list_accounts(self) -> dict:
        """List all LinkedIn accounts in the workspace."""
        return await self._get("/accounts")

    async def get_account_limits(self, account_id: str) -> dict:
        """Get interaction limits for a specific account."""
        return await self._get(f"/accounts/{account_id}/limits")

    # ── Campaigns ─────────────────────────────────────────────────────

    async def list_campaigns(self, account_id: str | None = None) -> dict:
        """List campaigns, optionally filtered by account."""
        params = {}
        if account_id:
            params["accountId"] = account_id
        return await self._get("/campaigns", params=params or None)

    async def get_campaign(self, campaign_id: str) -> dict:
        """Get details for a specific campaign."""
        return await self._get(f"/campaigns/{campaign_id}")

    # ── Leads ─────────────────────────────────────────────────────────

    async def list_leads(
        self,
        campaign_id: str | None = None,
        account_id: str | None = None,
        label: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """List leads with optional filters."""
        params: dict = {"limit": limit, "offset": offset}
        if campaign_id:
            params["campaignId"] = campaign_id
        if account_id:
            params["accountId"] = account_id
        if label:
            params["label"] = label
        return await self._get("/leads", params=params)

    async def get_lead(self, lead_id: str) -> dict:
        """Get details for a specific lead."""
        return await self._get(f"/leads/{lead_id}")

    # ── Conversations ─────────────────────────────────────────────────

    async def list_conversations(
        self,
        account_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """List conversations."""
        params: dict = {"limit": limit, "offset": offset}
        if account_id:
            params["accountId"] = account_id
        return await self._get("/conversations", params=params)

    async def get_conversation(self, conversation_id: str) -> dict:
        """Get a specific conversation with messages."""
        return await self._get(f"/conversations/{conversation_id}")

    # ── Labels ────────────────────────────────────────────────────────

    async def list_labels(self) -> dict:
        """List all labels in the workspace."""
        return await self._get("/labels")

    # ── Templates ─────────────────────────────────────────────────────

    async def list_templates(self) -> dict:
        """List all message templates."""
        return await self._get("/templates")

    # ── High-level helpers ────────────────────────────────────────────

    async def get_workspace_overview(self) -> dict:
        """Pull a combined overview: accounts, campaigns, and lead counts."""
        accounts = await self.list_accounts()
        campaigns = await self.list_campaigns()
        leads = await self.list_leads(limit=0)
        return {
            "accounts": accounts,
            "campaigns": campaigns,
            "leads_summary": leads,
        }

    async def get_account_performance(self, account_id: str) -> dict:
        """Get performance data for a specific account (agent)."""
        campaigns = await self.list_campaigns(account_id=account_id)
        leads = await self.list_leads(account_id=account_id, limit=100)
        conversations = await self.list_conversations(
            account_id=account_id, limit=100
        )
        limits = await self.get_account_limits(account_id)
        return {
            "campaigns": campaigns,
            "leads": leads,
            "conversations": conversations,
            "limits": limits,
        }
