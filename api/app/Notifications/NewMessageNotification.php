<?php

namespace App\Notifications;

use App\Models\Message;
use Illuminate\Notifications\Notification;

/**
 * Notification stockée en base — synchrone par design.
 *
 * PAS de ShouldQueue : on garantit que la ligne `notifications` est créée
 * AVANT que le broadcast `NotificationCreated` ne soit dispatché.
 * Le listener `SendNewMessageNotification` isole les exceptions via try/catch
 * pour que l'échec de notification ne bloque jamais l'envoi du message.
 *
 * Phase 3 (Redis + multi-instance > 10k users) : réintroduire ShouldQueue ici
 * et déplacer le dispatch de NotificationCreated dans le job de notification.
 */
class NewMessageNotification extends Notification
{
    public function __construct(public readonly Message $message) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $sender = $this->message->sender;

        return [
            'type'           => 'new_message',
            'messageId'      => $this->message->id,
            'conversationId' => $this->message->conversation_id,
            'senderName'     => $sender->name,
            'senderRole'     => $sender->role,
            // Aperçu sécurisé : strip_tags prévient l'injection HTML stockée en JSON
            'preview'        => mb_substr(strip_tags($this->message->content ?? ''), 0, 100),
        ];
    }
}
