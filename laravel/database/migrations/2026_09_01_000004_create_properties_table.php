<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('agency_id');
            $table->string('address');
            $table->string('suburb')->nullable();
            $table->string('state')->nullable();
            $table->string('postcode')->nullable();
            $table->string('property_type')->default('house');
            $table->string('status')->default('vacant'); // leased | vacant | pending
            $table->integer('bedrooms')->default(0);
            $table->integer('bathrooms')->default(0);
            $table->integer('parking')->default(0);
            $table->uuid('landlord_id')->nullable();

            // Management gained
            $table->string('management_gained_reason')->nullable();
            $table->string('gained_reason_source')->nullable();

            // Property features
            $table->string('property_category')->nullable();
            $table->string('property_aspect')->nullable();
            $table->boolean('has_aircon')->default(false);
            $table->boolean('has_garden')->default(false);
            $table->boolean('has_built_ins')->default(false);
            $table->boolean('has_internal_laundry')->default(false);
            $table->boolean('has_balcony')->default(false);
            $table->boolean('has_gas_cooking')->default(false);
            $table->boolean('has_electric_cooking')->default(false);
            $table->boolean('has_dishwasher')->default(false);
            $table->boolean('has_stairs')->default(false);
            $table->boolean('has_lift')->default(false);

            // Ownership
            $table->string('ownership_type')->nullable();
            $table->boolean('split_payments')->default(false);
            $table->string('owner_first_name')->nullable();
            $table->string('owner_last_name')->nullable();
            $table->string('owner_email')->nullable();
            $table->string('owner_mobile')->nullable();

            // Management fees
            $table->decimal('management_fee_percent', 5, 2)->nullable();
            $table->decimal('letting_fee', 12, 2)->nullable();
            $table->decimal('lease_renewal_fee', 12, 2)->nullable();
            $table->decimal('advertising_fee', 12, 2)->nullable();
            $table->decimal('approved_maintenance_spend', 12, 2)->nullable();
            $table->decimal('admin_fee', 12, 2)->nullable();
            $table->string('admin_fee_charge_date')->nullable();
            $table->boolean('do_not_charge_admin_fee_if_vacant')->default(false);

            $table->timestamps();

            $table->foreign('agency_id')->references('id')->on('agencies')->onDelete('cascade');
            $table->foreign('landlord_id')->references('id')->on('contacts')->onDelete('set null');
            $table->index(['agency_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
