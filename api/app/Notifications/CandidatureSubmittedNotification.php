<?php

namespace App\Notifications;

use App\Models\Candidature;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CandidatureSubmittedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Candidature $candidature)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'          => 'candidature_submitted',
            'candidatureId' => $this->candidature->id,
            'candidateName' => $this->candidature->user->name,
            'destination'   => $this->candidature->destination,
            'programme'     => $this->candidature->programme,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $cand = $this->candidature->load('user');

        return (new MailMessage)
            ->subject('Nouvelle candidature - ' . $cand->user->name)
            ->line('Une nouvelle candidature a été soumise.')
            ->line("Candidat : {$cand->user->name}")
            ->line("Destination : {$cand->destination} - {$cand->programme}")
            ->action('Voir la candidature', url('/admin/candidatures/' . $cand->id));
    }
}
