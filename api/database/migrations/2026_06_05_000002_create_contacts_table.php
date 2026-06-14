<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->string('type');                         // wwa_team|referent|school|company|advisor|personal
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('role');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('location')->nullable();
            $table->text('bio')->nullable();
            $table->string('website')->nullable();
            $table->string('avatar_url')->nullable();
            $table->json('languages')->nullable();
            $table->string('availability')->nullable();
            $table->json('specializations')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('status')->default('active');   // active|inactive|pending
            $table->boolean('is_default')->default(false);
            $table->unsignedBigInteger('conversation_id')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->index('type');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
