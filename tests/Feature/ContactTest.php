<?php

namespace Tests\Feature;

use App\Mail\ContactSubmission;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

class ContactTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['contact.recipient' => 'admin@agrifarm.test']);
        Mail::fake();
    }

    private function message(array $overrides = []): array
    {
        return array_replace([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.test',
            'category' => 'report',
            'subject' => 'Incorrect product information',
            'reference' => 'Fresh Pechay, Rosario',
            'message' => 'The listing information appears incorrect. Please review the product description.',
        ], $overrides);
    }

    public function test_guests_can_open_the_contact_page(): void
    {
        $this->get('/contact')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Contact')->where('contactEmail', 'admin@agrifarm.test'));
    }

    public function test_each_contact_type_is_sent_only_to_the_configured_admin_inbox(): void
    {
        foreach (['inquiry', 'report', 'account', 'other'] as $category) {
            $this->from('/contact')->post('/contact', $this->message([
                'category' => $category, 'recipient' => 'attacker@example.test',
            ]))->assertRedirect('/contact')->assertSessionHas('contact_success')->assertSessionHasNoErrors();
        }

        Mail::assertSentCount(4);
        Mail::assertSent(ContactSubmission::class, function (ContactSubmission $mail) {
            return $mail->hasTo('admin@agrifarm.test')
                && ! $mail->hasTo('attacker@example.test')
                && $mail->envelope()->replyTo[0]->address === 'juan@example.test'
                && ! array_key_exists('recipient', $mail->submission)
                && str_starts_with($mail->referenceId, 'AF-');
        });
    }

    public function test_invalid_input_does_not_send_mail(): void
    {
        $this->from('/contact')->post('/contact', $this->message([
            'name' => '', 'email' => 'invalid', 'category' => 'unknown',
            'subject' => "Header\r\nInjection", 'message' => 'short', 'reference' => str_repeat('x', 301),
        ]))->assertSessionHasErrors(['name', 'email', 'category', 'subject', 'message', 'reference']);
        Mail::assertNothingSent();
    }

    public function test_message_length_is_limited(): void
    {
        $this->from('/contact')->post('/contact', $this->message(['message' => str_repeat('x', 5001)]))
            ->assertSessionHasErrors('message');
        Mail::assertNothingSent();
    }

    public function test_sixth_submission_is_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->from('/contact')->post('/contact', $this->message())->assertSessionHasNoErrors();
        }
        $this->from('/contact')->post('/contact', $this->message())->assertSessionHasErrors('submission');
        Mail::assertSentCount(5);
    }

    public function test_mail_failure_returns_an_error_without_success(): void
    {
        Mail::shouldReceive('to')->once()->with('admin@agrifarm.test')->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new RuntimeException('Transport failed'));
        $this->from('/contact')->post('/contact', $this->message())
            ->assertRedirect('/contact')->assertSessionHasErrors('submission')->assertSessionMissing('contact_success');
    }

    public function test_missing_recipient_does_not_send_mail(): void
    {
        config(['contact.recipient' => null]);
        $this->from('/contact')->post('/contact', $this->message())->assertSessionHasErrors('submission');
        Mail::assertNothingSent();
    }

    public function test_email_escapes_user_content_and_includes_report_reference(): void
    {
        $mail = new ContactSubmission($this->message(['message' => '<script>alert("x")</script> Please review this concern.']), 'AF-TEST');
        $html = $mail->render();
        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('AF-TEST', $html);
        $this->assertStringContainsString('Fresh Pechay, Rosario', $html);
    }
}
