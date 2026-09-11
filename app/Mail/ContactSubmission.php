<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ContactSubmission extends Mailable
{
    public function __construct(public array $submission, public string $referenceId) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [new Address($this->submission['email'], $this->submission['name'])],
            subject: '[AgriFarm '.ucfirst($this->submission['category']).'] '.$this->submission['subject'],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.contact-submission');
    }
}
