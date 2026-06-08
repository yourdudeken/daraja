package services

import (
	"context"
	"fmt"

	"github.com/yourdudeken/mpesa-sdk/go/client"
	svctypes "github.com/yourdudeken/mpesa-sdk/go/services/types"
	"github.com/yourdudeken/mpesa-sdk/go/types"
)

type Service struct {
	client *client.Client
}

func NewService(c *client.Client) *Service {
	return &Service{client: c}
}

func (s *Service) STKPush(ctx context.Context, input svctypes.STKPushInput) (*svctypes.STKPushResult, error) {
	req := types.STKPushRequest{
		BusinessShortCode: input.BusinessShortCode,
		TransactionType:   input.TransactionType,
		Amount:            input.Amount,
		PartyA:            input.PartyA,
		PartyB:            input.PartyB,
		PhoneNumber:       input.PhoneNumber,
		CallBackURL:       input.CallBackURL,
		AccountReference:  input.AccountReference,
		TransactionDesc:   input.TransactionDesc,
	}
	resp, err := s.client.STKPush(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.STKPushResult{
		CheckoutRequestID:   resp.CheckoutRequestID,
		MerchantRequestID:   resp.MerchantRequestID,
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		CustomerMessage:     resp.CustomerMessage,
	}, nil
}

func (s *Service) STKQuery(ctx context.Context, input svctypes.STKQueryInput) (*svctypes.STKQueryResult, error) {
	req := types.STKQueryRequest{
		BusinessShortCode: fmt.Sprintf("%d", input.BusinessShortCode),
		CheckoutRequestID: input.CheckoutRequestID,
	}
	resp, err := s.client.STKQuery(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.STKQueryResult{
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		MerchantRequestID:   resp.MerchantRequestID,
		CheckoutRequestID:   resp.CheckoutRequestID,
		ResultCode:          resp.ResultCode,
		ResultDesc:          resp.ResultDesc,
	}, nil
}

func (s *Service) C2BRegisterURL(ctx context.Context, input svctypes.C2BRegisterURLInput) (*svctypes.C2BResult, error) {
	req := types.C2BRegisterURLRequest{
		ShortCode:       input.ShortCode,
		ResponseType:    input.ResponseType,
		ConfirmationURL: input.ConfirmationURL,
		ValidationURL:   input.ValidationURL,
	}
	resp, err := s.client.C2BRegisterURL(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.C2BResult{
		OriginatorConversationID: resp.OriginatorCoversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) C2BSimulate(ctx context.Context, input svctypes.C2BSimulateInput) (*svctypes.C2BResult, error) {
	req := types.C2BSimulateRequest{
		ShortCode:     input.ShortCode,
		CommandID:     input.CommandID,
		Amount:        input.Amount,
		Msisdn:        input.Msisdn,
		BillRefNumber: input.BillRefNumber,
	}
	resp, err := s.client.C2BSimulate(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.C2BResult{
		OriginatorConversationID: resp.OriginatorCoversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) B2C(ctx context.Context, input svctypes.B2CInput) (*svctypes.B2CResult, error) {
	req := types.B2CRequest{
		InitiatorName:      input.InitiatorName,
		SecurityCredential: input.SecurityCredential,
		CommandID:          input.CommandID,
		Amount:             input.Amount,
		PartyA:             input.PartyA,
		PartyB:             input.PartyB,
		Remarks:            input.Remarks,
		QueueTimeOutURL:    input.QueueTimeOutURL,
		ResultURL:          input.ResultURL,
		Occassion:          input.Occassion,
	}
	resp, err := s.client.B2C(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.B2CResult{
		ConversationID:           resp.ConversationID,
		OriginatorConversationID: resp.OriginatorConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) B2B(ctx context.Context, input svctypes.B2BInput) (*svctypes.B2BResult, error) {
	req := types.B2BRequest{
		Initiator:              input.Initiator,
		SecurityCredential:     input.SecurityCredential,
		CommandID:              input.CommandID,
		SenderIdentifierType:   input.SenderIdentifierType,
		RecieverIdentifierType: input.RecieverIdentifierType,
		Amount:                 input.Amount,
		PartyA:                 input.PartyA,
		PartyB:                 input.PartyB,
		Requester:              input.Requester,
		AccountReference:       input.AccountReference,
		Remarks:                input.Remarks,
		QueueTimeOutURL:        input.QueueTimeOutURL,
		ResultURL:              input.ResultURL,
		Occassion:              input.Occassion,
	}
	resp, err := s.client.B2B(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.B2BResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) Reversal(ctx context.Context, input svctypes.ReversalInput) (*svctypes.ReversalResult, error) {
	req := types.ReversalRequest{
		Initiator:          input.Initiator,
		SecurityCredential: input.SecurityCredential,
		CommandID:          "TransactionReversal",
		TransactionID:      input.TransactionID,
		Amount:             input.Amount,
		ReceiverParty:      input.ReceiverParty,
		QueueTimeOutURL:    input.QueueTimeOutURL,
		ResultURL:          input.ResultURL,
		Remarks:            input.Remarks,
	}
	resp, err := s.client.Reversal(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.ReversalResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) TransactionStatus(ctx context.Context, input svctypes.TransactionStatusInput) (*svctypes.TransactionStatusResult, error) {
	req := types.TransactionStatusRequest{
		Initiator:              input.Initiator,
		SecurityCredential:     input.SecurityCredential,
		CommandID:              "TransactionStatusQuery",
		TransactionID:          input.TransactionID,
		OriginalConversationID: input.OriginalConversationID,
		PartyA:                 input.PartyA,
		IdentifierType:         4,
		ResultURL:              input.ResultURL,
		QueueTimeOutURL:        input.QueueTimeOutURL,
		Remarks:                input.Remarks,
	}
	resp, err := s.client.TransactionStatus(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.TransactionStatusResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) AccountBalance(ctx context.Context, input svctypes.AccountBalanceInput) (*svctypes.AccountBalanceResult, error) {
	req := types.AccountBalanceRequest{
		Initiator:          input.Initiator,
		SecurityCredential: input.SecurityCredential,
		CommandID:          "AccountBalance",
		PartyA:             input.PartyA,
		IdentifierType:     4,
		Remarks:            input.Remarks,
		QueueTimeOutURL:    input.QueueTimeOutURL,
		ResultURL:          input.ResultURL,
	}
	resp, err := s.client.AccountBalance(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.AccountBalanceResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) BusinessBuyGoods(ctx context.Context, input svctypes.BusinessBuyGoodsInput) (*svctypes.BusinessGoodsResult, error) {
	req := types.BusinessBuyGoodsRequest{
		ShortCode:     input.ShortCode,
		CommandID:     "SimulateC2BTrans",
		Amount:        input.Amount,
		Msisdn:        input.Msisdn,
		BillRefNumber: input.BillRefNumber,
	}
	resp, err := s.client.BusinessBuyGoods(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BusinessGoodsResult{
		MerchantRequestID:   resp.MerchantRequestID,
		CheckoutRequestID:   resp.CheckoutRequestID,
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		CustomerMessage:     resp.CustomerMessage,
	}, nil
}

func (s *Service) BusinessPayBill(ctx context.Context, input svctypes.BusinessPayBillInput) (*svctypes.BusinessGoodsResult, error) {
	req := types.BusinessPayBillRequest{
		ShortCode:     input.ShortCode,
		CommandID:     "SimulateC2BTrans",
		Amount:        input.Amount,
		Msisdn:        input.Msisdn,
		BillRefNumber: input.BillRefNumber,
	}
	resp, err := s.client.BusinessPayBill(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BusinessGoodsResult{
		MerchantRequestID:   resp.MerchantRequestID,
		CheckoutRequestID:   resp.CheckoutRequestID,
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		CustomerMessage:     resp.CustomerMessage,
	}, nil
}

func (s *Service) QueryOrgInfo(ctx context.Context, _ svctypes.QueryOrgInfoInput) (*svctypes.QueryOrgInfoResult, error) {
	req := types.QueryOrgInfoRequest{}
	resp, err := s.client.QueryOrgInfo(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.QueryOrgInfoResult{
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		Organization:        resp.Organization,
		Accounts:            resp.Accounts,
		APIAccess:           resp.APIAccess,
	}, nil
}

func (s *Service) IMSI(ctx context.Context, input svctypes.IMSIInput) (*svctypes.IMSIResult, error) {
	req := types.IMSIRequest{
		PhoneNumber: input.PhoneNumber,
	}
	resp, err := s.client.IMSI(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IMSIResult{
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		PhoneNumber:         resp.PhoneNumber,
		IMSI:                resp.IMSI,
		SubscriberStatus:    resp.SubscriberStatus,
		NetworkOperator:     resp.NetworkOperator,
	}, nil
}

func (s *Service) IoTManage(ctx context.Context, input svctypes.IoTInput) (*svctypes.IoTResult, error) {
	req := types.IoTSIMRequest{
		InitiatorName:      input.InitiatorName,
		SecurityCredential: input.SecurityCredential,
		CommandID:          input.CommandID,
		ICCID:              input.ICCID,
		IMEI:               input.IMEI,
		DeviceName:         input.DeviceName,
		DeviceLocation:     input.DeviceLocation,
		DataPlan:           input.DataPlan,
		BillingCycle:       input.BillingCycle,
	}
	resp, err := s.client.IoTManage(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTResult{
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		ICCID:               resp.ICCID,
		Status:              resp.Status,
		ActivationDate:      resp.ActivationDate,
		DataPlan:            resp.DataPlan,
		ExpiryDate:          resp.ExpiryDate,
	}, nil
}

func (s *Service) B2Pochi(ctx context.Context, input svctypes.B2PochiInput) (*svctypes.B2PochiResult, error) {
	req := types.B2PochiRequest{
		InitiatorName:      input.InitiatorName,
		SecurityCredential: input.SecurityCredential,
		CommandID:          input.CommandID,
		Amount:             input.Amount,
		SenderIdentifier:   input.SenderIdentifier,
		ReceiverIdentifier: input.ReceiverIdentifier,
		PartyA:             input.PartyA,
		PartyB:             input.PartyB,
		AccountReference:   input.AccountReference,
		Remarks:            input.Remarks,
		QueueTimeOutURL:    input.QueueTimeOutURL,
		ResultURL:          input.ResultURL,
	}
	resp, err := s.client.B2Pochi(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.B2PochiResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) LipaNaBonga(ctx context.Context, input svctypes.LipaNaBongaInput) (*svctypes.LipaNaBongaResult, error) {
	req := types.LipaNaBongaRequest{
		PhoneNumber:          input.PhoneNumber,
		Amount:               input.Amount,
		TransactionReference: input.TransactionReference,
		Remarks:              input.Remarks,
	}
	resp, err := s.client.LipaNaBonga(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.LipaNaBongaResult{
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		TransactionID:       resp.TransactionID,
		PhoneNumber:         resp.PhoneNumber,
		PointsRedeemed:      resp.PointsRedeemed,
		CreditAmount:        resp.CreditAmount,
		NewBalance:          resp.NewBalance,
	}, nil
}

func (s *Service) PullTransactions(ctx context.Context, input svctypes.PullTransactionsInput) (*svctypes.PullTransactionsResult, error) {
	req := types.PullTransactionsRequest{
		ShortCode:       input.ShortCode,
		StartDate:       input.StartDate,
		EndDate:         input.EndDate,
		TransactionType: input.TransactionType,
		PageNumber:      input.PageNumber,
		PageSize:        input.PageSize,
	}
	resp, err := s.client.PullTransactions(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.PullTransactionsResult{
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		TotalCount:          resp.TotalCount,
		PageNumber:          resp.PageNumber,
		PageSize:            resp.PageSize,
		Transactions:        resp.Transactions,
	}, nil
}

func (s *Service) Swap(ctx context.Context, input svctypes.SwapInput) (*svctypes.SwapResult, error) {
	req := types.SwapRequest{
		InitiatorName:      input.InitiatorName,
		SecurityCredential: input.SecurityCredential,
		CommandID:          input.CommandID,
		Amount:             input.Amount,
		SourceAccount:      input.SourceAccount,
		TargetAccount:      input.TargetAccount,
		Remarks:            input.Remarks,
	}
	resp, err := s.client.Swap(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.SwapResult{
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		TransactionID:       resp.TransactionID,
		Amount:              resp.Amount,
		SourceAccount:       resp.SourceAccount,
		TargetAccount:       resp.TargetAccount,
		Timestamp:           resp.Timestamp,
		NewSourceBalance:    resp.NewSourceBalance,
		NewTargetBalance:    resp.NewTargetBalance,
	}, nil
}

func (s *Service) BillManager(ctx context.Context, input svctypes.BillManagerInput) (*svctypes.BillManagerResult, error) {
	req := types.BillManagerRequest{
		BillRefName:      input.BillRefName,
		DueDate:          input.DueDate,
		Amount:           input.Amount,
		InvoiceNumber:    input.InvoiceNumber,
		AccountReference: input.AccountReference,
		PhoneNumber:      input.PhoneNumber,
		Email:            input.Email,
		Description:      input.Description,
	}
	resp, err := s.client.BillManager(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BillManagerResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) B2BExpress(ctx context.Context, input svctypes.B2BExpressInput) (*svctypes.B2BExpressResult, error) {
	req := types.B2BExpressRequest{
		InitiatorName:          input.InitiatorName,
		SecurityCredential:     input.SecurityCredential,
		CommandID:              input.CommandID,
		SenderIdentifierType:   input.SenderIdentifierType,
		RecieverIdentifierType: input.RecieverIdentifierType,
		Amount:                 input.Amount,
		PartyA:                 input.PartyA,
		PartyB:                 input.PartyB,
		AccountReference:       input.AccountReference,
		Remarks:                input.Remarks,
		QueueTimeOutURL:        input.QueueTimeOutURL,
		ResultURL:              input.ResultURL,
	}
	resp, err := s.client.B2BExpress(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.B2BExpressResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) Ratiba(ctx context.Context, input svctypes.RatibaInput) (*svctypes.RatibaResult, error) {
	payments := make([]types.RatibaPayment, len(input.Payments))
	for i, p := range input.Payments {
		payments[i] = types.RatibaPayment{
			EmployeeID:   p.EmployeeID,
			EmployeeName: p.EmployeeName,
			PhoneNumber:  p.PhoneNumber,
			Amount:       p.Amount,
			Remarks:      p.Remarks,
		}
	}
	req := types.RatibaRequest{
		InitiatorName:      input.InitiatorName,
		SecurityCredential: input.SecurityCredential,
		CommandID:          input.CommandID,
		BatchName:          input.BatchName,
		BatchNumber:        input.BatchNumber,
		BatchDescription:   input.BatchDescription,
		ProcessingMethod:   input.ProcessingMethod,
		ScheduleDateTime:   input.ScheduleDateTime,
		Payments:           payments,
	}
	resp, err := s.client.Ratiba(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.RatibaResult{
		BatchID:             resp.BatchID,
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		TotalAmount:         resp.TotalAmount,
		PaymentCount:        resp.PaymentCount,
		ProcessingStatus:    resp.ProcessingStatus,
		ScheduledDateTime:   resp.ScheduledDateTime,
	}, nil
}

func (s *Service) TaxRemittance(ctx context.Context, input svctypes.TaxRemittanceInput) (*svctypes.TaxRemittanceResult, error) {
	req := types.TaxRemittanceRequest{
		InitiatorName:        input.InitiatorName,
		SecurityCredential:   input.SecurityCredential,
		CommandID:            input.CommandID,
		ShortCode:            input.ShortCode,
		TaxType:              input.TaxType,
		KRAPINNumber:         input.KRAPINNumber,
		Amount:               input.Amount,
		TransactionReference: input.TransactionReference,
		Description:          input.Description,
	}
	resp, err := s.client.TaxRemittance(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.TaxRemittanceResult{
		ResponseCode:        resp.ResponseCode,
		ResponseDescription: resp.ResponseDescription,
		TransactionID:       resp.TransactionID,
		KRAPINNumber:        resp.KRAPINNumber,
		TaxType:             resp.TaxType,
		Amount:              resp.Amount,
		ReceiptNumber:       resp.ReceiptNumber,
		PaymentDate:         resp.PaymentDate,
		Status:              resp.Status,
	}, nil
}

func (s *Service) DynamicQR(ctx context.Context, input svctypes.DynamicQRInput) (*svctypes.DynamicQRResult, error) {
	req := types.DynamicQRRequest{
		MerchantName: input.MerchantName,
		RefNo:        input.RefNo,
		Amount:       input.Amount,
		TrxCode:      input.TrxCode,
		CPI:          input.CPI,
		Size:         input.Size,
	}
	resp, err := s.client.DynamicQR(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.DynamicQRResult{
		ResponseCode:        resp.ResponseCode,
		RequestID:           resp.RequestID,
		ResponseDescription: resp.ResponseDescription,
		QRCode:              resp.QRCode,
	}, nil
}
