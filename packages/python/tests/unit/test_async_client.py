import pytest

from daraja.client.async_client import AsyncMpesa
from daraja.models import (
    BusinessBuyGoodsRequest,
    BusinessGoodsResponse,
    BusinessPayBillRequest,
    MpesaConfig,
)


def make_config() -> MpesaConfig:
    return MpesaConfig(
        consumer_key="test-key",
        consumer_secret="test-secret",
        environment="sandbox",
        initiator_name="test-initiator",
        security_credential="test-cred",
    )


async def capture_post(client: AsyncMpesa, monkeypatch: pytest.MonkeyPatch):
    captured: dict = {}

    async def fake_post(endpoint_key, data):
        captured["endpoint_key"] = endpoint_key
        captured["data"] = data
        return {
            "OriginatorConversationID": "orig-1",
            "ConversationID": "conv-1",
            "ResponseCode": "0",
            "ResponseDescription": "Success",
        }

    monkeypatch.setattr(client, "_post", fake_post)
    return captured


@pytest.mark.anyio
async def test_async_business_pay_bill_injects_credentials_from_dict(monkeypatch):
    client = AsyncMpesa(make_config())
    captured = await capture_post(client, monkeypatch)

    req = {
        "CommandID": "BusinessPayBill",
        "Amount": 239,
        "PartyA": 123456,
        "PartyB": 572572,
        "Remarks": "OK",
        "QueueTimeOutURL": "http://example.com/timeout",
        "ResultURL": "http://example.com/result",
    }

    await client.business_pay_bill(req)

    assert captured["data"]["SecurityCredential"] == "test-cred"
    assert captured["data"]["Initiator"] == "test-initiator"


@pytest.mark.anyio
async def test_async_business_pay_bill_injects_credentials_when_model_omits(monkeypatch):
    client = AsyncMpesa(make_config())
    captured = await capture_post(client, monkeypatch)

    req = BusinessPayBillRequest(
        CommandID="BusinessPayBill",
        SecurityCredential="",
        Initiator="",
        Amount=239,
        PartyA=123456,
        PartyB=572572,
        Remarks="OK",
        QueueTimeOutURL="http://example.com/timeout",
        ResultURL="http://example.com/result",
    )

    await client.business_pay_bill(req)

    assert captured["data"]["SecurityCredential"] == "test-cred"
    assert captured["data"]["Initiator"] == "test-initiator"


@pytest.mark.anyio
async def test_async_business_buy_goods_injects_credentials(monkeypatch):
    client = AsyncMpesa(make_config())
    captured = await capture_post(client, monkeypatch)

    req = {
        "CommandID": "BusinessBuyGoods",
        "Amount": 239,
        "PartyA": 123456,
        "PartyB": 572572,
        "Remarks": "OK",
        "QueueTimeOutURL": "http://example.com/timeout",
        "ResultURL": "http://example.com/result",
    }

    await client.business_buy_goods(req)

    assert captured["data"]["SecurityCredential"] == "test-cred"
    assert captured["data"]["Initiator"] == "test-initiator"