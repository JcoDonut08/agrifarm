<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\Customer\HomeController as CustomerHomeController;
use App\Http\Controllers\LegalPageController;
use App\Http\Controllers\Seller\DashboardController as SellerDashboardController;
use App\Http\Controllers\Seller\ProductController;
use App\Http\Controllers\Seller\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::get('/terms', [LegalPageController::class, 'terms'])->name('terms');
Route::get('/contact', [ContactController::class, 'index'])->name('contact');
Route::post('/contact', [ContactController::class, 'store'])->name('contact.store');
Route::get('/privacy', [LegalPageController::class, 'privacy'])->name('privacy');

require __DIR__.'/auth.php';

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/customer', CustomerHomeController::class)
        ->middleware('role:customer')
        ->name('customer.home');

    Route::get('/seller/dashboard', SellerDashboardController::class)
        ->middleware('role:seller')
        ->name('seller.dashboard');

    Route::middleware('role:seller')->group(function () {
        Route::post('/seller/products', [ProductController::class, 'store'])->middleware('throttle:20,1')->name('seller.products.store');
        Route::get('/seller/products/{product}/photo', [ProductController::class, 'photo'])->name('seller.products.photo');
        Route::post('/seller/profile/photo', [ProfileController::class, 'photo'])->middleware('throttle:10,1')->name('seller.profile.photo');
        Route::get('/seller/profile/photo', [ProfileController::class, 'showPhoto']);
        Route::delete('/seller/profile/photo', [ProfileController::class, 'removePhoto']);
        Route::patch('/seller/profile', [ProfileController::class, 'update'])->middleware('throttle:6,1')->name('seller.profile.update');
        Route::put('/seller/password', [ProfileController::class, 'password'])->middleware('throttle:6,1')->name('seller.password.update');
        Route::get('/seller/profile/email/verify', [ProfileController::class, 'verifyEmail'])->middleware('signed')->name('seller.profile.email.verify');
    });

    Route::get('/admin/dashboard', AdminDashboardController::class)
        ->middleware('role:cenro_admin')
        ->name('admin.dashboard');
});
