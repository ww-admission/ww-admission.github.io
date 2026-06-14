<?php

namespace Tests\Feature;

use App\Models\Candidature;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ConversationTest extends TestCase
{
    use RefreshDatabase;

    private function makeConversation(): array
    {
        $admin     = User::factory()->create(['role' => 'admin']);
        $candidate = User::factory()->create(['role' => 'candidate']);
        $cand      = Candidature::factory()->create(['user_id' => $candidate->id]);
        $conv      = Conversation::factory()->create([
            'candidate_id'   => $candidate->id,
            'candidature_id' => $cand->id,
        ]);

        return compact('admin', 'candidate', 'conv');
    }

    public function test_candidate_can_send_message(): void
    {
        ['candidate' => $candidate, 'conv' => $conv] = $this->makeConversation();
        $token = $candidate->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", ['content' => 'Bonjour !'])
            ->assertStatus(201)
            ->assertJsonPath('content', 'Bonjour !')
            ->assertJsonPath('senderRole', 'candidate');
    }

    public function test_admin_can_send_message(): void
    {
        ['admin' => $admin, 'conv' => $conv] = $this->makeConversation();
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", ['content' => 'Réponse admin'])
            ->assertStatus(201)
            ->assertJsonPath('senderRole', 'admin');
    }

    public function test_candidate_cannot_access_other_conversation(): void
    {
        ['conv' => $conv] = $this->makeConversation();

        $other = User::factory()->create(['role' => 'candidate']);
        $token = $other->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/conversations/{$conv->id}/messages")
            ->assertStatus(403);
    }

    public function test_reading_messages_marks_them_as_read(): void
    {
        ['candidate' => $candidate, 'admin' => $admin, 'conv' => $conv] = $this->makeConversation();

        Message::factory()->create([
            'conversation_id' => $conv->id,
            'sender_id'       => $admin->id,
            'read_at'         => null,
        ]);

        $token = $candidate->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/conversations/{$conv->id}/messages")
            ->assertStatus(200);

        $this->assertNotNull(Message::first()->read_at);
    }

    public function test_message_content_max_5000_chars(): void
    {
        ['candidate' => $candidate, 'conv' => $conv] = $this->makeConversation();
        $token = $candidate->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", ['content' => str_repeat('a', 5001)])
            ->assertStatus(422);
    }

    /**
     * MessageSent (ShouldBroadcastNow) est dispatché à chaque envoi de message.
     * NotificationCreated est dispatché après stockage en DB.
     */
    public function test_sending_message_dispatches_broadcast_events(): void
    {
        Event::fake([\App\Events\MessageSent::class, \App\Events\NotificationCreated::class]);

        ['admin' => $admin, 'candidate' => $candidate, 'conv' => $conv] = $this->makeConversation();
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/conversations/{$conv->id}/messages", ['content' => 'Live !'])
            ->assertStatus(201);

        Event::assertDispatched(\App\Events\MessageSent::class);
        Event::assertDispatched(\App\Events\NotificationCreated::class, function ($e) use ($candidate) {
            return $e->recipientId === $candidate->id;
        });
    }

    public function test_admin_sees_all_conversations(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Conversation::factory()->count(3)->create();
        $token = $admin->createToken('t')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/conversations')
            ->assertStatus(200);

        $this->assertCount(3, $response->json());
    }

    public function test_candidate_sees_only_own_conversations(): void
    {
        $candidate = User::factory()->create(['role' => 'candidate']);
        Conversation::factory()->create(['candidate_id' => $candidate->id]);
        Conversation::factory()->create(); // autre

        $token = $candidate->createToken('t')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/conversations')
            ->assertStatus(200);

        $this->assertCount(1, $response->json());
    }
}
