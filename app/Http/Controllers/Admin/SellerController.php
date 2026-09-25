<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AccountStatusHistory;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class SellerController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedSeller($request);

        $seller = DB::transaction(function () use ($request, $data): User {
            $seller = new User;
            $seller->forceFill([
                'name' => $data['name'],
                'email' => $data['email'],
                'barangay' => $data['barangay'],
                'role' => UserRole::Seller,
                'account_status' => AccountStatus::Active,
                'password' => $data['temporary_password'],
                'password_must_be_changed' => true,
                'email_verified_at' => now(),
            ])->save();

            $this->storePhoto($request, $seller);

            AuditLog::record(
                admin: $request->user(),
                action: 'Created seller account',
                details: 'Assigned to '.$seller->barangay,
                seller: $seller,
                actionType: 'create'
            );

            return $seller;
        });

        return redirect()->route('admin.dashboard', ['section' => 'farmers-sellers'])
            ->with('status', $seller->name.' was added as an active seller.');
    }

    public function update(Request $request, User $seller): RedirectResponse
    {
        $this->seller($seller);
        $data = $this->validatedSeller($request, $seller, false);
        $oldBarangay = $seller->barangay;
        $oldName = $seller->name;

        $seller->forceFill([
            'name' => $data['name'],
            'email' => $data['email'],
            'barangay' => $data['barangay'],
        ])->save();
        $this->storePhoto($request, $seller);

        $changes = [];
        if ($oldBarangay !== $seller->barangay) {
            $changes[] = 'Barangay changed: '.$oldBarangay.' → '.$seller->barangay;
        }
        if ($oldName !== $seller->name) {
            $changes[] = 'Name changed: '.$oldName.' → '.$seller->name;
        }
        if (empty($changes)) {
            $changes[] = 'Seller details updated';
        }

        AuditLog::record(
            admin: $request->user(),
            action: 'Updated seller details',
            details: implode(', ', $changes),
            seller: $seller,
            actionType: 'update'
        );

        return redirect()->route('admin.dashboard', ['section' => 'farmers-sellers'])
            ->with('status', 'Seller details updated.');
    }

    public function suspend(Request $request, User $seller): RedirectResponse
    {
        $this->seller($seller);
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000']]);

        if ($seller->account_status === AccountStatus::Suspended) {
            return back()->withErrors(['reason' => 'This seller is already suspended.']);
        }

        DB::transaction(function () use ($request, $seller, $data): void {
            $seller->forceFill(['account_status' => AccountStatus::Suspended, 'remember_token' => Str::random(60)])->save();
            AccountStatusHistory::create([
                'user_id' => $seller->id,
                'admin_id' => $request->user()->id,
                'action' => 'suspended',
                'reason' => $data['reason'],
            ]);

            AuditLog::record(
                admin: $request->user(),
                action: 'Suspended account',
                details: 'Reason: '.$data['reason'],
                seller: $seller,
                actionType: 'suspend'
            );

            AuditLog::record(
                admin: $request->user(),
                action: 'Status changed',
                details: 'Active → Suspended',
                seller: $seller,
                actionType: 'status_change'
            );
        });

        return redirect()->route('admin.dashboard', ['section' => 'farmers-sellers'])
            ->with('status', $seller->name.' was suspended.');
    }

    public function reinstate(Request $request, User $seller): RedirectResponse
    {
        $this->seller($seller);

        if ($seller->account_status === AccountStatus::Active) {
            return back()->withErrors(['status' => 'This seller is already active.']);
        }

        DB::transaction(function () use ($request, $seller): void {
            $seller->forceFill(['account_status' => AccountStatus::Active])->save();
            AccountStatusHistory::create([
                'user_id' => $seller->id,
                'admin_id' => $request->user()->id,
                'action' => 'reinstated',
            ]);

            AuditLog::record(
                admin: $request->user(),
                action: 'Reinstated account',
                details: 'Suspension history retained',
                seller: $seller,
                actionType: 'reinstate'
            );
        });

        return redirect()->route('admin.dashboard', ['section' => 'farmers-sellers'])
            ->with('status', $seller->name.' was reinstated.');
    }

    public function photo(User $seller)
    {
        $this->seller($seller);
        parse_str((string) parse_url((string) $seller->avatar_url, PHP_URL_QUERY), $query);
        $image = (string) ($query['image'] ?? '');
        abort_unless(preg_match('/^[a-zA-Z0-9]+\.(jpg|jpeg|png|webp)$/', $image), 404);
        $path = 'seller-avatars/'.$seller->id.'/'.$image;
        abort_unless(Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), ['Cache-Control' => 'private, max-age=3600', 'X-Content-Type-Options' => 'nosniff']);
    }

    private function seller(User $seller): void
    {
        abort_unless($seller->role === UserRole::Seller, 404);
    }

    /** @return array<string, mixed> */
    private function validatedSeller(Request $request, ?User $seller = null, bool $creating = true): array
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'email' => mb_strtolower(trim((string) $request->input('email'))),
        ]);

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($seller?->id)],
            'barangay' => ['required', 'string', Rule::in(array_keys(config('marketplace.barangay_seller_names')))],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=6000,max_height=6000'],
        ];

        if ($creating) {
            $rules['temporary_password'] = ['required', 'string', Password::min(8)->letters()->numbers(), 'confirmed'];
        }

        return $request->validate($rules);
    }

    private function storePhoto(Request $request, User $seller): void
    {
        if (! $request->hasFile('photo')) {
            return;
        }

        $path = $request->file('photo')->store('seller-avatars/'.$seller->id, 'local');
        abort_unless($path, 500, 'The photo could not be saved. Please try again.');
        $oldPhoto = $seller->avatar_url;
        $seller->forceFill(['avatar_url' => '/seller/profile/photo?image='.basename($path)])->save();

        if (preg_match('~^/seller/profile/photo\?image=([a-zA-Z0-9]+\.(?:jpg|jpeg|png|webp))$~', $oldPhoto ?? '', $matches)) {
            Storage::disk('local')->delete('seller-avatars/'.$seller->id.'/'.$matches[1]);
        }
    }
}
