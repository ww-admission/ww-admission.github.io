<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Événement broadcast émis après qu'une notification a été stockée en DB.
 *
 * Canal : user.{recipientId}  (privé, autorisé dans channels.php)
 * Événement JS côté client : '.notification.created'
 *
 * Payload minimal — le frontend met à jour le badge et dispatch wwa:new-notification.
 * Il récupère le détail complet via GET /api/notifications quand l'utilisateur
 * ouvre le panneau.
 *
 * ShouldBroadcastNow → broadcast synchrone dans la requête HTTP courante,
 * sans queue worker. Jamais de token en query string : l'auth passe par
 * /api/broadcasting/auth (Astro BFF) → Sanctum → channels.php.
 */
class NotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int     $recipientId,
        public readonly Message $message,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.' . $this->recipientId)];
    }

    /** Payload volontairement minimal pour limiter l'exposition de données. */
    public function broadcastWith(): array
    {
        $sender = $this->message->sender;

        return [
            'type'           => 'new_message',
            'senderName'     => $sender->name,
            'senderRole'     => $sender->role,
            'conversationId' => $this->message->conversation_id,
            // Aperçu court, pas de HTML
            'preview'        => mb_substr(strip_tags($this->message->content ?? ''), 0, 80),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }
}
