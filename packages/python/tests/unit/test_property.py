from hypothesis import given, strategies as st
from mpesa.utils import (
    is_phone_number_valid,
    format_phone_number,
    mask_sensitive_data,
)
from mpesa.utils.idempotency import generate_idempotency_key


class TestPhoneNumberProperties:
    @given(st.text(min_size=1))
    def test_valid_numbers_must_start_with_2547(self, phone: str) -> None:
        valid = is_phone_number_valid(phone)
        if valid:
            assert phone.startswith("2547")
            assert len(phone) == 12

    @given(st.one_of(
        st.integers(min_value=700000000, max_value=799999999).map(str),
        st.from_regex(r"^0?7\d{8}\Z"),
        st.from_regex(r"^2547\d{8}\Z"),
    ))
    def test_format_phone_number_produces_valid(self, phone: str) -> None:
        formatted = format_phone_number(phone)
        assert len(formatted) == 12
        assert formatted.startswith("2547")
        assert formatted.isdigit()


class TestMaskingProperties:
    @given(st.dictionaries(
        st.sampled_from(["consumerKey", "Password", "SecurityCredential", "other"]),
        st.text(min_size=1, max_size=20),
        min_size=1, max_size=5,
    ))
    def test_sensitive_fields_masked(self, data: dict) -> None:
        masked = mask_sensitive_data(data)
        for key in ("consumerKey", "Password", "SecurityCredential"):
            if key in data:
                val = str(masked[key])
                assert "****" in val


class TestIdempotencyKeyProperties:
    @given(
        method=st.text(min_size=1, max_size=10),
        url=st.text(min_size=1, max_size=50),
        body=st.dictionaries(st.text(min_size=1), st.integers(), min_size=0, max_size=5),
    )
    def test_deterministic(self, method: str, url: str, body: dict) -> None:
        key1 = generate_idempotency_key(method, url, body)
        key2 = generate_idempotency_key(method, url, body)
        assert key1 == key2

    @given(
        m1=st.text(min_size=1, max_size=5),
        u1=st.text(min_size=1, max_size=10),
        m2=st.text(min_size=1, max_size=5),
        u2=st.text(min_size=1, max_size=10),
    )
    def test_different_inputs_produce_different_keys(self, m1: str, u1: str, m2: str, u2: str) -> None:
        if m1 == m2 and u1 == u2:
            return
        key1 = generate_idempotency_key(m1, u1, {})
        key2 = generate_idempotency_key(m2, u2, {})
        assert key1 != key2
