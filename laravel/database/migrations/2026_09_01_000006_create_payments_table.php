<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('agency_id');
            $table->uuid('lease_id');
            $table->decimal('amount', 12, 2)->default(0);
            $table->date('due_date');
            $table->date('paid_date')->nullable();
            $table->string('status')->default('pending'); // pending | paid | overdue
            $table->string('method')->nullable();
            $table->string('reference')->nullable();
            $table->timestamps();

            $table->foreign('agency_id')->references('id')->on('agencies')->onDelete('cascade');
            $table->foreign('lease_id')->references('id')->on('leases')->onDelete('cascade');
            $table->index(['agency_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
