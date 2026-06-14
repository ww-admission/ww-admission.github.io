<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('candidatures', function (Blueprint $table) {
            $table->index('user_id');
            $table->index('status');
            $table->index('submitted_at');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->index(['conversation_id', 'created_at']);
            $table->index('read_at');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->index('candidate_id');
            $table->index('updated_at');
        });

        Schema::table('app_logs', function (Blueprint $table) {
            $table->index('actor_id');
            $table->index('created_at');
            $table->index('action');
        });

        Schema::table('candidature_comments', function (Blueprint $table) {
            $table->index('candidature_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('candidatures', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['submitted_at']);
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['conversation_id', 'created_at']);
            $table->dropIndex(['read_at']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex(['candidate_id']);
            $table->dropIndex(['updated_at']);
        });

        Schema::table('app_logs', function (Blueprint $table) {
            $table->dropIndex(['actor_id']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['action']);
        });

        Schema::table('candidature_comments', function (Blueprint $table) {
            $table->dropIndex(['candidature_id']);
            $table->dropIndex(['created_at']);
        });
    }
};
