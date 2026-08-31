STK_CALLBACK_SUCCESS = {
    "Body": {
        "stkCallback": {
            "MerchantRequestID": "29115-34620561-1",
            "CheckoutRequestID": "ws_CO_191220191020363925",
            "ResultCode": 0,
            "ResultDesc": "The service request is processed successfully.",
            "CallbackMetadata": {
                "Item": [
                    {"Name": "Amount", "Value": 1.0},
                    {"Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV"},
                    {"Name": "TransactionDate", "Value": 20191219102115},
                    {"Name": "PhoneNumber", "Value": 254708374149},
                ]
            },
        }
    }
}

STK_CALLBACK_FAILED = {
    "Body": {
        "stkCallback": {
            "MerchantRequestID": "f1e2-4b95-a71d-b30d3cdbb7a7942864",
            "CheckoutRequestID": "ws_CO_21072024125243250722943992",
            "ResultCode": 1032,
            "ResultDesc": "Request cancelled by user",
        }
    }
}

B2C_CALLBACK_SUCCESS = {
    "Result": {
        "ResultType": 0,
        "ResultCode": 0,
        "ResultDesc": "The service request is processed successfully.",
        "OriginatorConversationID": "53e3-4aa8-9fe0-8fb5e4092cdd3533373",
        "ConversationID": "AG_20240706_2010364430d9bbdaf872",
        "TransactionID": "SG632NMUAB",
        "ResultParameters": {
            "ResultParameter": [
                {"Key": "TransactionAmount", "Value": 10},
                {"Key": "TransactionReceipt", "Value": "SG632NMUAB"},
                {"Key": "ReceiverPartyPublicName", "Value": "254705912645 - NICHOLAS JOHN SONGOK"},
                {"Key": "TransactionCompletedDateTime", "Value": "06.07.2024 22:48:52"},
                {"Key": "B2CUtilityAccountAvailableFunds", "Value": 8959269.6},
                {"Key": "B2CWorkingAccountAvailableFunds", "Value": 1199371.0},
                {"Key": "B2CRecipientIsRegisteredCustomer", "Value": "Y"},
                {"Key": "B2CChargesPaidAccountAvailableFunds", "Value": -1980.0},
            ]
        },
        "ReferenceData": {
            "ReferenceItem": {
                "Key": "QueueTimeoutURL",
                "Value": "https://internalsandbox.safaricom.co.ke/mpesa/b2cresults/v1/submit",
            }
        },
    }
}

C2B_VALIDATION_REQUEST = {
    "TransactionType": "Pay Bill",
    "TransID": "RKL51ZDR4F",
    "TransTime": "20231121121325",
    "TransAmount": "5.00",
    "BusinessShortCode": "600966",
    "BillRefNumber": "Sample Transaction",
    "InvoiceNumber": "",
    "OrgAccountBalance": "25.00",
    "ThirdPartyTransID": "",
    "MSISDN": "2547*****126",
    "FirstName": "NICHOLAS",
    "MiddleName": "",
    "LastName": "",
}

ACCOUNT_BALANCE_RESULT = {
    "Result": {
        "ResultType": "0",
        "ResultCode": "0",
        "ResultDesc": "The service request is processed successfully",
        "OriginatorConversationID": "16917-22577599-3",
        "ConversationID": "AG_20200206_00005e091a8ec6b9eac5",
        "TransactionID": "OA90000000",
        "ResultParameters": {
            "ResultParameter": [
                {
                    "Key": "AccountBalance",
                    "Value": "Working Account|KES|700000.00|700000.00|0.00|0.00&Float Account|KES|0.00|0.00|0.00|0.00&Utility Account|KES|228037.00|228037.00|0.00|0.00&Charges Paid Account|KES|-1540.00|-1540.00|0.00|0.00&Organization Settlement Account|KES|0.00|0.00|0.00|0.00",
                },
                {"Key": "BOCompletedTime", "Value": "20200109125710"},
            ]
        },
        "ReferenceData": {
            "ReferenceItem": {
                "Key": "QueueTimeoutURL",
                "Value": "https://internalsandbox.safaricom.co.ke/mpesa/abresults/v1/submit",
            }
        },
    }
}


__all__ = [
    "STK_CALLBACK_SUCCESS",
    "STK_CALLBACK_FAILED",
    "B2C_CALLBACK_SUCCESS",
    "C2B_VALIDATION_REQUEST",
    "ACCOUNT_BALANCE_RESULT",
]
