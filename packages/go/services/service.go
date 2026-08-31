package services

import (
	"context"
	"fmt"

	"github.com/yourdudeken/daraja-sdk/go/client"
	svctypes "github.com/yourdudeken/daraja-sdk/go/services/types"
	"github.com/yourdudeken/daraja-sdk/go/types"
	"github.com/yourdudeken/daraja-sdk/go/validation"
)

type Service struct {
	client *client.Client
}

func NewService(c *client.Client) *Service {
	return &Service{client: c}
}

func (s *Service) STKPush(ctx context.Context, input svctypes.STKPushInput) (*svctypes.STKPushResult, error) {
	if err := validation.PhoneNumber(input.PhoneNumber, "PhoneNumber"); err != nil {
		return nil, err
	}
	if err := validation.Amount(int(input.Amount), "Amount", 1, 70000); err != nil {
		return nil, err
	}
	if err := validation.ValidURL(input.CallBackURL, "CallBackURL"); err != nil {
		return nil, err
	}
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
	if err := validation.RequiredInt(input.ShortCode, "ShortCode"); err != nil {
		return nil, err
	}
	if err := validation.Amount(int(input.Amount), "Amount", 1, 70000); err != nil {
		return nil, err
	}
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
	if err := validation.PhoneNumber(input.PartyB, "PartyB"); err != nil {
		return nil, err
	}
	if err := validation.Amount(int(input.Amount), "Amount", 1, 70000); err != nil {
		return nil, err
	}
	cfg := s.client.GetConfig()
	if input.SecurityCredential == "" && cfg.SecurityCredential != "" {
		input.SecurityCredential = cfg.SecurityCredential
	}
	if input.InitiatorName == "" && cfg.InitiatorName != "" {
		input.InitiatorName = cfg.InitiatorName
	}
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

func (s *Service) Reversal(ctx context.Context, input svctypes.ReversalInput) (*svctypes.ReversalResult, error) {
	if err := validation.RequiredString(input.TransactionID, "TransactionID"); err != nil {
		return nil, err
	}
	cfg := s.client.GetConfig()
	if input.SecurityCredential == "" && cfg.SecurityCredential != "" {
		input.SecurityCredential = cfg.SecurityCredential
	}
	if input.Initiator == "" && cfg.InitiatorName != "" {
		input.Initiator = cfg.InitiatorName
	}
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
	if err := validation.RequiredString(input.TransactionID, "TransactionID"); err != nil {
		return nil, err
	}
	cfg := s.client.GetConfig()
	if input.SecurityCredential == "" && cfg.SecurityCredential != "" {
		input.SecurityCredential = cfg.SecurityCredential
	}
	if input.Initiator == "" && cfg.InitiatorName != "" {
		input.Initiator = cfg.InitiatorName
	}
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
	if err := validation.RequiredInt(input.PartyA, "PartyA"); err != nil {
		return nil, err
	}
	cfg := s.client.GetConfig()
	if input.SecurityCredential == "" && cfg.SecurityCredential != "" {
		input.SecurityCredential = cfg.SecurityCredential
	}
	if input.Initiator == "" && cfg.InitiatorName != "" {
		input.Initiator = cfg.InitiatorName
	}
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
	if err := validation.Amount(int(input.Amount), "Amount", 1, 70000); err != nil {
		return nil, err
	}
	cfg := s.client.GetConfig()
	if input.SecurityCredential == "" && cfg.SecurityCredential != "" {
		input.SecurityCredential = cfg.SecurityCredential
	}
	if input.Initiator == "" && cfg.InitiatorName != "" {
		input.Initiator = cfg.InitiatorName
	}
	req := types.BusinessBuyGoodsRequest{
		Initiator:              input.Initiator,
		SecurityCredential:     input.SecurityCredential,
		CommandID:              "BusinessBuyGoods",
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
	resp, err := s.client.BusinessBuyGoods(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BusinessGoodsResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) BusinessPayBill(ctx context.Context, input svctypes.BusinessPayBillInput) (*svctypes.BusinessGoodsResult, error) {
	if err := validation.Amount(int(input.Amount), "Amount", 1, 70000); err != nil {
		return nil, err
	}
	cfg := s.client.GetConfig()
	if input.SecurityCredential == "" && cfg.SecurityCredential != "" {
		input.SecurityCredential = cfg.SecurityCredential
	}
	if input.Initiator == "" && cfg.InitiatorName != "" {
		input.Initiator = cfg.InitiatorName
	}
	req := types.BusinessPayBillRequest{
		Initiator:              input.Initiator,
		SecurityCredential:     input.SecurityCredential,
		CommandID:              "BusinessPayBill",
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
	resp, err := s.client.BusinessPayBill(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BusinessGoodsResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
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
		CustomerNumber: input.CustomerNumber,
	}
	resp, err := s.client.IMSI(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IMSIResult{
		RequestRefID:           resp.RequestRefID,
		ResponseCode:           resp.ResponseCode,
		ResponseDesc:           resp.ResponseDesc,
		IMSI:                   resp.IMSI,
		LastSwapDate:           resp.LastSwapDate,
		MsisdnRegistrationDate: resp.MsisdnRegistrationDate,
		CustomerNumber:         resp.CustomerNumber,
	}, nil
}

func (s *Service) IoTGetAllSIMs(ctx context.Context, input svctypes.IoTGetAllSIMsInput) (*svctypes.IoTGetAllSIMsResult, error) {
	req := types.IoTGetAllSIMsRequest{
		VpnGroup:     input.VpnGroup,
		StartAtIndex: input.StartAtIndex,
		PageSize:     input.PageSize,
		Username:     input.Username,
	}
	resp, err := s.client.IoTGetAllSIMs(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTGetAllSIMsResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTQueryLifeCycle(ctx context.Context, input svctypes.IoTQueryLifeCycleInput) (*svctypes.IoTQueryLifeCycleResult, error) {
	req := types.IoTQueryLifeCycleRequest{
		Msisdn:   input.Msisdn,
		VpnGroup: input.VpnGroup,
		Username: input.Username,
	}
	resp, err := s.client.IoTQueryLifeCycle(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTQueryLifeCycleResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTQueryCustomerInfo(ctx context.Context, input svctypes.IoTQueryCustomerInfoInput) (*svctypes.IoTQueryCustomerInfoResult, error) {
	req := types.IoTQueryCustomerInfoRequest{
		Msisdn:   input.Msisdn,
		VpnGroup: input.VpnGroup,
		Username: input.Username,
	}
	resp, err := s.client.IoTQueryCustomerInfo(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTQueryCustomerInfoResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTSimActivation(ctx context.Context, input svctypes.IoTSimActivationInput) (*svctypes.IoTSimActivationResult, error) {
	req := types.IoTSimActivationRequest{
		Msisdn:   input.Msisdn,
		VpnGroup: input.VpnGroup,
		Username: input.Username,
	}
	resp, err := s.client.IoTSimActivation(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTSimActivationResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTGetActivationTrends(ctx context.Context, input svctypes.IoTGetActivationTrendsInput) (*svctypes.IoTGetActivationTrendsResult, error) {
	req := types.IoTGetActivationTrendsRequest{
		VpnGroup:  input.VpnGroup,
		StartDate: input.StartDate,
		StopDate:  input.StopDate,
		Username:  input.Username,
	}
	resp, err := s.client.IoTGetActivationTrends(ctx, req)
	if err != nil {
		return nil, err
	}
	bodyBytes, _ := resp.Body.MarshalJSON()
	return &svctypes.IoTGetActivationTrendsResult{
		Header: resp.Header,
		Body:   bodyBytes,
	}, nil
}

func (s *Service) IoTRenameAsset(ctx context.Context, input svctypes.IoTRenameAssetInput) (*svctypes.IoTRenameAssetResult, error) {
	req := types.IoTRenameAssetRequest{
		Msisdn:    input.Msisdn,
		VpnGroup:  input.VpnGroup,
		Username:  input.Username,
		AssetName: input.AssetName,
	}
	resp, err := s.client.IoTRenameAsset(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTRenameAssetResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTSuspendUnsuspend(ctx context.Context, input svctypes.IoTSuspendUnsuspendInput) (*svctypes.IoTSuspendUnsuspendResult, error) {
	req := types.IoTSuspendUnsuspendRequest{
		Msisdn:    input.Msisdn,
		Username:  input.Username,
		VpnGroup:  input.VpnGroup,
		Product:   input.Product,
		Operation: input.Operation,
	}
	resp, err := s.client.IoTSuspendUnsuspend(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTSuspendUnsuspendResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTSearchMessages(ctx context.Context, input svctypes.IoTSearchMessagesInput) (*svctypes.IoTSearchMessagesResult, error) {
	req := types.IoTSearchMessagesRequest{
		SearchValue: input.SearchValue,
	}
	resp, err := s.client.IoTSearchMessages(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTSearchMessagesResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTFilterMessages(ctx context.Context, input svctypes.IoTFilterMessagesInput) (*svctypes.IoTFilterMessagesResult, error) {
	req := types.IoTFilterMessagesRequest{
		StartDate: input.StartDate,
		EndDate:   input.EndDate,
		Status:    input.Status,
	}
	resp, err := s.client.IoTFilterMessages(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTFilterMessagesResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTDeleteMessageThread(ctx context.Context, input svctypes.IoTDeleteMessageThreadInput) (*svctypes.IoTDeleteMessageThreadResult, error) {
	req := types.IoTDeleteMessageThreadRequest{
		Msisdn: input.Msisdn,
	}
	resp, err := s.client.IoTDeleteMessageThread(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTDeleteMessageThreadResult{
		Header: resp.Header,
	}, nil
}

func (s *Service) IoTGetAllMessages(ctx context.Context, input svctypes.IoTGetAllMessagesInput) (*svctypes.IoTGetAllMessagesResult, error) {
	req := types.IoTGetAllMessagesRequest{
		VpnGroup: input.VpnGroup,
		PageNo:   input.PageNo,
		PageSize: input.PageSize,
	}
	resp, err := s.client.IoTGetAllMessages(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTGetAllMessagesResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTSendSingleMessage(ctx context.Context, input svctypes.IoTSendSingleMessageInput) (*svctypes.IoTSendSingleMessageResult, error) {
	req := types.IoTSendSingleMessageRequest{
		Msisdn:   input.Msisdn,
		Message:  input.Message,
		VpnGroup: input.VpnGroup,
	}
	resp, err := s.client.IoTSendSingleMessage(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTSendSingleMessageResult{
		Header: resp.Header,
		Body:   resp.Body,
	}, nil
}

func (s *Service) IoTDeleteMessage(ctx context.Context, input svctypes.IoTDeleteMessageInput) (*svctypes.IoTDeleteMessageResult, error) {
	req := types.IoTDeleteMessageRequest{
		ID: input.ID,
	}
	resp, err := s.client.IoTDeleteMessage(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.IoTDeleteMessageResult{
		Header: resp.Header,
	}, nil
}

func (s *Service) B2Pochi(ctx context.Context, input svctypes.B2PochiInput) (*svctypes.B2PochiResult, error) {
	cfg := s.client.GetConfig()
	if input.SecurityCredential == "" && cfg.SecurityCredential != "" {
		input.SecurityCredential = cfg.SecurityCredential
	}
	if input.InitiatorName == "" && cfg.InitiatorName != "" {
		input.InitiatorName = cfg.InitiatorName
	}
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

func (s *Service) LipaNaBongaCalculate(ctx context.Context, input svctypes.LipaNaBongaCalculateInput) (*svctypes.LipaNaBongaCalculateResult, error) {
	req := types.LipaNaBongaCalculateRequest{
		Points: input.Points,
	}
	resp, err := s.client.LipaNaBongaCalculate(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.LipaNaBongaCalculateResult{
		RequestRefID:    resp.RequestRefID,
		ResponseCode:    resp.ResponseCode,
		ResponseMessage: resp.ResponseMessage,
		CustomerMessage: resp.CustomerMessage,
		Timestamp:       resp.Timestamp,
		Amount:          resp.Amount,
		Points:          resp.Points,
		Rate:            resp.Rate,
	}, nil
}

func (s *Service) LipaNaBongaRedeem(ctx context.Context, input svctypes.LipaNaBongaRedeemInput) (*svctypes.LipaNaBongaRedeemResult, error) {
	req := types.LipaNaBongaRedeemRequest{
		Msisdn:         input.Msisdn,
		Amount:         input.Amount,
		BongaPoints:    input.BongaPoints,
		ConversionRate: input.ConversionRate,
		ShortCode:      input.ShortCode,
		AccountNumber:  input.AccountNumber,
	}
	resp, err := s.client.LipaNaBongaRedeem(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.LipaNaBongaRedeemResult{
		RequestRefID:    resp.RequestRefID,
		ResponseCode:    resp.ResponseCode,
		ResponseMessage: resp.ResponseMessage,
		CustomerMessage: resp.CustomerMessage,
		Timestamp:       resp.Timestamp,
	}, nil
}

func (s *Service) PullTransactionsRegister(ctx context.Context, input svctypes.PullTransactionsRegisterInput) (*svctypes.PullTransactionsRegisterResult, error) {
	req := types.PullTransactionsRegisterRequest{
		ShortCode:       input.ShortCode,
		RequestType:     input.RequestType,
		NominatedNumber: input.NominatedNumber,
		CallBackURL:     input.CallBackURL,
	}
	resp, err := s.client.PullTransactionsRegister(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.PullTransactionsRegisterResult{
		ResponseRefID:       resp.ResponseRefID,
		ResponseStatus:      resp.ResponseStatus,
		ShortCode:           resp.ShortCode,
		ResponseDescription: resp.ResponseDescription,
	}, nil
}

func (s *Service) PullTransactionsQuery(ctx context.Context, input svctypes.PullTransactionsQueryInput) (*svctypes.PullTransactionsQueryResult, error) {
	req := types.PullTransactionsQueryRequest{
		ShortCode:   input.ShortCode,
		StartDate:   input.StartDate,
		EndDate:     input.EndDate,
		OffSetValue: input.OffSetValue,
	}
	resp, err := s.client.PullTransactionsQuery(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.PullTransactionsQueryResult{
		ResponseRefID:   resp.ResponseRefID,
		ResponseCode:    resp.ResponseCode,
		ResponseMessage: resp.ResponseMessage,
		Response:        resp.Response,
	}, nil
}

func (s *Service) Swap(ctx context.Context, input svctypes.SwapInput) (*svctypes.SwapResult, error) {
	req := types.SwapRequest{
		CustomerNumber: input.CustomerNumber,
	}
	resp, err := s.client.Swap(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.SwapResult{
		RequestRefID: resp.RequestRefID,
		ResponseCode: resp.ResponseCode,
		ResponseDesc: resp.ResponseDesc,
		LastSwapDate: resp.LastSwapDate,
	}, nil
}

func (s *Service) B2BExpress(ctx context.Context, input svctypes.B2BExpressInput) (*svctypes.B2BExpressResult, error) {
	req := types.B2BExpressRequest{
		PrimaryShortCode:  input.PrimaryShortCode,
		ReceiverShortCode: input.ReceiverShortCode,
		Amount:            input.Amount,
		PaymentRef:        input.PaymentRef,
		CallbackUrl:       input.CallbackUrl,
		PartnerName:       input.PartnerName,
		RequestRefID:      input.RequestRefID,
	}
	resp, err := s.client.B2BExpress(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.B2BExpressResult{
		Code:   resp.Code,
		Status: resp.Status,
	}, nil
}

func (s *Service) AccountTopUp(ctx context.Context, input svctypes.B2CAccountTopUpInput) (*svctypes.B2CAccountTopUpResult, error) {
	cfg := s.client.GetConfig()
	if input.SecurityCredential == "" && cfg.SecurityCredential != "" {
		input.SecurityCredential = cfg.SecurityCredential
	}
	if input.Initiator == "" && cfg.InitiatorName != "" {
		input.Initiator = cfg.InitiatorName
	}
	req := types.B2CAccountTopUpRequest{
		Initiator:              input.Initiator,
		SecurityCredential:     input.SecurityCredential,
		CommandID:              input.CommandID,
		SenderIdentifierType:   input.SenderIdentifierType,
		RecieverIdentifierType: input.RecieverIdentifierType,
		Amount:                 input.Amount,
		PartyA:                 input.PartyA,
		PartyB:                 input.PartyB,
		AccountReference:       input.AccountReference,
		Requester:              input.Requester,
		Remarks:                input.Remarks,
		QueueTimeOutURL:        input.QueueTimeOutURL,
		ResultURL:              input.ResultURL,
	}
	resp, err := s.client.AccountTopUp(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.B2CAccountTopUpResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
	}, nil
}

func (s *Service) BillManagerOptin(ctx context.Context, input svctypes.BillManagerOptinInput) (*svctypes.BillManagerOptinResult, error) {
	req := types.BillManagerOptinRequest{
		ShortCode:       input.ShortCode,
		Email:           input.Email,
		OfficialContact: input.OfficialContact,
		SendReminders:   input.SendReminders,
		Logo:            input.Logo,
		CallbackURL:     input.CallbackURL,
	}
	resp, err := s.client.BillManagerOptin(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BillManagerOptinResult{
		AppKey:  resp.AppKey,
		ResMsg:  resp.ResMsg,
		ResCode: resp.ResCode,
	}, nil
}

func (s *Service) BillManagerSingleInvoice(ctx context.Context, input svctypes.BillManagerSingleInvoiceInput) (*svctypes.BillManagerSingleInvoiceResult, error) {
	items := make([]types.BillManagerInvoiceItem, len(input.InvoiceItems))
	for i, item := range input.InvoiceItems {
		items[i] = types.BillManagerInvoiceItem{
			ItemName: item.ItemName,
			Amount:   item.Amount,
		}
	}
	req := types.BillManagerSingleInvoiceRequest{
		ExternalReference: input.ExternalReference,
		BilledFullName:    input.BilledFullName,
		BilledPhoneNumber: input.BilledPhoneNumber,
		BilledPeriod:      input.BilledPeriod,
		InvoiceName:       input.InvoiceName,
		DueDate:           input.DueDate,
		AccountReference:  input.AccountReference,
		Amount:            input.Amount,
		InvoiceItems:      items,
	}
	resp, err := s.client.BillManagerSingleInvoice(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BillManagerSingleInvoiceResult{
		StatusMessage: resp.StatusMessage,
		ResMsg:        resp.ResMsg,
		ResCode:       resp.ResCode,
	}, nil
}

func (s *Service) BillManagerBulkInvoice(ctx context.Context, input svctypes.BillManagerBulkInvoiceInput) (*svctypes.BillManagerBulkInvoiceResult, error) {
	req := make(types.BillManagerBulkInvoiceRequest, len(input))
	for i, inv := range input {
		items := make([]types.BillManagerInvoiceItem, len(inv.InvoiceItems))
		for j, item := range inv.InvoiceItems {
			items[j] = types.BillManagerInvoiceItem{
				ItemName: item.ItemName,
				Amount:   item.Amount,
			}
		}
		req[i] = types.BillManagerSingleInvoiceRequest{
			ExternalReference: inv.ExternalReference,
			BilledFullName:    inv.BilledFullName,
			BilledPhoneNumber: inv.BilledPhoneNumber,
			BilledPeriod:      inv.BilledPeriod,
			InvoiceName:       inv.InvoiceName,
			DueDate:           inv.DueDate,
			AccountReference:  inv.AccountReference,
			Amount:            inv.Amount,
			InvoiceItems:      items,
		}
	}
	resp, err := s.client.BillManagerBulkInvoice(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BillManagerBulkInvoiceResult{
		StatusMessage: resp.StatusMessage,
		ResMsg:        resp.ResMsg,
		ResCode:       resp.ResCode,
	}, nil
}

func (s *Service) BillManagerReconciliation(ctx context.Context, input svctypes.BillManagerReconciliationInput) (*svctypes.BillManagerReconciliationResult, error) {
	req := types.BillManagerReconciliationRequest{
		PaymentDate:       input.PaymentDate,
		PaidAmount:        input.PaidAmount,
		AccountReference:  input.AccountReference,
		TransactionID:     input.TransactionID,
		PhoneNumber:       input.PhoneNumber,
		FullName:          input.FullName,
		InvoiceName:       input.InvoiceName,
		ExternalReference: input.ExternalReference,
	}
	resp, err := s.client.BillManagerReconciliation(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BillManagerReconciliationResult{
		ResMsg:  resp.ResMsg,
		ResCode: resp.ResCode,
	}, nil
}

func (s *Service) BillManagerCancelSingle(ctx context.Context, input svctypes.BillManagerCancelSingleInput) (*svctypes.BillManagerCancelResult, error) {
	req := types.BillManagerCancelSingleRequest{
		ExternalReference: input.ExternalReference,
	}
	resp, err := s.client.BillManagerCancelSingle(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BillManagerCancelResult{
		StatusMessage: resp.StatusMessage,
		ResMsg:        resp.ResMsg,
		ResCode:       resp.ResCode,
	}, nil
}

func (s *Service) BillManagerCancelBulk(ctx context.Context, input svctypes.BillManagerCancelBulkInput) (*svctypes.BillManagerCancelResult, error) {
	req := make(types.BillManagerCancelBulkRequest, len(input.ExternalReferences))
	for i, ref := range input.ExternalReferences {
		req[i] = types.BillManagerCancelSingleRequest{
			ExternalReference: ref,
		}
	}
	resp, err := s.client.BillManagerCancelBulk(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BillManagerCancelResult{
		StatusMessage: resp.StatusMessage,
		ResMsg:        resp.ResMsg,
		ResCode:       resp.ResCode,
	}, nil
}

func (s *Service) BillManagerChangeOptin(ctx context.Context, input svctypes.BillManagerChangeOptinInput) (*svctypes.BillManagerChangeOptinResult, error) {
	req := types.BillManagerChangeOptinRequest{
		ShortCode:       input.ShortCode,
		Email:           input.Email,
		OfficialContact: input.OfficialContact,
		SendReminders:   input.SendReminders,
		Logo:            input.Logo,
		CallbackURL:     input.CallbackURL,
	}
	resp, err := s.client.BillManagerChangeOptin(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.BillManagerChangeOptinResult{
		ResMsg:  resp.ResMsg,
		ResCode: resp.ResCode,
	}, nil
}

func (s *Service) CreateStandingOrder(ctx context.Context, input svctypes.RatibaInput) (*svctypes.RatibaResult, error) {
	req := types.RatibaRequest{
		StandingOrderName:           input.StandingOrderName,
		StartDate:                   input.StartDate,
		EndDate:                     input.EndDate,
		BusinessShortCode:           input.BusinessShortCode,
		TransactionType:             input.TransactionType,
		ReceiverPartyIdentifierType: input.ReceiverPartyIdentifierType,
		Amount:                      input.Amount,
		PartyA:                      input.PartyA,
		CallBackURL:                 input.CallBackURL,
		AccountReference:            input.AccountReference,
		TransactionDesc:             input.TransactionDesc,
		Frequency:                   input.Frequency,
	}
	resp, err := s.client.CreateStandingOrder(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.RatibaResult{
		ResponseHeader: resp.ResponseHeader,
		ResponseBody:   resp.ResponseBody,
	}, nil
}

func (s *Service) TaxRemittance(ctx context.Context, input svctypes.TaxRemittanceInput) (*svctypes.TaxRemittanceResult, error) {
	cfg := s.client.GetConfig()
	if input.SecurityCredential == "" && cfg.SecurityCredential != "" {
		input.SecurityCredential = cfg.SecurityCredential
	}
	if input.Initiator == "" && cfg.InitiatorName != "" {
		input.Initiator = cfg.InitiatorName
	}
	req := types.TaxRemittanceRequest{
		Initiator:              input.Initiator,
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
	resp, err := s.client.TaxRemittance(ctx, req)
	if err != nil {
		return nil, err
	}
	return &svctypes.TaxRemittanceResult{
		OriginatorConversationID: resp.OriginatorConversationID,
		ConversationID:           resp.ConversationID,
		ResponseCode:             resp.ResponseCode,
		ResponseDescription:      resp.ResponseDescription,
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
