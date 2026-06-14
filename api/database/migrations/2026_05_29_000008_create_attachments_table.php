<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();

            // Relation polymorphique : candidature ou contact_submission
            $table->morphs('attachable');

            $table->string('original_name');
            $table->string('stored_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');           // octets
            $table->string('path');                       // chemin relatif dans le disk
            $table->string('disk', 20)->default('local'); // local | s3
            $table->string('field_name')->nullable();     // passeport, diplome, etc.

            // Null pour les soumissions de contact (visiteurs non authentifiés)
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index('uploaded_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
