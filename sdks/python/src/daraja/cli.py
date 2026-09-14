"""Command-line interface for the M-Pesa Daraja API.

Mirrors the TypeScript SDK's `mpesa` CLI commands.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Any

from daraja import Mpesa
from daraja.models import (
    AccountBalanceRequest,
    MpesaConfig,
    STKPushRequest,
    STKQueryRequest,
    TransactionStatusRequest,
)

VERSION = "0.2.0"  # x-release-please-version


def _client(args: argparse.Namespace) -> Mpesa:
    config = MpesaConfig(
        consumer_key=args.consumer_key,
        consumer_secret=args.consumer_secret,
        environment=args.env,
        passkey=getattr(args, "passkey", None),
        initiator_name=getattr(args, "initiator", None),
        initiator_password=getattr(args, "initiator_password", None),
        security_credential=getattr(args, "credential", None),
    )
    return Mpesa(config)


def _require(*values: Any) -> None:
    if any(v is None or v == "" for v in values):
        raise ValueError("missing required option(s)")


def _print(data: Any) -> None:
    print(json.dumps(data, indent=2, default=str))


def cmd_token(args: argparse.Namespace) -> None:
    _require(args.consumer_key, args.consumer_secret)
    with _client(args) as mpesa:
        token = mpesa.get_access_token()
    _print({"access_token": token, "environment": args.env})


def cmd_health(args: argparse.Namespace) -> None:
    _require(args.consumer_key, args.consumer_secret)
    start = time.time()
    try:
        with _client(args) as mpesa:
            mpesa.get_access_token()
        result: dict[str, Any] = {
            "status": "healthy",
            "environment": args.env,
            "latency_ms": int((time.time() - start) * 1000),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    except Exception as e:  # pragma: no cover - error path
        result = {
            "status": "unhealthy",
            "environment": args.env,
            "error": str(e),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        sys.exit(1)
    _print(result)


def cmd_stk_push(args: argparse.Namespace) -> None:
    _require(
        args.consumer_key,
        args.consumer_secret,
        args.shortcode,
        args.passkey,
        args.phone,
        args.amount,
    )
    request = STKPushRequest(
        BusinessShortCode=args.shortcode,
        TransactionType="CustomerPayBillOnline",
        Amount=args.amount,
        PartyA=int(args.phone),
        PartyB=int(args.shortcode),
        PhoneNumber=int(args.phone),
        CallBackURL=args.callback,
        AccountReference=args.reference,
        TransactionDesc=args.description,
    )
    with _client(args) as mpesa:
        result = mpesa.stk_push(request)
    _print(result.model_dump())


def cmd_stk_query(args: argparse.Namespace) -> None:
    _require(
        args.consumer_key,
        args.consumer_secret,
        args.shortcode,
        args.passkey,
        args.checkout_id,
    )
    request = STKQueryRequest(
        BusinessShortCode=str(args.shortcode),
        CheckoutRequestID=args.checkout_id,
    )
    with _client(args) as mpesa:
        result = mpesa.stk_query(request)
    _print(result.model_dump())


def cmd_transaction_status(args: argparse.Namespace) -> None:
    _require(
        args.consumer_key,
        args.consumer_secret,
        args.shortcode,
        args.transaction_id,
        args.initiator,
        args.credential,
    )
    request = TransactionStatusRequest(
        Initiator=args.initiator,
        SecurityCredential=args.credential,
        CommandID="TransactionStatusQuery",
        TransactionID=args.transaction_id,
        PartyA=int(args.shortcode),
        IdentifierType=args.identifier_type,
        Remarks="CLI query",
        QueueTimeOutURL=args.timeout,
        ResultURL=args.result,
    )
    with _client(args) as mpesa:
        result = mpesa.transaction_status(request)
    _print(result.model_dump())


def cmd_account_balance(args: argparse.Namespace) -> None:
    _require(
        args.consumer_key,
        args.consumer_secret,
        args.shortcode,
        args.initiator,
        args.credential,
    )
    request = AccountBalanceRequest(
        Initiator=args.initiator,
        SecurityCredential=args.credential,
        CommandID="AccountBalance",
        PartyA=int(args.shortcode),
        IdentifierType=args.identifier_type,
        Remarks="CLI balance query",
        QueueTimeOutURL=args.timeout,
        ResultURL=args.result,
    )
    with _client(args) as mpesa:
        result = mpesa.account_balance(request)
    _print(result.model_dump())


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="mpesa", description="M-Pesa Daraja API CLI")
    parser.add_argument("--version", action="version", version=VERSION)
    sub = parser.add_subparsers(dest="command", required=True)

    creds = ["--consumer-key", "--consumer-secret", "--env"]

    p = sub.add_parser("token", help="Generate OAuth access token")
    for opt in creds:
        required = opt != "--env"
        p.add_argument(opt, required=required, default="sandbox" if not required else None)
    p.set_defaults(func=cmd_token)

    p = sub.add_parser("health", help="Check API health by acquiring a test token")
    for opt in creds:
        required = opt != "--env"
        p.add_argument(opt, required=required, default="sandbox" if not required else None)
    p.set_defaults(func=cmd_health)

    p = sub.add_parser("stk-push", help="Send STK Push payment request")
    p.add_argument("--consumer-key", required=True)
    p.add_argument("--consumer-secret", required=True)
    p.add_argument("--shortcode", type=int, required=True)
    p.add_argument("--passkey", required=True)
    p.add_argument("--phone", type=int, required=True)
    p.add_argument("--amount", type=int, required=True)
    p.add_argument("--env", default="sandbox")
    p.add_argument("--callback", default="https://example.com/callback")
    p.add_argument("--reference", default="cli-test")
    p.add_argument("--description", default="CLI payment")
    p.set_defaults(func=cmd_stk_push)

    p = sub.add_parser("stk-query", help="Query STK Push status")
    p.add_argument("--consumer-key", required=True)
    p.add_argument("--consumer-secret", required=True)
    p.add_argument("--shortcode", type=int, required=True)
    p.add_argument("--passkey", required=True)
    p.add_argument("--checkout-id", required=True)
    p.add_argument("--env", default="sandbox")
    p.set_defaults(func=cmd_stk_query)

    p = sub.add_parser("transaction-status", help="Query transaction status")
    p.add_argument("--consumer-key", required=True)
    p.add_argument("--consumer-secret", required=True)
    p.add_argument("--shortcode", type=int, required=True)
    p.add_argument("--transaction-id", required=True)
    p.add_argument("--initiator", required=True)
    p.add_argument("--credential", required=True)
    p.add_argument("--env", default="sandbox")
    p.add_argument("--identifier-type", type=int, default=4)
    p.add_argument("--timeout", default="https://example.com/timeout")
    p.add_argument("--result", default="https://example.com/result")
    p.set_defaults(func=cmd_transaction_status)

    p = sub.add_parser("account-balance", help="Query account balance")
    p.add_argument("--consumer-key", required=True)
    p.add_argument("--consumer-secret", required=True)
    p.add_argument("--shortcode", type=int, required=True)
    p.add_argument("--initiator", required=True)
    p.add_argument("--credential", required=True)
    p.add_argument("--env", default="sandbox")
    p.add_argument("--identifier-type", type=int, default=4)
    p.add_argument("--timeout", default="https://example.com/timeout")
    p.add_argument("--result", default="https://example.com/result")
    p.set_defaults(func=cmd_account_balance)

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except SystemExit:
        raise
    except Exception as e:  # pragma: no cover - error path
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
