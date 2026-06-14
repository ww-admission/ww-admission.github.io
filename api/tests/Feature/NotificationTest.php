<?php

namespace Tests\Feature;

use App\Events\NotificationCreated;
use App\Models\Candidature;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Notifications\CandidatureStatusChangedNotification;
use App\Notifications\NewMessageNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeConversation(): array
    {
        $admin     = User::factory()->create(['role' => 'admin']);
        $candidate = User::factory()->create(['role' => 'candidate']);
        $cand      = Candidature::factory()->create(['user_id' => $candidate->id]);
        $conv      = Conversation::factory()->create([
            'candidate_id'   => $candidate->id,
            'candidature_id' => $cand->id,
        ]);

        return compact('admin', 'candidate', 'conv', 'cand');
    }

    // ── Tests existants ───────────────────────────────────────────────────────

    public function test_notifications_list_returns_user_notifications(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('t')->plainTextToken;

        $cand = Candidature::factory()->create(['user_id' => $user->id]);
        $user->notify(new CandidatureStatusChangedNotification($cand, 'pending', 'reviewing'));

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertCount(1, $response->json('notifications'));
        $this->assertEquals(1, $response->json('unreadCount'));
    }

    public function test_mark_notification_as_read(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('t')->plainTextToken;

        $cand = Candidature::factory()->create(['user_id' => $user->id]);
        $user->notify(new CandidatureStatusChangedNotification($cand, 'pending', 'reviewing'));

        $notifId = $user->notifications()->first()->id;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/notifications/{$notifId}/read")
            ->assertStatus(200);

        $this->assertNotNull($user->fresh()->notifications()->first()->read_at);
    }

    public function test_mark_all_notifications_as_read(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('t')->plainTextToken;

        $cand = Candidature::factory()->create(['user_id' => $user->id]);
        $user->notify(new CandidatureStatusChangedNotification($cand, 'pending', 'reviewing'));
        $user->notify(new CandidatureStatusChangedNotification($cand, 'reviewing', 'accepted'));

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/notifications/read-all')
            ->assertStatus(200);

        $this->assertEquals(0, $user->fresh()->unreadNotifications()->count());
    }

    public function test_status_change_sends_notification_to_candidate(): void
    {
        Notification::fake();

        ['admin' => $admin, 'candidate' => $candidate, 'cand' => $cand] = $this->makeConversation();
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/candidatures/{$cand->id}", ['status' => 'reviewing'])
            ->assertStatus(200);

        Notification::assertSentTo($candidate, CandidatureStatusChangedNotification::class);
        Notification::assertNotSentTo($admin, CandidatureStatusChangedNotification::class);
    }

    // ── Nouveaux tests : notifications de message ─────────────────────────────

    /**
     * Scénario principal : l'admin envoie un message → la notification est
     * stockée en DB de façon synchrone (pas de queue worker nécessaire).
     */
    public function test_admin_message_stores_notification_in_db_synchronously(): void
    {
        ['admin' => $admin, 'candidate' => $candidate, 'conv' => $conv] = $this->makeConversation();
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", ['content' => 'Bonjour !'])
            ->assertStatus(201);

        // La notification doit être en DB immédiatement, sans queue:work
        $this->assertCount(1, $candidate->fresh()->notifications);
        $notification = $candidate->fresh()->notifications->first();
        $this->assertEquals('new_message', $notification->data['type']);
        $this->assertEquals($conv->id, $notification->data['conversationId']);
        $this->assertEquals($admin->name, $notification->data['senderName']);
    }

    /**
     * Le candidat envoie un message → TOUS les admins reçoivent une notification,
     * le candidat lui-même n'en reçoit pas.
     */
    public function test_candidate_message_notifies_all_admins_not_candidate(): void
    {
        ['admin' => $admin, 'candidate' => $candidate, 'conv' => $conv] = $this->makeConversation();
        $admin2 = User::factory()->create(['role' => 'admin']);
        $token  = $candidate->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", ['content' => 'Question ?'])
            ->assertStatus(201);

        $this->assertCount(1, $admin->fresh()->notifications);
        $this->assertCount(1, $admin2->fresh()->notifications);
        // IDOR : le candidat ne se notifie pas lui-même
        $this->assertCount(0, $candidate->fresh()->notifications);
    }

    /**
     * Un autre candidat ne reçoit PAS la notification — prévention IDOR.
     */
    public function test_other_candidate_receives_no_notification(): void
    {
        ['admin' => $admin, 'conv' => $conv] = $this->makeConversation();
        $otherCandidate = User::factory()->create(['role' => 'candidate']);
        $token          = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", ['content' => 'Réponse'])
            ->assertStatus(201);

        $this->assertCount(0, $otherCandidate->fresh()->notifications);
    }

    /**
     * L'événement NotificationCreated est dispatché après le stockage DB.
     */
    public function test_notification_created_event_dispatched_after_db_storage(): void
    {
        Event::fake([NotificationCreated::class]);

        ['admin' => $admin, 'candidate' => $candidate, 'conv' => $conv] = $this->makeConversation();
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", ['content' => 'Hello'])
            ->assertStatus(201);

        Event::assertDispatched(NotificationCreated::class, function ($event) use ($candidate) {
            return $event->recipientId === $candidate->id;
        });
    }

    /**
     * NewMessageNotification est bien synchrone : pas de ShouldQueue.
     * Si la notification lève une exception, le message est quand même créé (201).
     */
    public function test_notification_failure_does_not_fail_message_send(): void
    {
        // On force une exception en mockant la notification
        Notification::fake();
        Notification::shouldReceive('send')->andThrow(new \RuntimeException('DB error'));

        ['admin' => $admin, 'conv' => $conv] = $this->makeConversation();
        $token = $admin->createToken('t')->plainTextToken;

        // Le message doit quand même être créé (le listener catch l'exception)
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", ['content' => 'Test'])
            ->assertStatus(201);
    }

    /**
     * L'accès aux notifications d'un autre utilisateur est refusé (IDOR).
     */
    public function test_user_cannot_read_another_users_notification(): void
    {
        $owner   = User::factory()->create();
        $other   = User::factory()->create();
        $cand    = Candidature::factory()->create(['user_id' => $owner->id]);

        $owner->notify(new CandidatureStatusChangedNotification($cand, 'pending', 'reviewing'));
        $notifId = $owner->notifications()->first()->id;

        $token = $other->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/notifications/{$notifId}/read")
            ->assertStatus(404); // findOrFail sur notifiable()->notifications()
    }

    /**
     * La liste de notifications ne renvoie QUE celles de l'utilisateur connecté.
     */
    public function test_notifications_list_scoped_to_authenticated_user(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $cand  = Candidature::factory()->create(['user_id' => $user1->id]);

        $user1->notify(new CandidatureStatusChangedNotification($cand, 'pending', 'reviewing'));

        $token2 = $user2->createToken('t')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token2}")
            ->getJson('/api/notifications')
            ->assertStatus(200);

        $this->assertCount(0, $response->json('notifications'));
        $this->assertEquals(0, $response->json('unreadCount'));
    }

    /**
     * Le contenu HTML dans un message est strippé dans l'aperçu de notification.
     */
    public function test_notification_preview_strips_html(): void
    {
        ['admin' => $admin, 'candidate' => $candidate, 'conv' => $conv] = $this->makeConversation();
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", [
                'content' => '<script>alert("xss")</script>Bonjour !',
            ])
            ->assertStatus(201);

        $notif = $candidate->fresh()->notifications->first();
        $this->assertStringNotContainsString('<script>', $notif->data['preview']);
        $this->assertStringContainsString('Bonjour !', $notif->data['preview']);
    }
}
