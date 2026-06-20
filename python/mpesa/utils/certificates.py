import os


def get_cert_path(environment: str) -> str:
    env = environment.lower()
    if env == "production":
        name = "ProductionCertificate.cer"
    else:
        name = "SandboxCertificate.cer"
    return os.path.join(os.path.dirname(__file__), "..", "certificates", name)
