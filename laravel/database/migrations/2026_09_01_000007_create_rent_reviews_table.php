<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rent_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('agency_id');
            $table->uuid('lease_id');
            $table->date('review_date');
            $table->decimal('current_rent', 12, 2);
            $table->decimal('proposed_rent', 12, 2);
            $table->decimal('approved_rent', 12, 2)->nullable();
            $table->string('status')->default('pending'); // pending | approved | rejected | applied
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('agency_id')->references('id')->on('agencies')->onDelete('cascade');
            $table->foreign('lease_id')->references('id')->on('leases')->onDelete('cascade');
            $table->index(['agency_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rent_reviews');
    }
};
