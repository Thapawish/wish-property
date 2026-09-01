<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('agency_id');
            $table->uuid('property_id');
            $table->uuid('tenant_id')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('rent_amount', 12, 2)->default(0);
            $table->decimal('bond_amount', 12, 2)->default(0);
            $table->string('status')->default('pending'); // active | expired | pending

            // Payment & schedule
            $table->string('payment_frequency')->default('monthly'); // weekly | fortnightly | monthly
            $table->date('first_payment_date')->nullable();
            $table->date('paid_until')->nullable();
            $table->integer('next_inspection_months')->nullable();
            $table->integer('next_rent_review_months')->nullable();

            // Lease terms
            $table->boolean('gst_included')->default(false);
            $table->boolean('tenant_pays_water')->default(false);
            $table->boolean('is_periodic')->default(false);

            // Notes
            $table->text('internal_notes')->nullable();

            $table->timestamps();

            $table->foreign('agency_id')->references('id')->on('agencies')->onDelete('cascade');
            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');
            $table->foreign('tenant_id')->references('id')->on('contacts')->onDelete('set null');
            $table->index(['agency_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leases');
    }
};
