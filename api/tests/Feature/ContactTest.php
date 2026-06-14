<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_can_submit_contact_form(): void
    {
        $this->postJson('/api/contact', [
            'name'    => 'Jean Dupont',
            'email'   => 'jean@example.com',
            'message' => 'Bonjour, j\'ai une question sur les programmes.',
        ])
        ->assertStatus(201)
        ->assertJsonPath('message', 'Votre message a bien été reçu.');

        $this->assertDatabaseHas('contact_submissions', [
            'email'  => 'jean@example.com',
            'status' => 'new',
        ]);
    }

    public function test_contact_requires_name_email_message(): void
    {
        $this->postJson('/api/contact', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'message']);
    }

    public function test_contact_rejects_invalid_email(): void
    {
        $this->postJson('/api/contact', [
            'name'    => 'Jean',
            'email'   => 'not-an-email',
            'message' => 'Test message here',
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['email']);
    }

    public function test_admin_can_list_contact_submissions(): void
    {
        $this->postJson('/api/contact', [
            'name' => 'A', 'email' => 'a@example.com', 'message' => 'Test message content',
        ]);

        $admin = \App\Models\User::factory()->create(['role' => 'admin']);
        $token = $admin->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/contact')
            ->assertStatus(200);
    }

    public function test_candidate_cannot_list_contact_submissions(): void
    {
        $user  = \App\Models\User::factory()->create(['role' => 'candidate']);
        $token = $user->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/contact')
            ->assertStatus(403);
    }
}
