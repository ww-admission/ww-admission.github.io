<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute les index manquants identifiés lors de l'audit :
 *
 *  1. messages.sender_id - utilisé dans Conversation::unreadCountFor()
 *     (WHERE sender_id != ?) sans index → seq scan sur chaque lecture.
 *
 *  2. notifications.created_at - permettra la pagination future des 50
 *     dernières notifs triées par date.
 *
 * Migration réversible (dropIndex dans down()).
 * Sur SQLite : CREATE INDEX non-bloquant.
 * Sur MySQL (future migration) : ajouter ALGORITHM=INPLACE, LOCK=NONE.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->index('sender_id', 'messages_sender_id_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->index('created_at', 'notifications_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('messages_sender_id_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_created_at_index');
        });
    }
};
