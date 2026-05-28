<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('destination');
            $table->string('programme');
            $table->string('niveau_vise');
            $table->string('status')->default('pending');
            $table->json('personal_info')->nullable();
            $table->json('academic_info')->nullable();
            $table->json('documents')->nullable();
            $table->json('complementary_info')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidatures');
    }
};
