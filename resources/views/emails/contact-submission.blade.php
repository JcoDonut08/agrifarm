<!doctype html>
<html lang="en">
<body style="font-family:Arial,sans-serif;color:#17382b;line-height:1.6">
    <h1>AgriFarm contact submission</h1>
    <p><strong>Reference:</strong> {{ $referenceId }}</p>
    <p><strong>Type:</strong> {{ ucfirst($submission['category']) }}</p>
    <p><strong>From:</strong> {{ $submission['name'] }} &lt;{{ $submission['email'] }}&gt;</p>
    <p><strong>Subject:</strong> {{ $submission['subject'] }}</p>
    @if (!empty($submission['reference']))
        <p><strong>Related product, seller, or order:</strong> {{ $submission['reference'] }}</p>
    @endif
    <hr>
    <div style="white-space:pre-wrap">{{ $submission['message'] }}</div>
    <hr>
    <p>Reply to this email to respond to the sender. The sender's contact details and message are user-provided.</p>
</body>
</html>
