<?php

namespace App\Listeners;

use App\Events\MessageSent;
use App\Events\NotificationCreated;
use App\Models\Message;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Support\Facades\Log;

/**
 * Écoute MessageSent et orchestre :
 *   1. Stockage DB synchrone de la notification (NewMessageNotification, sans queue)
 *   2. Broadcast temps réel sur user.{recipientId} (NotificationCreated, ShouldBroadcastNow)
 *
 * Isolation des échecs :
 *   - Si le stockage DB échoue → on logue, on ne broadcast PAS, le message REST reste 201.
 *   - Si le broadcast échoue → on logue en warning, la notification est déjà en DB,
 *     le client la récupère au prochain poll.
 *
 * N+1 / fan-out vers les admins : User::where('role', 'admin')->each() charge par chunks
 * de 1000. Pour l'instant (< 20 admins), acceptable.
 * Phase 3 : réintroduire ShouldQueue + Redis pour le fan-out.
 */
class SendNewMessageNotification
{
    public function handle(MessageSent $event): void
    {
        $message = $event->message->loadMissing(['sender', 'conversation.candidate']);
        $conv    = $message->conversation;

        if ($message->sender->role === 'admin') {
            $this->notifyRecipient($conv->candidate, $message);
        } else {
            User::where('role', 'admin')->each(
                fn (User $admin) => $this->notifyRecipient($admin, $message)
            );
        }
    }

    private function notifyRecipient(User $recipient, Message $message): void
    {
        // ── Étape 1 : DB d'abord ──────────────────────────────────────────────
        try {
            $recipient->notify(new NewMessageNotification($message));
        } catch (\Throwable $e) {
            Log::error('notification_storage_failed', [
                'recipient_id' => $recipient->id,
                'message_id'   => $message->id,
                'error'        => $e->getMessage(),
                'trace'        => $e->getTraceAsString(),
            ]);

            // La notification n'est pas en DB : on n'émet pas de broadcast
            // pour éviter un badge qui ne correspond à aucune entrée.
            return;
        }

        // ── Étape 2 : broadcast temps réel après confirmation du stockage ─────
        try {
            NotificationCreated::dispatch($recipient->id, $message);
        } catch (\Throwable $e) {
            // Non-bloquant : la notification existe déjà en DB.
            // Le client la recevra au prochain poll (30 s).
            Log::warning('notification_broadcast_failed', [
                'recipient_id' => $recipient->id,
                'message_id'   => $message->id,
                'error'        => $e->getMessage(),
            ]);
        }
    }
}
