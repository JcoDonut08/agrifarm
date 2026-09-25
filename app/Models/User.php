<?php

namespace App\Models;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Auth\MustVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail as MustVerifyEmailContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmailContract
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, MustVerifyEmail, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'terms_accepted_at',
        'privacy_accepted_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return HasMany<LoginOtp, $this>
     */
    public function loginOtps(): HasMany
    {
        return $this->hasMany(LoginOtp::class);
    }

    /**
     * @return HasMany<AccountOtp, $this>
     */
    public function accountOtps(): HasMany
    {
        return $this->hasMany(AccountOtp::class);
    }

    /**
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * @return HasMany<WalkInOrder, $this>
     */
    public function walkInOrders(): HasMany
    {
        return $this->hasMany(WalkInOrder::class);
    }

    /** @return HasMany<HarvestRecord, $this> */
    public function harvestRecords(): HasMany
    {
        return $this->hasMany(HarvestRecord::class);
    }

    /**
     * @return HasMany<AdminTask, $this>
     */
    public function adminTasks(): HasMany
    {
        return $this->hasMany(AdminTask::class);
    }

    /** @return HasMany<AccountStatusHistory, $this> */
    public function accountStatusHistory(): HasMany
    {
        return $this->hasMany(AccountStatusHistory::class)->latest();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'role' => UserRole::class,
            'account_status' => AccountStatus::class,
            'password_must_be_changed' => 'boolean',
            'terms_accepted_at' => 'immutable_datetime',
            'privacy_accepted_at' => 'immutable_datetime',
            'password' => 'hashed',
        ];
    }
}
