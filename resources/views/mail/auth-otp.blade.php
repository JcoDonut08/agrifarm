<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <style>
        @media only screen and (max-width: 620px) {
            .email-shell { padding: 18px 10px !important; }
            .email-card { border-radius: 18px !important; }
            .email-content { padding: 30px 22px 24px !important; }
            .otp-code { font-size: 29px !important; letter-spacing: 7px !important; }
        }
    </style>
</head>
<body style="margin:0;background:#f3f8ed;color:#17231c;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{{ $preheader }}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f8ed;">
        <tr>
            <td class="email-shell" align="center" style="padding:36px 16px;">
                <table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #d9ead9;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(13,84,55,.12);">
                    <tr>
                        <td style="padding:0;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td width="34%" height="7" style="background:#0f854c;font-size:0;line-height:0;">&nbsp;</td>
                                    <td width="22%" height="7" style="background:#7ac943;font-size:0;line-height:0;">&nbsp;</td>
                                    <td width="22%" height="7" style="background:#ffc247;font-size:0;line-height:0;">&nbsp;</td>
                                    <td width="22%" height="7" style="background:#ed6a45;font-size:0;line-height:0;">&nbsp;</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:22px 28px;border-bottom:1px solid #e4efe5;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td valign="middle" style="width:48px;height:48px;border-radius:15px;background:#0d6b3f;color:#ffffff;text-align:center;font-size:16px;font-weight:800;">AF</td>
                                    <td valign="middle" style="padding-left:13px;">
                                        <div style="font-size:20px;line-height:24px;font-weight:800;color:#07311f;">AgriFarm</div>
                                        <div style="font-size:12px;line-height:18px;color:#65746b;">Fresh produce from local growers</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-content" style="padding:38px 42px 32px;">
                            <div style="margin-bottom:10px;font-size:11px;line-height:16px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0f854c;">{{ $eyebrow }}</div>
                            <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:38px;color:#07311f;">{{ $title }}</h1>
                            <p style="margin:0 0 12px;font-size:16px;line-height:25px;color:#35483d;">Hello {{ $recipientName }},</p>
                            <p style="margin:0 0 26px;font-size:16px;line-height:25px;color:#526158;">{{ $intro }}</p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background:#effbed;border:1px solid #bce3bd;border-radius:18px;">
                                <tr>
                                    <td align="center" style="padding:22px 14px 20px;">
                                        <div style="margin-bottom:10px;font-size:11px;line-height:16px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#497357;">{{ $codeLabel }}</div>
                                        <div class="otp-code" style="font-family:'Courier New',monospace;font-size:36px;line-height:44px;font-weight:800;letter-spacing:10px;color:#073c25;">{{ $code }}</div>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#526158;">This code expires in <strong style="color:#173c29;">{{ $expiresMinutes }} minutes</strong> and can only be used once.</p>
                            <div style="padding:15px 17px;border-left:4px solid #ffc247;background:#fff8e6;font-size:13px;line-height:21px;color:#665429;">{{ $securityNote }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 28px;background:#073c25;color:#dcebdd;text-align:center;font-size:12px;line-height:19px;">
                            AgriFarm &middot; A local agricultural e-commerce marketplace<br>
                            <span style="color:#9fc4a8;">Connecting customers with community growers.</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
