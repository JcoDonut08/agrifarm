<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notifiable;
use Illuminate\Notifications\Notification;

class PendingRegistration extends Model
{
    use Notifiable;

    /** @var list<string> */
    protected $fillable = [
        'name',
        'email',
        'password',
        'terms_accepted_at',
        'privacy_accepted_at',
    ];

    /** @var list<string> */
    protected $hidden = [
        'password',
        'code_hash',
    ];

    public function routeNotificationForMail(Notification $notification): string
    {
        return $this->email;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'terms_accepted_at' => 'immutable_datetime',
            'privacy_accepted_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'code_sent_at' => 'immutable_datetime',
            'attempts' => 'integer',
        ];
    }
}
