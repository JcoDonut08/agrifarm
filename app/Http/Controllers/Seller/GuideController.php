<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GuideController extends Controller
{
    public function dismiss(Request $request): RedirectResponse
    {
        $request->user()->forceFill([
            'seller_guide_pending' => false,
            'seller_guide_dismissed_at' => $request->user()->seller_guide_dismissed_at ?? now(),
        ])->save();

        return redirect()->route('seller.dashboard');
    }
}
