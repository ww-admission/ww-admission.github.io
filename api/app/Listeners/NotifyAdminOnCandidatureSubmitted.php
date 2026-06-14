<?php

namespace App\Listeners;

use App\Events\CandidatureSubmitted;
use App\Models\User;
use App\Notifications\CandidatureSubmittedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;

class NotifyAdminOnCandidatureSubmitted implements ShouldQueue
{
    public function handle(CandidatureSubmitted $event): void
    {
        User::where('role', 'admin')->each(
            fn (User $admin) => $admin->notify(
                new CandidatureSubmittedNotification($event->candidature)
            )
        );
    }
}
