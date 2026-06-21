from mpesa.models import SwapResponse

r = SwapResponse(
    responseCode="404", responseDesc="Not found", requestRefID="", lastSwapDate=""
)
print(f"responseCode: {r.responseCode}")
print(f"responseDesc: {r.responseDesc}")
print("SwapResponse OK")
