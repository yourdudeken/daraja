from mpesa import Mpesa


class TestClientInitialization:
    def test_init_with_dict(self):
        client = Mpesa({
            "consumer_key": "test-key",
            "consumer_secret": "test-secret",
            "environment": "sandbox",
            "passkey": "test-passkey",
        })
        assert client._config.consumer_key == "test-key"
        assert client._config.environment == "sandbox"
        client.close()

    def test_init_with_env(self):
        client = Mpesa({
            "consumer_key": "key",
            "consumer_secret": "secret",
            "environment": "production",
        })
        assert client._config.environment == "production"
        client.close()
