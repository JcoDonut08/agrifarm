<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\Customer\HomeController as CustomerHomeController;
use App\Http\Controllers\Customer\ProfileController as CustomerProfileController;
use App\Http\Controllers\CustomerCheckoutController;
use App\Http\Controllers\LegalPageController;
use App\Http\Controllers\ProductReviewController;
use App\Http\Controllers\Seller\DashboardController as SellerDashboardController;
use App\Http\Controllers\Seller\ProductController;
use App\Http\Controllers\Seller\ProfileController;
use App\Http\Controllers\Seller\WalkInOrderController;
use App\Http\Controllers\StorefrontController;
use App\Http\Controllers\StorefrontProductPhotoController;
use App\Http\Controllers\StorefrontSellerPhotoController;
use Illuminate\Support\Facades\Route;

Route::get('/', [StorefrontController::class, 'index'])->name('home');
Route::get('/marketplace/products/{product}/photo', StorefrontProductPhotoController::class)->name('marketplace.products.photo');
Route::get('/marketplace/sellers/{user}/photo', StorefrontSellerPhotoController::class)->name('marketplace.sellers.photo');

Route::get('/terms', [LegalPageController::class, 'terms'])->name('terms');
Route::get('/contact', [ContactController::class, 'index'])->name('contact');
Route::post('/contact', [ContactController::class, 'store'])->name('contact.store');
Route::get('/privacy', [LegalPageController::class, 'privacy'])->name('privacy');

require __DIR__.'/auth.php';

Route::post('/product-reviews', [ProductReviewController::class, 'store'])
    ->middleware(['auth', 'role:customer', 'throttle:10,1'])
    ->name('product-reviews.store');
Route::patch('/product-reviews/{productReview}', [ProductReviewController::class, 'update'])
    ->middleware(['auth', 'role:customer', 'throttle:10,1'])
    ->name('product-reviews.update');
Route::delete('/product-reviews/{productReview}', [ProductReviewController::class, 'destroy'])
    ->middleware(['auth', 'role:customer', 'throttle:10,1'])
    ->name('product-reviews.destroy');

Route::post('/checkout', [CustomerCheckoutController::class, 'store'])
    ->middleware(['auth', 'role:customer', 'throttle:10,1'])
    ->name('checkout.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/customer', CustomerHomeController::class)
        ->middleware('role:customer')
        ->name('customer.home');

    Route::middleware('role:customer')->group(function () {
        Route::patch('/customer/profile', [CustomerProfileController::class, 'update'])->middleware('throttle:6,1')->name('customer.profile.update');
        Route::put('/customer/password', [CustomerProfileController::class, 'password'])->middleware('throttle:6,1')->name('customer.password.update');
        Route::post('/customer/profile/photo', [CustomerProfileController::class, 'photo'])->middleware('throttle:10,1')->name('customer.profile.photo');
        Route::get('/customer/profile/photo', [CustomerProfileController::class, 'showPhoto'])->name('customer.profile.photo.show');
        Route::delete('/customer/profile/photo', [CustomerProfileController::class, 'removePhoto'])->name('customer.profile.photo.remove');
    });

    Route::get('/seller/dashboard', SellerDashboardController::class)
        ->middleware('role:seller')
        ->name('seller.dashboard');

    Route::middleware('role:seller')->group(function () {
        Route::post('/seller/products', [ProductController::class, 'store'])->middleware('throttle:seller-product-management')->name('seller.products.store');
        Route::patch('/seller/products/{product}', [ProductController::class, 'update'])->middleware('throttle:seller-product-management')->name('seller.products.update');
        Route::delete('/seller/products', [ProductController::class, 'bulkDestroy'])->middleware('throttle:seller-product-management')->name('seller.products.bulk-destroy');
        Route::delete('/seller/products/{product}', [ProductController::class, 'destroy'])->middleware('throttle:seller-product-management')->name('seller.products.destroy');
        Route::post('/seller/orders/walk-in', [WalkInOrderController::class, 'store'])->middleware('throttle:30,1')->name('seller.orders.walk-in.store');
        Route::patch('/seller/orders/{walkInOrder}/status', [WalkInOrderController::class, 'updateStatus'])->middleware('throttle:seller-order-status')->name('seller.orders.status.update');
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
