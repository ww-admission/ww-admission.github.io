<?php

namespace App\Events;

use App\Models\CandidatureComment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentAdded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly CandidatureComment $comment)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('candidature.' . $this->comment->candidature_id),
        ];
    }

    public function broadcastWith(): array
    {
        $comment = $this->comment->load('author');

        return [
            'id'             => $comment->id,
            'candidatureId'  => $comment->candidature_id,
            'authorName'     => $comment->author->name,
            'content'        => $comment->content,
            'createdAt'      => $comment->created_at->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'comment.added';
    }
}
