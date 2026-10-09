<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style>
        @media only screen and (max-width: 620px) {
            .email-shell { padding: 20px 12px !important; }
            .email-content { padding: 24px 20px !important; }
            .email-heading { font-size: 24px !important; line-height: 32px !important; }
        }
    </style>
</head>
<body style="margin:0;background:#f5f5f5;color:#132f24;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{ $productName }}: {{ $statusLabel }}. Order {{ $reference }}.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f5;">
        <tr>
            <td class="email-shell" align="center" style="padding:36px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #ccd8cf;border-top:4px solid #0f783e;border-radius:14px;">
                    <tr>
                        <td style="padding:22px 28px;border-bottom:1px solid #e2e8df;">
                            <div style="font-size:22px;line-height:28px;font-weight:700;color:#0f783e;">AgriFarm</div>
                            <div style="margin-top:3px;font-size:13px;line-height:20px;color:#53635a;">Your community marketplace</div>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-content" style="padding:28px;">
                            <p style="margin:0 0 8px;font-size:12px;line-height:18px;font-weight:600;letter-spacing:1px;color:#53635a;">ORDER UPDATE</p>
                            <h1 class="email-heading" style="margin:0 0 20px;font-size:28px;line-height:36px;font-weight:700;color:#132f24;">{{ $title }}</h1>
                            <p style="margin:0 0 8px;font-size:15px;line-height:24px;">Hi {{ $recipientName }},</p>
                            <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#53635a;">{{ $intro }}</p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8df;border-bottom:1px solid #e2e8df;">
                                @foreach (['Order reference' => $reference, 'Product' => $productName, 'Quantity' => $quantity.' '.$unit, 'Item status' => $statusLabel] as $label => $value)
                                    <tr>
                                        <td valign="top" width="34%" style="padding:10px 12px 10px 0;font-size:13px;line-height:22px;color:#53635a;">{{ $label }}</td>
                                        <td valign="top" style="padding:10px 0;font-size:14px;line-height:22px;font-weight:600;color:#132f24;overflow-wrap:anywhere;word-break:break-word;">{{ $value }}</td>
                                    </tr>
                                @endforeach
                            </table>
                            @if ($cancelled)
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;background:#fff5f3;border-left:3px solid #a63d32;">
                                    <tr>
                                        <td style="padding:16px 18px;">
                                            <p style="margin:0 0 6px;font-size:14px;line-height:22px;font-weight:600;color:#84352d;">Reason for cancellation</p>
                                            <p style="margin:0;font-size:14px;line-height:23px;color:#35483d;">{{ $reason }}</p>
                                            @if ($note)
                                                <p style="margin:14px 0 4px;font-size:13px;line-height:20px;font-weight:600;color:#53635a;">Message from the seller</p>
                                                <p style="margin:0;font-size:14px;line-height:23px;color:#35483d;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;">{{ $note }}</p>
                                            @endif
                                        </td>
                                    </tr>
                                </table>
                            @endif
                            <p style="margin:24px 0 18px;font-size:14px;line-height:23px;color:#53635a;">View your orders to check each item's status and details.</p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" bgcolor="#0f783e" style="border-radius:10px;">
                                        <a href="{{ $ordersUrl }}" style="display:inline-block;padding:13px 24px;color:#ffffff;font-size:14px;line-height:20px;font-weight:600;text-decoration:none;border:1px solid #0f783e;border-radius:10px;">View my orders</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:24px 0 0;font-size:12px;line-height:20px;color:#53635a;">Button not working? Open this link:<br><a href="{{ $ordersUrl }}" style="color:#0f783e;text-decoration:underline;overflow-wrap:anywhere;word-break:break-word;">{{ $ordersUrl }}</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 28px;border-top:1px solid #e2e8df;font-size:12px;line-height:20px;color:#53635a;">AgriFarm &middot; Connecting you with local growers.</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
