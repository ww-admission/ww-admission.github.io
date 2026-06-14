<?php

namespace App\Listeners;

use App\Events\CandidatureStatusChanged;
use App\Notifications\CandidatureStatusChangedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendStatusChangedNotification implements ShouldQueue
{
    public function handle(CandidatureStatusChanged $event): void
    {
        $event->candidature->user->notify(
            new CandidatureStatusChangedNotification(
                $event->candidature,
                $event->oldStatus,
                $event->newStatus,
            )
        );
    }
}
