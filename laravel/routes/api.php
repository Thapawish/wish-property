<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\LeaseController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\RentReviewController;
use App\Http\Controllers\Api\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api/v1
| Each route expects an `agency_id` query param or body field for tenant scoping.
|
*/

Route::prefix('v1')->group(function () {

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Contacts (landlords + tenants)
    Route::apiResource('contacts', ContactController::class);

    // Properties
    Route::apiResource('properties', PropertyController::class);

    // Leases
    Route::apiResource('leases', LeaseController::class);

    // Payments
    Route::apiResource('payments', PaymentController::class);

    // Rent Reviews
    Route::apiResource('rent-reviews', RentReviewController::class);
});
