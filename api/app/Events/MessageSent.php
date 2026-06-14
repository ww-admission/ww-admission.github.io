<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Message $message)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->message->conversation_id),
        ];
    }

    public function broadcastWith(): array
    {
        $msg = $this->message->loadMissing(['sender', 'attachments']);

        return [
            'id'             => $msg->id,
            'conversationId' => $msg->conversation_id,
            'senderId'       => $msg->sender_id,
            'senderName'     => $msg->sender->name,
            'senderRole'     => $msg->sender->role,
            'content'        => $msg->content,
            'createdAt'      => $msg->created_at->toIso8601String(),
            'read'           => false,
            'attachments'    => $msg->attachments->map(fn ($a) => [
                'id'           => $a->id,
                'originalName' => $a->original_name,
                'mimeType'     => $a->mime_type,
                'humanSize'    => $a->humanSize(),
                'isImage'      => $a->isImage(),
                'previewUrl'   => "/api/attachments/{$a->id}/preview",
                'downloadUrl'  => "/api/attachments/{$a->id}/download",
            ])->values()->toArray(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
