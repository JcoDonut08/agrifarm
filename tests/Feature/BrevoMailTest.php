<?php

namespace Tests\Feature;

use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;
use InvalidArgumentException;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoApiTransport;
use Symfony\Component\Mailer\Exception\HttpTransportException;
use Tests\TestCase;

class BrevoMailTest extends TestCase
{
    public function test_brevo_sends_email_over_https_with_the_gmail_reply_address(): void
    {
        config([
            'mail.from' => ['address' => 'agrifarm@example.com', 'name' => 'AgriFarm'],
            'mail.reply_to' => ['address' => 'agrifarm.reply@gmail.com', 'name' => 'AgriFarm'],
        ]);
        $client = new MockHttpClient(function (string $method, string $url, array $options): MockResponse {
            $this->assertSame('POST', $method);
            $this->assertSame('https://api.brevo.com/v3/smtp/email', $url);
            $this->assertContains('api-key: test-key', $options['normalized_headers']['api-key']);
            $payload = json_decode($options['body'], true, flags: JSON_THROW_ON_ERROR);
            $this->assertSame('agrifarm@example.com', $payload['sender']['email']);
            $this->assertSame('buyer@example.com', $payload['to'][0]['email']);
            $this->assertSame('agrifarm.reply@gmail.com', $payload['replyTo']['email']);
            $this->assertSame('Your AgriFarm code', $payload['subject']);
            $this->assertStringContainsString('123456', $payload['textContent']);

            return new MockResponse('{"messageId":"<test@brevo.example>"}', ['http_code' => 201]);
        });
        $this->app->instance(BrevoApiTransport::class, new BrevoApiTransport('test-key', $client));

        $sent = Mail::mailer('brevo')->raw('Your code is 123456', function (Message $message): void {
            $message->to('buyer@example.com')->subject('Your AgriFarm code');
        });

        $this->assertSame(1, $client->getRequestsCount());
        $this->assertSame('<test@brevo.example>', $sent->getMessageId());
    }

    public function test_a_provider_rejection_is_reported_as_a_delivery_failure(): void
    {
        $client = new MockHttpClient(new MockResponse('{"message":"Daily quota reached"}', ['http_code' => 429]));
        $this->app->instance(BrevoApiTransport::class, new BrevoApiTransport('test-key', $client));
        $this->expectException(HttpTransportException::class);
        $this->expectExceptionMessage('Daily quota reached');

        Mail::mailer('brevo')->raw('Example', fn (Message $message) => $message->to('buyer@example.com')->subject('Example'));
    }

    public function test_an_api_key_is_only_required_when_brevo_is_selected(): void
    {
        config(['services.brevo.key' => null]);
        $this->assertNotNull(Mail::mailer('array'));
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Configure BREVO_API_KEY');

        Mail::mailer('brevo');
    }
}
