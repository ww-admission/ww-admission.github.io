<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Conversation $conversation): bool
    {
        return $user->role === 'admin' || $conversation->candidate_id === $user->id;
    }

    public function sendMessage(User $user, Conversation $conversation): bool
    {
        return $user->role === 'admin' || $conversation->candidate_id === $user->id;
    }
}
