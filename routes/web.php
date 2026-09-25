<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\ProfileController as AdminProfileController;
use App\Http\Controllers\Admin\TaskController as AdminTaskController;
use App\Http\Controllers\Admin\SellerController as AdminSellerController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\Customer\HomeController as CustomerHomeController;
use App\Http\Controllers\Customer\ProfileController as CustomerProfileController;
use App\Http\Controllers\CustomerCheckoutController;
use App\Http\Controllers\LegalPageController;
use App\Http\Controllers\ProductReviewController;
use App\Http\Controllers\Seller\DashboardController as SellerDashboardController;
use App\Http\Controllers\Seller\ProductController;
use App\Http\Controllers\Seller\ProfileController;
use App\Http\Controllers\Seller\TemporaryPasswordController;
use App\Http\Controllers\Seller\WalkInOrderController;
use App\Http\Controllers\StorefrontController;
use App\Http\Controllers\StorefrontCustomerPhotoController;
use App\Http\Controllers\StorefrontProductPhotoController;
use App\Http\Controllers\StorefrontSellerPhotoController;
use Illuminate\Support\Facades\Route;

Route::get('/', [StorefrontController::class, 'index'])->name('home');
Route::get('/marketplace/products/{product}/photo', StorefrontProductPhotoController::class)->name('marketplace.products.photo');
Route::get('/marketplace/sellers/{user}/photo', StorefrontSellerPhotoController::class)->name('marketplace.sellers.photo');
Route::get('/marketplace/customers/{user}/photo', StorefrontCustomerPhotoController::class)->name('marketplace.customers.photo');

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

Route::middleware(['auth', 'verified', 'seller.active'])->group(function () {
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

    Route::middleware('role:seller')->group(function () {
        Route::get('/seller/temporary-password', [TemporaryPasswordController::class, 'create'])->name('seller.temporary-password.create');
        Route::put('/seller/temporary-password', [TemporaryPasswordController::class, 'store'])->name('seller.temporary-password.store');
    });

    Route::get('/seller/dashboard', SellerDashboardController::class)
        ->middleware(['role:seller', 'seller.password-change'])
        ->name('seller.dashboard');

    Route::middleware(['role:seller', 'seller.password-change'])->group(function () {
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

    Route::middleware('role:cenro_admin')->group(function () {
        Route::get('/admin/dashboard', AdminDashboardController::class)->name('admin.dashboard');
        Route::post('/admin/profile/photo', [AdminProfileController::class, 'photo'])->name('admin.profile.photo');
        Route::get('/admin/profile/photo', [AdminProfileController::class, 'showPhoto'])->name('admin.profile.photo.show');
        Route::delete('/admin/profile/photo', [AdminProfileController::class, 'removePhoto'])->name('admin.profile.photo.remove');
        Route::post('/admin/sellers', [AdminSellerController::class, 'store'])->name('admin.sellers.store');
        Route::patch('/admin/sellers/{seller}', [AdminSellerController::class, 'update'])->name('admin.sellers.update');
        Route::post('/admin/sellers/{seller}/suspend', [AdminSellerController::class, 'suspend'])->name('admin.sellers.suspend');
        Route::post('/admin/sellers/{seller}/reinstate', [AdminSellerController::class, 'reinstate'])->name('admin.sellers.reinstate');
        Route::get('/admin/sellers/{seller}/photo', [AdminSellerController::class, 'photo'])->name('admin.sellers.photo');
        Route::post('/admin/tasks', [AdminTaskController::class, 'store'])->name('admin.tasks.store');
        Route::patch('/admin/tasks/{adminTask}', [AdminTaskController::class, 'update'])->name('admin.tasks.update');
        Route::delete('/admin/tasks/{adminTask}', [AdminTaskController::class, 'destroy'])->name('admin.tasks.destroy');
    });
});
