from daraja.exceptions import ValidationError
from daraja.models import B2PochiRequest
from daraja.services import B2PochiService


def _make_request(**overrides) -> B2PochiRequest:
    values = {
        "OriginatorConversationID": "600997_Test_32et3241ed8yu",
        "InitiatorName": "testapi",
        "SecurityCredential": "RC6E9WDxXR4b9X2c6z3gp0oC5Th==",
        "CommandID": "BusinessPayToPochi",
        "Amount": 10,
        "PartyA": 600992,
        "PartyB": 254705912645,
        "Remarks": "remarked",
        "QueueTimeOutURL": "https://mydomain.com/queue",
        "ResultURL": "https://mydomain.com/result",
        "Occassion": "ChristmasPay",
    }
    values.update(overrides)
    return B2PochiRequest(**values)


class TestB2PochiSend:
    def test_send_posts_documented_payload(self) -> None:
        captured = {}

        def post(name: str, data: dict) -> dict:
            captured["name"] = name
            captured["data"] = data
            return {
                "OriginatorConversationID": "600997_Test_32et3241ed8yu",
                "ConversationID": "AG_20240706_20106e9209f64bebd05b",
                "ResponseCode": "0",
                "ResponseDescription": "Accept the service request successfully.",
            }

        svc = B2PochiService(post)
        request = _make_request()
        result = svc.send(request)

        assert captured["name"] == "B2POCHI"
        assert captured["data"]["PartyA"] == 600992
        assert captured["data"]["PartyB"] == 254705912645
        assert captured["data"]["CommandID"] == "BusinessPayToPochi"

        assert result.ResponseCode == "0"
        assert result.ConversationID == "AG_20240706_20106e9209f64bebd05b"

    def test_send_rejects_invalid_party_b(self) -> None:
        svc = B2PochiService(lambda name, data: {})
        try:
            svc.send(_make_request(PartyB=123))
        except ValidationError:
            return
        raise AssertionError("expected ValidationError for invalid PartyB")
