<?php

namespace App\Policies;

use App\Models\Candidature;
use App\Models\User;

class CandidaturePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Candidature $candidature): bool
    {
        return $user->role === 'admin' || $candidature->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Candidature $candidature): bool
    {
        return $user->role === 'admin';
    }

    public function addComment(User $user, Candidature $candidature): bool
    {
        return $user->role === 'admin';
    }

    public function manageAttachments(User $user, Candidature $candidature): bool
    {
        return $user->role === 'admin' || $candidature->user_id === $user->id;
    }
}
