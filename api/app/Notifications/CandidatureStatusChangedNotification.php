<?php

namespace App\Notifications;

use App\Models\Candidature;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CandidatureStatusChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    private const STATUS_LABELS = [
        'pending'   => 'En attente',
        'reviewing' => 'En cours d\'examen',
        'on_hold'   => 'En suspens',
        'accepted'  => 'Acceptée',
        'rejected'  => 'Refusée',
    ];

    public function __construct(
        public readonly Candidature $candidature,
        public readonly string $oldStatus,
        public readonly string $newStatus,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'          => 'candidature_status_changed',
            'candidatureId' => $this->candidature->id,
            'destination'   => $this->candidature->destination,
            'oldStatus'     => $this->oldStatus,
            'newStatus'     => $this->newStatus,
            'newLabel'      => self::STATUS_LABELS[$this->newStatus] ?? $this->newStatus,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $label = self::STATUS_LABELS[$this->newStatus] ?? $this->newStatus;

        return (new MailMessage)
            ->subject("Mise à jour de votre candidature — {$label}")
            ->greeting('Bonjour ' . $notifiable->name . ',')
            ->line("Le statut de votre candidature pour {$this->candidature->destination} a été mis à jour.")
            ->line("Nouveau statut : **{$label}**")
            ->action('Voir ma candidature', url('/dashboard/candidature'));
    }
}
