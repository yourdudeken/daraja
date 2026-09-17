"""Tests for the async Mpesa client: wrapper methods, token manager, and lifecycle."""

import pytest

from daraja.client.async_client import AsyncMpesa
from daraja.models import (
    BusinessPayBillRequest,
    MpesaConfig,
)
from daraja.utils.token_cache import InMemorySharedTokenCache

_BIZ_RESPONSE = {
    "OriginatorConversationID": "oci-1",
    "ConversationID": "ci-1",
    "ResponseCode": "0",
    "ResponseDescription": "Success",
}


def make_config(**overrides) -> MpesaConfig:
    defaults = {
        "consumer_key": "test-key",
        "consumer_secret": "test-secret",
        "environment": "sandbox",
        "passkey": "test-passkey",
        "initiator_name": "test-initiator",
        "security_credential": "test-cred",
    }
    defaults.update(overrides)
    return MpesaConfig(**defaults)


async def capture_post(client: AsyncMpesa, monkeypatch: pytest.MonkeyPatch, response=None):
    captured: dict = {}

    async def fake_post(endpoint_key, data):
        captured["endpoint_key"] = endpoint_key
        captured["data"] = data
        return response or _BIZ_RESPONSE

    monkeypatch.setattr(client, "_post", fake_post)
    return captured


async def capture_get(client: AsyncMpesa, monkeypatch: pytest.MonkeyPatch, response=None):
    captured: dict = {}

    async def fake_get(endpoint_key, params):
        captured["endpoint_key"] = endpoint_key
        captured["params"] = params
        return response or _BIZ_RESPONSE

    monkeypatch.setattr(client, "_get", fake_get)
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


@pytest.mark.anyio
async def test_async_stk_push(monkeypatch):
    client = AsyncMpesa(make_config())
    captured = await capture_post(client, monkeypatch, {
        "MerchantRequestID": "m1", "CheckoutRequestID": "c1",
        "ResponseCode": "0", "ResponseDescription": "ok", "CustomerMessage": "success",
    })
    result = await client.stk_push({
        "BusinessShortCode": 174379, "TransactionType": "CustomerPayBillOnline",
        "Amount": 1, "PartyA": 254708374149, "PartyB": 174379,
        "PhoneNumber": 254708374149, "CallBackURL": "https://e.com/cb",
        "AccountReference": "ref", "TransactionDesc": "desc",
    })
    assert result.ResponseCode == "0"
    assert captured["endpoint_key"] == "STK_PUSH"
    await client.close()


@pytest.mark.anyio
async def test_async_stk_query(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "ResponseCode": "0", "ResponseDescription": "ok",
        "MerchantRequestID": "m1", "CheckoutRequestID": "c1",
        "ResultCode": "0", "ResultDesc": "success",
    })
    result = await client.stk_query({"BusinessShortCode": "174379", "CheckoutRequestID": "c1"})
    assert result.ResultCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_c2b_register_url(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch)
    result = await client.c2b_register_url({
        "ShortCode": "600984", "ResponseType": "Completed",
        "ConfirmationURL": "https://e.com/c", "ValidationURL": "https://e.com/v",
    })
    assert result.ResponseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_c2b_simulate(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch)
    result = await client.c2b_simulate({
        "ShortCode": 600984, "CommandID": "CustomerPayBillOnline",
        "Amount": 1, "Msisdn": 254708374149,
    })
    assert result.ResponseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_b2c(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch)
    result = await client.b2c({
        "OriginatorConversationID": "600997_Test_32et3241ed8yu",
        "InitiatorName": "test-initiator", "SecurityCredential": "test-cred",
        "CommandID": "SalaryPayment", "Amount": 100,
        "PartyA": 600984, "PartyB": 254708374149,
        "Remarks": "salary", "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
    })
    assert result.ResponseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_reversal(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch)
    result = await client.reversal({
        "Initiator": "test-initiator", "SecurityCredential": "test-cred",
        "CommandID": "TransactionReversal", "TransactionID": "T1",
        "Amount": 100, "ReceiverParty": 254708374149,
        "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r", "Remarks": "rev",
    })
    assert result.ResponseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_transaction_status(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch)
    result = await client.transaction_status({
        "Initiator": "test-initiator", "SecurityCredential": "test-cred",
        "CommandID": "TransactionStatusQuery", "TransactionID": "T1",
        "PartyA": 600984, "ResultURL": "https://e.com/r",
        "QueueTimeOutURL": "https://e.com/to", "Remarks": "status",
    })
    assert result.ResponseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_account_balance(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch)
    result = await client.account_balance({
        "Initiator": "test-initiator", "SecurityCredential": "test-cred",
        "CommandID": "AccountBalance", "PartyA": 600984,
        "Remarks": "bal", "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
    })
    assert result.ResponseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_dynamic_qr(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "ResponseCode": "0", "RequestID": "r1",
        "ResponseDescription": "ok", "QRCode": "qr",
    })
    result = await client.dynamic_qr({
        "MerchantName": "T", "RefNo": "r", "Amount": 100, "TrxCode": "BG", "CPI": "600984",
    })
    assert result.QRCode == "qr"
    await client.close()


@pytest.mark.anyio
async def test_async_query_org_info(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "ConversationID": "c1", "ResponseCode": "0", "ResponseMessage": "ok",
        "DetailedMessage": "ok", "OrganizationShortCode": "600984",
        "OrganizationName": "Org", "ChargeProfileID": "cp1",
    })
    result = await client.query_org_info({"IdentifierType": 4, "Identifier": 600984})
    assert result.OrganizationName == "Org"
    await client.close()


@pytest.mark.anyio
async def test_async_imsi_query(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "requestRefID": "r1", "responseCode": "0", "responseDesc": "ok",
        "imsi": "639002000000000", "lastSwapDate": "2024-01-01",
        "msisdnRegistrationDate": "2020-01-01", "customerNumber": "254708374149",
    })
    result = await client.imsi_query({"customerNumber": "254708374149"})
    assert result.imsi == "639002000000000"
    await client.close()


@pytest.mark.anyio
async def test_async_iot_manage(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "ResponseCode": "0", "ResponseDescription": "ok",
        "ICCID": "iccid1", "Status": "ACTIVE",
    })
    result = await client.iot_manage({
        "InitiatorName": "init", "SecurityCredential": "cred",
        "CommandID": "ActivateIOTSIM", "ICCID": "iccid1",
    })
    assert result.Status == "ACTIVE"
    await client.close()


@pytest.mark.anyio
async def test_async_b2pochi(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch)
    result = await client.b2pochi({
        "OriginatorConversationID": "600997_Test_32et3241ed8yu",
        "InitiatorName": "test-initiator", "SecurityCredential": "test-cred",
        "CommandID": "BusinessPayToPochi", "Amount": 100,
        "PartyA": 600984, "PartyB": 254708374149,
        "Remarks": "p", "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
    })
    assert result.ResponseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_lipa_na_bonga_calculate(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {"header": {"responseCode": 0}, "body": {}})
    result = await client.lipa_na_bonga_calculate({"points": "100"})
    assert result.header.responseCode == 0
    await client.close()


@pytest.mark.anyio
async def test_async_lipa_na_bonga_redeem(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {"header": {"responseCode": 0}, "body": {}})
    result = await client.lipa_na_bonga_redeem({
        "msisdn": "254708374149", "amount": 100, "bongaPoints": 1000,
        "conversionRate": 0.1, "shortCode": "600984", "accountNumber": "acc1",
    })
    assert result.header.responseCode == 0
    await client.close()


@pytest.mark.anyio
async def test_async_pull_transactions_register(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "ResponseRefID": "r1", "ResponseStatus": "ok",
        "ShortCode": "600984", "ResponseDescription": "success",
    })
    result = await client.pull_transactions_register({
        "ShortCode": "600984", "NominatedNumber": "254708374149", "CallBackURL": "https://e.com/cb",
    })
    assert result.ResponseRefID == "r1"
    await client.close()


@pytest.mark.anyio
async def test_async_pull_transactions_query(monkeypatch):
    client = AsyncMpesa(make_config())
    captured: dict = {}

    async def fake_request(method, url, json_data=None, operation_name=None):
        captured["method"] = method
        captured["url"] = url
        captured["data"] = json_data
        return {"ResponseRefID": "r1", "ResponseCode": "0", "ResponseMessage": "ok", "Response": []}

    monkeypatch.setattr(client, "_request", fake_request)
    result = await client.pull_transactions_query({
        "ShortCode": "600984", "StartDate": "2024-01-01", "EndDate": "2024-01-02",
    })
    assert result.ResponseCode == "0"
    assert captured["method"] == "GET"
    assert captured["data"]["ShortCode"] == "600984"
    await client.close()


@pytest.mark.anyio
async def test_async_swap(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "requestRefID": "r1", "responseCode": "0", "responseDesc": "ok",
        "lastSwapDate": "2024-01-01",
    })
    result = await client.swap({"customerNumber": "254708374149"})
    assert result.responseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_bill_manager(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {"resmsg": "ok", "rescode": "0"})
    result = await client.bill_manager({"shortcode": "600984"})
    assert result.rescode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_b2b_express(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {"code": "0", "status": "ok"})
    result = await client.b2b_express({
        "primaryShortCode": "600984", "receiverShortCode": "600000",
        "amount": "100", "paymentRef": "ref", "callbackUrl": "https://e.com/cb",
        "partnerName": "P", "RequestRefID": "r1",
    })
    assert result.code == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_b2c_account_top_up(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch)
    result = await client.b2c_account_top_up({
        "CommandID": "BusinessPayToBulk", "Amount": "100",
        "PartyA": "600984", "PartyB": "600000", "Remarks": "topup",
        "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
    })
    assert result.ResponseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_ratiba(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "ResponseHeader": {"responseRefID": "r1", "responseCode": "0"},
        "ResponseBody": {"responseCode": "0"},
    })
    result = await client.ratiba({
        "StandingOrderName": "Rent", "StartDate": "2024-01-01", "EndDate": "2024-12-31",
        "BusinessShortCode": "600984", "Amount": "100", "PartyA": "600984",
        "CallBackURL": "https://e.com/cb", "AccountReference": "acc1",
        "TransactionDesc": "rent", "Frequency": "MONTHLY",
    })
    assert result.ResponseHeader.responseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_tax_remittance(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch)
    result = await client.tax_remittance({
        "Amount": "100", "PartyA": "600984", "AccountReference": "acc1",
        "Remarks": "tax", "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
    })
    assert result.ResponseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_mobile_center_fetch_offers(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_get(client, monkeypatch, {"id": "1", "desc": "offers", "status": "ok"})
    result = await client.mobile_center_fetch_offers({"msisdn": "254708374149"})
    assert result.id == "1"
    await client.close()


@pytest.mark.anyio
async def test_async_mobile_center_purchase(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {"header": {"responseCode": 0}})
    result = await client.mobile_center_purchase({
        "offeringId": "o1", "accountId": "a1", "price": "100",
        "resourceAmount": "10", "validity": "30", "msisdn": "254708374149", "transactionId": "t1",
    })
    assert result.header.responseCode == 0
    await client.close()


@pytest.mark.anyio
async def test_async_mobile_center_status(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_get(client, monkeypatch, {
        "responseId": "r1", "responseDesc": "ok",
        "responseStatus": "SUCCESS", "responseCreated": "2024-01-01",
    })
    result = await client.mobile_center_status({"id": "1", "serviceAccountId": "a1"})
    assert result.responseStatus == "SUCCESS"
    await client.close()


@pytest.mark.anyio
async def test_async_age_on_network(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "requestRefID": "r1", "responseCode": "0", "responseDesc": "ok",
        "msisdnRegistrationDate": "2020-01-01", "customerNumber": "254708374149",
    })
    result = await client.age_on_network({"customerNumber": "254708374149"})
    assert result.responseCode == "0"
    await client.close()


@pytest.mark.anyio
async def test_async_mobile_number_validation(monkeypatch):
    client = AsyncMpesa(make_config())
    await capture_post(client, monkeypatch, {
        "responseRefID": "r1", "responseCode": "0",
        "responseMessage": "ok", "status": "VALID",
    })
    result = await client.mobile_number_validation({
        "shortCode": "600984", "msisdn": "254708374149",
        "idType": "NATIONAL_ID", "idNumber": "12345678",
    })
    assert result.status == "VALID"
    await client.close()


@pytest.mark.anyio
async def test_async_rotate_credentials():
    client = AsyncMpesa(make_config())
    await client.rotate_credentials("new-key", "new-secret")
    assert client._config.consumer_key == "new-key"
    assert client._config.consumer_secret == "new-secret"
    await client.close()


@pytest.mark.anyio
async def test_async_context_manager():
    async with AsyncMpesa(make_config()) as client:
        assert client._client is not None
    assert client._client.is_closed


@pytest.mark.anyio
async def test_async_token_manager_shared_cache():
    cache = InMemorySharedTokenCache()
    cache.set("mpesa:token:test-key", "cached-token", 300)
    client = AsyncMpesa(make_config(shared_token_cache=cache))
    try:
        token = await client._token_manager.get_token()
        assert token == "cached-token"
        client._token_manager.invalidate()
        assert client._token_manager._token is None
    finally:
        await client.close()
        cache.dispose()