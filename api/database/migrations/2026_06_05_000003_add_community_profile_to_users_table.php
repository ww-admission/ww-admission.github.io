<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('destination')->nullable()->after('status');
            $table->string('domain')->nullable()->after('destination');
            $table->string('programme')->nullable()->after('domain');
            $table->string('university')->nullable()->after('programme');
            $table->string('city')->nullable()->after('university');
            $table->string('nationality')->nullable()->after('city');
            $table->string('study_year')->nullable()->after('nationality');
            $table->string('graduation_year')->nullable()->after('study_year');
            $table->text('bio')->nullable()->after('graduation_year');
            $table->json('languages')->nullable()->after('bio');
            $table->json('looking_for')->nullable()->after('languages');
            $table->boolean('is_community_public')->default(false)->after('looking_for');
            $table->boolean('is_verified')->default(false)->after('is_community_public');
            $table->string('linkedin_url')->nullable()->after('is_verified');
            $table->string('community_status')->nullable()->after('linkedin_url');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'destination', 'domain', 'programme', 'university', 'city',
                'nationality', 'study_year', 'graduation_year', 'bio',
                'languages', 'looking_for', 'is_community_public', 'is_verified',
                'linkedin_url', 'community_status',
            ]);
        });
    }
};
