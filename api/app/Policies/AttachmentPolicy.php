<?php

namespace App\Policies;

use App\Models\Attachment;
use App\Models\User;

class AttachmentPolicy
{
    public function view(User $user, Attachment $attachment): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        // Le candidat ne peut voir que ses propres fichiers
        return $attachment->uploaded_by === $user->id
            || $this->attachableBelongsTo($user, $attachment);
    }

    public function delete(User $user, Attachment $attachment): bool
    {
        return $user->role === 'admin'
            || $attachment->uploaded_by === $user->id;
    }

    private function attachableBelongsTo(User $user, Attachment $attachment): bool
    {
        if ($attachment->attachable_type === \App\Models\Candidature::class) {
            return $attachment->attachable?->user_id === $user->id;
        }

        // Pièce jointe d'un message : le candidat de la conversation peut la consulter
        if ($attachment->attachable_type === \App\Models\Message::class) {
            $message = $attachment->attachable()->with('conversation')->first();
            return $message?->conversation?->candidate_id === $user->id;
        }

        return false;
    }
}
