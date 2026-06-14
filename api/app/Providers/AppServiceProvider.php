<?php

namespace App\Providers;

use App\Events\CandidatureStatusChanged;
use App\Events\CandidatureSubmitted;
use App\Events\MessageSent;
use App\Listeners\NotifyAdminOnCandidatureSubmitted;
use App\Listeners\SendNewMessageNotification;
use App\Listeners\SendStatusChangedNotification;
use App\Models\Attachment;
use App\Models\Candidature;
use App\Models\CandidatureComment;
use App\Models\ContactSubmission;
use App\Models\Conversation;
use App\Policies\AttachmentPolicy;
use App\Policies\CandidaturePolicy;
use App\Policies\ConversationPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // ── Events / Listeners ──────────────────────────────────────────
        Event::listen(MessageSent::class,              SendNewMessageNotification::class);
        Event::listen(CandidatureStatusChanged::class, SendStatusChangedNotification::class);
        Event::listen(CandidatureSubmitted::class,     NotifyAdminOnCandidatureSubmitted::class);

        // ── Policies ────────────────────────────────────────────────────
        Gate::policy(Candidature::class,  CandidaturePolicy::class);
        Gate::policy(Attachment::class,   AttachmentPolicy::class);
        Gate::policy(Conversation::class, ConversationPolicy::class);
    }
}
