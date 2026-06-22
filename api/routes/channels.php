<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Tous les channels privés sont protégés : un utilisateur ne peut s'abonner
| qu'aux channels pour lesquels il est autorisé.
|
*/

// Channel conversation.{id} - accessible par le candidat de la conv ou un admin
Broadcast::channel('conversation.{conversationId}', function ($user, int $conversationId) {
    $conv = Conversation::find($conversationId);
    if (! $conv) return false;

    return $user->role === 'admin' || $conv->candidate_id === $user->id;
});

// Channel user.{id} - chaque utilisateur accède uniquement à son propre canal
Broadcast::channel('user.{userId}', function ($user, int $userId) {
    return $user->id === $userId;
});

// Channel candidature.{id} - admin seulement pour les commentaires live
Broadcast::channel('candidature.{candidatureId}', function ($user, int $candidatureId) {
    if ($user->role === 'admin') return true;

    return \App\Models\Candidature::where('id', $candidatureId)
        ->where('user_id', $user->id)
        ->exists();
});
