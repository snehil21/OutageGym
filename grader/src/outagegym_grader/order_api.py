from dataclasses import dataclass
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class AcceptedOrder:
    order_id: str
    correlation_id: str


class OrderApiError(RuntimeError):
    pass


def submit_order(
    api_url: str,
    product_id: str,
    quantity: int,
    timeout_seconds: float = 5,
) -> AcceptedOrder:
    request = Request(
        f"{api_url.rstrip('/')}/orders",
        data=json.dumps(
            {
                "productId": product_id,
                "quantity": quantity,
            }
        ).encode(),
        headers={"content-type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            status_code = response.status
            response_body = response.read()
    except HTTPError as error:
        raise OrderApiError(
            f"Order API returned HTTP {error.code}"
        ) from error
    except (TimeoutError, URLError) as error:
        raise OrderApiError("Order API request failed") from error

    if status_code != 202:
        raise OrderApiError(f"Order API returned HTTP {status_code}, expected 202")

    try:
        payload = json.loads(response_body)
        order_id = payload["orderId"]
        correlation_id = payload["correlationId"]
        status = payload["status"]
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise OrderApiError("Order API returned an invalid response") from error

    if (
        not isinstance(order_id, str)
        or not order_id
        or not isinstance(correlation_id, str)
        or not correlation_id
        or status != "accepted"
    ):
        raise OrderApiError("Order API returned an invalid response")

    return AcceptedOrder(
        order_id=order_id,
        correlation_id=correlation_id,
    )
