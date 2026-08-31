# B2B (Business to Business)

Moves funds between two business accounts (Buy Goods or Pay Bill).

## Endpoints

- Buy Goods: `POST /mpesa/b2b/v3/buygoods`
- Pay Bill: `POST /mpesa/b2b/v3/paybill`

## Request fields

- `Initiator`, `SecurityCredential`, `CommandID`, `SenderIdentifierType`,
  `RecieverIdentifierType`, `Amount`, `PartyA`, `PartyB`, `AccountReference`,
  `Remarks`, `QueueTimeOutURL`, `ResultURL`
