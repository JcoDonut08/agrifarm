AgriFarm — {{ $title }}

Hi {{ $recipientName }},

{{ $intro }}

Order reference: {{ $reference }}
Product: {{ $productName }}
Quantity: {{ $quantity }} {{ $unit }}
Item status: {{ $statusLabel }}
@if ($cancelled)

Reason for cancellation: {{ $reason }}
@if ($note)

Message from the seller:
{{ $note }}
@endif
@endif

View your orders to check each item's status and details:
{{ $ordersUrl }}

AgriFarm · Connecting you with local growers.
