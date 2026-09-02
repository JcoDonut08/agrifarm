<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Customer\HomeController as CustomerHomeController;
use App\Http\Controllers\LegalPageController;
use App\Http\Controllers\Seller\DashboardController as SellerDashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::get('/terms', [LegalPageController::class, 'terms'])->name('terms');
Route::get('/privacy', [LegalPageController::class, 'privacy'])->name('privacy');

require __DIR__.'/auth.php';

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/customer', CustomerHomeController::class)
        ->middleware('role:customer')
        ->name('customer.home');

    Route::get('/seller/dashboard', SellerDashboardController::class)
        ->middleware('role:seller')
        ->name('seller.dashboard');

    Route::get('/admin/dashboard', AdminDashboardController::class)
        ->middleware('role:cenro_admin')
        ->name('admin.dashboard');
});
