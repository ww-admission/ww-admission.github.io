<?php

namespace App\Events;

use App\Models\Candidature;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CandidatureStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Candidature $candidature,
        public readonly string $oldStatus,
        public readonly string $newStatus,
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->candidature->user_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'candidatureId' => $this->candidature->id,
            'oldStatus'     => $this->oldStatus,
            'newStatus'     => $this->newStatus,
        ];
    }

    public function broadcastAs(): string
    {
        return 'candidature.status_changed';
    }
}
